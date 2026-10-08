import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { sendLogged } from "@/lib/outbox";
import { renderDesign, validDesign, type Design } from "@/lib/email-design";
import { unsubscribeUrl } from "@/lib/newsletter";
import { addEvent, mayReceiveMarketing , tagVars } from "@/lib/contacts";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";

/**
 * AUTOMATIONS: follow-ups that run themselves, kept deliberately small.
 *
 * A TRIGGER finds people (a tag added after the automation was switched on, or
 * a new contact of a type); each person enters ONCE (unique key). STEPS run in
 * order: wait, email, tag, stop if tagged, note, webhook. The clock is checked
 * every tick (lib/campaigns.ts' sender calls this), so a wait of two days
 * means the first tick after two days.
 *
 * TWO KINDS, and the difference matters: "marketing" goes only to people who
 * asked to hear from us; "service" is follow-up to people who contacted the
 * studio or are clients, about what they asked for. Both skip anyone on the
 * suppression list, and every email carries an unsubscribe link.
 */
export type Step =
  | { id: string; type: "wait"; days: number; hours: number; weekdays: number[]; hour: number | null }
  | { id: string; type: "email"; subject: string; design: Design }
  | { id: string; type: "tag"; tag: string; remove: boolean }
  | { id: string; type: "stop_if_tag"; tag: string }
  | { id: string; type: "note"; text: string }
  | { id: string; type: "webhook"; url: string };

export type Automation = { id: string; name: string; kind: "marketing" | "service"; triggerKind: "tag_added" | "new_contact"; triggerValue: string; steps: Step[]; enabled: boolean; enabledAt: string | null; createdAt: string };
type Row = { id: string; name: string; kind: "marketing" | "service"; trigger_kind: "tag_added" | "new_contact"; trigger_value: string; steps: Step[]; enabled: boolean; enabled_at: Date | null; created_at: Date };
const shape = (r: Row): Automation => ({ id: r.id, name: r.name, kind: r.kind, triggerKind: r.trigger_kind, triggerValue: r.trigger_value, steps: Array.isArray(r.steps) ? r.steps : [], enabled: r.enabled, enabledAt: r.enabled_at?.toISOString() ?? null, createdAt: r.created_at.toISOString() });

export async function listAutomations(): Promise<Automation[] | null> {
  try { return (await db.query<Row>(`SELECT * FROM automations ORDER BY created_at DESC`)).rows.map(shape); } catch { return null; }
}
export async function getAutomation(id: string): Promise<Automation | null> {
  try { const r = await db.query<Row>(`SELECT * FROM automations WHERE id = $1`, [id]); return r.rows[0] ? shape(r.rows[0]) : null; } catch { return null; }
}

