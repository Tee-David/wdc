import "server-only";

import { db } from "@/lib/db/pool";

/**
 * "THIS CHARGE HAS BEEN BANKED", written where every instance can see it
 * (migration 0031).
 *
 * `applyPayment` refuses a reference it has already seen, but it can only see
 * its own instance's memory. The webhook and the payer's return race each
 * other, and on Vercel they are usually different instances, so each would
 * bank the same charge and send its own receipt. The claim is an INSERT on the
 * reference as primary key: exactly one caller gets the row back.
 *
 * FAILS CLOSED. If the table cannot be reached the answer is "unavailable" and
 * nothing is banked: the webhook answers 503 so Paystack delivers it again,
 * and the return page says the payment is being recorded. A charge banked
 * late is an inconvenience; one banked twice is a wrong balance and two
 * receipts.
 *
 * Without a database at all (a local demonstration) there is one process and
 * `applyPayment`'s own check is the whole story, so the claim is granted.
 */

export type Claim = "claimed" | "taken" | "unavailable";

const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
const G = globalThis as typeof globalThis & { __wdcChargeTable?: boolean };

async function ensureTable() {
  if (G.__wdcChargeTable) return;
  await db.query(`CREATE TABLE IF NOT EXISTS paystack_charges (
    reference STRING PRIMARY KEY, invoice_id STRING NOT NULL, amount INT8 NOT NULL,
    claimed_by STRING NOT NULL, payment_id STRING, claimed_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  G.__wdcChargeTable = true;
}

export async function claimCharge(c: { reference: string; invoiceId: string; amount: number; by: string }): Promise<Claim> {
  if (!configured()) return "claimed";
  try {
    await ensureTable();
    const res = await db.query(
      `INSERT INTO paystack_charges (reference, invoice_id, amount, claimed_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (reference) DO NOTHING RETURNING reference`,
      [c.reference, c.invoiceId, Math.round(c.amount), c.by],
    );
    return res.rowCount ? "claimed" : "taken";
  } catch (error) {
    console.error("[paystack] could not claim a charge:", error instanceof Error ? error.message : error);
    return "unavailable";
  }
}

/** The payment the claim became, so a claim with no payment is findable. */
export async function chargeBanked(reference: string, paymentId: string) {
  if (!configured()) return;
  await db.query("UPDATE paystack_charges SET payment_id = $2 WHERE reference = $1", [reference, paymentId])
    .catch((error) => console.error("[paystack] could not mark a charge banked:", error instanceof Error ? error.message : error));
}

/** Give the claim back when banking was refused, so a later delivery can try. */
export async function releaseCharge(reference: string) {
  if (!configured()) return;
  await db.query("DELETE FROM paystack_charges WHERE reference = $1 AND payment_id IS NULL", [reference])
    .catch((error) => console.error("[paystack] could not release a charge:", error instanceof Error ? error.message : error));
}
