import { after, NextRequest, NextResponse } from "next/server";
import {
  applyPayment, getInvoice, getPaymentsFor, matchInvoice, recordProviderEvent,
} from "@/lib/admin/store";
import { invoiceTotals } from "@/lib/admin/types";
import { fromKobo, paystackMode, paystackSignatureValid } from "@/lib/paystack";
import { sendPaymentNotice, sendPaymentReceiptEmail } from "@/lib/money-mail";
import { saveStore, syncStore } from "@/lib/admin/persist";

/**
 * Paystack telling us what happened, which is the only account of a payment
 * that does not come through a browser.
 *
 * WHY THIS EXISTS AT ALL, given /pay/done also verifies. Because the browser
 * is optional. A payer who closes the tab on Paystack's success page, or whose
 * phone loses signal on the way back, has still paid -- and without this the
 * studio finds out when the money appears in the bank and nobody knows which
 * invoice it was. The webhook is the reliable path; the redirect is the fast
 * one. Both end at `applyPayment`, which is idempotent on the reference, and
 * they routinely race each other within the same second.
 *
 * IT FAILS CLOSED, in the order that matters:
 *   - no signature header, or one that does not verify -> 401, nothing written
 *     to the books, and a Rejected row so the attempt is visible;
 *   - a body we cannot parse -> 400;
 *   - an event we do not act on -> 200 and an Ignored row, because a non-200
 *     makes Paystack retry something that will never succeed.
 *
 * MODE SAFETY IS THE SIGNATURE. The HMAC is keyed on one account's secret, so
 * a test-mode event cannot validate against a live key or the reverse. There is
 * no separate mode check to forget to write.
 *
 * 200 IS NOT "WE AGREED". Paystack retries anything that is not a 2xx, so an
 * event we cannot match must still be acknowledged -- otherwise the same
 * unmatchable event arrives every hour for a day. The disagreement is recorded
 * as an Unmatched row for the reconciliation screen instead.
 */

export const maxDuration = 30;
/* The raw bytes are the signed thing. Any framework that parses and
   re-serialises the body changes it, and the HMAC then fails on a legitimate
   event -- so this route reads text() and nothing else touches it. */
export const dynamic = "force-dynamic";

type Charge = {
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  channel?: string;
  gateway_response?: string;
  metadata?: Record<string, unknown> | null;
  /* Present on refund events; Paystack's own docs and its actual payloads
     have disagreed on the exact shape across API versions, so both are
     read rather than trusted to one. */
  transaction_reference?: string;
  transaction?: { reference?: string };
};

/* EVENTS THIS ROUTE NAMES RATHER THAN LETTING FALL INTO THE GENERIC
   "no handler" BUCKET, because a refund or a dispute is real money moving
   the other way and the reconciliation screen should say so in words
   rather than "Ignored". Recorded, never auto-applied: `refundPayment`
   needs a human decision this webhook cannot make on its own (does the
   money go back to their bank, or sit as credit -- see the type's own
   note on `toCredit`), so the row exists to be FOUND on the
   reconciliation screen and acted on there, the same as any other
   Unmatched event. */
const REFUND_EVENTS = new Set(["refund.processed", "refund.pending", "refund.failed"]);
const DISPUTE_EVENTS = new Set(["charge.dispute.create", "charge.dispute.remind", "charge.dispute.resolve"]);

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/* MONEY IS SAVED BEFORE PAYSTACK HEARS "OK": a 200 tells it not to retry,
   so the payment has to be in the table by then, not behind the response. */
export async function POST(request: NextRequest) {
  await syncStore();
  const res = await receive(request);
  await saveStore();
  return res;
}

