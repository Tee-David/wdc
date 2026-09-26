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
  caption: string;
  /** An empty description on purpose: the picture carries no information. */
  decorative: boolean;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  /** Where the public site reads it from. Null when no public base is set. */
  url: string | null;
};

type Row = {
  id: string; key: string; filename: string; content_type: string; bytes: string | number;
  alt: string; uploaded_by: string; uploaded_at: Date; archived_at: Date | null; archived_by: string | null;
  caption?: string | null; decorative?: boolean | null; width?: number | null; height?: number | null; duration_ms?: number | null;
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
    caption: r.caption ?? "",
    decorative: Boolean(r.decorative),
    width: r.width ?? null,
    height: r.height ?? null,
    durationMs: r.duration_ms ?? null,
    url: mediaUrl(r.key),
  };
}

const BASE = "id, key, filename, content_type, bytes, alt, uploaded_by, uploaded_at, archived_at, archived_by";
const DETAILS = ", caption, decorative, width, height, duration_ms";

/* THE DETAIL COLUMNS ARRIVE WITH MIGRATION 0028. Until it has run (a deploy
   that ships code ahead of its schema, which Settings › System reports), the
   library still lists with the columns it had, and the details read as empty
   instead of the whole screen failing. Asked once per instance. */
const probe = globalThis as typeof globalThis & { __wdcMediaDetails?: Promise<boolean> };
export function mediaHasDetails(): Promise<boolean> {
  probe.__wdcMediaDetails ??= db.query("SELECT caption, decorative, width, height, duration_ms FROM media_assets LIMIT 0")
    .then(() => true, () => { probe.__wdcMediaDetails = undefined; return false; });
  return probe.__wdcMediaDetails;
}
const columns = async () => BASE + ((await mediaHasDetails()) ? DETAILS : "");

