"use server";

import { revalidatePath } from "next/cache";
import { headObject, mediaKey, presignPut, r2Config } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { checkMediaFile, isMediaKey, maxBytesFor, MEDIA_ALT_MAX, MEDIA_TYPES } from "@/lib/media-validate";
import { listMedia, mediaById, mediaDatabaseConfigured, recordMedia, setMediaAlt, setMediaArchived, setMediaDetails, type MediaAsset, type MediaKind } from "@/lib/media";
import { createFolder, deleteFolder, folderTree, FOLDER_COLORS, moveFiles, moveFolder, renameFolder, setFolderColor, type FolderColor, type FolderTree } from "@/lib/media-folders";
import { audit } from "./store";
import { actorName, allow } from "./guard";
import { FAIL, OK, str, type ActionState } from "./validate";

const PAGE = "/admin/settings/media";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dim = (v: unknown, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 && n <= max ? n : null; };

type Signed = { ok: true; url: string; key: string; contentType: string } | { ok: false; error: string };

/**
 * STEP ONE: permission to put one file in the bucket, for five minutes.
 *
 * The same shape as the onboarding uploader (`app/api/onboarding/upload`):
 * the server picks the key and signs the type, the browser only carries the
 * bytes. A server action rather than a route because the admin already talks
 * to itself this way, and Next checks the origin of every action call.
 */
export async function signMediaUpload(input: { filename: string; size: number }): Promise<Signed> {
  const refused = await allow("content");
  if (refused) return { ok: false, error: refused.message ?? "Sign in again, then retry." };

  const by = await actorName();
  /* Abuse control, not a quota: the window lives in one instance's memory, so
     on Vercel the real ceiling is this times the warm instances. Forty in ten
     minutes is a generous afternoon of uploading and still stops a loop. */
  const limit = rateLimit(`media-sign:${by}`, 40, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "That is a lot of uploads at once. Give it a minute and carry on." };

  const file = checkMediaFile(String(input?.filename ?? "").slice(0, 200), Number(input?.size));
  if (!file.ok) return { ok: false, error: file.error };

  if (!mediaDatabaseConfigured()) return { ok: false, error: "The content database is not connected, so an upload would have nowhere to be listed." };
  const config = r2Config();
  if (!config.ok) {
    console.error("[media] upload unavailable; missing env:", config.missing.join(", "));
    return { ok: false, error: `Uploads are not configured: ${config.missing.join(", ")} not set.` };
  }
  if (!config.config.publicBase) {
    return { ok: false, error: "CLOUDFLARE_R2_URL is not set, so an uploaded file would have no public address to use." };
  }

  const signed = presignPut({ config: config.config, key: mediaKey(file.ext), contentType: file.contentType });
  return { ok: true, url: signed.url, key: signed.key, contentType: file.contentType };
}

/**
 * STEP TWO: the browser says it finished; the bucket is asked whether it did.
 *
 * Nothing the browser sends is taken as fact. The key must be one this
 * library issues, the object must exist, and the size and type recorded are
 * what R2 stored. An object that turns out over the limit is still recorded
 * honestly rather than left orphaned -- it is in the bucket either way, and a
 * row is how somebody finds it to archive it.
 */
export async function recordMediaUpload(input: { key: string; filename: string; width?: number; height?: number; durationMs?: number; folderId?: string | null }): Promise<{ ok: true; item: MediaAsset } | { ok: false; error: string }> {
  const refused = await allow("content");
  if (refused) return { ok: false, error: refused.message ?? "Sign in again, then retry." };

  const key = String(input?.key ?? "");
  if (!isMediaKey(key)) return { ok: false, error: "That upload could not be matched to one the library issued." };
  const filename = String(input?.filename ?? "").trim().slice(0, 200) || key.split("/").pop()!;

  const config = r2Config();
  if (!config.ok) return { ok: false, error: `Uploads are not configured: ${config.missing.join(", ")} not set.` };

  const stored = await headObject({ config: config.config, key });
  if (!stored.ok) {
    return {
      ok: false,
      error: stored.status === 404
        ? "The file store has no copy of that upload, so it was not added. Try it again."
        : "The file store could not be asked about that upload just now. Try it again.",
    };
  }

  const ext = key.split(".").pop()!;
  const by = await actorName();
  let item: MediaAsset | null;
  try {
    item = await recordMedia({
      key, filename,
      /* The type the upload was signed as; R2 was told to store exactly that. */
      contentType: MEDIA_TYPES[ext],
      bytes: stored.bytes >= 0 ? stored.bytes : 0,
      alt: "",
      by,
      /* Measured by the browser before the upload. Informational only (the
         space a page reserves, "1600 × 900" in the details), so a lie costs
         nothing; still bounded, so it can never be nonsense in a column. */
      width: dim(input?.width, 20000), height: dim(input?.height, 20000), durationMs: dim(input?.durationMs, 6 * 60 * 60 * 1000),
      folderId: input?.folderId && UUID.test(input.folderId) ? input.folderId : null,
    });
  } catch {
    return { ok: false, error: "The file arrived but could not be listed just now. Try recording it again." };
  }
  if (!item) return { ok: false, error: "The file arrived but could not be listed just now. Try recording it again." };

  audit({
    actor: by, kind: "content", subjectId: item.id, subject: item.filename, action: "uploaded to the media library",
    note: stored.bytes > maxBytesFor(ext) ? "larger than the library's limit" : undefined,
  });
  revalidatePath(PAGE);
  return { ok: true, item };
}

