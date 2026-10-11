import PaymentAccount from "@/components/money/payment-account";
import {currencyOf,money} from "@/lib/money/currency";
import ReceiptControls from "@/components/money/receipt-controls";
import { PayForm } from "@/components/money/pay-form";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getInvoiceByToken, getPaymentsFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, lineTotal } from "@/lib/admin/types";
import { DocumentShell, DocNote, DocTotals, docDay, daysFromToday, invoiceUrl, type DocTag } from "@/components/money/document";
import { CONTACT_EMAIL } from "@/lib/site";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * One invoice, for the person who has to pay it.
 *
 * ADDRESSED BY A RANDOM TOKEN, NEVER BY ITS NUMBER. Invoice numbers are
 * sequential by design -- that is what makes them auditable -- so a page at
 * /i/INV-2026-004 would hand anyone holding one invoice every other invoice
 * the studio has ever raised, by subtracting one. The token is 128 bits from
 * `crypto.randomUUID`, it is the entire authorisation, and a wrong one gets a
 * plain 404 rather than a message confirming the format was right.
 *
 * NOINDEX, AND NOT ONLY BY META TAG. The robots file disallows /i/ and /r/ as
 * well, and neither is in the sitemap. A crawler that finds a token in a
 * forwarded email should not be the reason an invoice ends up in a search
 * index.
 *
 * WHAT IT DELIBERATELY DOES NOT SHOW: the client's own record, other invoices,
 * project internals, or anything about the studio's books. A person with this
 * link is being shown one document and nothing else.
 */
export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false, nocache: true },
  /* Explicitly cleared. The root layout sets a canonical to the site root and
     metadata is INHERITED, so without this every invoice would be telling
     crawlers it is a duplicate of the homepage. */
  alternates: { canonical: undefined },
};

/* WHY A CHECKOUT DID NOT START, IN THE PAYER'S WORDS.

   The route bounces back here with one of these rather than rendering its own
   error page, because the thing the payer wants next is the invoice itself,
   not a dead end with a Back button. Each case is a different sentence: "we
   are not sure it worked" and "we have no address for you" need different
   actions from them.

   NONE OF THEM SENDS SOMEBODY OFF TO MAKE A TRANSFER. They used to. That is
   how an invoice ends up paid by an untracked transfer nobody can match, and
   it is the studio, not the client, who then spends the afternoon on it. When
   the checkout will not open the honest instruction is to try again or write
   to us, because we can send a fresh link. */
const PAY_PROBLEMS: Record<string, string> = {
  busy: "That has been tried a few times in the last few minutes. Give it a moment and try again.",
  settled: "This invoice has already been paid in full, so there is nothing to charge.",
  voided: "This invoice has been cancelled, so there is nothing to pay on it.",
  "no-email": "We do not have an email address on file for you, and the checkout needs one to send your receipt to. Write to us and we will sort it out.",
  unavailable: "The checkout would not open just now, and nothing has been charged. Try again in a minute, or write to us and we will send you a fresh link.",
};

