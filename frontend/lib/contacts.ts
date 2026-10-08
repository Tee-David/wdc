import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { getClients } from "@/lib/admin/store";
import { normaliseEmail, looksLikeEmail } from "@/lib/newsletter";
import { refusedEmail } from "@/lib/email-domains";

/**
 * THE PERSON RECORD behind the Email page: one row per address, whether they
 * are a client, an enquiry, or someone on the newsletter.
 *
 * `syncContacts` fills it from the places people already arrive (clients, the
 * newsletter list, contact enquiries, onboarding briefs) without touching any
 * of those writers. It only ever adds and promotes: a person who unsubscribed,
 * bounced or complained is never brought back by a sync, and a client stays a
 * client. `marketing` is set only for newsletter subscribers; leads and
 * clients are not emailed campaigns unless the owner says they asked.
 */
export type ContactType = "client" | "lead" | "subscriber";
export type ContactStatus = "subscribed" | "unsubscribed" | "bounced" | "complained";
export const TYPES: ContactType[] = ["client", "lead", "subscriber"];
export const STATUSES: ContactStatus[] = ["subscribed", "unsubscribed", "bounced", "complained"];

export type Contact = {
  id: string; email: string; name: string; phone: string; type: ContactType; status: ContactStatus; marketing: boolean;
  source: string; clientId: string | null; consentAt: string | null; consentSource: string | null; unsubReason: string | null;
  createdAt: string; lastActivity: string | null; tags: string[];
};

type Row = { id: string; email: string; name: string; phone: string; type: ContactType; status: ContactStatus; marketing: boolean; source: string; client_id: string | null; consent_at: Date | null; consent_source: string | null; unsub_reason: string | null; created_at: Date; last_activity: Date | null; tags: string[] | null };
const shape = (r: Row): Contact => ({
  id: r.id, email: r.email, name: r.name, phone: r.phone, type: r.type, status: r.status, marketing: r.marketing, source: r.source, clientId: r.client_id,
  consentAt: r.consent_at?.toISOString() ?? null, consentSource: r.consent_source, unsubReason: r.unsub_reason,
  createdAt: r.created_at.toISOString(), lastActivity: r.last_activity?.toISOString() ?? null, tags: (r.tags ?? []).filter(Boolean).sort(),
});

