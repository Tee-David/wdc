import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { pool } from "./cockroach-client.mjs";

const email = (process.env.WDC_SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.WDC_SEED_ADMIN_PASSWORD || "";
if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10) throw new Error("Provide WDC_SEED_ADMIN_EMAIL and a password of at least 10 characters.");
const db = pool();
try {
  const hashed = await hashPassword(password);
  await db.query("BEGIN");
  try {
    const existing = await db.query('SELECT "id" FROM "user" WHERE "email" = $1 LIMIT 1', [email]);
    const userId = existing.rows[0]?.id || randomUUID();
    if (existing.rowCount) {
      await db.query('UPDATE "user" SET "name" = $1, "role" = $2, "emailVerified" = true, "updatedAt" = now() WHERE "id" = $3', ["WDC Owner", "owner", userId]);
      const account = await db.query('SELECT "id" FROM "account" WHERE "providerId" = $1 AND "accountId" = $2 LIMIT 1', ["credential", userId]);
      if (account.rowCount) await db.query('UPDATE "account" SET "password" = $1, "updatedAt" = now() WHERE "id" = $2', [hashed, account.rows[0].id]);
      else await db.query('INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password") VALUES ($1,$2,$3,$4,$5)', [randomUUID(), userId, "credential", userId, hashed]);
    } else {
      await db.query('INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1,$2,$3,true,$4)', [userId, "WDC Owner", email, "owner"]);
      await db.query('INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password") VALUES ($1,$2,$3,$4,$5)', [randomUUID(), userId, "credential", userId, hashed]);
    }
    await db.query("COMMIT");
    console.log("Owner account seeded or updated.");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
} finally { await db.end(); }
