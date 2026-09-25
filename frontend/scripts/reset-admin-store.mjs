/**
 * Empty the kept admin records (migration 0025) so the next request writes
 * the starting records again. FOR A LOCAL OR TEST DATABASE ONLY: it refuses
 * to run when the connection string looks like production, and it asks for
 * --yes. Restart the dev server afterwards so its memory reloads too.
 */
import pg from "pg";

const raw = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
if (!raw) { console.error("DATABASE_URL is not set."); process.exit(1); }
const url = new URL(raw);
if (!/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) { console.error(`Refusing: ${url.hostname} is not a local database.`); process.exit(1); }
if (!process.argv.includes("--yes")) { console.error("This deletes every kept admin record. Re-run with --yes."); process.exit(1); }
url.searchParams.delete("sslmode");
const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
const db = new pg.Pool({ connectionString: url.toString(), ssl: ca ? { ca, rejectUnauthorized: true } : undefined });
const r = await db.query("DELETE FROM admin_records");
console.log(`Removed ${r.rowCount} kept records.`);
await db.end();
