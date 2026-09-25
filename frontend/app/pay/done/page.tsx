import Link from "next/link";
import type { Metadata } from "next";
import { after } from "next/server";
import {
  applyPayment, getInvoice, getPaymentsFor, matchInvoice, recordProviderEvent,
} from "@/lib/admin/store";
import { invoiceTotals, naira } from "@/lib/admin/types";
import { fromKobo, paystackMode, verifyTransaction } from "@/lib/paystack";
import { sendPaymentReceiptEmail } from "@/lib/money-mail";
import ReceiptPrinter from "@/components/money/receipt-printer";
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
    }
  | { kind: "pending"; message: string }
  | { kind: "failed"; message: string }
  /* No reference at all: this page cannot know what happened, so it must not
     say "not paid" -- that alarms somebody whose money may well have gone. */
  | { kind: "unknown"; message: string };

async function settle(reference: string): Promise<Outcome> {
  const verified = await verifyTransaction(reference);
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
  const amount = fromKobo(t.amount);

  if (t.status !== "success") {
    recordProviderEvent({
      event: "verify.not-success", reference, amount, outcome: "Failed", mode: paystackMode(),
      channel: t.channel ?? undefined,
      note: t.gateway_response ?? `Paystack reports the transaction as ${t.status}.`,
    });
    return {
      kind: "failed",
      message: t.gateway_response
        ? `The payment did not go through: ${t.gateway_response.toLowerCase()}.`
        : "The payment did not go through. Nothing has been taken from your account.",
    };
  }

  if ((t.currency || "NGN") !== "NGN") {
    recordProviderEvent({
      event: "verify.currency", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      note: `Charged in ${t.currency}, and the books are in NGN.`,
    });
    return { kind: "pending", message: "Your payment went through and we are checking it against the invoice. We will email your receipt shortly." };
  }

  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  const invoice = matchInvoice({
    invoiceId: typeof meta.invoiceId === "string" ? meta.invoiceId : undefined,
    reference,
  });
  if (!invoice) {
    recordProviderEvent({
      event: "verify.unmatched", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      channel: t.channel ?? undefined,
      note: "Verified as paid, and no invoice in the books matches the reference.",
    });
    return { kind: "pending", message: "Your payment went through. We are matching it to the right invoice and will email your receipt shortly." };
  }

  const applied = applyPayment({
    invoiceId: invoice.id, amount, method: "Paystack", reference,
    by: "Paystack checkout", mode: paystackMode(),
  });

  /* ALREADY BANKED IS A SUCCESS, NOT AN ERROR. It means the webhook got here
     first, which is the system working. The payer is shown their receipt. */
  if (!applied.ok) {
    const existing = getPaymentsFor(invoice.id).find((p) => p.reference === reference);
    if (applied.reason === "duplicate" && existing) {
      const fresh = getInvoice(invoice.id) ?? invoice;
      return {
        kind: "paid", receiptUrl: `/r/${existing.token}`, amount: existing.amount,
        number: invoice.number, outstanding: invoiceTotals(fresh).due,
        receiptNo: existing.receiptNo, method: existing.method, at: existing.at,
      };
    }
    recordProviderEvent({
      event: "verify.not-applied", reference, amount, outcome: "Unmatched", mode: paystackMode(),
      invoiceId: invoice.id,
      note: `Verified as paid but could not be applied to ${invoice.number}: ${applied.reason}.`,
    });
    return { kind: "pending", message: "Your payment went through and we are recording it. We will email your receipt shortly." };
  }

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

  return {
    kind: "paid", receiptUrl: `/r/${applied.payment.token}`, amount: applied.payment.amount,
    number: invoice.number, outstanding: invoiceTotals(fresh).due,
    receiptNo: applied.payment.receiptNo, method: applied.payment.method,
    at: applied.payment.at,
  };
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
            />
            <p className="doc__said">
              Thank you. A copy is on its way to the email address we have for
              you, and the receipt below is the live one: it will still be
              right if anything about this payment changes later.
            </p>
            <p className="doc__actions">
              <Link className="doc__btn" href={outcome.receiptUrl}>Open your receipt</Link>
            </p>
          </>
        ) : (
          <>
            <div className="doc__owed">
              <span className="doc__k">{outcome.kind === "failed" ? "Not paid" : outcome.kind === "unknown" ? "No reference" : "Checking"}</span>
              <h1 style={{ fontSize: "1.5rem", margin: 0, lineHeight: 1.2 }}>
                {outcome.kind === "failed" ? "The payment did not go through" : outcome.kind === "unknown" ? "We cannot tell which payment this is" : "We are confirming your payment"}
              </h1>
            </div>
            <p>{outcome.message}</p>
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