export const MEDIA_KINDS = ["image", "video", "pdf"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const MEDIA_SORTS = { new: "uploaded_at DESC, id DESC", old: "uploaded_at ASC, id ASC", name: "lower(filename) ASC, id ASC", big: "bytes DESC, id DESC" } as const;
export type MediaSort = keyof typeof MEDIA_SORTS;
export type MediaQuery = {
  archived?: boolean; q?: string; page?: number; per?: number;
  kind?: MediaKind | ""; sort?: MediaSort; month?: string; by?: string; needsAlt?: boolean;
};
const KIND_SQL: Record<MediaKind, string> = {
  image: "content_type LIKE 'image/%'",
  video: "content_type LIKE 'video/%'",
  pdf: "content_type = 'application/pdf'",
};

/**
 * One page of the library. Everything that narrows it is in the URL, so a
 * filtered view is a link: the kind (by content type), who uploaded it, the
 * month (Lagos time), "needs a description" (a picture with no alt that is
 * not marked decorative), and words in the name, description or caption.
 * `q` is searched ON THE SERVER, so a file older than the first page can
 * still be found by name.
 */
export async function listMedia(query: MediaQuery = {}): Promise<{ items: MediaAsset[]; total: number }> {
  const { archived = false, q = "", page = 1, per = MEDIA_PAGE, kind = "", sort = "new", month = "", by = "", needsAlt = false } = query;
  const details = await mediaHasDetails();
  const params: unknown[] = [];
  const where = [archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"];
  const needle = q.trim().slice(0, 80);
  if (needle) {
    params.push(`%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(filename ILIKE $${params.length} OR alt ILIKE $${params.length}${details ? ` OR caption ILIKE $${params.length}` : ""})`);
  }
  if (kind && KIND_SQL[kind]) where.push(KIND_SQL[kind]);
  if (by) { params.push(by.slice(0, 120)); where.push(`uploaded_by = $${params.length}`); }
  if (/^\d{4}-\d{2}$/.test(month)) {
    /* Lagos is UTC+1 all year. */
    params.push(`${month}-01T00:00:00+01:00`);
    where.push(`uploaded_at >= $${params.length}::TIMESTAMPTZ AND uploaded_at < $${params.length}::TIMESTAMPTZ + INTERVAL '1 month'`);
  }
  if (needsAlt) where.push(`content_type LIKE 'image/%' AND alt = ''${details ? " AND NOT decorative" : ""}`);
  const clause = where.join(" AND ");
  const size = Math.min(120, Math.max(12, Math.floor(per)));
  const offset = (Math.max(1, Math.floor(page)) - 1) * size;
  const order = MEDIA_SORTS[sort] ?? MEDIA_SORTS.new;
  const [rows, count] = await Promise.all([
    db.query<Row>(`SELECT ${await columns()} FROM media_assets WHERE ${clause} ORDER BY ${order} LIMIT ${size} OFFSET ${offset}`, params),
    db.query<{ n: string }>(`SELECT count(*) AS n FROM media_assets WHERE ${clause}`, params),
  ]);
  return { items: rows.rows.map(toAsset), total: Number(count.rows[0]?.n ?? 0) };
}

/** What the library holds, for the tabs, the filters and the storage meter. One read. */
export async function mediaSummary(): Promise<{
  live: number; archived: number; kinds: Record<MediaKind, number>; needsAlt: number;
  bytes: Record<MediaKind | "other", number>; uploaders: string[]; months: string[];
}> {
  const details = await mediaHasDetails();
  const [a, b, c] = await Promise.all([
    db.query<Record<string, string>>(`
      SELECT count(*) FILTER (WHERE archived_at IS NULL) AS live,
             count(*) FILTER (WHERE archived_at IS NOT NULL) AS archived,
             count(*) FILTER (WHERE archived_at IS NULL AND ${KIND_SQL.image}) AS image,
             count(*) FILTER (WHERE archived_at IS NULL AND ${KIND_SQL.video}) AS video,
             count(*) FILTER (WHERE archived_at IS NULL AND ${KIND_SQL.pdf}) AS pdf,
             count(*) FILTER (WHERE archived_at IS NULL AND ${KIND_SQL.image} AND alt = ''${details ? " AND NOT decorative" : ""}) AS needs,
             COALESCE(sum(bytes) FILTER (WHERE ${KIND_SQL.image}), 0) AS b_image,
             COALESCE(sum(bytes) FILTER (WHERE ${KIND_SQL.video}), 0) AS b_video,
             COALESCE(sum(bytes) FILTER (WHERE ${KIND_SQL.pdf}), 0) AS b_pdf,
             COALESCE(sum(bytes), 0) AS b_all
        FROM media_assets`),
    db.query<{ by: string }>("SELECT DISTINCT uploaded_by AS by FROM media_assets WHERE archived_at IS NULL ORDER BY 1 LIMIT 40"),
    db.query<{ m: string }>(`SELECT DISTINCT to_char(uploaded_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM') AS m FROM media_assets WHERE archived_at IS NULL ORDER BY 1 DESC LIMIT 36`),
  ]);
  const r = a.rows[0] ?? {};
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    live: n("live"), archived: n("archived"),
    kinds: { image: n("image"), video: n("video"), pdf: n("pdf") },
    needsAlt: n("needs"),
    bytes: { image: n("b_image"), video: n("b_video"), pdf: n("b_pdf"), other: Math.max(0, n("b_all") - n("b_image") - n("b_video") - n("b_pdf")) },
    uploaders: b.rows.map((x) => x.by),
    months: c.rows.map((x) => x.m),
  };
}

/** The storage budget the meter measures against: MEDIA_BUDGET_GB, default 10 (R2's free tier). */
export function mediaBudgetBytes() {
  const gb = Number(process.env.MEDIA_BUDGET_GB);
  return (Number.isFinite(gb) && gb > 0 ? gb : 10) * 1024 ** 3;
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
export async function recordMedia(m: {
  key: string; filename: string; contentType: string; bytes: number; alt: string; by: string;
  width?: number | null; height?: number | null; durationMs?: number | null;
}) {
  if (await mediaHasDetails()) {
    await db.query(
      `INSERT INTO media_assets (key, filename, content_type, bytes, alt, uploaded_by, width, height, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (key) DO NOTHING`,
      [m.key, m.filename, m.contentType, m.bytes, m.alt, m.by, m.width ?? null, m.height ?? null, m.durationMs ?? null],
    );
  } else {
    await db.query(
      `INSERT INTO media_assets (key, filename, content_type, bytes, alt, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (key) DO NOTHING`,
      [m.key, m.filename, m.contentType, m.bytes, m.alt, m.by],
    );
  }
  const r = await db.query<Row>(`SELECT ${await columns()} FROM media_assets WHERE key = $1`, [m.key]);
  return r.rows[0] ? toAsset(r.rows[0]) : null;
}

export async function mediaById(id: string) {
  const r = await db.query<Row>(`SELECT ${await columns()} FROM media_assets WHERE id = $1`, [id]);
  return r.rows[0] ? toAsset(r.rows[0]) : null;
}

export async function setMediaAlt(id: string, alt: string) {
  const r = await db.query("UPDATE media_assets SET alt = $2 WHERE id = $1", [id, alt]);
  return (r.rowCount ?? 0) > 0;
}

/** Name, description, decorative and caption, together. The name is for people; the key never changes. */
export async function setMediaDetails(id: string, d: { filename: string; alt: string; decorative: boolean; caption: string }) {
  const r = (await mediaHasDetails())
    ? await db.query("UPDATE media_assets SET filename = $2, alt = $3, decorative = $4, caption = $5 WHERE id = $1", [id, d.filename, d.alt, d.decorative, d.caption])
    : await db.query("UPDATE media_assets SET filename = $2, alt = $3 WHERE id = $1", [id, d.filename, d.alt]);
  return (r.rowCount ?? 0) > 0;
}

export async function setMediaArchived(id: string, archived: boolean, by: string) {
  const r = archived
    ? await db.query("UPDATE media_assets SET archived_at = now(), archived_by = $2 WHERE id = $1 AND archived_at IS NULL", [id, by])
    : await db.query("UPDATE media_assets SET archived_at = NULL, archived_by = NULL WHERE id = $1 AND archived_at IS NOT NULL", [id]);
  return (r.rowCount ?? 0) > 0;
}
