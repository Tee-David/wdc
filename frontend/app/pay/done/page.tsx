import Link from "next/link";
import type { Metadata } from "next";
import { after } from "next/server";
import {
  applyPayment, getInvoice, getPaymentsFor, matchInvoice, recordProviderEvent,
} from "@/lib/admin/store";
import { invoiceTotals, lineTotal, type Invoice } from "@/lib/admin/types";
import { wholeKobo, verifyTransaction } from "@/lib/paystack";
import { chargeBanked, claimCharge, releaseCharge } from "@/lib/paystack-claim";
import { sendPaymentReceiptEmail } from "@/lib/money-mail";
import ReceiptPrinter, { type ReceiptLine } from "@/components/money/receipt-printer";
import "@/components/money/document.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * Where Paystack sends the payer back to.
 *
 * NOTHING ON THIS PAGE IS TAKEN FROM THE QUERY STRING EXCEPT THE REFERENCE,
 * and the reference is used only to ask Paystack what happened. The amount,
 * the status and the invoice all come from that answer. A page that read
 * "?status=success" and thanked somebody would thank anybody who typed it.
 *
 * IT RACES THE WEBHOOK ON PURPOSE, and that is fine: both call `applyPayment`,
 * which is idempotent on the reference, so whichever arrives second finds the
 * payment already banked and adds nothing. The redirect usually wins, which is
 * why it exists -- the payer sees their receipt immediately rather than
 * waiting on a server-to-server call they cannot see.
 *
 * NOT INDEXED, and there is nothing here worth indexing: it is one payer's
 * answer to one transaction.
 */

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
  alternates: { canonical: undefined },
};

export const dynamic = "force-dynamic";

type Outcome =
  | {
      kind: "paid"; receiptUrl: string; amount: number; number: string;
      outstanding: number;
      /* Carried so the slip can print the particulars rather than a figure on
         its own. All of it comes off the payment we just banked, never off
         the query string. */
      receiptNo: string; method: string; at: string;
      /** Paid past the total: the extra is credit, and the payer is told. */
      overpaid?: boolean;
      /* What the slip itemises: the invoice's own lines and totals, read
         after the payment is banked. */
      lines: ReceiptLine[]; subtotal: number; vat: number; vatRate: number; total: number;
    }
  /* The invoice's public address when it is known, so a failed or unconfirmed
     payment always has "Try again" rather than a dead end. */
  | { kind: "pending"; message: string; invoiceToken?: string }
  | { kind: "test"; message: string; invoiceToken?: string }
  | { kind: "failed"; message: string; invoiceToken?: string }
  /* No reference at all: this page cannot know what happened, so it must not
     say "not paid" -- that alarms somebody whose money may well have gone. */
  | { kind: "unknown"; message: string; invoiceToken?: string };

/** The paid outcome, from the banked payment and the invoice as it now stands. */
function paidOutcome(
  inv: Invoice,
  p: { token: string; amount: number; receiptNo: string; method: string; at: string },
  overpaid = false,
): Outcome {
  const t = invoiceTotals(inv);
  return {
    kind: "paid", receiptUrl: `/r/${p.token}`, amount: p.amount, number: inv.number,
    outstanding: t.due, receiptNo: p.receiptNo, method: p.method, at: p.at, overpaid,
    lines: inv.lines.map((l) => ({ description: l.description, qty: l.qty, amount: lineTotal(l) })),
    subtotal: t.subtotal, vat: t.vat, vatRate: inv.vatRate, total: t.total,
  };
}

