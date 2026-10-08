import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { sendMail } from "@/lib/email";
import { renderDesign, validDesign, type Design } from "@/lib/email-design";
import { unsubscribeUrl } from "@/lib/newsletter";
import { mayReceiveMarketing , tagVars } from "@/lib/contacts";
import { COMPANY_NAME, CONTACT_EMAIL, SITE_URL } from "@/lib/site";

/**
 * CAMPAIGNS: one email to an audience of people who asked to hear from us.
 *
 * SAFE TO RUN TWICE, ON TWO MACHINES AT ONCE. Every recipient is a row. A run
 * claims rows, and marks each `sent` BEFORE it calls the mail service, with a
 * conditional update that only one run can win. So the worst case after a crash
 * is one person not getting it (the row says sent), never one person getting it
 * twice. Rows stuck in "processing" for 100 seconds go back to "pending".
 *
 * WHO IS EMAILED: subscribed, marked as having asked, not on the suppression
 * list, and checked again at the moment of sending.
 */
export type Audience = { tags: string[]; types: string[]; excludeTags: string[]; onlyIds?: string[] };
export type Track = "full" | "anonymous" | "off";
export type Campaign = {
  id: string; title: string; design: Design; audience: Audience; track: Track; status: string;
  scheduledAt: string | null; recipients: number; anonClicks: number; anonOpens: number; createdAt: string; startedAt: string | null; finishedAt: string | null;
};
type CRow = { id: string; title: string; design: Design; audience: Audience; track: Track; status: string; scheduled_at: Date | null; recipients: number; anon_clicks: number; anon_opens: number; created_at: Date; started_at: Date | null; finished_at: Date | null };
const shape = (r: CRow): Campaign => ({ id: r.id, title: r.title, design: r.design, audience: { ...r.audience, tags: r.audience.tags ?? [], types: r.audience.types ?? [], excludeTags: r.audience.excludeTags ?? [] }, track: r.track, status: r.status, scheduledAt: r.scheduled_at?.toISOString() ?? null, recipients: r.recipients, anonClicks: r.anon_clicks, anonOpens: r.anon_opens, createdAt: r.created_at.toISOString(), startedAt: r.started_at?.toISOString() ?? null, finishedAt: r.finished_at?.toISOString() ?? null });

export async function listCampaigns(): Promise<Campaign[] | null> {
  try { return (await db.query<CRow>(`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100`)).rows.map(shape); } catch { return null; }
}
export async function getCampaign(id: string): Promise<Campaign | null> {
  try { const r = await db.query<CRow>(`SELECT * FROM campaigns WHERE id = $1`, [id]); return r.rows[0] ? shape(r.rows[0]) : null; } catch { return null; }
}

export async function createCampaign(title: string, design: Design, by: string): Promise<string | null> {
  if (!validDesign(design)) return null;
  const id = randomUUID();
  try {
    await db.query(`INSERT INTO campaigns (id, title, design, audience, created_by) VALUES ($1,$2,$3::JSONB,$4::JSONB,$5)`, [id, title.slice(0, 120), JSON.stringify(design), JSON.stringify({ tags: [], types: [], excludeTags: [] }), by]);
    return id;
  } catch { return null; }
}

