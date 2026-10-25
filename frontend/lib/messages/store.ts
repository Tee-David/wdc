import "server-only";
import { db } from "@/lib/db/pool";

/** One person's state for one conversation (message_reads, migration 0054). */
export type ReadState = { lastReadAt: string | null; pinned: boolean; archived: boolean };
export type TeamThread = { id: string; kind: "direct" | "group"; title: string; members: { id: string; name: string }[]; lastAt: string; last: { author: string; authorId: string; body: string } | null };
export type TeamMessage = { id: string; authorId: string; authorName: string; body: string; at: string };

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null);

/**
 * Whether migration 0054 is in. Every reader below answers "not yet" rather
 * than failing the page, so Messages keeps working before the owner applies it.
 */
export async function messagesReady(): Promise<boolean> {
  return db.query("SELECT 1 FROM message_reads LIMIT 1").then(() => true, () => false);
}

/** This person's read, pin and archive state for the given conversation keys. */
export async function readStates(userId: string, keys: string[]): Promise<Map<string, ReadState>> {
  const out = new Map<string, ReadState>();
  if (!userId || !keys.length) return out;
  try {
    const r = await db.query<{ thread_key: string; last_read_at: string | null; pinned: boolean; archived: boolean }>(
      "SELECT thread_key,last_read_at,pinned,archived FROM message_reads WHERE user_id=$1 AND thread_key=ANY($2::STRING[])", [userId, keys]);
    for (const x of r.rows) out.set(x.thread_key, { lastReadAt: iso(x.last_read_at), pinned: x.pinned, archived: x.archived });
  } catch { /* migration 0054 not applied: no state yet */ }
  return out;
}

/** The team chats this person is in, newest first, each with its members and last message. Bounded to 100. */
export async function teamThreadsFor(userId: string): Promise<TeamThread[]> {
  if (!userId) return [];
  try {
    const t = await db.query<{ id: string; kind: "direct" | "group"; title: string; last_message_at: string }>(
      `SELECT t.id,t.kind,t.title,t.last_message_at FROM team_threads t JOIN team_thread_members m ON m.thread_id=t.id
       WHERE m.user_id=$1 ORDER BY t.last_message_at DESC LIMIT 100`, [userId]);
    const ids = t.rows.map((x) => x.id);
    if (!ids.length) return [];
    const [members, last] = await Promise.all([
      db.query<{ thread_id: string; id: string; name: string }>(`SELECT m.thread_id,u."id",u."name" FROM team_thread_members m JOIN "user" u ON u."id"=m.user_id WHERE m.thread_id=ANY($1::UUID[]) ORDER BY lower(u."name")`, [ids]),
      db.query<{ thread_id: string; author_id: string; author_name: string; body: string }>(`SELECT DISTINCT ON (thread_id) thread_id,author_id,author_name,body FROM team_messages WHERE thread_id=ANY($1::UUID[]) ORDER BY thread_id,created_at DESC`, [ids]),
    ]);
    return t.rows.map((x) => {
      const l = last.rows.find((m) => m.thread_id === x.id);
      return {
        id: x.id, kind: x.kind, title: x.title, lastAt: iso(x.last_message_at)!,
        members: members.rows.filter((m) => m.thread_id === x.id).map(({ id, name }) => ({ id, name })),
        last: l ? { author: l.author_name, authorId: l.author_id, body: l.body } : null,
      };
    });
  } catch { return []; }
}

/** One team chat's messages, oldest first (the latest 120), or null when this person is not in it. */
export async function teamMessages(threadId: string, userId: string): Promise<TeamMessage[] | null> {
  try {
    const member = await db.query("SELECT 1 FROM team_thread_members WHERE thread_id=$1 AND user_id=$2", [threadId, userId]);
    if (!member.rowCount) return null;
    const r = await db.query<{ id: string; author_id: string; author_name: string; body: string; created_at: string }>(
      "SELECT id,author_id,author_name,body,created_at FROM team_messages WHERE thread_id=$1 ORDER BY created_at DESC LIMIT 120", [threadId]);
    return r.rows.reverse().map((m) => ({ id: m.id, authorId: m.author_id, authorName: m.author_name, body: m.body, at: iso(m.created_at)! }));
  } catch { return null; }
}

/** Active studio people, for starting a team chat. */
export async function studioPeople(): Promise<{ id: string; name: string }[]> {
  return db.query<{ id: string; name: string }>(`SELECT "id","name" FROM "user" WHERE "role" IN ('owner','staff') AND "deactivatedAt" IS NULL ORDER BY lower("name") LIMIT 200`)
    .then((r) => r.rows, () => []);
}
