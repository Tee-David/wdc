import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { getClients } from "@/lib/admin/store";
import { normaliseEmail, looksLikeEmail } from "@/lib/newsletter";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";
import { erasedHashes, hashEmail } from "@/lib/privacy/requests";
import { phoneKey, type ParsedRow, type Lookups, type Result } from "@/lib/contacts-import";
import type { ExportScope } from "@/lib/contacts-export";

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
  if (f.status === "stopped") parts.push(`c.status <> 'subscribed'`);
  else if (f.status === "can-email") parts.push(`c.status = 'subscribed' AND c.marketing`);
  else if (STATUSES.includes(f.status as ContactStatus)) { args.push(f.status); parts.push(`c.status = $${args.length}`); }
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

/** A person's tags as merge values (`tag.client` = "yes"), for blocks that show only to some people. */
export async function tagVars(contactId: string): Promise<Record<string, string>> {
  try {
    const r = await db.query<{ tag: string }>(`SELECT tag FROM contact_tags WHERE contact_id = $1`, [contactId]);
    return Object.fromEntries(r.rows.map((x) => [`tag.${x.tag.toLowerCase()}`, "yes"]));
  } catch { return {}; }
}

/* ------------------------------------------------------- the contacts screen */

export type Stats = { total: number; canEmail: number; stopped: number; fresh: number };

/** The three figures above the list, counted over everyone, whatever the filters say. */
export async function contactStats(): Promise<Stats> {
  try {
    const r = await db.query<{ total: string; can: string; stopped: string; fresh: string }>(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE status = 'subscribed' AND marketing) AS can,
              count(*) FILTER (WHERE status <> 'subscribed') AS stopped,
              count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS fresh
         FROM contacts`);
    const x = r.rows[0];
    return { total: Number(x.total), canEmail: Number(x.can), stopped: Number(x.stopped), fresh: Number(x.fresh) };
  } catch { return { total: 0, canEmail: 0, stopped: 0, fresh: 0 }; }
}

/** Per person, how many campaigns reached them and how many they opened or clicked. Empty if campaigns are not set up yet. */
export async function opensFor(ids: string[]): Promise<Map<string, { sent: number; opened: number }>> {
  const out = new Map<string, { sent: number; opened: number }>();
  if (!ids.length) return out;
  try {
    for (let i = 0; i < ids.length; i += 1000) {
      const r = await db.query<{ contact_id: string; sent: string; opened: string }>(
        `SELECT contact_id, count(*) AS sent, count(*) FILTER (WHERE opened_at IS NOT NULL OR clicks > 0) AS opened
           FROM campaign_sends WHERE contact_id = ANY($1::TEXT[]) AND status = 'sent' GROUP BY contact_id`, [ids.slice(i, i + 1000)]);
      for (const x of r.rows) out.set(x.contact_id, { sent: Number(x.sent), opened: Number(x.opened) });
    }
  } catch { /* migration 0046 not applied yet: no opens to show */ }
  return out;
}
export const openRate = (o?: { sent: number; opened: number }) => (o && o.sent ? Math.round((o.opened / o.sent) * 100) : null);

/** The campaigns that have reached one person. Opens are approximate: mail apps load images before anyone reads. */
export async function sendsFor(id: string) {
  try {
    const r = await db.query<{ campaign_id: string; title: string; subject: string | null; sent_at: Date | null; opened_at: Date | null; clicks: number }>(
      `SELECT s.campaign_id, c.title, c.design->>'subject' AS subject, s.sent_at, s.opened_at, s.clicks
         FROM campaign_sends s JOIN campaigns c ON c.id = s.campaign_id
        WHERE s.contact_id = $1 AND s.status = 'sent' ORDER BY s.sent_at DESC NULLS LAST LIMIT 20`, [id]);
    return r.rows.map((x) => ({ campaignId: x.campaign_id, title: x.subject || x.title, sentAt: x.sent_at?.toISOString() ?? null, opened: Boolean(x.opened_at) || x.clicks > 0, clicked: x.clicks > 0 }));
  } catch { return []; }
}

export async function setType(id: string, type: ContactType, by: string): Promise<boolean> {
  if (!TYPES.includes(type)) return false;
  const r = await db.query(`UPDATE contacts SET "type" = $2, updated_at = now() WHERE id = $1`, [id, type]);
  if (r.rowCount) await addEvent(id, "type", `Marked as a ${type}`, "", by);
  return Boolean(r.rowCount);
}

export async function removeTag(id: string, tag: string) {
  await db.query(`DELETE FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [id, cleanTag(tag)]);
}

