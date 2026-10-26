import "server-only";
import { db } from "@/lib/db/pool";
import { SITE_URL } from "@/lib/site";
import { sendLogged } from "@/lib/outbox";
import { workspaceNotificationEmail } from "@/lib/email-templates";
import { effectiveWorkspacePreferences } from "@/lib/workspace/notifications-preferences";

/**
 * ONE MORNING EMAIL PER STAFF MEMBER (owner, 2026-10-25: "staff are told in
 * the app plus one daily email"): their tasks overdue or due by tomorrow, the
 * handovers waiting on them and how many notices they have not read. Nothing
 * waiting, no email. It is the person's "reminders" setting that switches it
 * off, so the choice lives with them, not with this job.
 *
 * SAFE TO RUN TWICE: the message row's key is the person and the day, so a
 * second run that day finds the row and sends nothing.
 */
export async function sendStaffDays(day: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const out = { sent: 0, skipped: 0, failed: 0 };
  const people = await db.query<{ id: string; name: string; email: string; modes: unknown; digest_days: number }>(
    `SELECT u.id,u.name,u.email,p.modes,p.digest_days FROM "user" u LEFT JOIN workspace_notification_preferences p ON p.user_id=u.id
      WHERE u.role='staff' AND u."deactivatedAt" IS NULL LIMIT 200`).catch(() => ({ rows: [] }));
  const until = `${day}T23:59:59+01:00`;
  for (const person of people.rows) {
    if (effectiveWorkspacePreferences(person.email, person.modes, person.digest_days).modes.reminders === "off") { out.skipped++; continue; }
    const [tasks, handovers, unread] = await Promise.all([
      db.query<{ id: string; project_id: string; title: string; due_at: Date | null }>(
        `SELECT id,project_id,title,due_at FROM workspace_team_tasks WHERE assignee_id=$1 AND completed_at IS NULL AND due_at IS NOT NULL AND due_at <= $2::TIMESTAMPTZ + INTERVAL '1 day' ORDER BY due_at LIMIT 8`, [person.id, until]).catch(() => ({ rows: [] })),
      db.query<{ id: string; project_id: string; title: string }>(
        `SELECT id,project_id,title FROM workspace_handovers WHERE to_user_id=$1 AND accepted_at IS NULL ORDER BY created_at LIMIT 5`, [person.id]).catch(() => ({ rows: [] })),
      db.query<{ n: string | number }>(`SELECT count(*) AS n FROM workspace_notifications WHERE user_id=$1 AND read_at IS NULL`, [person.id]).then((r) => Number(r.rows[0]?.n ?? 0), () => 0),
    ]);
    if (!tasks.rows.length && !handovers.rows.length && !unread) { out.skipped++; continue; }
    const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);
    const items = [
      ...handovers.rows.map((h) => ({ title: `Handover to accept: ${h.title}`, summary: "Read the context and accept it so the work can start.", url: `${SITE_URL}/admin/projects/${h.project_id}?tab=activity#handover-${h.id}` })),
      ...tasks.rows.map((t) => ({ title: t.title, summary: t.due_at && new Date(t.due_at).toISOString().slice(0, 10) < day ? `Overdue since ${when(new Date(t.due_at))}` : `Due ${when(new Date(t.due_at!))}`, url: `${SITE_URL}/admin/projects/${t.project_id}?tab=activity#task-${t.id}` })),
      ...(unread ? [{ title: `${unread} unread ${unread === 1 ? "notice" : "notices"}`, summary: "Updates on your projects that you have not opened yet.", url: `${SITE_URL}/admin/notifications` }] : []),
    ];
    const first = person.name.trim().split(/\s+/)[0] || "there";
    const mail = workspaceNotificationEmail({ title: `Your day, ${first}`, summary: `${items.length} ${items.length === 1 ? "thing needs" : "things need"} you today.`, url: `${SITE_URL}/admin`, audience: "staff", items });
    try {
      const r = await sendLogged({ to: person.email, subject: mail.subject, text: mail.text, html: mail.html }, { summary: `Your day: ${items.length} items`, dedupeKey: `staff-day:${person.id}:${day}`, by: "Daily schedule" });
      if (r === "sent") out.sent++; else out.skipped++;
    } catch { out.failed++; }
  }
  return out;
}
