import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { sendLogged } from "@/lib/outbox";
import { renderDesign } from "@/lib/email-design";
import { unsubscribeUrl } from "@/lib/newsletter";
import { addEvent, mayReceiveMarketing , tagVars } from "@/lib/contacts";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";
import {
  after, checkSteps, hasBranches, encodePath, normTag, resolve, SAFE_HOOK, simulate, startPath, topIndex, validSteps, waitEnds,
  type Path, type Step,
} from "@/lib/automations-flow";

/* The pure half (steps, paths, the rules a flow must keep, the dry run) lives in lib/automations-flow.ts, which the canvas in the browser shares. */
export { SAFE_HOOK, validSteps, waitEnds };
export type { Step };

/**
 * AUTOMATIONS: follow-ups that run themselves, kept deliberately small.
 *
 * A TRIGGER finds people (a tag added after the automation was switched on, or
 * a new contact of a type); each person enters ONCE (unique key). STEPS run in
 * order: wait, email, tag, stop if tagged, note, webhook, stop, and a Yes/No
 * check of a tag that sends the person down one of two paths. Where a person
 * is stored as a PATH (lib/automations-flow.ts). The clock is checked
 * every tick (lib/campaigns.ts' sender calls this), so a wait of two days
 * means the first tick after two days.
 *
 * TWO KINDS, and the difference matters: "marketing" goes only to people who
 * asked to hear from us; "service" is follow-up to people who contacted the
 * studio or are clients, about what they asked for. Both skip anyone on the
 * suppression list, and every email carries an unsubscribe link.
 */
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