/** Upsert one person. Never revives a suppressed one; promotes the type, never demotes it. */
async function upsert(p: { email: string; name?: string; phone?: string; type: ContactType; source: string; marketing?: boolean; clientId?: string | null; tags?: string[]; consentAt?: Date | null; consentSource?: string | null; consentIp?: string | null; createdAt?: Date }) {
  const email = normaliseEmail(p.email);
  if (!looksLikeEmail(email) || refusedEmail(email)) return;
  const id = randomUUID();
  const r = await db.query<{ id: string }>(
    `INSERT INTO contacts (id, email, name, phone, type, source, marketing, client_id, consent_at, consent_source, consent_ip, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, now()))
     ON CONFLICT (email) DO UPDATE SET
       name = CASE WHEN contacts.name = '' THEN excluded.name ELSE contacts.name END,
       phone = CASE WHEN contacts.phone = '' THEN excluded.phone ELSE contacts.phone END,
       type = CASE WHEN (CASE excluded.type WHEN 'client' THEN 3 WHEN 'lead' THEN 2 ELSE 1 END) > (CASE contacts.type WHEN 'client' THEN 3 WHEN 'lead' THEN 2 ELSE 1 END) THEN excluded.type ELSE contacts.type END,
       client_id = COALESCE(contacts.client_id, excluded.client_id),
       marketing = contacts.marketing OR excluded.marketing,
       consent_at = COALESCE(contacts.consent_at, excluded.consent_at),
       consent_source = COALESCE(contacts.consent_source, excluded.consent_source),
       consent_ip = COALESCE(contacts.consent_ip, excluded.consent_ip),
       updated_at = now()
     RETURNING id`,
    [id, email, (p.name ?? "").slice(0, 120), (p.phone ?? "").slice(0, 40), p.type, p.source, Boolean(p.marketing), p.clientId ?? null, p.consentAt ?? null, p.consentSource ?? null, p.consentIp ?? null, p.createdAt ?? null],
  );
  const cid = r.rows[0].id;
  for (const tag of p.tags ?? []) await db.query(`INSERT INTO contact_tags (contact_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [cid, tag]);
}

/** Pulls people in from every source, then applies the suppression list. Safe to run any time, as often as you like. */
export async function syncContacts(): Promise<{ ok: boolean }> {
  try {
    for (const c of getClients({ includeArchived: true })) {
      if (!c.email) continue;
      await upsert({ email: c.email, name: c.name, phone: c.phone, type: "client", source: "client record", clientId: c.id, tags: ["client"] });
      for (const x of c.contacts ?? []) if (x.email) await upsert({ email: x.email, name: x.name, type: "client", source: "client record", clientId: c.id, tags: ["client"] });
    }
    const subs = await db.query<{ email: string; email_as_typed: string; source: string; created_at: Date; unsubscribed_at: Date | null; consent_at?: Date | null; consent_source?: string | null; consent_ip?: string | null }>(
      `SELECT * FROM newsletter_subscribers`);
    for (const s of subs.rows) {
      await upsert({ email: s.email, type: "subscriber", source: `newsletter, ${s.source}`, marketing: !s.unsubscribed_at, tags: ["newsletter"], consentAt: s.consent_at ?? s.created_at, consentSource: s.consent_source ?? "newsletter sign-up (before confirmation emails)", consentIp: s.consent_ip ?? null, createdAt: s.created_at });
      if (s.unsubscribed_at) await db.query(`INSERT INTO suppression (email, reason, detail, at) VALUES ($1,'unsubscribed','newsletter',$2) ON CONFLICT DO NOTHING`, [s.email, s.unsubscribed_at]);
    }
    const enq = await db.query<{ email: string; first_name: string; last_name: string; phone: string | null; created_at: Date }>(`SELECT email, first_name, last_name, phone, created_at FROM contact_enquiries ORDER BY created_at DESC LIMIT 5000`);
    for (const e of enq.rows) await upsert({ email: e.email, name: `${e.first_name} ${e.last_name}`.trim(), phone: e.phone ?? "", type: "lead", source: "contact form", tags: ["enquiry"], createdAt: e.created_at });
    const brief = await db.query<{ email: string; answers: Record<string, string>; created_at: Date }>(`SELECT email, answers, created_at FROM onboarding_submissions WHERE status = 'submitted' AND email IS NOT NULL ORDER BY created_at DESC LIMIT 5000`);
    for (const b of brief.rows) await upsert({ email: b.email, name: `${b.answers.first_name ?? ""} ${b.answers.last_name ?? ""}`.trim(), type: "lead", source: "onboarding brief", tags: ["onboarding"], createdAt: b.created_at });
    /* Anyone on the suppression list is marked, whatever else says otherwise. */
    await db.query(`UPDATE contacts SET status = (SELECT CASE s.reason WHEN 'unsubscribed' THEN 'unsubscribed' WHEN 'complained' THEN 'complained' ELSE 'bounced' END FROM suppression s WHERE s.email = contacts.email), marketing = false, updated_at = now()
                    WHERE email IN (SELECT email FROM suppression) AND status = 'subscribed'`);
    return { ok: true };
  } catch { return { ok: false }; }
}

export type Filters = { q: string; tag: string; type: string; status: string; marketing: string; page: number; per: number };

function where(f: Filters) {
  const parts: string[] = []; const args: unknown[] = [];
  if (f.q) { args.push(`%${f.q.replace(/[\\%_]/g, "\\$&")}%`); parts.push(`(c.email ILIKE $${args.length} OR c.name ILIKE $${args.length} OR c.phone ILIKE $${args.length})`); }
  if (f.tag) { args.push(f.tag); parts.push(`EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = $${args.length})`); }
  if (TYPES.includes(f.type as ContactType)) { args.push(f.type); parts.push(`c.type = $${args.length}`); }
  if (STATUSES.includes(f.status as ContactStatus)) { args.push(f.status); parts.push(`c.status = $${args.length}`); }
  if (f.marketing === "yes") parts.push("c.marketing"); else if (f.marketing === "no") parts.push("NOT c.marketing");
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", args };
}

const SELECT = `SELECT c.*, (SELECT array_agg(t.tag) FROM contact_tags t WHERE t.contact_id = c.id) AS tags FROM contacts c`;

export async function listContacts(f: Filters, all = false): Promise<{ rows: Contact[]; total: number } | null> {
  try {
    const w = where(f);
    const total = Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM contacts c ${w.sql}`, w.args)).rows[0].n);
    const lim = all ? 20_000 : f.per, off = all ? 0 : (f.page - 1) * f.per;
    const r = await db.query<Row>(`${SELECT} ${w.sql} ORDER BY c.created_at DESC, c.id LIMIT ${lim} OFFSET ${off}`, w.args);
    return { rows: r.rows.map(shape), total };
  } catch { return null; }
}

export async function allTags(): Promise<{ tag: string; n: number }[]> {
  try { return (await db.query<{ tag: string; n: string }>(`SELECT tag, count(*) AS n FROM contact_tags GROUP BY tag ORDER BY tag`)).rows.map((x) => ({ tag: x.tag, n: Number(x.n) })); } catch { return []; }
}

export async function getContact(id: string): Promise<Contact | null> {
  try { const r = await db.query<Row>(`${SELECT} WHERE c.id = $1`, [id]); return r.rows[0] ? shape(r.rows[0]) : null; } catch { return null; }
}

