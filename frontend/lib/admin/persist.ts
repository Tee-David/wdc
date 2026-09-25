import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db/pool";
import { persistedCollections } from "@/lib/admin/store";

/**
 * THE ADMIN'S RECORDS, KEPT (migration 0025).
 *
 * lib/admin/store.ts holds clients, projects, money, tickets and the work in
 * arrays, and every screen reads them synchronously. That made them vanish on
 * every deploy and disagree between Vercel instances. This keeps the arrays
 * and makes them durable:
 *
 *  - `syncStore()` at the start of a request asks the table for the rows
 *    written since this instance last looked (one small query) and folds them
 *    in, so an edit made on one instance is on every other at its next
 *    request. The first call loads everything, or, on an empty table, writes
 *    the starting records so there is something to load next time.
 *  - `saveStore()` diffs every collection against what was last written and
 *    upserts only what changed, so a write path that forgets to call it is
 *    still caught by the next save anywhere. Actions call it before they
 *    answer; `persistSoon()` is the same behind the response.
 *
 * Last write wins per record. For a studio's admin with a handful of people
 * that is the honest trade; per-row tables with real constraints are the
 * later job (checklist 4.9).
 */

type Rec = { id: string };
type State = {
  loaded: boolean;
  seq: number;
  saved: Map<string, Map<string, string>>;
  inflight: Promise<void> | null;
  checkedAt: number;
};
const G = globalThis as typeof globalThis & { __wdcPersist?: State };
const state = (G.__wdcPersist ??= { loaded: false, seq: 0, saved: new Map(), inflight: null, checkedAt: 0 });

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
/* Two requests arriving together share one query rather than asking twice. */
const FRESH_MS = 150;

function snapshot(coll: string) {
  let m = state.saved.get(coll);
  if (!m) state.saved.set(coll, (m = new Map()));
  return m;
}

function apply(coll: string, rows: Rec[], id: string, data: Rec | null) {
  const at = rows.findIndex((r) => r.id === id);
  if (data === null) { if (at >= 0) rows.splice(at, 1); snapshot(coll).delete(id); return; }
  if (at >= 0) rows[at] = data; else rows.push(data);
  snapshot(coll).set(id, JSON.stringify(data));
}

/**
 * THE TABLE MAKES ITSELF (migration 0025, statement for statement). Without
 * this, a deploy whose migration was not run by hand kept the records in each
 * instance's memory, so an email changed on one instance was not the email the
 * next request read: the owner's resent invitation went to the old address.
 * Idempotent, and recorded as applied so `scripts/migrate.mjs` and System
 * status agree with it.
 */
async function ensureSchema() {
  await db.query("CREATE SEQUENCE IF NOT EXISTS admin_records_seq");
  await db.query(`CREATE TABLE IF NOT EXISTS admin_records (
    collection STRING NOT NULL, id STRING NOT NULL, data JSONB, seq INT8 NOT NULL, ord INT8 NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (collection, id))`);
  await db.query("CREATE INDEX IF NOT EXISTS admin_records_seq_idx ON admin_records (seq)");
  await db.query(`CREATE TABLE IF NOT EXISTS wdc_schema_migrations (name STRING PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`).catch(() => undefined);
  await db.query("INSERT INTO wdc_schema_migrations (name) VALUES ('0025_admin_records.sql') ON CONFLICT (name) DO NOTHING").catch(() => undefined);
}

async function load() {
  await ensureSchema();
  const colls = persistedCollections();
  const count = await db.query<{ n: string }>("SELECT count(*)::STRING AS n FROM admin_records");
  if (Number(count.rows[0]?.n ?? 0) === 0) {
    /* An empty table: what is in memory (the starting records) becomes the
       first thing kept, so the next instance loads the same books. */
    await write(true);
    state.loaded = true;
    return;
  }
  const res = await db.query<{ collection: string; id: string; data: Rec | null; seq: string }>(
    "SELECT collection, id, data, seq::STRING AS seq FROM admin_records ORDER BY ord",
  );
  for (const [coll, rows] of Object.entries(colls)) { rows.length = 0; snapshot(coll).clear(); }
  let top = 0;
  for (const r of res.rows) {
    top = Math.max(top, Number(r.seq));
    const rows = colls[r.collection];
    if (rows && r.data) { rows.push(r.data); snapshot(r.collection).set(r.id, JSON.stringify(r.data)); }
  }
  state.seq = top;
  state.loaded = true;
}

