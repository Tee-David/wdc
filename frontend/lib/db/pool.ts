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

export const db =
  globalThis.__wdcPgPool ??
  new Pool({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: true, ...(certificate() ? { ca: certificate() } : {}) },
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    statement_timeout: 20_000,
    query_timeout: 20_000,
  });

if (process.env.NODE_ENV !== "production") globalThis.__wdcPgPool = db;