async function settle(reference: string): Promise<Outcome> {
  const verified = await verifyTransaction(reference);
  const paystackMode = () => verified.mode;
  if (!verified.ok) {
    recordProviderEvent({
      event: "verify.failed", reference, amount: null, outcome: "Rejected", mode: paystackMode(),
      note: verified.error,
    });
    return {
      kind: "pending",
      message: "We could not confirm this with Paystack just now. If the money left your account it will still reach us. Paystack tells our server separately, and we will send your receipt when it does.",
    };
  }

  const t = verified.data;
  const amount = wholeKobo(t.amount);
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  const invoice = matchInvoice({
    invoiceId: typeof meta.invoiceId === "string" ? meta.invoiceId : undefined,
    reference,
  });
  const invoiceToken = invoice?.token;
  if (verified.mode === "test") return {kind:"test",invoiceToken,message:"This was a test checkout. No real money was recorded and your invoice remains unpaid."};

  if (t.status !== "success") {
    recordProviderEvent({
      event: "verify.not-success", reference, amount, outcome: "Failed", mode: paystackMode(),
      channel: t.channel ?? undefined,
      note: t.gateway_response ?? `Paystack reports the transaction as ${t.status}.`,
    });
    return {
      kind: "failed", invoiceToken,
      message: t.gateway_response
        ? `The payment did not go through: ${t.gateway_response.toLowerCase()}. Nothing was taken from your account; you can try again now.`
        : "The payment did not go through. Nothing has been taken from your account; you can try again now.",
    };
  }

  if ((t.currency || "NGN") !== "NGN") {
    recordProviderEvent({
      event: "verify.currency", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      note: `Charged in ${t.currency}, and the books are in NGN.`,
    });
    return { kind: "pending", invoiceToken, message: "Your payment went through and we are checking it against the invoice. We will email your receipt shortly." };
  }

  if (!invoice) {
    recordProviderEvent({
      event: "verify.unmatched", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      channel: t.channel ?? undefined,
      note: "Verified as paid, and no invoice in the books matches the reference.",
    });
    return { kind: "pending", message: "Your payment went through. We are matching it to the right invoice and will email your receipt shortly." };
  }

  const recording = { kind: "pending" as const, invoiceToken, message: "Your payment went through and we are recording it. We will email your receipt shortly." };

  /* ONE OF THIS PAGE AND THE WEBHOOK BANKS IT (lib/paystack-claim.ts). */
  const claim = await claimCharge({ reference, invoiceId: invoice.id, amount, by: "Paystack checkout" });
  if (claim === "unavailable") return recording;
  if (claim === "taken") {
    /* The webhook has it. Its instance may not have written the payment yet,
       so look once more a moment later before settling for "shortly". */
    let existing = getPaymentsFor(invoice.id).find((p) => p.reference === reference);
    if (!existing) {
      await new Promise((r) => setTimeout(r, 800));
      await syncStore();
      existing = getPaymentsFor(invoice.id).find((p) => p.reference === reference);
    }
    if (!existing) return recording;
    return paidOutcome(getInvoice(invoice.id) ?? invoice, existing);
  }

  const applied = applyPayment({
    invoiceId: invoice.id, amount, method: "Paystack", reference,
    by: "Paystack checkout", mode: paystackMode(),
  });

  /* ALREADY BANKED IS A SUCCESS, NOT AN ERROR. It means the webhook got here
     first, which is the system working. The payer is shown their receipt. */
  if (!applied.ok) {
    const existing = getPaymentsFor(invoice.id).find((p) => p.reference === reference);
    if (existing) await chargeBanked(reference, existing.id); else await releaseCharge(reference);
    if (applied.reason === "duplicate" && existing) {
      return paidOutcome(getInvoice(invoice.id) ?? invoice, existing);
    }
    recordProviderEvent({
      event: "verify.not-applied", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      invoiceId: invoice.id,
      note: `Verified as paid but could not be applied to ${invoice.number}: ${applied.reason}.`,
    });
    return recording;
  }

  await chargeBanked(reference, applied.payment.id);
  recordProviderEvent({
    event: "verify.success", reference, amount, outcome: "Applied", mode: paystackMode(),
    channel: t.channel ?? undefined,
    invoiceId: invoice.id, paymentId: applied.payment.id,
    note: applied.overpaid ? `Takes ${invoice.number} past its total.` : undefined,
  });

  const fresh = getInvoice(invoice.id) ?? invoice;
  /* Behind the response, and deduped on the payment, so the webhook arriving
     a second later does not send a second copy. */
  after(async () => {
    await sendPaymentReceiptEmail({
      payment: applied.payment, invoice: fresh, outstanding: invoiceTotals(fresh).due,
    });
  });

  return paidOutcome(fresh, applied.payment, Boolean(applied.overpaid));
}

