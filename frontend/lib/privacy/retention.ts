import "server-only";

import { db } from "@/lib/db/pool";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";

/**
 * HOW LONG EACH KIND OF PERSONAL DATA IS KEPT, and what happens after.
 *
 * Each rule is a number of days, or null for "keep". The daily tidy
 * (lib/jobs/daily.ts) applies them in batches of at most BATCH rows per rule
 * per run, so one run can never lock a table for long, and writes one audit
 * line with its counts.
 *
 * NOT HERE, ON PURPOSE:
 * - Money records (invoices, payments, receipts): kept for the accounts,
 *   and in memory until section 4.9 in any case.
 * - Unsubscribed newsletter addresses: kept, because the row is what stops
 *   an import from signing them up again. An erasure request removes one
 *   and keeps only a hash for the same purpose (lib/privacy/requests.ts).
 * - The message log and each form's Trash: they have their own settings, on
 *   Settings > Email and on each form.
 * - Expired sessions, sign-in tokens and rate-limit counters are always
 *   removed after a day; they are housekeeping, not a choice.
 */

export const RETENTION_KEY = "privacy.retention";
export const BATCH = 500;

export type RuleKey = "drafts" | "enquiries" | "invitations" | "deactivated";
export type Rules = Record<RuleKey, number | null>;

export const RULES: { key: RuleKey; label: string; what: string; action: string; options: (number | null)[]; fallback: number | null }[] = [
  { key: "drafts", label: "Unfinished onboarding forms", what: "Briefs a visitor started and never submitted, counted from their last save.", action: "Deleted, with their resume links.", options: [30, 90, 180, 365, null], fallback: 180 },
  { key: "enquiries", label: "Contact enquiries", what: "Messages from the contact form, counted from when they arrived.", action: "Anonymised: the name, address, phone and message are removed; the topic and date stay for the counts.", options: [365, 730, 1095, null], fallback: null },
  { key: "invitations", label: "Invitations", what: "Invitations that were used, withdrawn or expired.", action: "Deleted.", options: [30, 90, 365, null], fallback: 90 },
  { key: "deactivated", label: "Deactivated team accounts", what: "Accounts switched off on Team, counted from when they were deactivated.", action: "Anonymised: name and email replaced, sign-in methods removed. Their name stays on the audit log as it was.", options: [90, 365, 730, null], fallback: null },
];

export const DEFAULT_RULES = Object.fromEntries(RULES.map((r) => [r.key, r.fallback])) as Rules;

export async function getRules(): Promise<Rules> {
  const stored = await getAppSetting<Partial<Rules>>(RETENTION_KEY, {});
  const out = { ...DEFAULT_RULES };
  for (const r of RULES) {
    const v = stored?.[r.key];
    if (v === null || (typeof v === "number" && r.options.includes(v))) out[r.key] = v;
  }
  return out;
}

export async function saveRules(rules: Rules, by: string) {
  await setAppSetting(RETENTION_KEY, rules, by);
}

export type RetentionCounts = Record<RuleKey | "housekeeping", number>;

const cutoff = "now() - ($1::INT * INTERVAL '1 day')";

/** Apply every rule once. Safe to run twice: a second run finds less to do. */
export async function runRetention(): Promise<{ counts: RetentionCounts; errors: string[] }> {
  const rules = await getRules();
  const counts: RetentionCounts = { drafts: 0, enquiries: 0, invitations: 0, deactivated: 0, housekeeping: 0 };
  const errors: string[] = [];
  const step = async (name: keyof RetentionCounts, fn: () => Promise<number>) => {
    try { counts[name] += await fn(); } catch (error) { errors.push(`${name}: ${error instanceof Error ? error.message.slice(0, 120) : "failed"}`); }
  };

  if (rules.drafts !== null) await step("drafts", async () => (await db.query(
    `DELETE FROM onboarding_submissions WHERE id IN (
       SELECT id FROM onboarding_submissions WHERE status = 'in_progress' AND updated_at < ${cutoff} LIMIT ${BATCH})`, [rules.drafts])).rowCount ?? 0);

  if (rules.enquiries !== null) await step("enquiries", async () => (await db.query(
    `UPDATE contact_enquiries SET first_name = 'Removed', last_name = '', email = '', phone = NULL,
            message = 'Removed after its retention period.'
     WHERE id IN (SELECT id FROM contact_enquiries WHERE created_at < ${cutoff} AND email <> '' LIMIT ${BATCH})`, [rules.enquiries])).rowCount ?? 0);

  if (rules.invitations !== null) await step("invitations", async () => (await db.query(
    `DELETE FROM invitations WHERE id IN (
       SELECT id FROM invitations WHERE (redeemed_at IS NOT NULL OR revoked_at IS NOT NULL OR expires_at < now())
         AND created_at < ${cutoff} LIMIT ${BATCH})`, [rules.invitations])).rowCount ?? 0);

  if (rules.deactivated !== null) await step("deactivated", async () => {
    const ids = (await db.query<{ id: string }>(
      `SELECT "id" FROM "user" WHERE "deactivatedAt" IS NOT NULL AND "deactivatedAt" < ${cutoff} AND "email" NOT LIKE 'removed-%@invalid' LIMIT ${BATCH}`,
      [rules.deactivated])).rows.map((r) => r.id);
    if (!ids.length) return 0;
    await db.query(`DELETE FROM "account" WHERE "userId" = ANY($1::TEXT[])`, [ids]);
    await db.query(`DELETE FROM "session" WHERE "userId" = ANY($1::TEXT[])`, [ids]);
    const r = await db.query(`UPDATE "user" SET "name" = 'Removed', "email" = 'removed-' || "id" || '@invalid', "image" = NULL, "updatedAt" = now() WHERE "id" = ANY($1::TEXT[])`, [ids]);
    return r.rowCount ?? 0;
  });

  await step("housekeeping", async () => {
    const a = await db.query(`DELETE FROM "session" WHERE "expiresAt" < now() - INTERVAL '1 day'`);
    const b = await db.query(`DELETE FROM "verification" WHERE "expiresAt" < now() - INTERVAL '1 day'`);
    const c = await db.query(`DELETE FROM rate_limit_counters WHERE updated_at < now() - INTERVAL '1 day'`);
    return (a.rowCount ?? 0) + (b.rowCount ?? 0) + (c.rowCount ?? 0);
  });

  return { counts, errors };
}