async function catchUp() {
  const colls = persistedCollections();
  const res = await db.query<{ collection: string; id: string; data: Rec | null; seq: string }>(
    "SELECT collection, id, data, seq::STRING AS seq FROM admin_records WHERE seq > $1 ORDER BY seq",
    [String(state.seq)],
  );
  for (const r of res.rows) {
    state.seq = Math.max(state.seq, Number(r.seq));
    const rows = colls[r.collection];
    if (rows) apply(r.collection, rows, r.id, r.data);
  }
}

/** What changed in memory since the last write, as rows to upsert. */
function changes(all: boolean) {
  const out: { coll: string; id: string; json: string | null }[] = [];
  for (const [coll, rows] of Object.entries(persistedCollections())) {
    const snap = snapshot(coll);
    const live = new Set<string>();
    for (const r of rows) {
      live.add(r.id);
      const json = JSON.stringify(r);
      if (all || snap.get(r.id) !== json) out.push({ coll, id: r.id, json });
    }
    for (const id of snap.keys()) if (!live.has(id)) out.push({ coll, id, json: null });
  }
  return out;
}

async function write(all = false) {
  const rows = changes(all);
  if (!rows.length) return;
  /* In chunks, so a first write of every record is not one enormous statement. */
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const args: unknown[] = [];
    const values = chunk.map((r, n) => {
      args.push(r.coll, r.id, r.json);
      const k = n * 3;
      return `($${k + 1}, $${k + 2}, $${k + 3}::JSONB, nextval('admin_records_seq'), currval('admin_records_seq'), now())`;
    });
    await db.query(
      `INSERT INTO admin_records (collection, id, data, seq, ord, updated_at) VALUES ${values.join(", ")}
       ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, updated_at = excluded.updated_at`,
      args,
    );
    for (const r of chunk) {
      if (r.json === null) snapshot(r.coll).delete(r.id);
      else snapshot(r.coll).set(r.id, r.json);
    }
  }
}

/**
 * Bring this instance's records up to date. Call it first in any page,
 * route or action that reads the store. Without a database it does nothing,
 * and the store is the in-memory demonstration it always was.
 */
export async function syncStore(): Promise<void> {
  if (!configured()) return;
  if (state.inflight) return state.inflight;
  if (state.loaded && Date.now() - state.checkedAt < FRESH_MS) return;
  state.inflight = (async () => {
    try {
      if (!state.loaded) await load();
      else {
        /* Anything this instance changed and has not written yet goes first,
           so catching up cannot quietly overwrite it. */
        await write();
        await catchUp();
      }
      state.checkedAt = Date.now();
    } catch (error) {
      /* A database that cannot be reached leaves the records as they are in
         memory; the page still renders, and the next request tries again. */
      console.error("[admin store] sync failed:", error instanceof Error ? error.message : error);
    } finally {
      state.inflight = null;
    }
  })();
  return state.inflight;
}

/** Write what changed. Actions await it before they answer. */
export async function saveStore(): Promise<void> {
  if (!configured()) return;
  if (!state.loaded) await syncStore();
  try {
    await write();
  } catch (error) {
    console.error("[admin store] save failed; kept in memory and retried on the next request:", error instanceof Error ? error.message : error);
  }
}

/** The same, behind the response, for a path that must not wait. */
export function persistSoon() {
  if (!configured()) return;
  try { after(saveStore); } catch { void saveStore(); }
}
