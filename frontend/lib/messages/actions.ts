"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { after } from "next/server";
import { requireProjectActor, requireWorkspaceUser, projectRecipients, WorkspaceAccessError } from "@/lib/workspace/access";
import { dispatchWorkspaceEvents, emitWorkspaceEvent, workspaceTransaction } from "@/lib/workspace/events";
import { confirmUploads, readUploads, saveAttachments, signChatFile } from "@/lib/messages/attachments";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

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
  const uploads = readUploads(value(fd, "attachments"), `d-${threadId}`);
  if (!uploads) return FAIL({}, "Those files could not be read. Remove them and attach them again.");
  if ((!body && !uploads.length) || body.length > 5000) return FAIL({ body: "Write a message or attach a file first." });
  try {
    const me = await requireWorkspaceUser(true);
    const member = await db.query("SELECT 1 FROM team_thread_members WHERE thread_id=$1 AND user_id=$2", [threadId, me.userId]);
    if (!member.rowCount) return FAIL({}, "You are not in this chat.");
    /* A quote must point at a message in this same chat. Before migration 0057 the column is missing and the message is saved without it. */
    const raw = value(fd, "replyTo");
    const replyTo = /^[0-9a-f-]{36}$/i.test(raw) && (await db.query("SELECT 1 FROM team_messages WHERE id=$1 AND thread_id=$2", [raw, threadId])).rowCount ? raw : null;
    const files = await confirmUploads(uploads);
    if (!files.ok) return FAIL({}, files.error);
    const id = randomUUID();
    try {
      await db.query("INSERT INTO team_messages (id,thread_id,author_id,author_name,body,reply_to) VALUES ($1,$2,$3,$4,$5,$6)", [id, threadId, me.userId, me.name, body, replyTo]);
    } catch (e) {
      if ((e as { code?: string }).code !== "42703") throw e;
      await db.query("INSERT INTO team_messages (id,thread_id,author_id,author_name,body) VALUES ($1,$2,$3,$4,$5)", [id, threadId, me.userId, me.name, body]);
    }
    await saveAttachments(`d-${threadId}`, id, me.userId, files.files);
    await db.query("UPDATE team_threads SET last_message_at=now() WHERE id=$1", [threadId]);
    /* Writing to a chat you archived brings it back to your inbox. */
    await db.query("UPDATE message_reads SET archived=false,last_read_at=now() WHERE user_id=$1 AND thread_key=$2", [me.userId, `d-${threadId}`]);
  } catch (e) { return FAIL({}, e instanceof WorkspaceAccessError ? e.message : NOT_READY); }
  revalidatePath("/admin/messages");
  return OK("Sent.");
}

/**
 * A client writes in their own project's channel. The message is always
 * visible to the client (it is theirs), lands in the studio's Messages as the
 * project channel, and tells the project's studio people through the usual
 * notification pipeline, which each of them can switch off.
 */
export async function postClientProjectMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = value(fd, "projectId"), body = value(fd, "body");
  if (!body || body.length > 5000) return FAIL({ body: "Write a message first." });
  try {
    const actor = await requireProjectActor(projectId, "comment");
    if (actor.kind !== "client") return FAIL({}, "This box is for clients. Use the studio Messages page.");
    const recipients = await projectRecipients(projectId, "internal");
    const id = randomUUID(), eventId = randomUUID();
    await workspaceTransaction(async (tx) => {
      await tx.query("INSERT INTO workspace_team_notes(id,project_id,author_id,author_name,visibility,body) VALUES($1,$2,$3,$4,'client',$5)", [id, projectId, actor.id, actor.name, body]);
      await emitWorkspaceEvent({ id: eventId, projectId, clientId: actor.clientId, kind: "client.message", category: "actions", actorId: actor.id, actorName: actor.name,
        title: `${actor.name} wrote in ${actor.project.title}`, summary: body.slice(0, 3000), href: `/admin/messages?c=p-${projectId}`, visibility: "internal", recipients }, tx);
    });
    after(() => dispatchWorkspaceEvents({ eventIds: [eventId] }));
  } catch (e) { return FAIL({}, said(e, "The message could not be sent. Reload and try again.")); }
  revalidatePath("/portal/support"); revalidatePath(`/portal/projects/${projectId}`); revalidatePath("/admin/messages");
  return OK("Sent. The team is told straight away.");
}
/**
 * One presigned upload for a picture or file in a conversation. The person is
 * checked against the conversation first (lib/messages/attachments.ts).
 * Rate limited per caller as abuse control: lib/rate-limit.ts is one
 * instance's memory, so the real ceiling is this times the warm instances.
 */
