import "server-only";

import { db } from "@/lib/db/pool";
import { clearSetting, forgetSetting, primeSetting, setSetting } from "@/lib/admin/store";
import { editableKeys } from "./registry";

/**
 * The Settings rows, kept in the database (app_settings, migration 0018).
 *
 * The admin store still answers reads synchronously from memory, because the
 * finance defaults are read inside a dozen synchronous helpers. What changes
 * is that memory is now a CACHE of the table: loaded once per server instance
 * before a page that reads it renders, and written through on every change. A
 * deploy or a cold start no longer puts the VAT rate back to what shipped.
 */

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

declare global {
  var __wdcSettingsLoaded: Promise<void> | undefined;
  var __wdcSettingsAt: number | undefined;
}

/* How long one instance trusts its copy. An edit saved on another instance
   reaches this one within this long, rather than at its next cold start. */
const FRESH_MS = 20_000;

/** Load the saved rows into memory, and again when the copy is stale. Never throws. */
export function hydrateSettings(): Promise<void> {
  if (!configured()) return Promise.resolve();
  if (globalThis.__wdcSettingsLoaded && Date.now() - (globalThis.__wdcSettingsAt ?? 0) < FRESH_MS) return globalThis.__wdcSettingsLoaded;
  globalThis.__wdcSettingsAt = Date.now();
  globalThis.__wdcSettingsLoaded = (async () => {
    try {
      const keys = editableKeys();
      const r = await db.query<{ key: string; value: unknown }>("SELECT key, value FROM app_settings WHERE key = ANY($1::TEXT[])", [keys]);
      const seen = new Set<string>();
      for (const row of r.rows) if (typeof row.value === "string") { primeSetting(row.key, row.value); seen.add(row.key); }
      for (const k of keys) if (!seen.has(k)) forgetSetting(k);
    } catch (error) {
      console.error("[settings] could not be loaded; showing what shipped:", error instanceof Error ? error.message : error);
      /* Try again on the next request rather than never. */
      globalThis.__wdcSettingsAt = 0;
    }
  })();
  return globalThis.__wdcSettingsLoaded;
}

export async function writeSetting(key: string, value: string, by: string) {
  if (configured()) {
    await db.query(`
      INSERT INTO app_settings (key, value, saved_by, saved_at) VALUES ($1, to_jsonb($2::TEXT), $3, now())
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, saved_by = excluded.saved_by, saved_at = now()
    `, [key, value, by]);
  }
  setSetting(key, value, by);
}

export async function removeSetting(key: string, by: string) {
  if (configured()) await db.query("DELETE FROM app_settings WHERE key = $1", [key]);
  return clearSetting(key, by);
}
