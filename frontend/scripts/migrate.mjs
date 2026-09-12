import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./cockroach-client.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "../db/migrations");
const files = fs.readdirSync(migrationsDir).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
const db = pool();

try {
  await db.query(`
    CREATE TABLE IF NOT EXISTS wdc_schema_migrations (
      name STRING PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const name of files) {
    const present = await db.query("SELECT 1 FROM wdc_schema_migrations WHERE name = $1", [name]);
    if (present.rowCount) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, name), "utf8");
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query("INSERT INTO wdc_schema_migrations (name) VALUES ($1)", [name]);
      await db.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await db.end();
}