/** Only a draft can be changed. */
export async function updateCampaign(id: string, patch: { title?: string; design?: Design; audience?: Audience; track?: Track }): Promise<boolean> {
  try {
    const sets: string[] = []; const args: unknown[] = [id];
    if (patch.title !== undefined) { args.push(patch.title.slice(0, 120)); sets.push(`title = $${args.length}`); }
    if (patch.design) { if (!validDesign(patch.design)) return false; args.push(JSON.stringify(patch.design)); sets.push(`design = $${args.length}::JSONB`); }
    if (patch.audience) { args.push(JSON.stringify(cleanAudience(patch.audience))); sets.push(`audience = $${args.length}::JSONB`); }
    if (patch.track && ["full", "anonymous", "off"].includes(patch.track)) { args.push(patch.track); sets.push(`track = $${args.length}`); }
    if (!sets.length) return true;
    const r = await db.query(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = $1 AND status = 'draft'`, args);
    return (r.rowCount ?? 0) > 0;
  } catch { return false; }
}

const tag = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/\s+/g, "-").slice(0, 40);
export function cleanAudience(a: Audience): Audience {
  return { tags: [...new Set(a.tags.map(tag).filter(Boolean))].slice(0, 20), types: a.types.filter((t) => ["client", "lead", "subscriber"].includes(t)), excludeTags: [...new Set(a.excludeTags.map(tag).filter(Boolean))].slice(0, 20), onlyIds: a.onlyIds?.slice(0, 20_000) };
}

function audienceSql(a: Audience) {
  const parts = [`c.status = 'subscribed'`, `c.marketing`, `NOT EXISTS (SELECT 1 FROM suppression s WHERE s.email = c.email)`];
  const args: unknown[] = [];
  if (a.types.length) { args.push(a.types); parts.push(`c.type = ANY($${args.length}::TEXT[])`); }
  if (a.tags.length) { args.push(a.tags); parts.push(`EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = ANY($${args.length}::TEXT[]))`); }
  if (a.excludeTags.length) { args.push(a.excludeTags); parts.push(`NOT EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = ANY($${args.length}::TEXT[]))`); }
  if (a.onlyIds) { args.push(a.onlyIds); parts.push(`c.id = ANY($${args.length}::TEXT[])`); }
  return { where: parts.join(" AND "), args };
}

/** How many people this audience reaches right now. */
export async function audienceCount(a: Audience): Promise<number> {
  try { const q = audienceSql(cleanAudience(a)); return Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM contacts c WHERE ${q.where}`, q.args)).rows[0].n); } catch { return 0; }
}

/** Draft to sending: the recipients become rows. Only one caller can win the change of state. */
export async function startCampaign(id: string, at?: Date | null): Promise<{ ok: true; recipients: number } | { ok: false; message: string }> {
  try {
    const c = await getCampaign(id);
    if (!c) return { ok: false, message: "That campaign is gone." };
    if (c.status !== "draft") return { ok: false, message: "It has already been started." };
    if (at && at.getTime() > Date.now() + 30_000) {
      await db.query(`UPDATE campaigns SET status = 'scheduled', scheduled_at = $2 WHERE id = $1 AND status = 'draft'`, [id, at]);
      return { ok: true, recipients: await audienceCount(c.audience) };
    }
    return { ok: true, recipients: await materialise(id) };
  } catch { return { ok: false, message: "It could not be started just now." }; }
}

async function materialise(id: string): Promise<number> {
  const won = await db.query(`UPDATE campaigns SET status = 'sending', started_at = now() WHERE id = $1 AND status IN ('draft','scheduled') RETURNING audience`, [id]);
  if (!won.rows[0]) return 0;
  const q = audienceSql(cleanAudience(won.rows[0].audience as Audience));
  const rows = (await db.query<{ id: string; email: string }>(`SELECT c.id, c.email FROM contacts c WHERE ${q.where}`, q.args)).rows;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const args: unknown[] = [id];
    const values = chunk.map((r, n) => { args.push(randomUUID(), r.id, r.email, randomBytes(16).toString("base64url")); const k = n * 4; return `($${k + 2}, $1, $${k + 3}, $${k + 4}, $${k + 5})`; });
    await db.query(`INSERT INTO campaign_sends (id, campaign_id, contact_id, email, token) VALUES ${values.join(",")} ON CONFLICT (campaign_id, contact_id) DO NOTHING`, args);
  }
  await db.query(`UPDATE campaigns SET recipients = $2 WHERE id = $1`, [id, rows.length]);
  if (!rows.length) await db.query(`UPDATE campaigns SET status = 'sent', finished_at = now() WHERE id = $1`, [id]);
  return rows.length;
}

export async function setCampaignState(id: string, to: "paused" | "sending" | "cancelled"): Promise<boolean> {
  try {
    const from = to === "paused" ? ["sending"] : to === "sending" ? ["paused"] : ["draft", "scheduled", "sending", "paused"];
    const r = await db.query(`UPDATE campaigns SET status = $2 WHERE id = $1 AND status = ANY($3::TEXT[])`, [id, to, from]);
    if (to === "cancelled") await db.query(`UPDATE campaign_sends SET status = 'cancelled' WHERE campaign_id = $1 AND status IN ('pending','processing')`, [id]);
    return (r.rowCount ?? 0) > 0;
  } catch { return false; }
}