export async function eventsFor(id: string) {
  try { return (await db.query<{ id: string; kind: string; title: string; detail: string; by: string; at: Date }>(`SELECT id, kind, title, detail, by, at FROM contact_events WHERE contact_id = $1 ORDER BY at DESC LIMIT 100`, [id])).rows; } catch { return []; }
}

export async function addEvent(contactId: string, kind: string, title: string, detail = "", by = "") {
  await db.query(`INSERT INTO contact_events (id, contact_id, kind, title, detail, by) VALUES ($1,$2,$3,$4,$5,$6)`, [randomUUID(), contactId, kind, title.slice(0, 200), detail.slice(0, 2000), by]).catch(() => {});
  await db.query(`UPDATE contacts SET last_activity = now() WHERE id = $1`, [contactId]).catch(() => {});
}

const cleanTag = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/\s+/g, "-").slice(0, 40);

export async function tagContacts(ids: string[], tag: string, remove = false) {
  const t = cleanTag(tag);
  if (!t || !ids.length) return 0;
  const list = ids.slice(0, 5000);
  if (remove) await db.query(`DELETE FROM contact_tags WHERE tag = $1 AND contact_id = ANY($2::TEXT[])`, [t, list]);
  else await db.query(`INSERT INTO contact_tags (contact_id, tag) SELECT id, $1 FROM contacts WHERE id = ANY($2::TEXT[]) ON CONFLICT DO NOTHING`, [t, list]);
  return list.length;
}

/** Someone told us (or a provider told us) not to email them. Written to the suppression list and the contact at once. */
export async function suppress(email: string, reason: "unsubscribed" | "bounced" | "complained", detail = "") {
  const e = normaliseEmail(email);
  await db.query(`INSERT INTO suppression (email, reason, detail) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET reason = excluded.reason, detail = excluded.detail, at = now()`, [e, reason, detail.slice(0, 300)]);
  await db.query(`UPDATE contacts SET status = $2, marketing = false, unsub_reason = COALESCE($3, unsub_reason), updated_at = now() WHERE email = $1`, [e, reason, detail || null]);
  /* Anything still waiting to go to them is cancelled (campaign rows, if that table exists yet). */
  await db.query(`UPDATE campaign_sends SET status = 'cancelled' WHERE email = $1 AND status IN ('pending','processing')`, [e]).catch(() => {});
}

/** Whether a person may be sent marketing mail right now: agreed, subscribed, and not suppressed. */
export async function mayReceiveMarketing(email: string): Promise<boolean> {
  const e = normaliseEmail(email);
  const s = await db.query(`SELECT 1 FROM suppression WHERE email = $1`, [e]).catch(() => ({ rowCount: 1 }));
  if (s.rowCount) return false;
  const c = await db.query(`SELECT 1 FROM contacts WHERE email = $1 AND status = 'subscribed' AND marketing`, [e]).catch(() => ({ rowCount: 0 }));
  return Boolean(c.rowCount);
}

export async function setMarketing(id: string, on: boolean, by: string) {
  await db.query(`UPDATE contacts SET marketing = $2, updated_at = now() WHERE id = $1 AND status = 'subscribed'`, [id, on]);
  await addEvent(id, "consent", on ? "Marked as having asked to hear from us" : "Marketing switched off", "", by);
}

/** CSV rows to contacts. Update-only for the existing, never revives a suppressed address, marketing off unless `asked`. */
export async function importContacts(csv: string, opts: { tag: string; asked: boolean }): Promise<{ added: number; skipped: number; invalid: number }> {
  let added = 0, skipped = 0, invalid = 0;
  const tag = cleanTag(opts.tag);
  const lines = csv.split(/\r?\n/).slice(0, 20_000);
  for (const line of lines) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const em = cells.find((c) => c.includes("@"));
    if (!em) continue;
    if (!looksLikeEmail(em)) { invalid++; continue; }
    const email = normaliseEmail(em);
    if (refusedEmail(email)) { invalid++; continue; }
    const sup = await db.query(`SELECT 1 FROM suppression WHERE email = $1`, [email]);
    if (sup.rowCount) { skipped++; continue; }
    const name = cells.find((c) => c && !c.includes("@") && !/^[+\d\s()-]+$/.test(c)) ?? "";
    await upsert({ email, name, type: "subscriber", source: "import", marketing: opts.asked, tags: tag ? [tag] : [], consentAt: opts.asked ? new Date() : null, consentSource: opts.asked ? "imported, owner confirmed they asked" : null });
    added++;
  }
  return { added, skipped, invalid };
}

/** A person's tags as merge values (`tag.client` = "yes"), for blocks that show only to some people. */
export async function tagVars(contactId: string): Promise<Record<string, string>> {
  try {
    const r = await db.query<{ tag: string }>(`SELECT tag FROM contact_tags WHERE contact_id = $1`, [contactId]);
    return Object.fromEntries(r.rows.map((x) => [`tag.${x.tag.toLowerCase()}`, "yes"]));
  } catch { return {}; }
}