export default async function PublicInvoice({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await syncStore();
  persistSoon();
  const { token } = await params;
  const inv = getInvoiceByToken(token);
  /* A draft has not been sent to anybody, so there is nothing here to show
     even with the right token: 404 is the truthful answer. */
  if (!inv || inv.status === "Draft") notFound();
  const naira=(amount:number)=>money(amount,currencyOf(inv));

  const client = getClient(inv.clientId);
  const t = invoiceTotals(inv);
  const status = invoiceStatus(inv);
  const payments = getPaymentsFor(inv.id);
  const settled = t.due <= 0;

  const q = await searchParams;
  const flag = Array.isArray(q.pay) ? q.pay[0] : q.pay;
  const problem = flag ? PAY_PROBLEMS[flag] : undefined;
  const paymentMode = await selectedPaystackMode().catch(() => null);

  /* THE BUTTON IS ONLY OFFERED WHEN IT CAN ACTUALLY WORK. Paystack needs an
     email address for the payer, and a checkout that opens and then refuses is
     worse than a page that never offered one. Where there is no address the
     panel below says to write to us instead, and we send a link -- which is a
     real answer rather than a dead end, and keeps the money on the one route
     the books can follow. */
  const canCheckout = ["NGN","USD"].includes(currencyOf(inv)) && !settled && !inv.voided && Boolean(client?.email?.trim());

  const day = docDay;
  /* WHOLE DAYS FROM TODAY TO THE DUE DATE, for the tag: "Due in 4 days" or
     "3 days late". Dates are calendar days, so both ends are cut to a day. */
  const away = daysFromToday(inv.due);
  const late = Math.max(1, -away);
  const tag: DocTag =
    inv.voided ? { text: "Cancelled", tone: "flat" }
      : settled ? { text: "Paid", tone: "good" }
        : status === "Overdue" ? { text: `${late} ${late === 1 ? "day" : "days"} late`, tone: "bad" }
          : status === "Part paid" ? { text: "Part paid", tone: "warn" }
            : { text: away <= 0 ? "Due today" : `Due in ${away} ${away === 1 ? "day" : "days"}`, tone: away <= 7 ? "warn" : "flat" };

  return (
    <DocumentShell
      kind="Invoice"
      number={inv.number}
      url={invoiceUrl(inv.token)}
      qrLabel={`Reopen invoice ${inv.number}`}
      tag={tag}
      /* NO STAMP ON AN INVOICE THAT IS SIMPLY WAITING. Settled, part paid and
         overdue are all facts worth pressing into the corner; "sent, not yet
         due" is the default state of every invoice and stamping it would make
         the mark mean nothing. The empty corner is the right answer there. */
      stamp={
        inv.voided ? "void"
          : settled ? "paid"
            : status === "Overdue" ? "overdue"
              : status === "Part paid" ? "part"
                : undefined
      }
    >
      {/* A STRUCK INVOICE STILL OPENS, AND SAYS SO ON ITS FACE.

          The alternative was a 404, and a 404 on a document somebody is
          holding reads as the studio having made it disappear. The number
          stays taken, the page stays live, and it says plainly that nothing is
          owed -- which is the one thing the person holding it needs to know.
          The reason is shown too, because "why does this say void" is the
          question they will ask next. */}
      {inv.voided ? (
        <DocNote tone="warn">
          <b>This invoice has been cancelled.</b> Nothing is owed on it and no
          payment should be made against it
          {inv.voided.reason ? `: ${inv.voided.reason}` : "."} If you were
          expecting a bill for this work, one will follow under a new number.
        </DocNote>
      ) : settled && t.total > 0 ? (
        <DocNote>Paid in full, {naira(t.total)}. Thank you. Each payment is listed below with its receipt.</DocNote>
      ) : status === "Part paid" ? (
        <DocNote tone="warn">{naira(inv.paid)} is paid. {naira(t.due)} is still open.</DocNote>
      ) : status === "Overdue" ? (
        /* ORANGE, NOT RED, WAS THE OLD RULE: an invoice past its date is a
           nudge, not a failure. The board's red is for the tag only when the
           invoice really is late; the sentence stays kind and says what to do. */
        <DocNote tone="bad">This invoice is {late} {late === 1 ? "day" : "days"} late. You can pay it below in one step.</DocNote>
      ) : null}

      <dl className="doc__meta docMetaG">
        <div>
          <dt>Billed to</dt>
          <dd><strong>{client?.company ?? "–"}</strong></dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{day(inv.issued)}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd><strong className={status === "Overdue" ? "doc__late" : undefined}>{day(inv.due)}</strong></dd>
        </div>
      </dl>

      <div className="doc__scroll" tabIndex={0} aria-label="Lines, scrolls sideways">
        <table className="doc__lines">
          <thead>
            {/* A RUNNING HEAD, PRINT ONLY.

                `table-header-group` reprints a thead after every page break,
                so anything in here comes back on each sheet. Sheet two of a
                long invoice was otherwise anonymous: columns of money with no
                number and no client on it, which is a real problem the moment
                a stapled copy comes apart on somebody's desk. */}
            <tr className="doc__run">
              <th colSpan={4}>
                {inv.number}{client ? ` · ${client.company}` : ""}
              </th>
            </tr>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" className="n">Qty</th>
              <th scope="col" className="n">Unit</th>
              <th scope="col" className="n">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, n) => (
              <tr key={n}>
                <td><strong>{l.description}</strong></td>
                <td className="n">{l.qty}</td>
                <td className="n">{naira(l.unit)}</td>
                <td className="n">{naira(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* EVERY FIGURE RECOMPUTED FROM THE LINES, never read from a stored
          total. A stored total is a second source of truth, and the day it
          disagrees with the first is the day somebody is billed wrong. */}
      <DocTotals
        rows={[
          { k: "Subtotal", v: naira(t.subtotal) },
          { k: `VAT ${inv.vatRate}%`, v: naira(t.vat) },
          ...(inv.paid > 0 ? [{ k: "Received", v: `−${naira(inv.paid)}` }] : []),
          { k: settled ? "Total" : "Balance", v: naira(settled ? t.total : t.due), strong: true },
        ]}
      />

      {payments.length ? (
        <>
          <h2 className="doc__sub">
            Payments received
          </h2>
          <div className="doc__scroll" tabIndex={0} aria-label="Payments, scrolls sideways">
            <table className="doc__lines">
              <thead>
                <tr><th scope="col">Receipt</th><th scope="col">When</th><th scope="col">How</th><th scope="col" className="n">Amount</th></tr>
              </thead>
              <tbody>
                {/* REVERSED ROWS STAY, STRUCK THROUGH. A client comparing this
                    against their own bank statement needs to see that the
                    payment was received and then went back; a list it silently
                    disappears from is a list they cannot reconcile, and the
                    first thing they will do is email to ask. */}
                {payments.map((p) => (
                  <tr key={p.id} className={p.reversed ? "is-void" : undefined}>
                    <td><a href={`/r/${p.token}`}>{p.receiptNo}</a></td>
                    <td>{day(p.at)}</td>
                    <td>
                      {p.method}
                      {p.reversed ? <><br /><small>Reversed, not counted</small></> : null}
                    </td>
                    <td className="n">{naira(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* NOTHING ABOUT PAYING A CANCELLED INVOICE. A "how to pay" panel under a
          document that says nothing is owed is an invitation to send money
          that will then have to be sent back. */}
      {!settled && !inv.voided ? (
        <section className="doc__pay">
          <h2>How to pay</h2>
          {inv.paymentAccount?<PaymentAccount account={inv.paymentAccount} reference={inv.number}/>:null}
          {currencyOf(inv)!=="NGN"?<p>{currencyOf(inv)==="USD"?"Pay in USD with Flutterwave, or transfer using the payment account shown.":`Pay in ${currencyOf(inv)} using the payment account shown.`} The studio checks manual transfers before recording payment. Contact us if no payment account is shown.</p>:null}

          {/* SAID BEFORE THE BUTTON, NOT AFTER IT. Something went wrong on the
              last attempt and the payer is standing here wondering whether
              they have been charged. Each of these is a different answer and
              none of them is "an error occurred". */}
          {problem ? <div className="errNote" role="alert"><span>{problem}</span></div> : null}
          {currencyOf(inv)==="NGN" && !settled && paymentMode !== "live" ? <div className="warnNote" role="status"><span>{paymentMode === "test" ? "Paystack is in test mode. A test payment leaves this invoice unpaid. Choose Flutterwave or use the bank details for a real payment." : "Paystack is temporarily unavailable. Choose Flutterwave or use the bank details below."}</span></div> : null}

          {/* A REAL FORM, A REAL POST. Not a fetch and not a link: a link that
              spends money can be followed by a prefetcher or a mail scanner,
              and a fetch would put this behind JavaScript for no gain. The
              route reads nothing from the body -- the amount and the invoice
              come off the token in the URL, because a form field is a number
              the payer can edit. */}
          {canCheckout ? (
            <PayForm currency={currencyOf(inv)} action={`/api/pay/${inv.token}`} className="doc__payForm" amount={naira(t.due)}>
              <p className="doc__hint">
                You pay the studio, and the studio never holds your card details. A receipt is emailed the moment it clears. A paid invoice cannot be paid twice.
              </p>
            </PayForm>
          ) : null}

          {/* ONE WAY TO PAY, AND IT IS THE ONE THAT WORKS.

              This used to offer bank transfer as an alternative under the
              button, which read as a second, equal option. It is not one. The
              studio collects through Paystack, and Paystack's own page already
              offers a transfer to a one-time account alongside the card, so
              "prefer a bank transfer?" was sending people out to email for
              something the button in front of them does better and records
              automatically.

              The other methods in the books -- transfer, cash, POS -- are the
              studio's, for entering money that arrived some other way or
              sorting out a payment that went wrong. They are not a menu a
              client picks from, and a document that showed them as one is what
              produces the untracked transfer somebody then has to reconcile by
              hand. */}
          {canCheckout ? (
            /* The method is already said under the button. This is the other
               half: what to do when the button does not work, which is the
               only thing left for this panel to answer. */
            <p className="doc__hint">
              Anything that goes wrong, write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(inv.number)}`}>{CONTACT_EMAIL}</a>{" "}
              quoting <b>{inv.number}</b> and we will sort it out.
            </p>
          ) : (
            /* No checkout, so this is the only route left and it has to carry
               the whole answer rather than read as a fallback. */
            <p>
              Write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(inv.number)}`}>{CONTACT_EMAIL}</a>{" "}
              quoting <b>{inv.number}</b>{currencyOf(inv)==="NGN"?" and we will send you a payment link for this invoice.":` to confirm payment details in ${currencyOf(inv)}.`}
            </p>
          )}
        </section>
      ) : null}

      <ReceiptControls token={inv.token} kind="Invoice" number={inv.number} />
      <p className="doc__hint">Questions about this invoice? Reply to the email it came with, or use Need help.</p>
    </DocumentShell>
  );
}
