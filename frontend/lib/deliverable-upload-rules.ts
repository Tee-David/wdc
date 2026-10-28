/**
 * What a deliverable upload may be, shared by the picker and the server that
 * signs it, so the two cannot disagree. Pure: no server imports.
 *
 * DELIVERABLES ARE NOT MEDIA. The media library is for things drawn on the
 * public site, so it takes pictures, PDF and short video. Finished work is
 * handed over as packs, source files and fonts, most often a zip, and it is
 * the client's, so it lives in the private bucket under its project
 * (`deliverables/<projectId>/`) and is only ever read through short-lived
 * signed links (lib/deliverable-files.ts). Older versions keep their media
 * keys and still open.
 */
export const DELIVERABLE_TYPES: Readonly<Record<string, string>> = {
  zip: "application/zip",
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif",
  /* Opened on the bucket's domain through a signed link, never drawn inline on ours. */
  svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  mp3: "audio/mpeg", wav: "audio/wav",
  ai: "application/postscript", eps: "application/postscript", psd: "image/vnd.adobe.photoshop",
  fig: "application/octet-stream", indd: "application/octet-stream",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2",
};

/* ponytail: one presigned PUT, so one request per file; R2 takes up to 5GB that way. 250MB covers a brand pack
   or a site export; past that, multipart upload, or a link in the "Add a link" field. */
export const DELIVERABLE_MAX_BYTES = 250 * 1024 * 1024;

export const DELIVERABLE_ACCEPT = Object.keys(DELIVERABLE_TYPES).map((e) => `.${e}`).join(",");

export const deliverableExt = (filename: string) => {
  const ext = filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase();
  return ext && DELIVERABLE_TYPES[ext] ? ext : null;
};

export type DeliverableCheck = { ok: true; ext: string; contentType: string } | { ok: false; error: string };

export function checkDeliverableFile(filename: string, size: number): DeliverableCheck {
  const name = filename.trim();
  if (!name) return { ok: false, error: "That file has no name we can use." };
  const ext = deliverableExt(name);
  if (!ext) return { ok: false, error: `${name} is not a kind of file deliverables take. Zip it first, or add a link instead.` };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: `${name} is empty.` };
  if (size > DELIVERABLE_MAX_BYTES) return { ok: false, error: `${name} is over ${DELIVERABLE_MAX_BYTES / 1024 / 1024}MB. Split it, or add a link to where it is stored instead.` };
  return { ok: true, ext, contentType: DELIVERABLE_TYPES[ext] };
}

/** A key this site issued for a deliverable of this project, and nothing else. */
export const DELIVERABLE_KEY = /^deliverables\/([A-Za-z0-9_-]{1,64})\/[a-z0-9]{6,16}-[a-f0-9]{8}\.([a-z0-9]{1,8})$/;

export function deliverableKeyProject(key: string): string | null {
  const m = key.match(DELIVERABLE_KEY);
  return m && DELIVERABLE_TYPES[m[2]] ? m[1] : null;
}