export async function signChatUpload(input: { threadKey: string; filename: string; size: number }) {
  const h = await headers();
  const limit = rateLimit(`chat-upload:${h.get("x-forwarded-for") ?? "local"}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false as const, error: "Too many files at once. Give it a minute." };
  if (!KEY.test(String(input?.threadKey ?? ""))) return { ok: false as const, error: "That conversation could not be found." };
  return signChatFile(input.threadKey, String(input.filename ?? "").slice(0, 200), Number(input.size));
}

/**
 * ASK ADMIN (staff Support): the question goes into the person's direct chat
 * with Admin, so the answer lands in Messages and nothing needs a second inbox.
 * Uses the same path as starting a chat, which reuses the direct chat if there
 * is one.
 */
export async function askAdmin(prev: ActionState, fd: FormData): Promise<ActionState> {
  const kind = ["Question", "Problem", "Request"].find((k) => k === value(fd, "kind")) ?? "Question";
  const about = value(fd, "about").slice(0, 80), body = value(fd, "body");
  if (body.length < 5) return FAIL({ body: "Say what you need from Admin." });
  const owner = await db.query<{ id: string }>(`SELECT "id" FROM "user" WHERE "role"='owner' AND "deactivatedAt" IS NULL ORDER BY "createdAt" LIMIT 1`).then((r) => r.rows[0]?.id, () => undefined);
  if (!owner) return FAIL({}, NOT_READY);
  const next = new FormData();
  next.set("people", owner);
  next.set("body", `${kind}${about ? `, about ${about}` : ""}:\n${body}`);
  return startTeamThread(prev, next);
}

/** "Mark all read": every conversation in this person's list, read up to now. Their own state only. */
export async function markAllRead(keys: string[]): Promise<{ ok: boolean; message: string }> {
  const list = [...new Set((Array.isArray(keys) ? keys : []).map(String).filter((k) => KEY.test(k)))].slice(0, 300);
  if (!list.length) return { ok: true, message: "Everything is already read." };
  try {
    const me = await requireWorkspaceUser(true, false);
    await db.query(`INSERT INTO message_reads (user_id,thread_key,last_read_at,updated_at) SELECT $1,k,now(),now() FROM unnest($2::STRING[]) AS k
      ON CONFLICT (user_id,thread_key) DO UPDATE SET last_read_at=now(),updated_at=now()`, [me.userId, list]);
  } catch { return { ok: false, message: NOT_READY }; }
  revalidatePath("/admin/messages"); revalidatePath("/admin", "layout");
  return { ok: true, message: `Updated. ${list.length === 1 ? "The conversation is" : `${list.length} conversations are`} marked read.` };
}

/**
 * "Make it a task": a message on a project's conversation becomes an open task on that project, named by its
 * first line, with nobody assigned yet. The same task the project page adds, with its history line.
 */
export async function taskFromMessage(projectId: string, text: string): Promise<{ ok: boolean; message: string }> {
  const { allow } = await import("@/lib/admin/guard");
  if (await allow("projects")) return { ok: false, message: "Your account cannot add tasks." };
  const { outOfScope } = await import("@/lib/admin/staff-scope");
  if (await outOfScope({ project: String(projectId ?? "") })) return { ok: false, message: "That project is not one of yours." };
  const title = String(text ?? "").split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 200) ?? "";
  if (!title) return { ok: false, message: "That message has no words to make a task from." };
  try {
    const { changeLegacyTask } = await import("@/lib/workspace/project-changes");
    const r = await changeLegacyTask({ kind: "create", projectId: String(projectId), task: { title, assignee: "", due: null, priority: "Normal", blockedBy: null } });
    after(() => dispatchWorkspaceEvents({ eventIds: r.eventIds }));
    revalidatePath(`/admin/projects/${projectId}`); revalidatePath("/admin");
    return { ok: true, message: `Saved. "${title.length > 60 ? `${title.slice(0, 59)}…` : title}" is a task on the project. Give it a person and a date there.` };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "The task could not be added." }; }
}