export type FlowInput = { name: string; kind: "marketing" | "service"; triggerKind: "tag_added" | "new_contact"; triggerValue: string; steps: Step[] };
/** Saves the whole flow: its name, who it is for, what starts it and the steps. The caller picks how strict to be (see checkSteps). */
export async function saveFlow(id: string, f: FlowInput, mode: "draft" | "publish"): Promise<boolean> {
  if (checkSteps(f.steps, mode) !== null) return false;
  try {
    const r = await db.query(`UPDATE automations SET name = $2, kind = $3, trigger_kind = $4, trigger_value = $5, steps = $6::JSONB WHERE id = $1`,
      [id, f.name.slice(0, 100), f.kind, f.triggerKind, f.triggerKind === "tag_added" ? normTag(f.triggerValue) : "", JSON.stringify(f.steps)]);
    return (r.rowCount ?? 0) > 0;
  } catch { return false; }
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

/**
 * What the Results view shows, all of it counted and none of it guessed.
 * `reached` is how many times each step has run (null until migration 0048 is applied, so the view says so instead of showing zeros);
 * `upNext` is how many people are on the way to each step right now.
 */
export async function stepResults(id: string, steps: Step[]): Promise<{ reached: Record<string, number> | null; upNext: Record<string, number> }> {
  let reached: Record<string, number> | null = null;
  try {
    const r = await db.query<{ step_id: string; n: number }>(`SELECT step_id, n FROM automation_step_hits WHERE automation_id = $1`, [id]);
    reached = Object.fromEntries(r.rows.map((x) => [x.step_id, Number(x.n)]));
  } catch { /* migration 0048 */ }
  const upNext: Record<string, number> = {};
  try {
    const r = await db.query<{ step: number; path?: string | null }>(`SELECT * FROM automation_runs WHERE automation_id = $1 AND status = 'active'`, [id]);
    for (const row of r.rows) { const p = startPath(steps, row); if (p) upNext[p[p.length - 1]] = (upNext[p[p.length - 1]] ?? 0) + 1; }
  } catch { /* tables arrive with migration 0047 */ }
  return { reached, upNext };
}

/** The newest people, for the "Test as" list. A hundred is a pick-list; the list is searchable. */
export async function testContacts(): Promise<{ id: string; label: string }[]> {
  try {
    const r = await db.query<{ id: string; name: string; email: string }>(`SELECT id, name, email FROM contacts ORDER BY created_at DESC LIMIT 100`);
    return r.rows.map((c) => ({ id: c.id, label: c.name ? `${c.name} (${c.email})` : c.email }));
  } catch { return []; }
}

/**
 * A DRY RUN as one real contact: their tags and whether they may be emailed are read, and the flow is walked with the same path logic the engine uses.
 * Nothing is sent, tagged, noted or called.
 */
export async function testRun(a: { kind: "marketing" | "service"; steps: Step[] }, contactId: string) {
  try {
    const c = (await db.query<{ id: string; name: string; email: string }>(`SELECT id, name, email FROM contacts WHERE id = $1`, [contactId])).rows[0];
    if (!c) return null;
    const tags = (await db.query<{ tag: string }>(`SELECT tag FROM contact_tags WHERE contact_id = $1`, [c.id])).rows.map((r) => r.tag);
    const canEmail = await allowed(a.kind, c.email, c.id);
    return { who: { name: c.name || c.email, tags, canEmail }, ...simulate(a.steps, { tags, canEmail }) };
  } catch { return null; }
}

/* ------------------------------------------------------------ the running */

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

async function allowed(kind: Automation["kind"], email: string, contactId: string): Promise<boolean> {
  if (kind === "marketing") return mayReceiveMarketing(email);
  const sup = await db.query(`SELECT 1 FROM suppression WHERE email = $1`, [email]);
  if (sup.rowCount) return false;
  const c = await db.query(`SELECT 1 FROM contacts WHERE id = $1 AND status = 'subscribed' AND type IN ('client','lead') OR (id = $1 AND status = 'subscribed' AND marketing)`, [contactId]);
  return Boolean(c.rowCount);
}

type Run = { id: string; automation_id: string; contact_id: string; email: string; step: number; path?: string | null };

async function bump(automationId: string, stepId: string) {
  await db.query(`INSERT INTO automation_step_hits (automation_id, step_id, n) VALUES ($1,$2,1) ON CONFLICT (automation_id, step_id) DO UPDATE SET n = automation_step_hits.n + 1`, [automationId, stepId]).catch(() => { /* counts begin with migration 0048 */ });
}

async function execute(a: Automation, run: Run): Promise<void> {
  const contact = (await db.query<{ name: string }>(`SELECT name FROM contacts WHERE id = $1`, [run.contact_id])).rows[0];
  /* A flow with no Yes/No step writes only the old `step` column, so it keeps working before migration 0048 is applied. */
  const branched = hasBranches(a.steps);
  const moveTo = async (next: Path | null, at?: Date) => {
    const args: unknown[] = [run.id, topIndex(a.steps, next)];
    const sets = ["step = $2"];
    if (branched) { args.push(next ? encodePath(next) : ""); sets.push(`path = $${args.length}`); }
    if (at) { args.push(at); sets.push(`next_at = $${args.length}`); }
    await db.query(`UPDATE automation_runs SET ${sets.join(", ")} WHERE id = $1`, args);
  };
  let path = startPath(a.steps, run);
  for (let guard = 0; path && guard < 60; guard++) {
    const here = resolve(a.steps, path);
    if (!here) break;
    const s = here.step;
    let tagged = false;
    if (s.type === "wait") {
      await bump(a.id, s.id);
      await moveTo(after(a.steps, path), waitEnds(new Date(), s));
      return;
    }
    if (s.type === "tag") {
      const t = normTag(s.tag);
      if (t) await (s.remove ? db.query(`DELETE FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [run.contact_id, t]) : db.query(`INSERT INTO contact_tags (contact_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [run.contact_id, t]));
    } else if (s.type === "stop_if_tag") {
      const has = await db.query(`SELECT 1 FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [run.contact_id, normTag(s.tag)]);
      if (has.rowCount) { await bump(a.id, s.id); await db.query(`UPDATE automation_runs SET status = 'cancelled', note = $2, finished_at = now() WHERE id = $1`, [run.id, `stopped: tagged ${s.tag}`]); return; }
    } else if (s.type === "if") {
      tagged = Boolean((await db.query(`SELECT 1 FROM contact_tags WHERE contact_id = $1 AND tag = $2`, [run.contact_id, normTag(s.tag)])).rowCount);
    } else if (s.type === "note") {
      await addEvent(run.contact_id, "automation", a.name, s.text, "Automation");
    } else if (s.type === "webhook") {
      if (SAFE_HOOK(s.url)) await fetch(s.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ automation: a.name, email: run.email, name: contact?.name ?? "" }), signal: AbortSignal.timeout(8000), redirect: "manual" }).catch(() => {});
    } else if (s.type === "email") {
      if (!(await allowed(a.kind, run.email, run.contact_id))) {
        await db.query(`UPDATE automation_runs SET status = 'cancelled', note = 'stopped: not allowed to email them', finished_at = now() WHERE id = $1`, [run.id]);
        return;
      }
      const first = (contact?.name ?? "").trim().split(/\s+/)[0] ?? "";
      const mail = renderDesign(s.design, { ...(await tagVars(run.contact_id)), "contact.first_name": first, "studio.name": COMPANY_NAME, "studio.email": CONTACT_EMAIL }, { unsubscribe: true, why: a.kind === "marketing" ? "You are getting this because you asked to hear from us." : "You are getting this because of your enquiry or project with us." });
      /* The key is per person AND per step, so a retry after a crash cannot send twice and two steps never share one. */
      await sendLogged({ to: run.email, subject: s.subject ? renderDesign({ ...s.design, subject: s.subject }, {}, {}).subject : mail.subject, text: mail.text, html: mail.html, unsubscribe: true, unsubscribeUrl: unsubscribeUrl(run.email) ?? undefined },
        { summary: `Automation "${a.name}", ${s.name?.trim() || `step ${here.index + 1}`}.`, dedupeKey: `auto:${run.id}:${s.id}`, by: "Automation" });
      await addEvent(run.contact_id, "automation", `Email sent: ${mail.subject}`, a.name, "Automation");
    }
    await bump(a.id, s.id);
    path = after(a.steps, path, tagged);
    await moveTo(path);
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
    /* SELECT * so a row carries `path` once migration 0048 is applied and works without it before. */
    const due = await db.query<Run>(`SELECT * FROM automation_runs WHERE status = 'active' AND next_at <= now() AND automation_id = ANY($1::TEXT[]) ORDER BY next_at LIMIT ${limit}`, [all.map((a) => a.id)]);
    for (const r of due.rows) {
      const a = byId.get(r.automation_id);
      if (!a) continue;
      try { await execute(a, r); out.ran++; } catch { /* the run stays active and is tried again next tick */ }
    }
  } catch { /* tables arrive with migration 0047 */ }
  return out;
}