export async function retryFailed(id: string): Promise<number> {
  const r = await db.query(`UPDATE campaign_sends SET status = 'pending', error = NULL, claimed_at = NULL WHERE campaign_id = $1 AND status = 'failed'`, [id]);
  if (r.rowCount) await db.query(`UPDATE campaigns SET status = 'sending', finished_at = NULL WHERE id = $1 AND status = 'sent'`, [id]);
  return r.rowCount ?? 0;
}

/** A copy of a campaign aimed only at people who got it and did not open or click. Returns the new draft's id. */
export async function copyToUnopened(id: string, by: string): Promise<string | null> {
  const c = await getCampaign(id);
  if (!c) return null;
  const ids = (await db.query<{ contact_id: string }>(`SELECT contact_id FROM campaign_sends WHERE campaign_id = $1 AND status = 'sent' AND opened_at IS NULL AND clicks = 0`, [id])).rows.map((r) => r.contact_id);
  if (!ids.length) return null;
  const n = await createCampaign(`${c.title} (again, to people who did not open it)`, { ...c.design, subject: `Re: ${c.design.subject}` }, by);
  if (n) await updateCampaign(n, { audience: { ...c.audience, onlyIds: ids }, track: c.track });
  return n;
}

export async function tagClickers(id: string, tagName: string): Promise<number> {
  const t = tag(tagName);
  if (!t) return 0;
  const r = await db.query(`INSERT INTO contact_tags (contact_id, tag) SELECT contact_id, $2 FROM campaign_sends WHERE campaign_id = $1 AND clicks > 0 ON CONFLICT DO NOTHING`, [id, t]);
  return r.rowCount ?? 0;
}

/* ------------------------------------------------------------- the sending */

const links = new Map<string, string>();
async function linkId(campaignId: string, url: string): Promise<string> {
  const key = `${campaignId}|${url}`;
  const hit = links.get(key);
  if (hit) return hit;
  const r = await db.query<{ id: string }>(`INSERT INTO campaign_links (id, campaign_id, url) VALUES ($1,$2,$3) ON CONFLICT (campaign_id, url) DO UPDATE SET url = excluded.url RETURNING id`, [randomBytes(6).toString("base64url"), campaignId, url]);
  links.set(key, r.rows[0].id);
  if (links.size > 500) links.clear();
  return r.rows[0].id;
}

/** Wraps each outside link so a click is counted, and adds the open pixel. Unsubscribe and mail links are left alone. */
async function track(html: string, c: Campaign, token: string): Promise<string> {
  if (c.track === "off") return html;
  const found = new Map<string, string>();
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (/\/unsubscribe|\/api\/newsletter/.test(url) || found.has(m[1])) continue;
    found.set(m[1], await linkId(c.id, url));
  }
  let out = html;
  for (const [raw, id] of found) out = out.split(`href="${raw}"`).join(`href="${SITE_URL}/c/${id}/${token}"`);
  const pixel = `<img src="${SITE_URL}/c/o/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`;
  return out.includes("</body>") ? out.replace("</body>", `${pixel}</body>`) : out + pixel;
}

type Send = { id: string; campaign_id: string; contact_id: string; email: string; token: string; claimed_at: Date };

async function deliver(s: Send, c: Campaign): Promise<void> {
  const contact = (await db.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [s.contact_id])).rows[0];
  const first = (contact?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const mail = renderDesign(c.design, { ...(await tagVars(s.contact_id)), "contact.first_name": first, "campaign.title": c.title, "studio.name": COMPANY_NAME, "studio.email": CONTACT_EMAIL }, { unsubscribe: true, why: "You are getting this because you asked to hear from us." });
  const link = unsubscribeUrl(s.email) ?? undefined;
  await sendMail({ to: s.email, subject: mail.subject, text: mail.text, html: await track(mail.html, c, s.token), unsubscribe: true, unsubscribeUrl: link });
}

export type BatchResult = { sent: number; failed: number; skipped: number; started: number };

