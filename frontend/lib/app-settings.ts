import "server-only";

import { db } from "@/lib/db/pool";

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

/**
 * One site-wide setting (migration 0018), or its default.
 *
 * The default is also what comes back when the database cannot be read, so a
 * settings outage never changes behaviour; it only stops changes being made.
 */
export async function getAppSetting<T>(key: string, fallback: T): Promise<T> {
  if (!configured()) return fallback;
  try {
    const r = await db.query<{ value: T }>("SELECT value FROM app_settings WHERE key = $1", [key]);
    return r.rows[0] ? r.rows[0].value : fallback;
  } catch {
    return fallback;
  }
}

export async function setAppSetting(key: string, value: unknown, by: string) {
  await db.query(`
    INSERT INTO app_settings (key, value, saved_by, saved_at) VALUES ($1, $2::JSONB, $3, now())
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, saved_by = excluded.saved_by, saved_at = now()
  `, [key, JSON.stringify(value), by]);
}

/** How long the message log keeps a row. */
export const LOG_RETENTION_DAYS = [7, 14, 30, 90, 180, 365] as const;
export const LOG_RETENTION_KEY = "email.logRetentionDays";
export const DEFAULT_LOG_RETENTION = 30;
