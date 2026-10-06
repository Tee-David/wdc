import "server-only";
import { db } from "@/lib/db/pool";
import type { PaystackMode } from "./paystack";

export const PAYSTACK_MODE_SETTING = "payments.paystackMode";
/** Financial configuration never falls back after a database failure. */
export async function selectedPaystackMode(): Promise<PaystackMode> {
  const fallback = process.env.PAYSTACK_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
  if (!process.env.DATABASE_URL && !process.env.COCKROACHDB_URL) return fallback;
  const result = await db.query<{value:unknown}>("SELECT value FROM app_settings WHERE key=$1", [PAYSTACK_MODE_SETTING]);
  if (!result.rows.length) return fallback;
  const mode = result.rows[0].value;
  if (mode !== "test" && mode !== "live") throw new Error("Payment mode configuration is invalid.");
  return mode;
}

export async function checkoutAttempt(reference: string) {
  const r = await db.query<{mode:PaystackMode;invoice_id:string;amount:string;currency:string}>("SELECT mode,invoice_id,amount,currency FROM paystack_checkout_attempts WHERE reference=$1", [reference]);
  return r.rows[0] ?? null;
}