async function receive(request: NextRequest) {
  const raw = await request.text();

  if (!(await paystackSignatureValid(raw, request.headers.get("x-paystack-signature")))) {
    /* Recorded, and deliberately with as little of the body as possible: a
       request that failed its signature is exactly the one whose contents we
       should not be copying into our own storage. The reference is taken only
       to make a genuine misconfiguration -- a rotated key, say -- findable. */
    let ref = "";
    try { ref = str((JSON.parse(raw) as { data?: Charge })?.data?.reference); } catch { /* not ours to parse */ }
    recordProviderEvent({
      event: "signature.invalid", reference: ref || "(unreadable)", amount: null,
      outcome: "Rejected", mode: paystackMode(),
      note: "A webhook arrived whose signature did not verify. Nothing was written to the books.",
    });
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: { event?: string; data?: Charge };
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad request", { status: 400 }); }

  const event = str(body.event) || "unknown";
  const data = body.data ?? {};
  const reference = str(data.reference);
  const amount = typeof data.amount === "number" ? fromKobo(data.amount) : null;
  const channel = str(data.channel) || undefined;

  if (REFUND_EVENTS.has(event) || DISPUTE_EVENTS.has(event)) {
    /* The reference on a refund/dispute event names the ORIGINAL charge,
       not a new transaction -- checked under a few field names since this
       has not been exercised against a live payload. */
    const origRef = str(data.transaction_reference) || str(data.transaction?.reference) || reference;
    const invoice = origRef ? matchInvoice({ reference: origRef }) : null;
    recordProviderEvent({
      event, reference: origRef || "(none)", amount, channel,
      outcome: "Unmatched", mode: paystackMode(),
      invoiceId: invoice?.id,
      note: invoice
        ? `${REFUND_EVENTS.has(event) ? "Refund" : "Dispute"} against ${invoice.number}. Needs a human decision -- apply it from the payment's own screen, this is not done automatically.`
        : `${REFUND_EVENTS.has(event) ? "Refund" : "Dispute"} event with no invoice matched from the reference. Needs a look.`,
    });
    return NextResponse.json({ received: true });
  }

  if (event !== "charge.success") {
    recordProviderEvent({
      event, reference: reference || "(none)", amount, channel,
      outcome: event.startsWith("charge.") ? "Failed" : "Ignored", mode: paystackMode(),
      note: str(data.gateway_response) || `No handler for ${event}. Recorded so the log is complete.`,
    });
    return NextResponse.json({ received: true });
  }

  /* PAYSTACK'S OWN STATUS FIELD IS STILL CHECKED. `charge.success` with a
     status that is not "success" should not happen; if it ever does, banking
     it on the strength of the event name alone is the expensive way to find
     out. */
  if (str(data.status) !== "success" || !reference || amount === null || amount <= 0) {
    recordProviderEvent({
      event, reference: reference || "(none)", amount, channel, outcome: "Failed", mode: paystackMode(),
      note: str(data.gateway_response) || "A success event that did not describe a successful charge.",
    });
    return NextResponse.json({ received: true });
  }

  /* NGN ONLY, AND SAID OUT LOUD. The books are in naira and `fromKobo` assumes
     it. A charge in another currency banked as naira is a number wrong by a
     factor of hundreds, which is the kind of error that survives a review. */
  const currency = str(data.currency) || "NGN";
  if (currency !== "NGN") {
    recordProviderEvent({
      event, reference, amount, channel, outcome: "Unmatched", mode: paystackMode(),
      note: `Charged in ${currency}, and the books are in NGN. Somebody has to decide the rate.`,
    });
    return NextResponse.json({ received: true });
  }

  const meta = data.metadata ?? {};
  const invoice = matchInvoice({
    invoiceId: str((meta as Record<string, unknown>).invoiceId) || undefined,
    reference,
  });

  if (!invoice) {
    recordProviderEvent({
      event, reference, amount, channel, outcome: "Unmatched", mode: paystackMode(),
      note: "Money arrived and no invoice in the books matches the reference.",
    });
    return NextResponse.json({ received: true });
  }

  const applied = applyPayment({
    invoiceId: invoice.id, amount, method: "Paystack", reference,
    by: "Paystack webhook", mode: paystackMode(),
  });

  if (!applied.ok) {
    const duplicate = applied.reason === "duplicate";
    const existing = duplicate
      ? getPaymentsFor(invoice.id).find((p) => p.reference === reference)
      : undefined;
    recordProviderEvent({
      event, reference, amount, channel, mode: paystackMode(),
      outcome: duplicate ? "Duplicate" : "Unmatched",
      invoiceId: invoice.id, paymentId: existing?.id,
      note: duplicate
        ? "Already banked, so nothing was added. Paystack retries, and the payer's return races this."
        : `Could not be applied to ${invoice.number}: ${applied.reason}.`,
    });
    return NextResponse.json({ received: true });
  }

  recordProviderEvent({
    event, reference, amount, channel, outcome: "Applied", mode: paystackMode(),
    invoiceId: invoice.id, paymentId: applied.payment.id,
    note: applied.overpaid
      ? `Banked, and it takes ${invoice.number} past its total. The excess is real money and needs a decision.`
      : undefined,
  });

  /* THE RECEIPT GOES OUT BEHIND THE RESPONSE. Truehost's SMTP takes about 23
     seconds just to authenticate, and Paystack treats a slow webhook as a
     failed one and retries it -- which would send the receipt twice. Answer
     first, send after. */
  after(async () => {
    /* Re-read rather than reusing the invoice from before the write: `paid`
       was recomputed by applyPayment, and the figure the client reads on the
       receipt has to be the one the books now hold. */
    const fresh = getInvoice(invoice.id) ?? invoice;
    await sendPaymentReceiptEmail({
      payment: applied.payment,
      invoice: fresh,
      outstanding: invoiceTotals(fresh).due,
    });
    await sendPaymentNotice({ payment: applied.payment, invoice: fresh, outstanding: invoiceTotals(fresh).due });
  });

  return NextResponse.json({ received: true });
}
