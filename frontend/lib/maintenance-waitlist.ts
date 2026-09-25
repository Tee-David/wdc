import "server-only";

import { db } from "@/lib/db/pool";
import { backOnlineEmail } from "@/lib/email-templates";
import { maintenance } from "@/lib/maintenance";
import { normaliseEmail } from "@/lib/newsletter";
import { sendLogged } from "@/lib/outbox";

/**
 * "Notify me" on the maintenance page (migration 0026).
 *
 * A LIST WITH ONE MESSAGE ON IT. Each address is kept until the "we are back"
 * email has gone to it, then deleted; nothing else is ever sent to it. That is
 * both the promise on the page and the reason there is no unsubscribe: the
 * setting that lives with the person is that they asked for one message.
 *
 * WHEN IT SENDS. Behind the response to switching maintenance off, and again
 * from the daily job for anything that failed or did not fit. Each send has a
 * dedupe key naming the maintenance and the address, so a second run after a
 * partial one mails nobody twice.
 *
 * HOW MANY AT ONCE. A studio's maintenance window collects tens of addresses,
 * not thousands. The mail transport is pooled, so after the first connection
 * (about 23 seconds to authenticate with this provider) each message is a
 * fraction of a second; BATCH = 40 stays well inside a function's time limit.
 * Anything past it is sent by the next daily run.
 */

export const REASONS = ["project", "client", "browsing"] as const;
export type Reason = (typeof REASONS)[number];
const BATCH = 40;

export function waitlistIsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/** Add an address for this maintenance. A second sign-up is the same row, not a second message. */
export async function joinWaitlist(emailAsTyped: string, since: string) {
  const email = normaliseEmail(emailAsTyped);
  await db.query(
    `INSERT INTO maintenance_waitlist (email, email_as_typed, since) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET email_as_typed = EXCLUDED.email_as_typed, since = EXCLUDED.since, updated_at = now()`,
    [email, emailAsTyped.trim().slice(0, 254), since],
  );
}

/** The optional "what brings you here". Empty takes the answer back. Only touches a row from this maintenance. */
export async function setWaitlistReason(emailAsTyped: string, reason: Reason | null, since: string) {
  await db.query(
    "UPDATE maintenance_waitlist SET reason = $2, updated_at = now() WHERE email = $1 AND since = $3",
    [normaliseEmail(emailAsTyped), reason, since],
  );
}

export type WaitlistSummary = { total: number; project: number; client: number; browsing: number };

export async function waitlistSummary(): Promise<WaitlistSummary | null> {
  if (!waitlistIsConfigured()) return null;
  try {
    const r = await db.query<{ reason: string | null; n: string }>("SELECT reason, count(*) AS n FROM maintenance_waitlist GROUP BY reason");
    const s: WaitlistSummary = { total: 0, project: 0, client: 0, browsing: 0 };
    for (const row of r.rows) {
      const n = Number(row.n);
      s.total += n;
      if (row.reason === "project" || row.reason === "client" || row.reason === "browsing") s[row.reason] += n;
    }
    return s;
  } catch {
    return null;
  }
}

export type BackResult = { sent: number; failed: number; left: number; skipped?: "on" | "unconfigured" };

/**
 * Tell the people waiting that the site is back, then forget them.
 *
 * Refuses while maintenance is on: this runs from the daily job too, and a
 * site that went back down must not announce that it is up.
 */
export async function sendBackOnline(): Promise<BackResult> {
  if (!waitlistIsConfigured()) return { sent: 0, failed: 0, left: 0, skipped: "unconfigured" };
  if ((await maintenance({ fresh: true })).on) return { sent: 0, failed: 0, left: 0, skipped: "on" };
  const rows = (await db.query<{ email: string; email_as_typed: string; since: string }>(
    "SELECT email, email_as_typed, since FROM maintenance_waitlist ORDER BY created_at LIMIT $1", [BATCH],
  )).rows;
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      await sendLogged(
        { to: row.email_as_typed, ...backOnlineEmail() },
        { summary: "The site is back from maintenance, as they asked to be told.", dedupeKey: `maintenance-back:${row.since}:${row.email}`, by: "Website" },
      );
      sent += 1;
    } catch {
      failed += 1;
      continue;
    }
    /* Sent, or already sent by an earlier run: either way the promise is kept, so the address goes. */
    await db.query("DELETE FROM maintenance_waitlist WHERE email = $1", [row.email]).catch(() => {});
  }
  const left = Number((await db.query<{ n: string }>("SELECT count(*) AS n FROM maintenance_waitlist")).rows[0]?.n ?? 0);
  return { sent, failed, left };
}

/** Anything older than 30 days goes, sent or not: the address was never ours to keep. */
export async function purgeWaitlist(days = 30): Promise<number> {
  if (!waitlistIsConfigured()) return 0;
  const r = await db.query("DELETE FROM maintenance_waitlist WHERE created_at < now() - ($1 || ' days')::INTERVAL", [String(days)]);
  return r.rowCount ?? 0;
}