export async function saveMediaAlt(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const id = str(fd, "id");
  const alt = str(fd, "alt").replace(/\s+/g, " ");
  if (!UUID.test(id)) return FAIL({}, "That file could not be found.");
  if (alt.length > MEDIA_ALT_MAX) return FAIL({}, `Keep it under ${MEDIA_ALT_MAX} characters; say what the picture shows, not everything in it.`);

  const by = await actorName();
  try {
    const before = await mediaById(id);
    if (!before) return FAIL({}, "That file could not be found. It may have been removed from the list.");
    if (!(await setMediaAlt(id, alt))) return FAIL({}, "That file could not be found.");
    audit({
      actor: by, kind: "content", subjectId: id, subject: before.filename, action: "changed the alt text",
      field: "Alt text", from: before.alt || "(none)", to: alt || "(none)",
    });
  } catch {
    return FAIL({}, "The description could not be saved just now. Try again.");
  }
  revalidatePath(PAGE);
  return OK(alt ? "Description saved." : "Description cleared. Leave it empty only for a picture that is purely decorative.");
}

/**
 * A file's details, from its panel: the name people see, the description,
 * "decorative" (an empty description on purpose) and a caption. Each field
 * that changed is its own audit line, so the log says what moved.
 */
export async function saveMediaDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("content");
  if (refused) return refused;
  const id = str(fd, "id");
  if (!UUID.test(id)) return FAIL({}, "That file could not be found.");
  const filename = str(fd, "filename").replace(/\s+/g, " ").slice(0, 200);
  const decorative = fd.get("decorative") === "on";
  /* Decorative means empty on purpose: a description typed as well would be
     read out anyway, so the flag wins and the box is cleared. */
  const alt = decorative ? "" : str(fd, "alt").replace(/\s+/g, " ");
  const caption = str(fd, "caption").replace(/\s+/g, " ");
  const errors: Record<string, string> = {};
  if (!filename) errors.filename = "Give it a name people will recognise.";
  if (alt.length > MEDIA_ALT_MAX) errors.alt = `Keep it under ${MEDIA_ALT_MAX} characters; say what the picture shows, not everything in it.`;
  if (caption.length > 300) errors.caption = "Keep the caption under 300 characters.";
  if (Object.keys(errors).length) return FAIL(errors);

  const by = await actorName();
  try {
    const before = await mediaById(id);
    if (!before) return FAIL({}, "That file could not be found. It may have been removed from the list.");
    if (!(await setMediaDetails(id, { filename, alt, decorative, caption }))) return FAIL({}, "That file could not be found.");
    const changes: [string, string, string][] = [
      ["Name", before.filename, filename],
      ["Alt text", before.alt || "(none)", alt || "(none)"],
      ["Decorative", before.decorative ? "yes" : "no", decorative ? "yes" : "no"],
      ["Caption", before.caption || "(none)", caption || "(none)"],
    ];
    for (const [field, from, to] of changes) {
      if (from !== to) audit({ actor: by, kind: "content", subjectId: id, subject: filename, action: `changed the ${field.toLowerCase()}`, field, from, to });
    }
  } catch {
    return FAIL({}, "The details could not be saved just now. Try again.");
  }
  revalidatePath(PAGE);
  return OK("Details saved.");
}

async function archive(fd: FormData, archived: boolean): Promise<ActionState> {
  /* Content work, and reversible: the object is never deleted. */
  const refused = await allow("content");
  if (refused) return refused;
  const id = str(fd, "id");
  if (!UUID.test(id)) return FAIL({}, "That file could not be found.");
  const by = await actorName();
  let filename = "";
  try {
    const item = await mediaById(id);
    if (!item) return FAIL({}, "That file could not be found.");
    filename = item.filename;
    if (!(await setMediaArchived(id, archived, by))) {
      return OK(archived ? `${filename} was already archived.` : `${filename} was already in the library.`);
    }
    audit({ actor: by, kind: "content", subjectId: id, subject: filename, action: archived ? "archived from the media library" : "restored to the media library" });
  } catch {
    return FAIL({}, "That could not be saved just now. Try again.");
  }
  /* No revalidatePath: the card this came from leaves the list, so the page
     announces the result first and refreshes after (see MediaGrid). */
  return OK(archived
    ? `Archived ${filename}. It is out of the library, and its address still works for any page already using it.`
    : `Restored ${filename} to the library.`);
}