/** One pass of the sender: starts due campaigns, recovers stuck rows, sends for up to `budgetMs`. */
export async function runBatch(budgetMs = 45_000, size = 10): Promise<BatchResult> {
  const out: BatchResult = { sent: 0, failed: 0, skipped: 0, started: 0 };
  const began = Date.now();
  try {
    const due = await db.query<{ id: string }>(`SELECT id FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= now() LIMIT 5`);
    for (const d of due.rows) { await materialise(d.id); out.started++; }
    await db.query(`UPDATE campaign_sends SET status = 'pending', claimed_at = NULL WHERE status = 'processing' AND claimed_at < now() - INTERVAL '100 seconds'`);
    const cache = new Map<string, Campaign | null>();
    while (Date.now() - began < budgetMs) {
      const claimed = await db.query<Send>(
        `UPDATE campaign_sends SET status = 'processing', claimed_at = now()
         WHERE id IN (SELECT s.id FROM campaign_sends s JOIN campaigns c ON c.id = s.campaign_id WHERE s.status = 'pending' AND c.status = 'sending' ORDER BY s.id LIMIT ${size})
         RETURNING id, campaign_id, contact_id, email, token, claimed_at`);
      if (!claimed.rows.length) break;
      for (const s of claimed.rows) {
        if (Date.now() - began > budgetMs + 20_000) break;
        if (!(await mayReceiveMarketing(s.email))) { await db.query(`UPDATE campaign_sends SET status = 'cancelled' WHERE id = $1 AND status = 'processing'`, [s.id]); out.skipped++; continue; }
        const won = await db.query(`UPDATE campaign_sends SET status = 'sent', sent_at = now() WHERE id = $1 AND status = 'processing' AND claimed_at = $2 RETURNING id`, [s.id, s.claimed_at]);
        if (!won.rows.length) continue;
        let c = cache.get(s.campaign_id);
        if (c === undefined) { c = await getCampaign(s.campaign_id); cache.set(s.campaign_id, c); }
        if (!c) continue;
        try { await deliver(s, c); out.sent++; }
        catch (e) { out.failed++; await db.query(`UPDATE campaign_sends SET status = 'failed', error = $2 WHERE id = $1`, [s.id, (e instanceof Error ? e.message : "failed").slice(0, 300)]); }
      }
    }
    await db.query(`UPDATE campaigns SET status = 'sent', finished_at = now() WHERE status = 'sending' AND NOT EXISTS (SELECT 1 FROM campaign_sends s WHERE s.campaign_id = campaigns.id AND s.status IN ('pending','processing'))`);
  } catch { /* tables arrive with migration 0046; the next tick tries again */ }
  return out;
}

/* ---------------------------------------------------------------- tracking */

export async function recordClick(linkIdValue: string, token: string): Promise<string | null> {
  try {
    const s = await db.query<{ campaign_id: string; contact_id: string; email: string }>(`SELECT campaign_id, contact_id, email FROM campaign_sends WHERE token = $1`, [token.slice(0, 60)]);
    const send = s.rows[0];
    if (!send) return null;
    const l = await db.query<{ url: string }>(`SELECT url FROM campaign_links WHERE id = $1 AND campaign_id = $2`, [linkIdValue.slice(0, 40), send.campaign_id]);
    if (!l.rows[0]) return null;
    const c = await db.query<{ track: Track }>(`SELECT track FROM campaigns WHERE id = $1`, [send.campaign_id]);
    await db.query(`UPDATE campaign_links SET clicks = clicks + 1 WHERE id = $1`, [linkIdValue]);
    if (c.rows[0]?.track === "anonymous") await db.query(`UPDATE campaigns SET anon_clicks = anon_clicks + 1 WHERE id = $1`, [send.campaign_id]);
    else {
      /* A click counts as an open too: mail apps that preload images make the pixel unreliable. */
      await db.query(`UPDATE campaign_sends SET clicks = clicks + 1, opened_at = COALESCE(opened_at, now()) WHERE token = $1`, [token]);
      await db.query(`INSERT INTO contact_events (id, contact_id, kind, title, detail) VALUES ($1,$2,'campaign','Clicked a link in a campaign',$3)`, [randomUUID(), send.contact_id, l.rows[0].url.slice(0, 300)]).catch(() => {});
    }
    return l.rows[0].url;
  } catch { return null; }
}

export async function recordOpen(token: string): Promise<void> {
  try {
    const s = await db.query<{ campaign_id: string }>(`SELECT campaign_id FROM campaign_sends WHERE token = $1`, [token.slice(0, 60)]);
    if (!s.rows[0]) return;
    const c = await db.query<{ track: Track }>(`SELECT track FROM campaigns WHERE id = $1`, [s.rows[0].campaign_id]);
    if (c.rows[0]?.track === "anonymous") await db.query(`UPDATE campaigns SET anon_opens = anon_opens + 1 WHERE id = $1`, [s.rows[0].campaign_id]);
    else if (c.rows[0]?.track === "full") await db.query(`UPDATE campaign_sends SET opened_at = COALESCE(opened_at, now()) WHERE token = $1`, [token]);
  } catch { /* a pixel never fails a page */ }
}

