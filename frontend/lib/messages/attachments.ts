import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { headObject, presignGet, presignPut, r2Config } from "@/lib/r2";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { getTicket } from "@/lib/admin/store";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { requireProjectActor } from "@/lib/workspace/access";

/**
 * PICTURES AND FILES IN A CONVERSATION. They live in the private bucket under
 * the conversation's own folder (`chat/<key>/`), never in the public media
 * library: a client's files are theirs. Each is signed for upload only after
 * the person is checked against the conversation, confirmed with the bucket
 * before it is recorded, and read back through short-lived signed links.
 *
 * One table for all three kinds of conversation, keyed by the conversation
 * key ("t-", "p-" or "d-") and the message id (migration 0058).
 */
export const CHAT_TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav",
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain", zip: "application/zip", ai: "application/postscript", psd: "image/vnd.adobe.photoshop",
};
export const CHAT_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_MAX_FILES = 10;

export type ChatFile = { key: string; name: string; type: string; bytes: number; kind: "image" | "video" | "audio" | "file"; open: string; download: string };

const kindOf = (type: string): ChatFile["kind"] =>
  /^image\/(jpeg|png|webp|gif)$/.test(type) ? "image" : type.startsWith("video/") ? "video" : type.startsWith("audio/") ? "audio" : "file";

/** Can the signed-in studio person write in this conversation? Fails closed. */
export async function canWriteThread(threadKey: string): Promise<{ ok: true; userId: string; name: string } | { ok: false; error: string }> {
  const m = /^([tpd])-(.{1,120})$/.exec(threadKey);
  if (!m) return { ok: false, error: "That conversation could not be found." };
  const role = await adminRole();
  const { session } = await getAdminRequest();
  const userId = session?.user?.id ?? "", name = session?.user?.name ?? "";
  if (!role || !userId) return { ok: false, error: "Sign in again with your studio account." };
  try {
    if (m[1] === "t") {
      const t = getTicket(m[2]);
      if (!t || !can(role, "clients") || !inScope(await staffScope(role), "clients", t.clientId)) return { ok: false, error: "You cannot write in this conversation." };
    } else if (m[1] === "p") {
      await requireProjectActor(m[2], "comment");
    } else {
      if (!/^[0-9a-f-]{36}$/i.test(m[2])) return { ok: false, error: "That chat could not be found." };
      const r = await db.query("SELECT 1 FROM team_thread_members WHERE thread_id=$1 AND user_id=$2", [m[2], userId]);
      if (!r.rowCount) return { ok: false, error: "You are not in this chat." };
    }
  } catch {
    return { ok: false, error: "You cannot write in this conversation." };
  }
  return { ok: true, userId, name };
}

/** A presigned upload for one file, good for five minutes, under the conversation's folder. */
export async function signChatFile(threadKey: string, filename: string, size: number) {
  const who = await canWriteThread(threadKey);
  if (!who.ok) return who;
  const ext = filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";
  const contentType = CHAT_TYPES[ext];
  if (!filename || !contentType) return { ok: false as const, error: "That kind of file cannot be sent here. Pictures, video, audio, PDF and office files can." };
  if (!(size > 0) || size > CHAT_MAX_BYTES) return { ok: false as const, error: "Files need to be 25MB or smaller." };
  const cfg = r2Config();
  if (!cfg.ok) return { ok: false as const, error: "File sharing is not set up yet. Admin connects the file store in Settings, System." };
  const key = `chat/${threadKey}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${ext}`;
  const signed = presignPut({ config: cfg.config, key, contentType, expiresIn: 300 });
  return { ok: true as const, url: signed.url, key, contentType };
}

export type Upload = { key: string; name: string };

/** Read the `attachments` field a composer sends: at most ten, each under this conversation's folder. */
export function readUploads(raw: string, threadKey: string): Upload[] | null {
  if (!raw) return [];
  let list: unknown;
  try { list = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(list) || list.length > CHAT_MAX_FILES) return null;
  const out: Upload[] = [];
  for (const x of list) {
    const key = typeof x?.key === "string" ? x.key : "", name = typeof x?.name === "string" ? x.name.slice(0, 200) : "";
    if (!key.startsWith(`chat/${threadKey}/`) || key.includes("..") || !name) return null;
    out.push({ key, name });
  }
  return out;
}

/** Ask the bucket what arrived, before anything is recorded. A key nobody uploaded to is refused. */
export async function confirmUploads(list: Upload[]): Promise<{ ok: true; files: (Upload & { type: string; bytes: number })[] } | { ok: false; error: string }> {
  if (!list.length) return { ok: true, files: [] };
  const cfg = r2Config();
  if (!cfg.ok) return { ok: false, error: "File sharing is not set up yet." };
  const heads = await Promise.all(list.map((u) => headObject({ config: cfg.config, key: u.key })));
  const files = [];
  for (let i = 0; i < list.length; i++) {
    const h = heads[i];
    if (!h.ok) return { ok: false, error: `${list[i].name} did not finish uploading. Remove it and try again.` };
    const ext = list[i].key.split(".").pop() ?? "";
    files.push({ ...list[i], type: CHAT_TYPES[ext] ?? "application/octet-stream", bytes: h.bytes });
  }
  return { ok: true, files };
}

/** Record confirmed files against the message that carries them. Safe to run twice: the key is the row's identity. */
export async function saveAttachments(threadKey: string, messageId: string, by: string, files: (Upload & { type: string; bytes: number })[]) {
  for (const f of files) {
    await db.query(
      "INSERT INTO message_attachments (key,thread_key,message_id,name,content_type,bytes,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (key) DO NOTHING",
      [f.key, threadKey, messageId, f.name, f.type, f.bytes, by]);
  }
}

/** The files on the given messages, with signed links good for an hour. Empty before migration 0058 or without a file store. */
export async function attachmentsFor(threadKey: string, messageIds: string[]): Promise<Map<string, ChatFile[]>> {
  const out = new Map<string, ChatFile[]>();
  if (!messageIds.length) return out;
  const cfg = r2Config();
  try {
    const r = await db.query<{ key: string; message_id: string; name: string; content_type: string; bytes: string | number }>(
      "SELECT key,message_id,name,content_type,bytes FROM message_attachments WHERE thread_key=$1 AND message_id=ANY($2::STRING[]) ORDER BY created_at,key", [threadKey, messageIds]);
    for (const x of r.rows) {
      const f: ChatFile = {
        key: x.key, name: x.name, type: x.content_type, bytes: Number(x.bytes), kind: kindOf(x.content_type),
        open: cfg.ok ? presignGet({ config: cfg.config, key: x.key }) : "",
        download: cfg.ok ? presignGet({ config: cfg.config, key: x.key, download: x.name }) : "",
      };
      out.set(x.message_id, [...(out.get(x.message_id) ?? []), f]);
    }
  } catch { /* before 0058 there are no files */ }
  return out;
}