export async function archiveMedia(_prev: ActionState, fd: FormData) { return archive(fd, true); }
export async function restoreMedia(_prev: ActionState, fd: FormData) { return archive(fd, false); }

/* ------------------------------------------------------------- folders */

type Said = { ok: true; message: string; id?: string } | { ok: false; error: string };
const uuid = (v: unknown) => (typeof v === "string" && UUID.test(v) ? v : null);
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 120) : []);
/* Every folder action is content work, the same permission as uploading. */
async function gate(): Promise<{ by: string } | { error: string }> {
  const refused = await allow("content");
  if (refused) return { error: refused.message ?? "Sign in again, then retry." };
  return { by: await actorName() };
}
const oops = "That could not be saved just now. Nothing was changed; try again.";

export async function createMediaFolder(input: { name: string; parentId: string | null }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const parent = input?.parentId ? uuid(input.parentId) : null;
  if (input?.parentId && !parent) return { ok: false, error: "That folder could not be found." };
  try {
    const r = await createFolder(String(input?.name ?? ""), parent, g.by);
    if (!r.ok) return r;
    audit({ actor: g.by, kind: "content", subjectId: r.id, subject: String(input.name).trim(), action: "created a media folder" });
    revalidatePath(PAGE);
    return { ok: true, message: `Created ${String(input.name).trim()}.`, id: r.id };
  } catch { return { ok: false, error: oops }; }
}

export async function renameMediaFolder(input: { id: string; name: string }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const id = uuid(input?.id); if (!id) return { ok: false, error: "That folder could not be found." };
  try {
    const r = await renameFolder(id, String(input?.name ?? ""));
    if (!r.ok) return r;
    if (r.before !== r.after) audit({ actor: g.by, kind: "content", subjectId: id, subject: r.after, action: "renamed a media folder", field: "Name", from: r.before, to: r.after });
    revalidatePath(PAGE);
    return { ok: true, message: `Renamed to ${r.after}.` };
  } catch { return { ok: false, error: oops }; }
}

export async function colorMediaFolder(input: { id: string; color: string | null }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const id = uuid(input?.id); if (!id) return { ok: false, error: "That folder could not be found." };
  const color = input?.color && (FOLDER_COLORS as readonly string[]).includes(input.color) ? (input.color as FolderColor) : null;
  try {
    const r = await setFolderColor(id, color);
    if (!r.ok) return r;
    revalidatePath(PAGE);
    return { ok: true, message: color ? `${r.name} is tagged ${color}.` : `${r.name} has no colour tag.` };
  } catch { return { ok: false, error: oops }; }
}

export async function moveMediaFolder(input: { id: string; parentId: string | null; beforeId?: string | null }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const id = uuid(input?.id); if (!id) return { ok: false, error: "That folder could not be found." };
  const parent = input?.parentId ? uuid(input.parentId) : null;
  if (input?.parentId && !parent) return { ok: false, error: "The folder you chose could not be found." };
  try {
    const r = await moveFolder(id, parent, input?.beforeId ? uuid(input.beforeId) : null);
    if (!r.ok) return r;
    audit({ actor: g.by, kind: "content", subjectId: id, subject: r.name, action: "moved a media folder" });
    revalidatePath(PAGE);
    return { ok: true, message: `Moved ${r.name}.` };
  } catch { return { ok: false, error: oops }; }
}

export async function deleteMediaFolder(input: { id: string }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const id = uuid(input?.id); if (!id) return { ok: false, error: "That folder could not be found." };
  try {
    const r = await deleteFolder(id);
    if (!r.ok) return r;
    audit({ actor: g.by, kind: "content", subjectId: id, subject: r.name, action: "deleted a media folder",
      note: `${r.files} ${r.files === 1 ? "file" : "files"} and ${r.folders} ${r.folders === 1 ? "folder" : "folders"} moved up` });
    revalidatePath(PAGE);
    const bits = [r.files ? `${r.files} ${r.files === 1 ? "file" : "files"}` : "", r.folders ? `${r.folders} ${r.folders === 1 ? "folder" : "folders"}` : ""].filter(Boolean);
    return { ok: true, message: `Deleted ${r.name}.${bits.length ? ` Its ${bits.join(" and ")} moved up a level.` : ""}` };
  } catch { return { ok: false, error: oops }; }
}