export type Report = { sent: number; failed: number; pending: number; cancelled: number; opened: number; clickers: number; clicks: number; unsubscribed: number; bounced: number; links: { url: string; clicks: number }[] };
export async function reportFor(c: Campaign): Promise<Report> {
  const blank: Report = { sent: 0, failed: 0, pending: 0, cancelled: 0, opened: 0, clickers: 0, clicks: 0, unsubscribed: 0, bounced: 0, links: [] };
  try {
    const r = await db.query<{ sent: string; failed: string; pending: string; cancelled: string; opened: string; clickers: string; clicks: string; unsub: string; bounced: string }>(
      `SELECT count(*) FILTER (WHERE status = 'sent') AS sent, count(*) FILTER (WHERE status = 'failed') AS failed,
              count(*) FILTER (WHERE status IN ('pending','processing')) AS pending, count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
              count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened, count(*) FILTER (WHERE clicks > 0) AS clickers, COALESCE(sum(clicks), 0) AS clicks,
              count(*) FILTER (WHERE email IN (SELECT email FROM suppression WHERE reason = 'unsubscribed' AND at > (SELECT COALESCE(started_at, now()) FROM campaigns WHERE id = $1))) AS unsub,
              count(*) FILTER (WHERE status = 'sent' AND email IN (SELECT email FROM suppression WHERE reason = 'bounced' AND at > (SELECT COALESCE(started_at, now()) FROM campaigns WHERE id = $1))) AS bounced
       FROM campaign_sends WHERE campaign_id = $1`, [c.id]);
    const x = r.rows[0];
    const l = await db.query<{ url: string; clicks: number }>(`SELECT url, clicks FROM campaign_links WHERE campaign_id = $1 AND clicks > 0 ORDER BY clicks DESC LIMIT 20`, [c.id]);
    const sent = Number(x.sent);
    return { sent, failed: Number(x.failed), pending: Number(x.pending), cancelled: Number(x.cancelled), opened: Math.min(Number(x.opened) + c.anonOpens, sent || Number(x.opened)), clickers: Number(x.clickers), clicks: Number(x.clicks) + c.anonClicks, unsubscribed: Number(x.unsub), bounced: Number(x.bounced), links: l.rows };
  } catch { return blank; }
}

export type Rates = { sent: number; opened: number; clickers: number; bounced: number };
/**
 * Sent, opened, clicked and bounced for many campaigns in ONE query, for the list (reportFor is one campaign and two queries).
 * Opens add the anonymous count the same way reportFor does. "Bounced" is a recipient the mail provider later reported as bounced (the suppression list), never a guess.
 * Null when the tables are not there; a campaign with no sends is simply absent.
 */
export async function ratesFor(campaigns: Campaign[]): Promise<Map<string, Rates> | null> {
  if (!campaigns.length) return new Map();
  try {
    const r = await db.query<{ campaign_id: string; sent: string; opened: string; clickers: string; bounced: string }>(
      `SELECT s.campaign_id, count(*) FILTER (WHERE s.status = 'sent') AS sent, count(*) FILTER (WHERE s.opened_at IS NOT NULL) AS opened,
              count(*) FILTER (WHERE s.clicks > 0) AS clickers,
              count(*) FILTER (WHERE s.status = 'sent' AND EXISTS (SELECT 1 FROM suppression x WHERE x.email = s.email AND x.reason = 'bounced' AND x.at > COALESCE(c.started_at, c.created_at))) AS bounced
       FROM campaign_sends s JOIN campaigns c ON c.id = s.campaign_id
       WHERE s.campaign_id = ANY($1::TEXT[]) GROUP BY s.campaign_id, c.started_at, c.created_at`, [campaigns.map((c) => c.id)]);
    const out = new Map<string, Rates>();
    for (const x of r.rows) {
      const c = campaigns.find((k) => k.id === x.campaign_id);
      const sent = Number(x.sent);
      out.set(x.campaign_id, { sent, opened: Math.min(Number(x.opened) + (c?.anonOpens ?? 0), sent || Number(x.opened)), clickers: Number(x.clickers), bounced: Number(x.bounced) });
    }
    return out;
  } catch { return null; }
}
