import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

declare global {
  var __wdcPgPool: Pool | undefined;
}

function certificate() {
  const configured = process.env.COCKROACHDB_CERT?.trim();
  if (configured?.startsWith("-----BEGIN CERTIFICATE-----")) {
    return configured.replace(/\\n/g, "\n");
  }
  if (configured) {
    try {
      const decoded = Buffer.from(configured, "base64").toString("utf8");
      if (decoded.startsWith("-----BEGIN CERTIFICATE-----")) return decoded;
    } catch {
      // A copied Cockroach setup command is not a certificate. Never execute it.
    }
  }

  const appData = process.env.APPDATA;
  const localRoot = appData ? join(appData, "postgresql", "root.crt") : "";
  return localRoot && existsSync(localRoot) ? readFileSync(localRoot, "utf8") : undefined;
}

function connectionString() {
  const raw = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
  if (!raw) throw new Error("COCKROACHDB_URL is not configured.");
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return url.toString();
}

/**
 * The pool is built on first use, not on first import.
 *
 * WHY THE PROXY. `next build` imports every route module to collect its page
 * data, so a pool constructed at module scope is constructed during the build
 * -- and `connectionString()` throws when the variable is absent. That turned a
 * missing environment variable into "Failed to collect page data", a build that
 * cannot run at all on any machine or CI runner without database credentials,
 * for pages that never touch the database. Behind this proxy the same missing
 * variable throws inside the request that actually needs a connection, which is
 * where it can be reported and where it is true.
 *
 * Every call site keeps writing `db.query(...)`; the proxy forwards property
 * access to the real pool and binds methods to it.
 */
function createPool() {
  const ca = certificate();
  return new Pool({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    statement_timeout: 20_000,
    query_timeout: 20_000,
  });
}

function pool(): Pool {
  if (!globalThis.__wdcPgPool) {
    const created = createPool();
    /* In development the module graph is re-evaluated on every edit, so without
       this a long session leaks a pool per save. In production the module is
       evaluated once per instance and the global adds nothing, but it is also
       harmless and keeps one code path. */
    globalThis.__wdcPgPool = created;
  }
  return globalThis.__wdcPgPool;
}

export const db = new Proxy({} as Pool, {
  get(_t, prop, receiver) {
    const real = pool();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has: (_t, prop) => prop in pool(),
});