/** Files into a folder; null is Unsorted. The address of each file stays the same. */
export async function moveMediaFiles(input: { ids: string[]; folderId: string | null }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const list = ids(input?.ids); if (!list.length) return { ok: false, error: "Choose at least one file." };
  const folder = input?.folderId ? uuid(input.folderId) : null;
  if (input?.folderId && !folder) return { ok: false, error: "That folder could not be found." };
  try {
    const r = await moveFiles(list, folder);
    if (!r.ok) return r;
    if (r.moved) audit({ actor: g.by, kind: "content", subjectId: folder ?? "unsorted", subject: r.folder, action: `moved ${r.moved} ${r.moved === 1 ? "file" : "files"} into a media folder` });
    revalidatePath(PAGE);
    return { ok: true, message: r.moved ? `Moved ${r.moved} ${r.moved === 1 ? "file" : "files"} to ${r.folder}.` : `Already in ${r.folder}.` };
  } catch { return { ok: false, error: oops }; }
}

/** Archive or restore several files at once. Reversible, so no second question beyond the bar's own. */
export async function archiveMediaMany(input: { ids: string[]; archived: boolean }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const list = ids(input?.ids); if (!list.length) return { ok: false, error: "Choose at least one file." };
  let n = 0;
  try {
    for (const id of list) {
      const item = await mediaById(id);
      if (item && (await setMediaArchived(id, Boolean(input.archived), g.by))) {
        n++;
        audit({ actor: g.by, kind: "content", subjectId: id, subject: item.filename, action: input.archived ? "archived from the media library" : "restored to the media library" });
      }
    }
  } catch { return { ok: false, error: n ? `${n} done, then it stopped. Try the rest again.` : oops }; }
  revalidatePath(PAGE);
  return { ok: true, message: `${input.archived ? "Archived" : "Restored"} ${n} ${n === 1 ? "file" : "files"}.` };
}

/* -------------------------------------------------------------- the picker */

export type Browsed = { ok: true; items: MediaAsset[]; total: number; tree?: FolderTree } | { ok: false; error: string };

/**
 * ONE PAGE OF THE LIBRARY FOR THE "CHOOSE MEDIA" DIALOG
 * (components/admin/media-picker.tsx), which opens inside an editor and so
 * cannot be a page of its own. The same query the library page runs, narrowed
 * to what a picker needs; the folder tree comes back on the first call only.
 */
export async function browseMedia(input: { q?: string; folder?: string; kind?: string; page?: number; withTree?: boolean }): Promise<Browsed> {
  const refused = await allow("content");
  if (refused) return { ok: false, error: refused.message ?? "Sign in again, then retry." };
  if (!mediaDatabaseConfigured()) return { ok: false, error: "The content database is not connected, so there is no library to choose from." };
  const kind = (["image", "video", "pdf"] as const).find((k) => k === input?.kind) ?? "";
  const folder = input?.folder === "unsorted" ? "unsorted" : uuid(input?.folder) ?? "";
  try {
    const [page, tree] = await Promise.all([
      listMedia({ q: String(input?.q ?? "").slice(0, 80), folder, deep: Boolean(folder && folder !== "unsorted"), kind: kind as MediaKind | "", page: Math.max(1, Math.floor(Number(input?.page) || 1)), per: 48 }),
      input?.withTree ? folderTree() : Promise.resolve(undefined),
    ]);
    return { ok: true, items: page.items, total: page.total, tree };
  } catch {
    return { ok: false, error: "The library could not be read just now. Try again." };
  }
}

/**
 * A description written in the picker, saved back to the file so the next
 * place that uses it starts with one. Only the description and "decorative";
 * each change is an audit line, as in the library's own details.
 */
export async function describeMedia(input: { id: string; alt: string; decorative: boolean }): Promise<Said> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  const id = uuid(input?.id); if (!id) return { ok: false, error: "That file could not be found." };
  const decorative = Boolean(input?.decorative);
  const alt = decorative ? "" : String(input?.alt ?? "").replace(/\s+/g, " ").trim();
  if (alt.length > MEDIA_ALT_MAX) return { ok: false, error: `Keep the description under ${MEDIA_ALT_MAX} characters.` };
  try {
    const before = await mediaById(id);
    if (!before) return { ok: false, error: "That file could not be found." };
    if (before.alt === alt && before.decorative === decorative) return { ok: true, message: "No change." };
    await setMediaDetails(id, { filename: before.filename, alt, decorative, caption: before.caption });
    if (before.alt !== alt) audit({ actor: g.by, kind: "content", subjectId: id, subject: before.filename, action: "changed the alt text", field: "Alt text", from: before.alt || "(none)", to: alt || "(none)" });
    if (before.decorative !== decorative) audit({ actor: g.by, kind: "content", subjectId: id, subject: before.filename, action: "changed the decorative", field: "Decorative", from: before.decorative ? "yes" : "no", to: decorative ? "yes" : "no" });
    revalidatePath(PAGE);
    return { ok: true, message: "Description saved." };
  } catch { return { ok: false, error: oops }; }
}
