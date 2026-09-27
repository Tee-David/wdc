import "server-only";

import type { PoolClient } from "pg";
import { db } from "@/lib/db/pool";

/**
 * EARLIER VERSIONS: a live post's last 25, and the FAQ's last 10
 * (migration 0032).
 *
 * The snapshot is the row as it stood BEFORE a save, written in the save's
 * own transaction, so there is no version of a live post that readers saw
 * and the history does not have. Restoring is a save like any other, so it
 * too leaves the version it replaced behind: nothing here is one-way.
 */

export const POST_REVISIONS_KEPT = 25;
export const FAQ_REVISIONS_KEPT = 10;

/** The content columns a revision carries; slug, status and dates stay the post's own. */
export const POST_CONTENT_COLUMNS = ["title", "seo_title", "description", "excerpt", "topic", "tags", "cover", "body", "canonical", "social_image"] as const;

const G = globalThis as typeof globalThis & { __wdcRevisionTables?: Promise<boolean> };

/** The tables, made once per instance if the migration has not run. False if they cannot be. */
export function revisionTables(): Promise<boolean> {
  G.__wdcRevisionTables ??= (async () => {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS blog_post_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), post_id UUID NOT NULL, content JSONB NOT NULL,
        saved_by STRING NOT NULL, saved_at TIMESTAMPTZ NOT NULL, kept_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await db.query("CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON blog_post_revisions (post_id, kept_at DESC)");
      await db.query(`CREATE TABLE IF NOT EXISTS site_content_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), key STRING NOT NULL, value JSONB NULL,
        saved_by STRING NOT NULL, saved_at TIMESTAMPTZ NOT NULL, kept_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await db.query("CREATE INDEX IF NOT EXISTS site_content_history_key_idx ON site_content_history (key, kept_at DESC)");
      return true;
    } catch (error) {
      console.error("[revisions] history is off on this instance:", error instanceof Error ? error.message : error);
      G.__wdcRevisionTables = undefined;
      return false;
    }
  })();
  return G.__wdcRevisionTables;
}

const contentOf = `jsonb_build_object(${POST_CONTENT_COLUMNS.map((c) => `'${c}', ${c}`).join(", ")})`;

/**
 * Keep the post as it stands now, inside the caller's transaction, and trim
 * to the newest 25. With `next`, nothing is kept when the save changes none
 * of the words: pressing Update twice is not two versions.
 */
export async function keepPostVersion(c: Pick<PoolClient, "query">, postId: string, next?: Record<string, unknown>) {
  await c.query(
    `INSERT INTO blog_post_revisions (post_id, content, saved_by, saved_at)
     SELECT id, ${contentOf}, COALESCE(saved_by, 'Studio'), COALESCE(saved_at, created_at) FROM blog_posts
     WHERE id = $1 ${next ? `AND ${contentOf} IS DISTINCT FROM $2::JSONB` : ""}`,
    next ? [postId, JSON.stringify(next)] : [postId],
  );
  await c.query(
    `DELETE FROM blog_post_revisions WHERE post_id = $1 AND id NOT IN (
       SELECT id FROM blog_post_revisions WHERE post_id = $1 ORDER BY kept_at DESC LIMIT ${POST_REVISIONS_KEPT})`,
    [postId],
  );
}

export type Revision = { id: string; by: string; at: string; title: string };

export async function postRevisions(postId: string): Promise<Revision[]> {
  if (!(await revisionTables())) return [];
  const r = await db.query<{ id: string; saved_by: string; saved_at: Date; title: string }>(
    `SELECT id, saved_by, saved_at, content->>'title' AS title FROM blog_post_revisions
     WHERE post_id = $1 ORDER BY kept_at DESC LIMIT ${POST_REVISIONS_KEPT}`, [postId],
  );
  return r.rows.map((x) => ({ id: x.id, by: x.saved_by, at: new Date(x.saved_at).toISOString(), title: x.title }));
}

/**
 * Put a revision's words back on the post. The slug, the status and the dates
 * are the post's own and are not touched; the version being replaced is kept
 * first, so this can itself be undone.
 */
export async function restorePostRevision(c: Pick<PoolClient, "query">, postId: string, revisionId: string, by: string) {
  const rev = await c.query<{ content: Record<string, unknown> }>(
    "SELECT content FROM blog_post_revisions WHERE id = $1 AND post_id = $2", [revisionId, postId],
  );
  const content = rev.rows[0]?.content;
  if (!content) return null;
  await keepPostVersion(c, postId);
  const sets = POST_CONTENT_COLUMNS.map((col, i) => `${col} = ${col === "tags" || col === "body" ? `$${i + 1}::JSONB` : `$${i + 1}`}`);
  const args = POST_CONTENT_COLUMNS.map((col) => (col === "tags" || col === "body" ? JSON.stringify(content[col] ?? (col === "tags" ? [] : null)) : content[col] ?? null));
  const r = await c.query<{ slug: string; title: string }>(
    `UPDATE blog_posts SET ${sets.join(", ")}, saved_by = $${args.length + 1}, saved_at = now()
     WHERE id = $${args.length + 2} AND trashed_at IS NULL RETURNING slug, title`,
    [...args, by, postId],
  );
  return r.rows[0] ?? null;
}

/** Keep a site_content value as it stands (a missing row is kept as "what shipped"), then trim. */
export async function keepContentVersion(c: Pick<PoolClient, "query">, key: string) {
  const now = await c.query<{ value: unknown; saved_by: string; saved_at: Date }>("SELECT value, saved_by, saved_at FROM site_content WHERE key = $1", [key]);
  const row = now.rows[0];
  await c.query("INSERT INTO site_content_history (key, value, saved_by, saved_at) VALUES ($1, $2::JSONB, $3, $4)",
    [key, row ? JSON.stringify(row.value) : null, row?.saved_by ?? "What shipped", row?.saved_at ?? new Date()]);
  await c.query(
    `DELETE FROM site_content_history WHERE key = $1 AND id NOT IN (
       SELECT id FROM site_content_history WHERE key = $1 ORDER BY kept_at DESC LIMIT ${FAQ_REVISIONS_KEPT})`, [key],
  );
}

export type ContentVersion = { id: string; by: string; at: string; shipped: boolean; count: number };

export async function contentHistory(key: string): Promise<ContentVersion[]> {
  if (!(await revisionTables())) return [];
  const r = await db.query<{ id: string; saved_by: string; saved_at: Date; value: unknown }>(
    `SELECT id, saved_by, saved_at, value FROM site_content_history WHERE key = $1 ORDER BY kept_at DESC LIMIT ${FAQ_REVISIONS_KEPT}`, [key],
  );
  return r.rows.map((x) => ({
    id: x.id, by: x.saved_by, at: new Date(x.saved_at).toISOString(),
    shipped: x.value === null, count: Array.isArray(x.value) ? x.value.length : 0,
  }));
}

export async function contentVersion(id: string, key: string): Promise<{ value: unknown } | null> {
  const r = await db.query<{ value: unknown }>("SELECT value FROM site_content_history WHERE id = $1 AND key = $2", [id, key]);
  return r.rows[0] ?? null;
}
