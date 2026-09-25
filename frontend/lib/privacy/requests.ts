import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/db/pool";

/**
 * A PERSONAL DATA REQUEST: everything held about one email address, as a
 * download, or erased.
 *
 * FOUND BY ADDRESS, in every table that holds one: contact enquiries,
 * onboarding briefs (the address field or the answers), the newsletter, the
 * message log, invitations, and accounts. The history notes on an entry are
 * included with the entry. The audit log is not searched: it names the
 * studio's people and records, and an entry's subject is a company or an
 * invoice number rather than a person's address.
 *
 * ERASED BY ANONYMISING, not by deleting rows, so the counts and the numbers
 * stay whole: a brief keeps its number and service and loses its answers.
 * An address that is somebody's account is refused: an account is closed on
 * Team (or is a client's, handled with them), not quietly emptied from here.
 *
 * Every request is logged in `privacy_requests` by a hash of the address.
 */

export const hashEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
export const looksEmail = (v: string) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(v) && v.length <= 254;

export type Found = {
  enquiries: Record<string, unknown>[];
  briefs: Record<string, unknown>[];
  newsletter: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  invitations: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  waitlist: Record<string, unknown>[];
};

export const SECTION_LABEL: Record<keyof Found, string> = {
  enquiries: "Contact enquiries", briefs: "Onboarding briefs", newsletter: "Newsletter", messages: "Emails sent to them",
  invitations: "Invitations", accounts: "Accounts", notes: "Notes on their entries", waitlist: "Maintenance notify-me",
};

export async function findPersonalData(raw: string): Promise<Found> {
  const email = raw.trim().toLowerCase();
  const q = <T extends Record<string, unknown>>(sql: string, args: unknown[] = [email]) => db.query<T>(sql, args).then((r) => r.rows);
  const [enquiries, briefs, newsletter, messages, invitations, accounts, waitlist] = await Promise.all([
    q(`SELECT id, serial, first_name, last_name, email, phone, topic, message, created_at FROM contact_enquiries WHERE lower(email) = $1 ORDER BY created_at`),
    q(`SELECT id, serial, service, status, email, answers, created_at, updated_at, submitted_at FROM onboarding_submissions
       WHERE lower(email) = $1 OR lower(answers->>'email') = $1 ORDER BY created_at`),
    q(`SELECT email, source, created_at, unsubscribed_at FROM newsletter_subscribers WHERE email = $1`),
    q(`SELECT created_at, subject, summary, state FROM message_log WHERE lower(to_addr) = $1 ORDER BY created_at LIMIT 1000`),
    q(`SELECT name, email, role, created_at, expires_at, redeemed_at, revoked_at FROM invitations WHERE email = $1 ORDER BY created_at`),
    q(`SELECT "name", "email", "role", "createdAt" FROM "user" WHERE lower("email") = $1`),
    q(`SELECT email, reason, created_at FROM maintenance_waitlist WHERE email = $1`),
  ]);
  const ids = [...enquiries, ...briefs].map((r) => String(r.id));
  const notes = ids.length
    ? await q(`SELECT entry_id, kind, body, actor, created_at FROM entry_events WHERE entry_id = ANY($1::UUID[]) ORDER BY created_at`, [ids])
    : [];
  return { enquiries, briefs, newsletter, messages, invitations, accounts, notes, waitlist };
}

export const countOf = (f: Found) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.length])) as Record<keyof Found, number>;
export const totalOf = (f: Found) => Object.values(f).reduce((a, v) => a + v.length, 0);

export async function logRequest(email: string, kind: "export" | "erase", counts: Record<string, number>, by: string) {
  await db.query("INSERT INTO privacy_requests (email_hash, kind, counts, by_name) VALUES ($1, $2, $3::JSONB, $4)", [hashEmail(email), kind, JSON.stringify(counts), by.slice(0, 120)]);
}