/** Of these people, the ones campaigns may go to: subscribed, asked to hear from us, and not on the suppression list. */
export async function marketingEligible(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const r = await db.query<{ id: string }>(
    `SELECT c.id FROM contacts c WHERE c.id = ANY($1::TEXT[]) AND c.status = 'subscribed' AND c.marketing
        AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.email = c.email)`, [ids.slice(0, 20_000)]);
  return r.rows.map((x) => x.id);
}

/**
 * Move people to "asked to stop", in a handful of statements however many
 * there are. The same facts `suppress` writes one at a time: the suppression
 * list, the contact, anything still queued for them, and the newsletter list.
 * Nothing here can be undone from the screen: leaving is not reversible by us.
 */
export async function suppressContacts(ids: string[], by: string): Promise<number> {
  const list = ids.slice(0, 1000);
  if (!list.length) return 0;
  const who = (await db.query<{ id: string; email: string }>(`SELECT id, email FROM contacts WHERE id = ANY($1::TEXT[]) AND status = 'subscribed'`, [list])).rows;
  if (!who.length) return 0;
  const mails = who.map((x) => x.email), cids = who.map((x) => x.id);
  const detail = `Marked by ${by}`.slice(0, 300);
  await db.query(`INSERT INTO suppression (email, reason, detail) SELECT e, 'unsubscribed', $2 FROM unnest($1::TEXT[]) AS e ON CONFLICT (email) DO UPDATE SET reason = excluded.reason, detail = excluded.detail, at = now()`, [mails, detail]);
  await db.query(`UPDATE contacts SET status = 'unsubscribed', marketing = false, unsub_reason = $2, updated_at = now(), last_activity = now() WHERE id = ANY($1::TEXT[])`, [cids, detail]);
  await db.query(`UPDATE campaign_sends SET status = 'cancelled' WHERE email = ANY($1::TEXT[]) AND status IN ('pending','processing')`, [mails]).catch(() => {});
  await db.query(`UPDATE newsletter_subscribers SET unsubscribed_at = now(), updated_at = now() WHERE email = ANY($1::TEXT[]) AND unsubscribed_at IS NULL`, [mails]).catch(() => {});
  const events = JSON.stringify(cids.map((cid) => ({ id: randomUUID(), cid })));
  await db.query(
    `INSERT INTO contact_events (id, contact_id, kind, title, detail, by)
     SELECT x->>'id', x->>'cid', 'consent', 'Moved to asked to stop', 'Never emailed again', $2 FROM (SELECT jsonb_array_elements($1::JSONB) AS x) q`, [events, by]).catch(() => {});
  return who.length;
}

export type AddResult = { ok: true; id: string; existing: boolean } | { ok: false; message: string };

/** One person added by hand. Matches an existing record by email or phone first: one record per person. */
export async function addContact(p: { name: string; email: string; phone: string }, by: string): Promise<AddResult> {
  const email = normaliseEmail(p.email);
  if (!looksLikeEmail(email)) return { ok: false, message: "That does not look like an email address." };
  if (refusedEmail(email)) return { ok: false, message: REFUSED_EMAIL_MESSAGE };
  const name = p.name.trim().slice(0, 120), phone = p.phone.trim().slice(0, 40);
  const byMail = await db.query<{ id: string; status: string }>(`SELECT id, status FROM contacts WHERE email = $1`, [email]);
  const sup = await db.query(`SELECT 1 FROM suppression WHERE email = $1`, [email]);
  if (sup.rowCount || (byMail.rows[0] && byMail.rows[0].status !== "subscribed")) {
    return { ok: false, message: "That person asked to stop, so they cannot be added back." };
  }
  if (byMail.rows[0]) return { ok: true, id: byMail.rows[0].id, existing: true };
  const key = phoneKey(phone);
  if (key) {
    const byPhone = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE phone <> '' AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = $1 LIMIT 1`, [key]);
    if (byPhone.rows[0]) return { ok: true, id: byPhone.rows[0].id, existing: true };
  }
  const id = randomUUID();
  const r = await db.query<{ id: string }>(
    `INSERT INTO contacts (id, email, name, phone, "type", source) VALUES ($1,$2,$3,$4,'lead','added by hand') ON CONFLICT (email) DO NOTHING RETURNING id`, [id, email, name, phone]);
  if (!r.rows[0]) { const again = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE email = $1`, [email]); return again.rows[0] ? { ok: true, id: again.rows[0].id, existing: true } : { ok: false, message: "It could not be added just now." }; }
  await addEvent(id, "created", "Added by hand", "", by);
  return { ok: true, id, existing: false };
}

