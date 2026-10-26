import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db/pool";
import { getClient, getProject } from "@/lib/admin/store";
import { syncStore } from "@/lib/admin/persist";
import { projectRecipients } from "@/lib/workspace/access";
import { emitWorkspaceEvent } from "@/lib/workspace/events";

/** A stable event id per project and day, so a second run the same day adds nothing (emit is ON CONFLICT DO NOTHING). */
const identity = (key: string) => { const h = createHash("sha256").update("approval:" + key).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };

export type Waiting = { projectId: string; items: { id: string; title: string }[]; days: number };

/** Work shared with a client and still waiting on their decision, by project, with how long the oldest has waited. */
export async function waitingOnClients(): Promise<Waiting[]> {
  const r = await db.query<{ id: string; project_id: string; title: string; since: Date }>(
    `SELECT i.id,i.project_id,i.title,v.created_at AS since FROM workspace_service_items i
       JOIN workspace_service_versions v ON v.item_id=i.id AND v.version=i.version
      WHERE i.state='client_review' AND i.visibility='shared' ORDER BY v.created_at LIMIT 500`).catch(() => ({ rows: [] }));
  const by = new Map<string, Waiting>();
  for (const x of r.rows) {
    const days = Math.floor((Date.now() - new Date(x.since).getTime()) / 86_400_000);
    const w = by.get(x.project_id) ?? { projectId: x.project_id, items: [], days: 0 };
    w.items.push({ id: x.id, title: x.title });
    w.days = Math.max(w.days, days);
    by.set(x.project_id, w);
  }
  return [...by.values()];
}

/**
 * A CLIENT WHO HAS NOT DECIDED (owner, 2026-10-25): a reminder on the second
 * and the fourth day the work waits, then nothing more by email; from the
 * fifth day it is a card on Today for Admin. Nothing is ever approved on
 * their behalf. Their "reminders" setting switches these emails off.
 */
export async function sendApprovalReminders(day: string): Promise<{ reminded: number }> {
  await syncStore();
  let reminded = 0;
  for (const w of await waitingOnClients()) {
    if (w.days !== 2 && w.days !== 4) continue;
    const project = getProject(w.projectId), client = project ? getClient(project.clientId) : null;
    if (!project || !client || project.archived || client.archived) continue;
    const recipients = (await projectRecipients(w.projectId, "client", "review")).map((p) => ({ userId: p.userId }));
    if (!recipients.length) continue;
    const id = identity(`${w.projectId}:${day}`);
    if ((await db.query("SELECT 1 FROM workspace_events WHERE id=$1", [id]).catch(() => ({ rowCount: 1 }))).rowCount) continue;
    const n = w.items.length;
    await emitWorkspaceEvent({ id, projectId: w.projectId, clientId: client.id, kind: "review.reminder", category: "reminders", actorId: "approvals", actorName: "WDC",
      title: `${n} ${n === 1 ? "item is" : "items are"} still waiting for your approval`,
      summary: `${w.items.slice(0, 8).map((x) => `• ${x.title}`).join("\n")}\nThe work for ${project.title} moves again once you approve, or ask for changes with a note.`,
      href: `/admin/projects/${w.projectId}?tab=approvals`, visibility: "client", recipients, staleKey: `late:${w.projectId}` });
    reminded++;
  }
  /* Recorded only: the five-minute mail heartbeat sends them, so this run never waits on the mail server. */
  return { reminded };
}
