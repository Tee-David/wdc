import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { requireProjectActor, requireWorkspaceUser, type WorkspaceUser } from "@/lib/workspace/access";
import { outOfScope } from "@/lib/admin/staff-scope";

/**
 * REACTIONS, TAGS AND SCHEDULED MESSAGES (migration 0062). Studio-side only: the
 * client portal never reads these tables. Every reader answers "nothing yet"
 * before the migration is applied rather than failing the page.
 */
export const REACTS = ["like", "done", "love", "eyes", "party"] as const;
export type React = (typeof REACTS)[number];
export const TAGS = ["Decision", "Action needed", "Approved", "Question", "Money", "Feedback"] as const;
export type Marks = { reacts: { k: React; n: number; mine: boolean; names: string[] }[]; tags: string[] };

const KEY = /^[tpd]-[A-Za-z0-9_-]{1,100}$/;

/** A studio person who may see this conversation: the same rules as Messages itself. */
export async function studioFor(key: string): Promise<WorkspaceUser> {
  if (!KEY.test(key)) throw new Error("That conversation could not be found.");
  const me = await requireWorkspaceUser(true);
  if (me.kind !== "staff") throw new Error("Only the studio can do that here.");
  const id = key.slice(2);
  if (key.startsWith("p-")) await requireProjectActor(id, "read");
  else if (key.startsWith("t-")) { if (await outOfScope({ ticket: id })) throw new Error("This is not one of your clients."); }
  else if (!(await db.query("SELECT 1 FROM team_thread_members WHERE thread_id=$1 AND user_id=$2", [id, me.userId])).rowCount) throw new Error("You are not in this chat.");
  return me;
}

/** Every mark on the given messages of one conversation, shaped for the bubbles. */
export async function marksFor(key: string, messageIds: string[], me: string): Promise<Map<string, Marks>> {
  const out = new Map<string, Marks>();
  if (!messageIds.length) return out;
  try {
    const r = await db.query<{ message_id: string; user_id: string; kind: string; value: string; name: string | null }>(
      `SELECT m.message_id,m.user_id,m.kind,m.value,u."name" FROM message_marks m LEFT JOIN "user" u ON u."id"=m.user_id
        WHERE m.thread_key=$1 AND m.message_id=ANY($2::STRING[]) ORDER BY m.created_at`, [key, messageIds]);
    for (const x of r.rows) {
      const m = out.get(x.message_id) ?? { reacts: [], tags: [] };
      if (x.kind === "tag") { if (!m.tags.includes(x.value)) m.tags.push(x.value); }
      else if ((REACTS as readonly string[]).includes(x.value)) {
        const k = x.value as React, row = m.reacts.find((y) => y.k === k) ?? (m.reacts.push({ k, n: 0, mine: false, names: [] }), m.reacts.at(-1)!);
        row.n++; row.mine ||= x.user_id === me; row.names.push(x.user_id === me ? "You" : x.name ?? "Someone");
      }
      out.set(x.message_id, m);
    }
  } catch { /* migration 0062 not applied: no marks yet */ }
  return out;
}

export type Scheduled = { id: string; body: string; sendAt: string; author: string };

/** Messages waiting to go in one conversation, soonest first. */
export async function scheduledFor(key: string): Promise<Scheduled[]> {
  return db.query<{ id: string; body: string; send_at: Date; author_name: string }>(
    "SELECT id,body,send_at,author_name FROM message_schedules WHERE thread_key=$1 AND sent_at IS NULL AND cancelled_at IS NULL ORDER BY send_at LIMIT 20", [key])
    .then((r) => r.rows.map((x) => ({ id: x.id, body: x.body, sendAt: new Date(x.send_at).toISOString(), author: x.author_name })), () => []);
}

/**
 * THE HEARTBEAT'S PART: claim what is due (sent_at is set in the claiming
 * statement, so an overlapping tick cannot take the same row), then post each
 * the way the person would have: a client question gets the studio reply and
 * its email, a team chat gets the message.
 */
export async function sendDueMessages(): Promise<{ sent: number; failed: number }> {
  const due = await db.query<{ id: string; thread_key: string; author_id: string; author_name: string; body: string }>(
    `UPDATE message_schedules SET sent_at=now() WHERE id IN (SELECT id FROM message_schedules WHERE send_at<=now() AND sent_at IS NULL AND cancelled_at IS NULL ORDER BY send_at LIMIT 20)
     RETURNING id,thread_key,author_id,author_name,body`).then((r) => r.rows, () => []);
  let sent = 0, failed = 0;
  for (const m of due) {
    try {
      const id = m.thread_key.slice(2);
      if (m.thread_key.startsWith("t-")) {
        const { syncStore, saveStore } = await import("@/lib/admin/persist");
        const store = await import("@/lib/admin/store");
        await syncStore();
        const msg = store.addTicketMessage({ ticketId: id, from: "studio", author: m.author_name, body: m.body });
        const ticket = store.getTicket(id);
        if (!msg || !ticket) throw new Error("The question is gone.");
        await saveStore();
        const { stageSupportReply } = await import("@/lib/support-mail");
        const run = await stageSupportReply({ ticket, reply: m.body, author: m.author_name, messageId: msg.id, by: m.author_name });
        if (typeof run === "function") await run();
      } else if (m.thread_key.startsWith("d-")) {
        await db.query("INSERT INTO team_messages (id,thread_id,author_id,author_name,body) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), id, m.author_id, m.author_name, m.body]);
        await db.query("UPDATE team_threads SET last_message_at=now() WHERE id=$1", [id]);
      } else throw new Error("Only questions and team chats can be scheduled.");
      sent++;
    } catch (e) {
      failed++;
      await db.query("UPDATE message_schedules SET error=$2 WHERE id=$1", [m.id, e instanceof Error ? e.message.slice(0, 300) : "Could not be sent."]).catch(() => {});
    }
  }
  return { sent, failed };
}
