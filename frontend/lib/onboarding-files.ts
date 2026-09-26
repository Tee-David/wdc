import "server-only";

import { db } from "@/lib/db/pool";
import { presignGet, r2Config } from "@/lib/r2";

/**
 * The files behind an entry, with links the admin can open.
 *
 * Onboarding briefs record each upload in `onboarding_uploads` (migration
 * 0030) and keep only the names in the answer; built forms keep the key in
 * the answer itself. Either way the admin gets the same thing: a name, a
 * size, a type, which question it answered, and two signed links (open, and
 * download under its own name) that last an hour. The bucket stays private.
 */

export type EntryFile = {
  question: string;
  name: string;
  bytes: number;
  contentType: string;
  /** No record of where it went: sent before uploads were kept with briefs. */
  missing: boolean;
  /** Null when missing, or when the file store is not configured. */
  open: string | null;
  download: string | null;
  /** Where it is in the bucket, for the server only (the email's longer links). */
  key?: string;
};

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  pdf: "application/pdf", svg: "image/svg+xml", zip: "application/zip",
};
export const typeOf = (name: string, given = "") => given || TYPES[name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";

export async function recordUpload(u: { draftId: string; key: string; filename: string; bytes: number; contentType: string }) {
  await db.query(
    `INSERT INTO onboarding_uploads (draft_id, object_key, filename, bytes, content_type) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (object_key) DO NOTHING`,
    [u.draftId, u.key, u.filename.slice(0, 200), Math.max(0, Math.round(u.bytes)), u.contentType.slice(0, 100)],
  );
}

function links(key: string, name: string) {
  const r2 = r2Config();
  if (!r2.ok) return { open: null, download: null };
  return { open: presignGet({ config: r2.config, key }), download: presignGet({ config: r2.config, key, download: name }) };
}

/**
 * An onboarding brief's files: each name in an upload answer, matched to the
 * latest upload of that name for this brief. A name with no record (a brief
 * sent before 0030) is still listed, without links, so it is never silently
 * missing.
 */
export async function onboardingFiles(draftId: string, answers: Record<string, unknown>, uploadFields: { key: string; label: string }[]): Promise<EntryFile[]> {
  const wanted = uploadFields.flatMap((f) => {
    const v = answers[f.key];
    return (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []).map((name) => ({ question: f.label, name: String(name) }));
  });
  if (!wanted.length) return [];
  let rows: { object_key: string; filename: string; bytes: string; content_type: string }[] = [];
  try {
    rows = (await db.query<{ object_key: string; filename: string; bytes: string; content_type: string }>(
      "SELECT object_key, filename, bytes, content_type FROM onboarding_uploads WHERE draft_id = $1 ORDER BY created_at DESC", [draftId])).rows;
  } catch { /* the table is not there yet (0030 unapplied): names only */ }
  const used = new Set<string>();
  return wanted.map(({ question, name }) => {
    const row = rows.find((r) => r.filename === name && !used.has(r.object_key));
    if (!row) return { question, name, bytes: 0, contentType: typeOf(name), missing: true, open: null, download: null };
    used.add(row.object_key);
    return { question, name, bytes: Number(row.bytes), contentType: typeOf(name, row.content_type), missing: false, key: row.object_key, ...links(row.object_key, name) };
  });
}

/** A built form's files, whose answers carry their own keys. */
export function customFiles(items: { question: string; key: string; name: string; size: number }[]): EntryFile[] {
  return items.map((x) => ({ question: x.question, name: x.name, bytes: x.size, contentType: typeOf(x.name), missing: false, key: x.key, ...links(x.key, x.name) }));
}
