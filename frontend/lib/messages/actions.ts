"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { requireWorkspaceUser, WorkspaceAccessError } from "@/lib/workspace/access";

const KEY = /^[tpd]-[A-Za-z0-9_-]{1,100}$/;
const value = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const NOT_READY = "Messages need migration 0054. Admin applies it in Settings, System.";
const said = (e: unknown, fallback: string) => (e instanceof WorkspaceAccessError ? e.message : fallback);

/**
 * Marks a conversation read up to now for the signed-in person. Called by the
 * thread when it opens; the state is the person's own and reveals nothing
 * about the conversation, so the key is checked for shape only.
 */
export async function markThreadRead(key: string): Promise<void> {
  if (!KEY.test(key)) return;
  try {
    const me = await requireWorkspaceUser(true, false);
    await db.query(`INSERT INTO message_reads (user_id,thread_key,last_read_at,updated_at) VALUES ($1,$2,now(),now())
      ON CONFLICT (user_id,thread_key) DO UPDATE SET last_read_at=now(),updated_at=now()`, [me.userId, key]);
  } catch { /* read-only view, or migration 0054 not applied: nothing to remember */ }
}

/** Pin or archive a conversation for the signed-in person only. */
export async function setThreadFlag(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const key = value(fd, "key"), flag = value(fd, "flag"), on = value(fd, "on") === "1";
  if (!KEY.test(key) || !["pinned", "archived"].includes(flag)) return FAIL({}, "That conversation could not be found.");
  try {
    const me = await requireWorkspaceUser(true);
    await db.query(`INSERT INTO message_reads (user_id,thread_key,${flag},updated_at) VALUES ($1,$2,$3,now())
      ON CONFLICT (user_id,thread_key) DO UPDATE SET ${flag}=$3,updated_at=now()`, [me.userId, key, on]);
  } catch (e) { return FAIL({}, e instanceof WorkspaceAccessError ? e.message : NOT_READY); }
  revalidatePath("/admin/messages"); revalidatePath("/portal/support");
  return OK(flag === "pinned" ? (on ? "Pinned to the top." : "Unpinned.") : (on ? "Archived. It comes back when someone writes." : "Back in the inbox."));
}

/** Starts a team chat with chosen studio people: a direct chat for one, a named group for more. */
export async function startTeamThread(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let me;
  try { me = await requireWorkspaceUser(true); } catch (e) { return FAIL({}, said(e, "Sign in again, then retry.")); }
  if (me.role === "client") return FAIL({}, "Team chats are for the studio.");
  const chosen = [...new Set(fd.getAll("people").map(String).filter((x) => x && x !== me.userId && x.length <= 120))].slice(0, 20);
  const body = value(fd, "body"), title = value(fd, "title").slice(0, 80);
  if (!chosen.length) return FAIL({ people: "Choose at least one person." });
  if (!body || body.length > 5000) return FAIL({ body: "Write the first message." });
  const kind = chosen.length === 1 ? "direct" : "group";
  let id: string | undefined;
  if (kind === "group" && !title) return FAIL({ title: "Name the group so everyone knows what it is for." });
  try {
    const valid = await db.query<{ id: string }>(`SELECT "id" FROM "user" WHERE "id"=ANY($1::STRING[]) AND "role" IN ('owner','staff') AND "deactivatedAt" IS NULL`, [chosen]);
    if (valid.rows.length !== chosen.length) return FAIL({ people: "Choose active studio accounts only." });
    /* A direct chat with the same person already exists: write there instead of starting a second. */
    id = kind === "direct" ? (await db.query<{ id: string }>(`SELECT t.id FROM team_threads t
      JOIN team_thread_members a ON a.thread_id=t.id AND a.user_id=$1 JOIN team_thread_members b ON b.thread_id=t.id AND b.user_id=$2
      WHERE t.kind='direct' LIMIT 1`, [me.userId, chosen[0]])).rows[0]?.id : undefined;
    await transaction(async (tx) => {
      if (!id) {
        id = randomUUID();
        await tx.query("INSERT INTO team_threads (id,kind,title,created_by) VALUES ($1,$2,$3,$4)", [id, kind, kind === "group" ? title : "", me.userId]);
        for (const u of [me.userId, ...chosen]) await tx.query("INSERT INTO team_thread_members (thread_id,user_id) VALUES ($1,$2)", [id, u]);
      }
      await tx.query("INSERT INTO team_messages (id,thread_id,author_id,author_name,body) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), id, me.userId, me.name, body]);
      await tx.query("UPDATE team_threads SET last_message_at=now() WHERE id=$1", [id]);
    });
  } catch { return FAIL({}, NOT_READY); }
  revalidatePath("/admin/messages");
  /* Outside the try: a redirect is thrown, and the new chat is the confirmation. */
  redirect(`/admin/messages?c=d-${id}`);
}

/** Posts in a team chat the signed-in person belongs to. */
export async function postTeamMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const threadId = value(fd, "threadId"), body = value(fd, "body");
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return FAIL({}, "That chat could not be found.");
  if (!body || body.length > 5000) return FAIL({ body: "Write a message first." });
  try {
    const me = await requireWorkspaceUser(true);
    const member = await db.query("SELECT 1 FROM team_thread_members WHERE thread_id=$1 AND user_id=$2", [threadId, me.userId]);
    if (!member.rowCount) return FAIL({}, "You are not in this chat.");
    await db.query("INSERT INTO team_messages (id,thread_id,author_id,author_name,body) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), threadId, me.userId, me.name, body]);
    await db.query("UPDATE team_threads SET last_message_at=now() WHERE id=$1", [threadId]);
    /* Writing to a chat you archived brings it back to your inbox. */
    await db.query("UPDATE message_reads SET archived=false,last_read_at=now() WHERE user_id=$1 AND thread_key=$2", [me.userId, `d-${threadId}`]);
  } catch (e) { return FAIL({}, e instanceof WorkspaceAccessError ? e.message : NOT_READY); }
  revalidatePath("/admin/messages");
  return OK("Sent.");
}
