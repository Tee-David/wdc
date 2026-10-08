import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/pool";
import { normaliseEmail, subscribe, type SubscribeResult } from "./newsletter";

/**
 * DOUBLE OPT-IN. Typing an address asks for a confirmation email; only the
 * link in it adds the person. The token is random (not derived from the
 * address), stored hashed, valid 48 hours, and a fresh request within 150
 * seconds does not send another mail (the guard Fluent CRM uses). On
 * confirmation the time, the source and the IP are kept as the proof.
 *
 * `pending` is a separate table so every existing query on the list ("who is
 * subscribed") keeps meaning exactly that. Returns "unavailable" while
 * migration 0042 is not applied, and the caller falls back to the old path.
 */
const HOURS = 48;
const RESEND_GUARD_MS = 150_000;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export type PendingResult =
  | { kind: "already" }
  | { kind: "sent"; token: string }
  | { kind: "wait" }
  | { kind: "unavailable" };

export async function requestConfirmation(typed: string, source: string, ip: string | null): Promise<PendingResult> {
  const email = normaliseEmail(typed);
  try {
    const have = await db.query(`SELECT 1 FROM newsletter_subscribers WHERE email = $1 AND unsubscribed_at IS NULL`, [email]);
    if (have.rowCount) return { kind: "already" };
    const prev = await db.query<{ last_sent_at: Date }>(`SELECT last_sent_at FROM newsletter_pending WHERE email = $1`, [email]);
    if (prev.rows[0] && Date.now() - prev.rows[0].last_sent_at.getTime() < RESEND_GUARD_MS) return { kind: "wait" };
    const token = randomBytes(24).toString("base64url");
    await db.query(
      `INSERT INTO newsletter_pending (email, email_as_typed, source, token_hash, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::INTERVAL)
       ON CONFLICT (email) DO UPDATE SET email_as_typed = excluded.email_as_typed, token_hash = excluded.token_hash,
         ip = excluded.ip, requested_at = now(), expires_at = excluded.expires_at, last_sent_at = now()`,
      [email, typed.trim().slice(0, 254), source, hash(token), ip, String(HOURS)],
    );
    return { kind: "sent", token };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Confirms a pending address. Fails closed on any mismatch, expiry or error. */
export async function confirmSubscription(emailRaw: string, token: string): Promise<{ ok: true; email: string; source: string; result: SubscribeResult } | { ok: false }> {
  const email = normaliseEmail(emailRaw);
  if (!email || !token || token.length > 100) return { ok: false };
  try {
    const r = await db.query<{ email_as_typed: string; source: string; token_hash: string; ip: string | null }>(
      `SELECT email_as_typed, source, token_hash, ip FROM newsletter_pending WHERE email = $1 AND expires_at > now()`, [email]);
    const row = r.rows[0];
    if (!row) return { ok: false };
    const a = Buffer.from(row.token_hash), b = Buffer.from(hash(token));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
    const result = await subscribe(row.email_as_typed, row.source);
    await db.query(
      `UPDATE newsletter_subscribers SET consent_at = now(), consent_source = $2, consent_ip = $3 WHERE email = $1`,
      [email, `double opt-in: ${row.source}`, row.ip],
    ).catch(() => {});
    await db.query(`DELETE FROM newsletter_pending WHERE email = $1`, [email]);
    return { ok: true, email, source: row.source, result };
  } catch {
    return { ok: false };
  }
}

/** Pending requests past their expiry are dropped by the daily tidy. */
export async function purgeExpiredPending() {
  await db.query(`DELETE FROM newsletter_pending WHERE expires_at < now() - INTERVAL '7 days'`).catch(() => {});
}