export async function createAutomation(name: string, kind: string, triggerKind: string, triggerValue: string, by: string): Promise<string | null> {
  if (!["tag_added", "new_contact"].includes(triggerKind)) return null;
  const id = randomUUID();
  try {
    await db.query(`INSERT INTO automations (id, name, kind, trigger_kind, trigger_value, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, name.slice(0, 100), kind === "service" ? "service" : "marketing", triggerKind, triggerValue.trim().toLowerCase().slice(0, 40), by]);
    return id;
  } catch { return null; }
}

export const SAFE_HOOK = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname) && !/^[\d.]+$/.test(u.hostname) && !u.hostname.includes(":") && !u.username && !u.password;
  } catch { return false; }
};

export function validSteps(steps: unknown): steps is Step[] {
  if (!Array.isArray(steps) || steps.length > 30) return false;
  return steps.every((s: Step) => s && typeof s.id === "string" && (
    (s.type === "wait" && s.days >= 0 && s.days <= 365 && s.hours >= 0 && s.hours <= 23) ||
    (s.type === "email" && typeof s.subject === "string" && validDesign(s.design)) ||
    (s.type === "tag" && typeof s.tag === "string") || (s.type === "stop_if_tag" && typeof s.tag === "string") ||
    (s.type === "note" && typeof s.text === "string") || (s.type === "webhook" && typeof s.url === "string" && SAFE_HOOK(s.url))));
}

export async function saveSteps(id: string, steps: Step[]): Promise<boolean> {
  if (!validSteps(steps)) return false;
  try { const r = await db.query(`UPDATE automations SET steps = $2::JSONB WHERE id = $1`, [id, JSON.stringify(steps)]); return (r.rowCount ?? 0) > 0; } catch { return false; }
}
export async function setAutomationOn(id: string, on: boolean): Promise<boolean> {
  try { const r = await db.query(`UPDATE automations SET enabled = $2, enabled_at = CASE WHEN $2 AND enabled_at IS NULL THEN now() WHEN $2 THEN enabled_at ELSE enabled_at END WHERE id = $1`, [id, on]); return (r.rowCount ?? 0) > 0; } catch { return false; }
}
export async function deleteAutomation(id: string) { await db.query(`DELETE FROM automations WHERE id = $1`, [id]).catch(() => {}); }

export async function statsFor(id: string): Promise<{ active: number; completed: number; stopped: number }> {
  try {
    const r = await db.query<{ status: string; n: string }>(`SELECT status, count(*) AS n FROM automation_runs WHERE automation_id = $1 GROUP BY status`, [id]);
    const n = (s: string) => Number(r.rows.find((x) => x.status === s)?.n ?? 0);
    return { active: n("active"), completed: n("completed"), stopped: n("cancelled") };
  } catch { return { active: 0, completed: 0, stopped: 0 }; }
}

/* ------------------------------------------------------------ the running */

/** When a wait ends: after days and hours, then, if weekdays are set, the next allowed day (Lagos) at the chosen hour. */
export function waitEnds(from: Date, w: { days: number; hours: number; weekdays: number[]; hour: number | null }): Date {
  let t = new Date(from.getTime() + (w.days * 24 + w.hours) * 3_600_000);
  if (w.weekdays.length || w.hour !== null) {
    for (let i = 0; i < 8; i++) {
      const lagos = new Date(t.getTime() + 3_600_000); // Lagos is UTC+1, no daylight saving
      const day = lagos.getUTCDay();
      if (!w.weekdays.length || w.weekdays.includes(day)) {
        if (w.hour === null) break;
        const at = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), w.hour - 1, 0, 0));
        if (at.getTime() >= t.getTime() - 1000) { t = at; break; }
      }
      t = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + 1, w.hour === null ? 0 : w.hour - 1, 0, 0));
    }
  }
  return t;
}

async function enrol(a: Automation): Promise<number> {
  if (!a.enabled || !a.enabledAt) return 0;
  const since = a.enabledAt;
  const q = a.triggerKind === "tag_added"
    ? { sql: `SELECT c.id, c.email FROM contacts c JOIN contact_tags t ON t.contact_id = c.id WHERE t.tag = $1 AND t.added_at >= $2`, args: [a.triggerValue, since] }
    : { sql: `SELECT c.id, c.email FROM contacts c WHERE ($1 = '' OR c.type = $1) AND c.created_at >= $2`, args: [a.triggerValue, since] };
  const people = (await db.query<{ id: string; email: string }>(`${q.sql} LIMIT 500`, q.args)).rows;
  let n = 0;
  for (const p of people) {
    const r = await db.query(`INSERT INTO automation_runs (id, automation_id, contact_id, email) VALUES ($1,$2,$3,$4) ON CONFLICT (automation_id, contact_id) DO NOTHING`, [randomUUID(), a.id, p.id, p.email]);
    n += r.rowCount ?? 0;
  }
  return n;
}

async function allowed(a: Automation, email: string, contactId: string): Promise<boolean> {
  if (a.kind === "marketing") return mayReceiveMarketing(email);
  const sup = await db.query(`SELECT 1 FROM suppression WHERE email = $1`, [email]);
  if (sup.rowCount) return false;
  const c = await db.query(`SELECT 1 FROM contacts WHERE id = $1 AND status = 'subscribed' AND type IN ('client','lead') OR (id = $1 AND status = 'subscribed' AND marketing)`, [contactId]);
  return Boolean(c.rowCount);
}

type Run = { id: string; automation_id: string; contact_id: string; email: string; step: number };

async function execute(a: Automation, run: Run): Promise<void> {
  let i = run.step;
  const contact = (await db.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [run.contact_id])).rows[0];
  for (let guard = 0; guard < 40 && i < a.steps.length; guard++) {
    const s = a.steps[i];
    if (s.type === "wait") {
      await db.query(`UPDATE automation_runs SET step = $2, next_at = $3 WHERE id = $1`, [run.id, i + 1, waitEnds(new Date(), s)]);
      return;
    }
    if (s.type === "tag") {
      const t = s.tag.trim().toLowerCase().slice(0, 40);
      if (t) await (s.remove ? db.query(`DELETE FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [run.contact_id, t]) : db.query(`INSERT INTO contact_tags (contact_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [run.contact_id, t]));
    } else if (s.type === "stop_if_tag") {
      const has = await db.query(`SELECT 1 FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [run.contact_id, s.tag.trim().toLowerCase()]);
      if (has.rowCount) { await db.query(`UPDATE automation_runs SET status = 'cancelled', note = $2, finished_at = now() WHERE id = $1`, [run.id, `stopped: tagged ${s.tag}`]); return; }
    } else if (s.type === "note") {
      await addEvent(run.contact_id, "automation", a.name, s.text, "Automation");
    } else if (s.type === "webhook") {
      if (SAFE_HOOK(s.url)) await fetch(s.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ automation: a.name, email: run.email, name: contact?.name ?? "" }), signal: AbortSignal.timeout(8000), redirect: "manual" }).catch(() => {});
    } else if (s.type === "email") {
      if (!(await allowed(a, run.email, run.contact_id))) {
        await db.query(`UPDATE automation_runs SET status = 'cancelled', note = 'stopped: not allowed to email them', finished_at = now() WHERE id = $1`, [run.id]);
        return;
      }
      const first = (contact?.name ?? "").trim().split(/\s+/)[0] ?? "";
      const mail = renderDesign(s.design, { ...(await tagVars(run.contact_id)), "contact.first_name": first, "studio.name": COMPANY_NAME, "studio.email": CONTACT_EMAIL }, { unsubscribe: true, why: a.kind === "marketing" ? "You are getting this because you asked to hear from us." : "You are getting this because of your enquiry or project with us." });
      await sendLogged({ to: run.email, subject: s.subject ? renderDesign({ ...s.design, subject: s.subject }, {}, {}).subject : mail.subject, text: mail.text, html: mail.html, unsubscribe: true, unsubscribeUrl: unsubscribeUrl(run.email) ?? undefined },
        { summary: `Automation "${a.name}", step ${i + 1}.`, dedupeKey: `auto:${run.id}:${s.id}`, by: "Automation" });
      await addEvent(run.contact_id, "automation", `Email sent: ${mail.subject}`, a.name, "Automation");
    }
    i++;
    await db.query(`UPDATE automation_runs SET step = $2 WHERE id = $1`, [run.id, i]);
  }
  await db.query(`UPDATE automation_runs SET status = 'completed', finished_at = now() WHERE id = $1 AND status = 'active'`, [run.id]);
}

/** One pass: enrol new people, then run whoever is due. Failures leave a run for the next tick; a send is never repeated (its key is unique). */
export async function runAutomations(limit = 40): Promise<{ enrolled: number; ran: number }> {
  const out = { enrolled: 0, ran: 0 };
  try {
    const all = ((await listAutomations()) ?? []).filter((a) => a.enabled);
    const byId = new Map(all.map((a) => [a.id, a]));
    for (const a of all) out.enrolled += await enrol(a);
    if (!all.length) return out;
    const due = await db.query<Run>(`SELECT id, automation_id, contact_id, email, step FROM automation_runs WHERE status = 'active' AND next_at <= now() AND automation_id = ANY($1::TEXT[]) ORDER BY next_at LIMIT ${limit}`, [all.map((a) => a.id)]);
    for (const r of due.rows) {
      const a = byId.get(r.automation_id);
      if (!a) continue;
      try { await execute(a, r); out.ran++; } catch { /* the run stays active and is tried again next tick */ }
    }
  } catch { /* tables arrive with migration 0047 */ }
  return out;
}