/* ------------------------------------------------------------------ import */

const chunks = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, (i + 1) * n));

/** Who in this file is already a contact, who may never be added back, and whose phone number is already held. */
export async function importLookups(rows: ParsedRow[]): Promise<Lookups> {
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  const stopped = new Set<string>(), existing = new Set<string>(), phones = new Map<string, string>();
  for (const part of chunks(emails, 1000)) {
    for (const x of (await db.query<{ email: string; status: string }>(`SELECT email, status FROM contacts WHERE email = ANY($1::TEXT[])`, [part])).rows) {
      existing.add(x.email); if (x.status !== "subscribed") stopped.add(x.email);
    }
    for (const x of (await db.query<{ email: string }>(`SELECT email FROM suppression WHERE email = ANY($1::TEXT[])`, [part])).rows) stopped.add(x.email);
    /* Someone erased at their own request is not put back by a list somebody kept. */
    const erased = await erasedHashes(part).catch(() => new Set<string>());
    for (const e of part) if (erased.has(hashEmail(e))) stopped.add(e);
  }
  const keys = [...new Set(rows.map((r) => phoneKey(r.phone)).filter(Boolean))];
  for (const part of chunks(keys, 1000)) {
    const r = await db.query<{ email: string; k: string }>(
      `SELECT email, right(regexp_replace(phone, '\\D', '', 'g'), 10) AS k FROM contacts
        WHERE phone <> '' AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = ANY($1::TEXT[])`, [part]);
    for (const x of r.rows) if (!phones.has(x.k)) phones.set(x.k, x.email);
  }
  return { stopped, existing, phones };
}

/**
 * Write the rows that passed. New people are inserted, existing ones are
 * filled in (never overwritten: a name or number already held stays), tags are
 * added, and every one gets an "Imported" event. `marketing = yes` records the
 * consent the owner confirmed, with the time, where it came from and the IP of
 * the signed-in owner, the same three facts the newsletter path writes.
 * ponytail: statements run in chunks of 400, not one transaction; a failure
 * midway leaves the earlier chunks written and a re-run turns them into updates.
 */
