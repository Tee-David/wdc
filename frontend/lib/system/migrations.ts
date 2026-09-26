import "server-only";

import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";

/**
 * Which migrations are in the code and which the database has applied.
 *
 * `scripts/migrate.mjs` records each file it runs in `wdc_schema_migrations`.
 * A file on disk with no row is a deploy that shipped code ahead of its
 * schema, which is the failure that shows up as a 500 on one screen and
 * nowhere else. The files ship with the admin routes
 * (`outputFileTracingIncludes` in next.config.ts).
 *
 * Cached for five minutes per instance: the shell asks on every admin page.
 */

export type MigrationStatus =
  | { ok: true; files: number; applied: number; pending: string[]; unknown: string[] }
  | { ok: false; error: string };

const TTL = 5 * 60 * 1000;
const cache = globalThis as typeof globalThis & { __wdcMigrations?: { at: number; value: MigrationStatus } };

function files(): string[] {
  const dir = path.join(process.cwd(), "db", "migrations");
  return fs.readdirSync(dir).filter((n) => /^\d+.*\.sql$/.test(n)).sort();
}

export async function migrationStatus(opts: { fresh?: boolean } = {}): Promise<MigrationStatus> {
  const held = cache.__wdcMigrations;
  if (!opts.fresh && held && Date.now() - held.at < TTL) return held.value;
  let value: MigrationStatus;
  try {
    const onDisk = files();
    const r = await db.query<{ name: string }>("SELECT name FROM wdc_schema_migrations");
    const applied = new Set(r.rows.map((x) => x.name));
    value = {
      ok: true, files: onDisk.length, applied: applied.size,
      pending: onDisk.filter((n) => !applied.has(n)),
      /* Applied but not in this build: a newer deploy ran them, or this one is older. */
      unknown: [...applied].filter((n) => !onDisk.includes(n)).sort(),
    };
  } catch (error) {
    value = { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "could not be read" };
  }
  cache.__wdcMigrations = { at: Date.now(), value };
  return value;
}

/**
 * APPLY WHAT THIS DEPLOY EXPECTS, from Settings › System, the same way
 * `scripts/migrate.mjs` does: in file order, each file and its record in one
 * transaction, stopping at the first that fails. It exists because the only
 * other way was a terminal against production, which is how the media
 * folders shipped without their table and every folder action said "could
 * not be saved". Owner-only and audited by the caller.
 */
export async function applyPendingMigrations(): Promise<{ applied: string[]; failed?: { name: string; error: string } }> {
  await db.query("CREATE TABLE IF NOT EXISTS wdc_schema_migrations (name STRING PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM wdc_schema_migrations")).rows.map((r) => r.name));
  const dir = path.join(process.cwd(), "db", "migrations");
  const applied: string[] = [];
  for (const name of files()) {
    if (done.has(name)) continue;
    const sql = fs.readFileSync(path.join(dir, name), "utf8");
    try {
      await transaction(async (c) => {
        await c.query(sql);
        await c.query("INSERT INTO wdc_schema_migrations (name) VALUES ($1)", [name]);
      }, 1);
      applied.push(name);
    } catch (error) {
      cache.__wdcMigrations = undefined;
      return { applied, failed: { name, error: error instanceof Error ? error.message.slice(0, 300) : "failed" } };
    }
  }
  cache.__wdcMigrations = undefined;
  return { applied };
}
