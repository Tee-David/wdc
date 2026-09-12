import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export function pool() {
  const raw = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
  if (!raw) throw new Error("COCKROACHDB_URL is not configured");
  const url = new URL(raw); url.searchParams.delete("sslmode");
  const certPath = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const configured = process.env.COCKROACHDB_CERT || "";
  let ca;
  if (configured.startsWith("-----BEGIN CERTIFICATE-----")) ca = configured.replace(/\\n/g, "\n");
  else if (certPath && fs.existsSync(certPath)) ca = fs.readFileSync(certPath, "utf8");
  return new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2, connectionTimeoutMillis: 12_000 });
}
