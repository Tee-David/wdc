import "server-only";

import type { PoolClient } from "pg";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";

/**
 * Folders in the media library: a tree of parent links, at most five deep.
 * See db/migrations/0029_media_folders.sql.
 *
 * Folders are virtual. Moving a file changes one column, never its key, so a
 * page already using its address keeps working.
 */

export const FOLDER_DEPTH = 5;
export const FOLDER_COLORS = ["navy", "orange", "green", "red", "amber"] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number];

export type MediaFolder = {
  id: string;
  parentId: string | null;
  depth: number;
  name: string;
  position: number;
  color: FolderColor | null;
  /** Files directly in this folder (not archived). */
  own: number;
  /** Files here and in every folder below. */
  total: number;
};

export type FolderTree = { folders: MediaFolder[]; unsorted: number; all: number };

const probe = globalThis as typeof globalThis & { __wdcMediaFolders?: Promise<boolean> };
/** Whether migration 0029 has run. Asked once per instance; a miss asks again next time. */
export function foldersReady(): Promise<boolean> {
  probe.__wdcMediaFolders ??= db.query("SELECT folder_id FROM media_assets LIMIT 0")
    .then(() => db.query("SELECT id FROM media_folders LIMIT 0"))
    .then(() => true, () => { probe.__wdcMediaFolders = undefined; return false; });
  return probe.__wdcMediaFolders;
}

/**
 * The whole tree in one read, with file counts. Counts that include
 * subfolders are summed up the tree here rather than in SQL: a few hundred
 * rows at most.
 */
export async function folderTree(): Promise<FolderTree> {
  if (!(await foldersReady())) return { folders: [], unsorted: 0, all: 0 };
  const [f, n] = await Promise.all([
    db.query<{ id: string; parent_id: string | null; depth: number; name: string; position: number; color: FolderColor | null }>(
      "SELECT id, parent_id, depth, name, position, color FROM media_folders ORDER BY position, lower(name)"),
    db.query<{ folder_id: string | null; n: string }>(
      "SELECT folder_id, count(*) AS n FROM media_assets WHERE archived_at IS NULL GROUP BY folder_id"),
  ]);
  const own = new Map(n.rows.map((r) => [r.folder_id ?? "", Number(r.n)]));
  const folders: MediaFolder[] = f.rows.map((r) => ({
    id: r.id, parentId: r.parent_id, depth: Number(r.depth), name: r.name, position: Number(r.position), color: r.color,
    own: own.get(r.id) ?? 0, total: own.get(r.id) ?? 0,
  }));
  const byId = new Map(folders.map((x) => [x.id, x]));
  /* Deepest first, so each folder's total is complete before it is added to its parent's. */
  for (const x of [...folders].sort((a, b) => b.depth - a.depth)) {
    if (x.parentId) { const p = byId.get(x.parentId); if (p) p.total += x.total; }
  }
  const all = [...own.values()].reduce((a, b) => a + b, 0);
  return { folders, unsorted: own.get("") ?? 0, all };
}

/** The ids of a folder and every folder below it. */
export async function subtreeIds(id: string, c: Pick<PoolClient, "query"> = db): Promise<string[]> {
  const r = await c.query<{ id: string }>(`
    WITH RECURSIVE t(id, n) AS (
      SELECT id, 1 FROM media_folders WHERE id = $1
      UNION ALL
      SELECT f.id, t.n + 1 FROM media_folders f JOIN t ON f.parent_id = t.id WHERE t.n < ${FOLDER_DEPTH + 1}
    ) SELECT id FROM t`, [id]);
  return r.rows.map((x) => x.id);
}

export type FolderResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const clean = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 40);
const clash = (e: unknown) => (e as { code?: string }).code === "23505";
const CLASH = "There is already a folder with that name here. Folder names only need to differ from their neighbours.";