export async function commitImport(results: Result[], opts: { file: string; by: string; ip: string }): Promise<{ added: number; updated: number }> {
  const todo = results.filter((r) => r.verdict !== "refused");
  let added = 0, updated = 0;
  const events: { id: string; cid: string; detail: string }[] = [];
  const tagRows: { email: string; tag: string }[] = [];
  for (const part of chunks(todo, 400)) {
    const fresh = part.filter((r) => r.verdict === "new");
    const inserted = new Set<string>();
    if (fresh.length) {
      const payload = JSON.stringify(fresh.map((r) => ({
        id: randomUUID(), email: r.email, name: r.name, phone: r.phone, type: r.marketing ? "subscriber" : "lead",
        source: r.source ? `import: ${r.source}` : "import", marketing: r.marketing,
        consent: r.marketing ? `import: ${r.source}, owner confirmed they agreed` : "",
      })));
      const res = await db.query<{ id: string; email: string }>(
        `INSERT INTO contacts (id, email, name, phone, "type", source, marketing, consent_at, consent_source, consent_ip)
         SELECT r->>'id', r->>'email', r->>'name', r->>'phone', r->>'type', r->>'source', (r->>'marketing')::BOOL,
                CASE WHEN (r->>'marketing')::BOOL THEN now() END, NULLIF(r->>'consent', ''), CASE WHEN (r->>'marketing')::BOOL THEN $2 END
           FROM (SELECT jsonb_array_elements($1::JSONB) AS r) j
         ON CONFLICT (email) DO NOTHING RETURNING id, email`, [payload, opts.ip]);
      for (const x of res.rows) { inserted.add(x.email); events.push({ id: randomUUID(), cid: x.id, detail: `From ${opts.file}: added` }); }
      added += res.rows.length;
    }
    /* An update by email, by phone, or a new row that lost a race to the same address. */
    const rest = part.filter((r) => !(r.verdict === "new" && inserted.has(r.email)));
    if (rest.length) {
      const payload = JSON.stringify(rest.map((r) => ({
        email: r.matchedEmail ?? r.email, name: r.name, phone: r.phone, marketing: r.marketing,
        consent: `import: ${r.source}, owner confirmed they agreed`,
      })));
      const res = await db.query<{ id: string; email: string }>(
        `UPDATE contacts c SET
           name = CASE WHEN c.name = '' THEN j.name ELSE c.name END,
           phone = CASE WHEN c.phone = '' THEN j.phone ELSE c.phone END,
           marketing = c.marketing OR (j.marketing AND c.status = 'subscribed'),
           consent_at = CASE WHEN j.marketing AND c.status = 'subscribed' THEN COALESCE(c.consent_at, now()) ELSE c.consent_at END,
           consent_source = CASE WHEN j.marketing AND c.status = 'subscribed' THEN COALESCE(c.consent_source, j.consent) ELSE c.consent_source END,
           consent_ip = CASE WHEN j.marketing AND c.status = 'subscribed' THEN COALESCE(c.consent_ip, $2) ELSE c.consent_ip END,
           updated_at = now(), last_activity = now()
         FROM (SELECT x->>'email' AS email, x->>'name' AS name, x->>'phone' AS phone, (x->>'marketing')::BOOL AS marketing, x->>'consent' AS consent
                 FROM (SELECT jsonb_array_elements($1::JSONB) AS x) q) j
        WHERE c.email = j.email RETURNING c.id, c.email`, [payload, opts.ip]);
      for (const x of res.rows) events.push({ id: randomUUID(), cid: x.id, detail: `From ${opts.file}: updated` });
      updated += res.rows.length;
    }
    for (const r of part) for (const tag of r.tags) tagRows.push({ email: r.matchedEmail ?? r.email, tag });
  }
  for (const part of chunks(tagRows, 1000)) {
    await db.query(
      `INSERT INTO contact_tags (contact_id, tag)
       SELECT c.id, j.tag FROM contacts c JOIN (SELECT x->>'email' AS email, x->>'tag' AS tag FROM (SELECT jsonb_array_elements($1::JSONB) AS x) q) j ON j.email = c.email
       ON CONFLICT DO NOTHING`, [JSON.stringify(part)]);
  }
  for (const part of chunks(events, 1000)) {
    await db.query(
      `INSERT INTO contact_events (id, contact_id, kind, title, detail, by)
       SELECT x->>'id', x->>'cid', 'import', 'Imported', x->>'detail', $2 FROM (SELECT jsonb_array_elements($1::JSONB) AS x) q`, [JSON.stringify(part), opts.by.slice(0, 120)]);
  }
  return { added, updated };
}

/* ------------------------------------------------------------------ export */

export type ExportQuery = { scope: ExportScope; filters: Filters; ids: string[]; stopped: boolean };

function exportWhere(q: ExportQuery) {
  let sql = "", args: unknown[] = [];
  if (q.scope === "filtered") { const w = where(q.filters); sql = w.sql; args = w.args; }
  else if (q.scope === "selected") { sql = "WHERE c.id = ANY($1::TEXT[])"; args = [q.ids.slice(0, 20_000)]; }
  if (!q.stopped) sql = sql ? `${sql} AND c.status = 'subscribed'` : "WHERE c.status = 'subscribed'";
  return { sql, args };
}

export async function exportContacts(q: ExportQuery): Promise<Contact[] | null> {
  try {
    const w = exportWhere(q);
    return (await db.query<Row>(`${SELECT} ${w.sql} ORDER BY c.created_at DESC, c.id LIMIT 20000`, w.args)).rows.map(shape);
  } catch { return null; }
}

export async function exportCount(q: ExportQuery): Promise<number | null> {
  try {
    const w = exportWhere(q);
    return Math.min(20_000, Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM contacts c ${w.sql}`, w.args)).rows[0].n));
  } catch { return null; }
}
