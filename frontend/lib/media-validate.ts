/**
 * What the media library accepts, shared by the server that signs an upload
 * and the page that picks the file, so the two cannot disagree.
 *
 * Pure: no server imports, so the picker can use it and a test can too.
 */

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
/** A short clip for a blog post: a minute or so of web video, not a film. */
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
export const VIDEO_EXTENSIONS = ["mp4", "webm"] as const;
export const isVideoExt = (ext: string) => (VIDEO_EXTENSIONS as readonly string[]).includes(ext);
/** The size limit for a file of this extension. */
export const maxBytesFor = (ext: string | null) => (ext && isVideoExt(ext) ? VIDEO_MAX_BYTES : MEDIA_MAX_BYTES);
export const MEDIA_ALT_MAX = 250;

/* Extension to the type the upload is SIGNED as. The browser's reported MIME
   type is a hint; this table is the decision.

   NO SVG, ON PURPOSE. Everything here is meant to be shown on the public site,
   and an SVG is a document that can carry a script. The onboarding uploader
   takes SVG only because its files are opened from R2's own domain and never
   drawn inline on ours; a library whose whole job is to be drawn inline on
   ours cannot make that promise. A logo that needs to be vector ships in
   `public/` through a commit, where a person reads it first. */
export const MEDIA_TYPES: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};

export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).map((e) => `.${e}`).join(",");

export function mediaExtension(filename: string): string | null {
  const ext = filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase();
  return ext && MEDIA_TYPES[ext] ? ext : null;
}

export type MediaCheck =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; error: string };

/** The same answer on both sides of the upload. */
export function checkMediaFile(filename: string, size: number): MediaCheck {
  const name = filename.trim();
  if (!name) return { ok: false, error: "That file has no name we can use." };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: `${name} is empty.` };
  const ext = mediaExtension(name);
  if (size > maxBytesFor(ext)) {
    return {
      ok: false,
      error: ext && isVideoExt(ext)
        ? `${name} is over ${VIDEO_MAX_BYTES / 1024 / 1024}MB. Trim it or export it at 1080p or smaller; a clip for a post rarely needs more than 20MB.`
        : `${name} is over ${MEDIA_MAX_BYTES / 1024 / 1024}MB. Resize it first; a web image rarely needs to be more than 1MB.`,
    };
  }
  if (!ext) {
    return {
      ok: false,
      error: /\.svg$/i.test(name)
        ? `${name} is an SVG, which the library does not take: it can carry a script and these files are shown on the public site. Export a PNG or WebP.`
        : `${name} is not a type the library takes. PNG, JPEG, WebP, AVIF, GIF, PDF, or an MP4 or WebM video.`,
    };
  }
  return { ok: true, ext, contentType: MEDIA_TYPES[ext] };
}

/**
 * A key the server issued: media/YYYY/MM/<stamp>-<random>.<ext>.
 *
 * Checked again when the upload is recorded, because the key comes back from
 * the browser and must not be able to name anything outside the library.
 */
export const MEDIA_KEY = /^media\/\d{4}\/\d{2}\/[a-z0-9]{6,16}-[a-z0-9]{6,12}\.([a-z0-9]{1,8})$/;

export function isMediaKey(key: string) {
  const ext = key.match(MEDIA_KEY)?.[1];
  return Boolean(ext && MEDIA_TYPES[ext]);
}

export function readableBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / 1024 / 1024;
  if (mb < 1024) return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
}