export async function createFolder(name: string, parentId: string | null, by: string): Promise<FolderResult<{ id: string }>> {
  const n = clean(name);
  if (!n) return { ok: false, error: "Give the folder a name." };
  try {
    return await transaction(async (c) => {
      let depth = 1;
      if (parentId) {
        const p = await c.query<{ depth: number }>("SELECT depth FROM media_folders WHERE id = $1", [parentId]);
        if (!p.rows[0]) return { ok: false as const, error: "That folder is no longer there." };
        depth = Number(p.rows[0].depth) + 1;
        if (depth > FOLDER_DEPTH) return { ok: false as const, error: `Folders go ${FOLDER_DEPTH} levels deep at most.` };
      }
      const pos = await c.query<{ n: string }>("SELECT COALESCE(max(position), -1) + 1 AS n FROM media_folders WHERE parent_id IS NOT DISTINCT FROM $1", [parentId]);
      const r = await c.query<{ id: string }>(
        "INSERT INTO media_folders (parent_id, depth, name, position, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [parentId, depth, n, Number(pos.rows[0]?.n ?? 0), by]);
      return { ok: true as const, id: r.rows[0].id };
    });
  } catch (e) {
    if (clash(e)) return { ok: false, error: CLASH };
    throw e;
  }
}

export async function renameFolder(id: string, name: string): Promise<FolderResult<{ before: string; after: string }>> {
  const n = clean(name);
  if (!n) return { ok: false, error: "Give the folder a name." };
  try {
    const before = await db.query<{ name: string }>("SELECT name FROM media_folders WHERE id = $1", [id]);
    if (!before.rows[0]) return { ok: false, error: "That folder is no longer there." };
    await db.query("UPDATE media_folders SET name = $2 WHERE id = $1", [id, n]);
    return { ok: true, before: before.rows[0].name, after: n };
  } catch (e) {
    if (clash(e)) return { ok: false, error: CLASH };
    throw e;
  }
}

export async function setFolderColor(id: string, color: FolderColor | null): Promise<FolderResult<{ name: string }>> {
  const r = await db.query<{ name: string }>("UPDATE media_folders SET color = $2 WHERE id = $1 RETURNING name", [id, color]);
  return r.rows[0] ? { ok: true, name: r.rows[0].name } : { ok: false, error: "That folder is no longer there." };
}

/**
 * Move a folder under another (or to the top), before a sibling or at the
 * end, in one transaction. Refused: into itself or anything below it, deeper
 * than five levels once its own subtree is counted, or onto a sibling's name.
 */
export async function moveFolder(id: string, parentId: string | null, beforeId: string | null): Promise<FolderResult<{ name: string }>> {
  try {
    return await transaction(async (c) => {
      const me = await c.query<{ name: string; depth: number }>("SELECT name, depth FROM media_folders WHERE id = $1", [id]);
      if (!me.rows[0]) return { ok: false as const, error: "That folder is no longer there." };
      const sub = await subtreeIds(id, c);
      if (parentId && sub.includes(parentId)) return { ok: false as const, error: "A folder cannot go inside itself or one of its own folders." };
      let base = 0;
      if (parentId) {
        const p = await c.query<{ depth: number }>("SELECT depth FROM media_folders WHERE id = $1", [parentId]);
        if (!p.rows[0]) return { ok: false as const, error: "The folder you chose is no longer there." };
        base = Number(p.rows[0].depth);
      }
      const deepest = await c.query<{ d: number }>("SELECT max(depth) AS d FROM media_folders WHERE id = ANY($1::UUID[])", [sub]);
      const shift = base + 1 - Number(me.rows[0].depth);
      if (Number(deepest.rows[0]?.d ?? 0) + shift > FOLDER_DEPTH) {
        return { ok: false as const, error: `That would make it more than ${FOLDER_DEPTH} levels deep.` };
      }
      /* Siblings in their new order, with this one placed before `beforeId`. */
      const sibs = (await c.query<{ id: string }>(
        "SELECT id FROM media_folders WHERE parent_id IS NOT DISTINCT FROM $1 AND id != $2 ORDER BY position, lower(name)", [parentId, id])).rows.map((r) => r.id);
      const at = beforeId ? sibs.indexOf(beforeId) : -1;
      sibs.splice(at >= 0 ? at : sibs.length, 0, id);
      await c.query("UPDATE media_folders SET parent_id = $2 WHERE id = $1", [id, parentId]);
      if (shift) await c.query("UPDATE media_folders SET depth = depth + $2 WHERE id = ANY($1::UUID[])", [sub, shift]);
      for (let i = 0; i < sibs.length; i++) await c.query("UPDATE media_folders SET position = $2 WHERE id = $1", [sibs[i], i]);
      return { ok: true as const, name: me.rows[0].name };
    });
  } catch (e) {
    if (clash(e)) return { ok: false, error: "There is already a folder with that name there. Rename one of them first." };
    throw e;
  }
}

/**
 * Delete a folder in one transaction. Its files go to its parent (or to
 * Unsorted at the top), its folders move up one level, taking "(2)" if their
 * name is already used there, and then the folder itself goes. Nothing is
 * deleted but the folder.
 */
export async function deleteFolder(id: string): Promise<FolderResult<{ name: string; files: number; folders: number }>> {
  return transaction(async (c) => {
    const me = await c.query<{ name: string; parent_id: string | null }>("SELECT name, parent_id FROM media_folders WHERE id = $1", [id]);
    if (!me.rows[0]) return { ok: false as const, error: "That folder is no longer there." };
    const parent = me.rows[0].parent_id;
    /* Out of its children's way first: a child called the same as this
       folder moves up beside it before this row is gone. */
    await c.query("UPDATE media_folders SET name = '~' || left(id::TEXT, 30) WHERE id = $1", [id]);
    const files = await c.query("UPDATE media_assets SET folder_id = $2 WHERE folder_id = $1", [id, parent]);
    const kids = (await c.query<{ id: string; name: string }>("SELECT id, name FROM media_folders WHERE parent_id = $1 ORDER BY position", [id])).rows;
    const taken = new Set((await c.query<{ n: string }>(
      "SELECT lower(name) AS n FROM media_folders WHERE parent_id IS NOT DISTINCT FROM $1 AND id != $2", [parent, id])).rows.map((r) => r.n));
    const pos = Number((await c.query<{ n: string }>("SELECT COALESCE(max(position), -1) + 1 AS n FROM media_folders WHERE parent_id IS NOT DISTINCT FROM $1", [parent])).rows[0]?.n ?? 0);
    for (const [i, k] of kids.entries()) {
      let name = k.name;
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${k.name.slice(0, 34)} (${n})`;
      taken.add(name.toLowerCase());
      const sub = await subtreeIds(k.id, c);
      await c.query("UPDATE media_folders SET depth = depth - 1 WHERE id = ANY($1::UUID[])", [sub]);
      await c.query("UPDATE media_folders SET parent_id = $2, name = $3, position = $4 WHERE id = $1", [k.id, parent, name, pos + i]);
    }
    await c.query("DELETE FROM media_folders WHERE id = $1", [id]);
    return { ok: true as const, name: me.rows[0].name, files: files.rowCount ?? 0, folders: kids.length };
  });
}

/** Move files into a folder (null: Unsorted). Capped, and only files that exist. */
export async function moveFiles(ids: string[], folderId: string | null): Promise<FolderResult<{ moved: number; folder: string }>> {
  let folder = "Unsorted";
  if (folderId) {
    const f = await db.query<{ name: string }>("SELECT name FROM media_folders WHERE id = $1", [folderId]);
    if (!f.rows[0]) return { ok: false, error: "That folder is no longer there." };
    folder = f.rows[0].name;
  }
  const r = await db.query("UPDATE media_assets SET folder_id = $2 WHERE id = ANY($1::UUID[]) AND folder_id IS DISTINCT FROM $2", [ids.slice(0, 120), folderId]);
  return { ok: true, moved: r.rowCount ?? 0, folder };
}
