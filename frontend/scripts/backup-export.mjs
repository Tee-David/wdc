/**
 * Portable, encrypted copy of the database. Run weekly by
 * .github/workflows/backup.yml, or by hand.
 *
 *   BACKUP_DATABASE_URL  a READ-ONLY role's connection string
 *   BACKUP_KEY           64 hex characters (openssl rand -hex 32), kept OUTSIDE the cloud account
 *   COCKROACHDB_CERT     optional CA certificate text
 *   node scripts/backup-export.mjs <output-file>
 *
 * Every table except sessions and one-time tokens goes into one gzipped NDJSON
 * stream, behind a manifest of row counts and a SHA-256 of the stream, all
 * sealed with AES-256-GCM. File layout: "WDCB1" | iv(12) | tag(16) | ciphertext.
 * scripts/restore-check.mjs opens it again; a backup is not counted until it has.
 */
import fs from "node:fs";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import pg from "pg";

const out = process.argv[2];
const raw = process.env.BACKUP_DATABASE_URL;
const key = process.env.BACKUP_KEY ?? "";
if (!out || fs.existsSync(out)) throw new Error("Give a new output file path; backups are never overwritten.");
if (!raw) throw new Error("Set BACKUP_DATABASE_URL (a read-only role).");
if (!/^[0-9a-f]{64}$/i.test(key)) throw new Error("BACKUP_KEY must be 64 hex characters.");

const url = new URL(raw);
url.searchParams.delete("sslmode");
const ca = (process.env.COCKROACHDB_CERT ?? "").replace(/\\n/g, "\n");
const pool = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca.startsWith("-----BEGIN") ? { ca } : {}) }, max: 1 });

const SKIP = new Set(["session", "verification"]);
const tables = (await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1",
)).rows.map((r) => r.table_name).filter((t) => !SKIP.has(t));

const lines = [];
const counts = {};
for (const t of tables) {
  const rows = (await pool.query(`SELECT * FROM "${t.replace(/"/g, '""')}"`)).rows;
  counts[t] = rows.length;
  for (const row of rows) lines.push(JSON.stringify({ t, row }));
}
await pool.end();

const body = gzipSync(Buffer.from(lines.join("\n")));
const manifest = Buffer.from(JSON.stringify({
  version: 1, at: new Date().toISOString(), tables: counts, sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length,
}));
const head = Buffer.alloc(4); head.writeUInt32BE(manifest.length);
const plain = Buffer.concat([head, manifest, body]);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
const sealed = Buffer.concat([cipher.update(plain), cipher.final()]);
fs.writeFileSync(out, Buffer.concat([Buffer.from("WDCB1"), iv, cipher.getAuthTag(), sealed]));
console.log(`Backed up ${tables.length} tables, ${lines.length} rows, ${(sealed.length / 1024).toFixed(0)} KB -> ${out}`);
