import "server-only";

import { db } from "@/lib/db/pool";

/**
 * The client and project the studio has assigned an entry to
 * (migration 0033). Reads never throw: an entry list must draw even if this
 * table is unreachable, it just falls back to matching by email or phone.
 */

export type EntryLink = { entryId: string; clientId: string; projectId: string | null; by: string; at: string };

let ready: Promise<void> | null = null;
/** Makes the table if the migration has not been applied yet, once per instance. */
function ensure() {
  ready ??= db.query(`
    CREATE TABLE IF NOT EXISTS entry_links (
      entry_id UUID PRIMARY KEY, form_key STRING NOT NULL, client_id STRING NOT NULL,
      project_id STRING NULL, linked_by STRING NOT NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`).then(() => undefined).catch((error) => { ready = null; throw error; });
  return ready;
}

type Row = { entry_id: string; client_id: string; project_id: string | null; linked_by: string; linked_at: Date };
const toLink = (r: Row): EntryLink => ({
  entryId: r.entry_id, clientId: r.client_id, projectId: r.project_id, by: r.linked_by, at: new Date(r.linked_at).toISOString(),
});

export async function linksFor(ids: string[]): Promise<Map<string, EntryLink>> {
  const out = new Map<string, EntryLink>();
  if (!ids.length) return out;
  try {
    await ensure();
    const r = await db.query<Row>("SELECT entry_id, client_id, project_id, linked_by, linked_at FROM entry_links WHERE entry_id = ANY($1::UUID[])", [ids]);
    for (const row of r.rows) out.set(String(row.entry_id), toLink(row));
  } catch (error) {
    console.error("[forms] entry links unavailable", error instanceof Error ? error.message : error);
  }
  return out;
}

export async function linkFor(id: string): Promise<EntryLink | null> {
  return (await linksFor([id])).get(id) ?? null;
}

/** Assign (or reassign) an entry. Throws if the row cannot be written. */
export async function setLink(formKey: string, entryId: string, clientId: string, projectId: string | null, by: string) {
  await ensure();
  await db.query(`
    INSERT INTO entry_links (entry_id, form_key, client_id, project_id, linked_by) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (entry_id) DO UPDATE SET client_id = $3, project_id = $4, linked_by = $5, linked_at = now()
  `, [entryId, formKey, clientId, projectId, by.slice(0, 120)]);
}
