import "server-only";

import { db } from "@/lib/db/pool";

export type EntryEvent = {
  id: string; kind: "note" | "state" | "email" | "client"; body: string; actor: string; ref: string | null; at: string;
};

/** Add lines to entries' timelines. Never throws: a lost line is not worth failing the action. */
export async function addEvents(formKey: string, entryIds: string[], kind: EntryEvent["kind"], body: string, actor: string, ref?: string) {
  if (!entryIds.length) return;
  try {
    await db.query(`
      INSERT INTO entry_events (form_key, entry_id, kind, body, actor, ref)
      SELECT $1, e, $3, $4, $5, $6 FROM unnest($2::UUID[]) AS e
    `, [formKey, entryIds, kind, body.slice(0, 2000), actor.slice(0, 120), ref ?? null]);
  } catch (error) {
    console.error("[forms] timeline write failed", error instanceof Error ? error.message : error);
  }
}

export async function eventsFor(entryId: string): Promise<EntryEvent[]> {
  const r = await db.query<{ id: string; kind: EntryEvent["kind"]; body: string; actor: string; ref: string | null; created_at: Date }>(
    "SELECT id, kind, body, actor, ref, created_at FROM entry_events WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 200",
    [entryId],
  );
  return r.rows.map((x) => ({ id: x.id, kind: x.kind, body: x.body, actor: x.actor, ref: x.ref, at: new Date(x.created_at).toISOString() }));
}
