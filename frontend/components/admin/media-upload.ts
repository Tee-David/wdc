"use client";

import { recordMediaUpload, signMediaUpload } from "@/lib/admin/media-actions";
import { checkMediaFile } from "@/lib/media-validate";

/**
 * ONE PICTURE INTO THE MEDIA LIBRARY: checked here, signed by the server, put
 * straight into the bucket, then checked again by the server against the
 * bucket before it is listed. The same two steps the editor's Picture panel
 * and the blog cover use, so a post never points at a file the library does
 * not know about. Resolves to the file's public address, or an error to show.
 */
export async function uploadToMedia(f: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const local = checkMediaFile(f.name, f.size);
  if (!local.ok) return { ok: false, error: local.error };
  const grant = await signMediaUpload({ filename: f.name, size: f.size }).catch(() => null);
  if (!grant?.ok) return { ok: false, error: grant?.error ?? "The upload could not be started. Check your connection and try again." };
  const put = await fetch(grant.url, { method: "PUT", headers: { "Content-Type": grant.contentType }, body: f }).then((r) => r.ok).catch(() => false);
  if (!put) return { ok: false, error: "The file store did not accept the upload. If this keeps happening, check the bucket's CORS policy allows this site." };
  const recorded = await recordMediaUpload({ key: grant.key, filename: f.name }).catch(() => null);
  if (!recorded?.ok || !recorded.item.url) return { ok: false, error: (recorded && !recorded.ok && recorded.error) || "The file arrived but could not be listed. Try again." };
  return { ok: true, url: recorded.item.url };
}
