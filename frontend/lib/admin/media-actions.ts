"use server";

import { revalidatePath } from "next/cache";
import { headObject, mediaKey, presignPut, r2Config } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { checkMediaFile, isMediaKey, maxBytesFor, MEDIA_ALT_MAX, MEDIA_TYPES } from "@/lib/media-validate";
import { mediaById, mediaDatabaseConfigured, recordMedia, setMediaAlt, setMediaArchived, type MediaAsset } from "@/lib/media";
import { audit } from "./store";
import { actorName, allow } from "./guard";
import { FAIL, OK, str, type ActionState } from "./validate";

const PAGE = "/admin/settings/media";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
export async function recordMediaUpload(input: { key: string; filename: string }): Promise<{ ok: true; item: MediaAsset } | { ok: false; error: string }> {
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