export default async function PaymentDone({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await syncStore();
  persistSoon();
  const params = await searchParams;
  /* Paystack sends `reference`; older integrations see `trxref`. Both are the
     same value, and a string is all we take from either. */
  const raw = params.reference ?? params.trxref;
  const reference = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";

  /* A signed-in client came from the portal and gets a way back to it. */
  const signedInClient = await import("@/lib/portal/session")
    .then((m) => m.getPortalRequest()).then((r) => Boolean(r.client)).catch(() => false);

  const outcome: Outcome = reference
    ? await settle(reference)
    : { kind: "unknown", message: "This page needs a payment reference to look your payment up, and there is not one on it. If you were paying an invoice, open the invoice again: it shows whether the payment arrived, and has the button to pay if it did not." };

  return (
    <main className="doc doc--return">
      <article className="doc__sheet">
        <header className="doc__top">
          <div className="doc__who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-navy.svg" alt="" width={40} height={40} />
            <span><b>We Dig Creativity</b><small>Payment</small></span>
          </div>
        </header>

        {outcome.kind === "paid" ? (
          <>
            {/* THE SLIP REPLACES THE PANEL RATHER THAN SITTING ABOVE IT. Two
                statements of the same amount, one animated and one not, would
                make the page look like it could not decide which was the
                answer. The printer IS the answer; everything under it is what
                to do next. */}
            <ReceiptPrinter
              amount={outcome.amount}
              receiptNo={outcome.receiptNo}
              number={outcome.number}
              method={outcome.method}
              at={outcome.at}
              outstanding={outcome.outstanding}
              lines={outcome.lines}
              subtotal={outcome.subtotal}
              vat={outcome.vat}
              vatRate={outcome.vatRate}
              total={outcome.total}
            />
            <p className="doc__said">
              Thank you. A copy is on its way to the email address we have for
              you, and the receipt below is the live one: it will still be
              right if anything about this payment changes later.
            </p>
            {outcome.overpaid ? (
              <p className="doc__said">
                This invoice was already paid, so the extra is held as credit and comes off your next invoice.
                If you would rather have it back, write to info@wedigcreativity.com.ng and we will refund it.
              </p>
            ) : null}
            <p className="doc__actions">
              <Link className="doc__btn" href={outcome.receiptUrl}>Open your receipt</Link>
              {signedInClient ? <Link className="doc__btn doc__btn--ghost" href="/portal/billing">Back to billing</Link> : null}
            </p>
          </>
        ) : (
          <>
            <div className="doc__owed">
              <span className="doc__k">{outcome.kind === "test" ? "Test checkout" : outcome.kind === "failed" ? "Not paid" : outcome.kind === "unknown" ? "No reference" : "Checking"}</span>
              <h1 style={{ fontSize: "1.5rem", margin: 0, lineHeight: 1.2 }}>
                {outcome.kind === "test" ? "No real payment was recorded" : outcome.kind === "failed" ? "The payment did not go through" : outcome.kind === "unknown" ? "We cannot tell which payment this is" : "We are confirming your payment"}
              </h1>
            </div>
            <p>{outcome.message}</p>
            <p className="doc__actions">
              {outcome.invoiceToken
                ? <Link className="doc__btn" href={`/i/${outcome.invoiceToken}`}>{outcome.kind === "failed" ? "Try again" : "Back to the invoice"}</Link>
                : null}
              {signedInClient ? <Link className={`doc__btn${outcome.invoiceToken ? " doc__btn--ghost" : ""}`} href="/portal/billing">Back to billing</Link> : null}
            </p>
          </>
        )}

        <footer className="doc__foot">
          <small>
            Questions about this go to{" "}
            <a href="mailto:info@wedigcreativity.com.ng">info@wedigcreativity.com.ng</a>.
            {reference ? <> Quote reference <b>{reference}</b>.</> : null}
          </small>
        </footer>
      </article>
    </main>
  );
}
