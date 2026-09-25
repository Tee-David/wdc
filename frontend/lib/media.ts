import "server-only";

import { db } from "@/lib/db/pool";
import { r2Config, r2PublicBase } from "@/lib/r2";

/**
 * The media library's rows. See `db/migrations/0011_media_library.sql` for
 * why a row follows the object and why nothing here deletes.
 */

export type MediaAsset = {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  bytes: number;
  alt: string;
  uploadedBy: string;
  uploadedAt: string;
  archivedAt: string | null;
  archivedBy: string | null;
  /** Where the public site reads it from. Null when no public base is set. */
  url: string | null;
};

type Row = {
  id: string; key: string; filename: string; content_type: string; bytes: string | number;
  alt: string; uploaded_by: string; uploaded_at: Date; archived_at: Date | null; archived_by: string | null;
};

/** The page is bounded, and says so, rather than growing without limit. */
export const MEDIA_PAGE = 120;

export function mediaDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/** Public URL for a key, or null when CLOUDFLARE_R2_URL is not set. */
export function mediaUrl(key: string) {
  const r2 = r2Config();
  const base = r2.ok ? r2.config.publicBase : r2PublicBase();
  return base ? `${base}/${key}` : null;
}

function toAsset(r: Row): MediaAsset {
  return {
    id: r.id,
    key: r.key,
    filename: r.filename,
    contentType: r.content_type,
    bytes: Number(r.bytes),
    alt: r.alt,
    uploadedBy: r.uploaded_by,
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    archivedAt: r.archived_at ? new Date(r.archived_at).toISOString() : null,
    archivedBy: r.archived_by,
    url: mediaUrl(r.key),
  };
}

const COLUMNS = "id, key, filename, content_type, bytes, alt, uploaded_by, uploaded_at, archived_at, archived_by";

/**
 * One page of the library, newest first. `q` looks in the file name and the
 * description ON THE SERVER, so a file older than the first page can still be
 * found by name; `page` walks back through the rest, a page at a time.
 */
export async function listMedia({ archived = false, q = "", page = 1 }: { archived?: boolean; q?: string; page?: number } = {}): Promise<{ items: MediaAsset[]; total: number }> {
  const needle = q.trim().slice(0, 80);
  const params: unknown[] = [];
  let where = archived ? "archived_at IS NOT NULL" : "archived_at IS NULL";
  if (needle) {
    params.push(`%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where += ` AND (filename ILIKE $1 OR alt ILIKE $1)`;
  }
  const offset = (Math.max(1, Math.floor(page)) - 1) * MEDIA_PAGE;
  const [rows, count] = await Promise.all([
    db.query<Row>(`SELECT ${COLUMNS} FROM media_assets WHERE ${where} ORDER BY uploaded_at DESC, id DESC LIMIT ${MEDIA_PAGE} OFFSET ${offset}`, params),
    db.query<{ n: string }>(`SELECT count(*) AS n FROM media_assets WHERE ${where}`, params),
  ]);
  return { items: rows.rows.map(toAsset), total: Number(count.rows[0]?.n ?? 0) };
}

export async function mediaCounts(): Promise<{ live: number; archived: number }> {
  const r = await db.query<{ live: string; archived: string }>(
    `SELECT count(*) FILTER (WHERE archived_at IS NULL) AS live,
            count(*) FILTER (WHERE archived_at IS NOT NULL) AS archived
       FROM media_assets`,
  );
  return { live: Number(r.rows[0]?.live ?? 0), archived: Number(r.rows[0]?.archived ?? 0) };
}

/**
 * Records an upload. ON CONFLICT DO NOTHING because the key is unique and a
 * second press of the same upload must be a no-op, not a second row; the
 * existing row is returned either way.
 */
export async function recordMedia(m: { key: string; filename: string; contentType: string; bytes: number; alt: string; by: string }) {
  await db.query(
    `INSERT INTO media_assets (key, filename, content_type, bytes, alt, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (key) DO NOTHING`,
    [m.key, m.filename, m.contentType, m.bytes, m.alt, m.by],
  );
  const r = await db.query<Row>(`SELECT ${COLUMNS} FROM media_assets WHERE key = $1`, [m.key]);
  return r.rows[0] ? toAsset(r.rows[0]) : null;
}

export async function mediaById(id: string) {
  const r = await db.query<Row>(`SELECT ${COLUMNS} FROM media_assets WHERE id = $1`, [id]);
  return r.rows[0] ? toAsset(r.rows[0]) : null;
}

export async function setMediaAlt(id: string, alt: string) {
  const r = await db.query("UPDATE media_assets SET alt = $2 WHERE id = $1", [id, alt]);
  return (r.rowCount ?? 0) > 0;
}

export async function setMediaArchived(id: string, archived: boolean, by: string) {
  const r = archived
    ? await db.query("UPDATE media_assets SET archived_at = now(), archived_by = $2 WHERE id = $1 AND archived_at IS NULL", [id, by])
    : await db.query("UPDATE media_assets SET archived_at = NULL, archived_by = NULL WHERE id = $1 AND archived_at IS NOT NULL", [id]);
  return (r.rowCount ?? 0) > 0;
}
