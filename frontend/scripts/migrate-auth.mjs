import fs from "node:fs";
import { pool } from "./cockroach-client.mjs";

const db = pool();
try {
  const sql = fs.readFileSync(new URL("../db/migrations/0001_better_auth.sql", import.meta.url), "utf8");
  await db.query("BEGIN");
  try { await db.query(sql); await db.query("COMMIT"); }
  catch (error) { await db.query("ROLLBACK"); throw error; }
  console.log("Better Auth schema is present.");
} finally { await db.end(); }