export async function recentRequests(limit = 20) {
  const r = await db.query<{ kind: string; counts: Record<string, number>; by_name: string; at: Date; email_hash: string }>(
    "SELECT kind, counts, by_name, at, email_hash FROM privacy_requests ORDER BY at DESC LIMIT $1", [limit]);
  return r.rows.map((x) => ({ kind: x.kind, counts: x.counts, by: x.by_name, at: new Date(x.at).toISOString(), ref: x.email_hash.slice(0, 8) }));
}

/** Whether this address was erased: an import must not bring it back. */
export async function erasedHashes(emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const hashes = emails.map(hashEmail);
  const r = await db.query<{ email_hash: string }>("SELECT DISTINCT email_hash FROM privacy_requests WHERE kind = 'erase' AND email_hash = ANY($1::TEXT[])", [hashes]);
  return new Set(r.rows.map((x) => x.email_hash));
}

export type EraseResult = { ok: true; counts: Record<string, number> } | { ok: false; reason: "account" };

/** Anonymise everything held about the address, in one transaction. */
export async function erasePersonalData(raw: string): Promise<EraseResult> {
  const email = raw.trim().toLowerCase();
  const tx = await db.connect();
  try {
    await tx.query("BEGIN");
    const account = await tx.query(`SELECT 1 FROM "user" WHERE lower("email") = $1`, [email]);
    if (account.rowCount) { await tx.query("ROLLBACK"); return { ok: false, reason: "account" }; }
    const enquiryIds = (await tx.query<{ id: string }>(`SELECT id FROM contact_enquiries WHERE lower(email) = $1`, [email])).rows.map((r) => r.id);
    const briefIds = (await tx.query<{ id: string }>(`SELECT id FROM onboarding_submissions WHERE lower(email) = $1 OR lower(answers->>'email') = $1`, [email])).rows.map((r) => r.id);
    const e = await tx.query(`UPDATE contact_enquiries SET first_name = 'Erased', last_name = '', email = '', phone = NULL, message = 'Erased at the person''s request.' WHERE id = ANY($1::UUID[])`, [enquiryIds]);
    const b = await tx.query(`UPDATE onboarding_submissions SET answers = '{}'::JSONB, email = NULL WHERE id = ANY($1::UUID[])`, [briefIds]);
    await tx.query(`UPDATE onboarding_resume_tokens SET email = NULL, revoked_at = COALESCE(revoked_at, now()) WHERE submission_id = ANY($1::UUID[])`, [briefIds]);
    const n = await tx.query(`UPDATE entry_events SET body = 'Erased at the person''s request.' WHERE entry_id = ANY($1::UUID[]) AND kind IN ('note', 'email')`, [[...enquiryIds, ...briefIds]]);
    const s = await tx.query(`DELETE FROM newsletter_subscribers WHERE email = $1`, [email]);
    const m = await tx.query(`UPDATE message_log SET to_addr = 'erased', summary = 'Erased at the person''s request.' WHERE lower(to_addr) = $1`, [email]);
    const i = await tx.query(`DELETE FROM invitations WHERE email = $1 AND redeemed_at IS NULL`, [email]);
    const w = await tx.query(`DELETE FROM maintenance_waitlist WHERE email = $1`, [email]);
    await tx.query("COMMIT");
    return { ok: true, counts: { enquiries: e.rowCount ?? 0, briefs: b.rowCount ?? 0, notes: n.rowCount ?? 0, newsletter: s.rowCount ?? 0, messages: m.rowCount ?? 0, invitations: i.rowCount ?? 0, waitlist: w.rowCount ?? 0 } };
  } catch (error) {
    await tx.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    tx.release();
  }
}

/** One row per value, for the CSV: section, record, field, value. */
export function flatten(f: Found): string[][] {
  const rows: string[][] = [["section", "record", "field", "value"]];
  for (const [section, list] of Object.entries(f)) {
    list.forEach((rec, n) => {
      const walk = (prefix: string, v: unknown) => {
        if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
          for (const [k, x] of Object.entries(v)) walk(prefix ? `${prefix}.${k}` : k, x);
        } else {
          rows.push([section, String(n + 1), prefix, v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)]);
        }
      };
      walk("", rec);
    });
  }
  return rows;
}
