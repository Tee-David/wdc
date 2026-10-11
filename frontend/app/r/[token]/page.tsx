import Link from "next/link";
import ReceiptPrinter from "@/components/money/receipt-printer";
import {currencyOf,money} from "@/lib/money/currency";
import ReceiptControls from "@/components/money/receipt-controls";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getInvoice, getPaymentByToken, getProject } from "@/lib/admin/store";
import { invoiceTotals, lineTotal, paymentNet, refundedTotal } from "@/lib/admin/types";
import { DocumentShell, DocNote, DocTotals, docDay, docTime, invoiceUrl, receiptUrl, type DocTag } from "@/components/money/document";
import { BarePage } from "@/components/layout/bare-page";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * A receipt for one payment.
 *
 * EVERY SUCCESSFUL PAYMENT GETS ONE, whatever the method. A Paystack charge
 * and two hundred thousand naira transferred from a phone are the same event
 * as far as the client is concerned -- they paid, and they are owed a document
 * saying so. The number is assigned when the payment is recorded rather than
 * when the receipt is opened, so reprinting one cannot change it.
 *
 * Addressed by its own random token for the same reason the invoice is: see
 * the note there. Receipt numbers are sequential too.
 *
 * A RECEIPT IS A STATEMENT ABOUT ONE PAYMENT, so it shows the payment and the
 * invoice it went against, and deliberately not the client's other invoices,
 * their balance elsewhere, or anything about the project beyond its name.
 */
export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

export default async function PublicReceipt({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{view?:string}>;
}) {
  await syncStore();
  persistSoon();
  const { token } = await params;
  const pay = getPaymentByToken(token);
  if (!pay) notFound();

  const inv = getInvoice(pay.invoiceId);
  /* A receipt without its invoice cannot say what the money was for, which is
     most of what a receipt is. This should not happen -- reversing a payment
     removes the payment, not the invoice -- so it is a 404 rather than a
     half-rendered document. */
  if (!inv) notFound();
  const naira=(amount:number)=>money(amount,currencyOf(inv));

  const client = getClient(inv.clientId);
  const project = inv.projectId ? getProject(inv.projectId) : null;
  const t = invoiceTotals(inv);
  const remaining = t.due;
  const gone = pay.reversed;
  const refunds = pay.refunds ?? [];
  const refunded = refundedTotal(pay);
  const net = paymentNet(pay);
  /* Refunded to nothing is its own state and reads differently from a partial
     one: "we gave it all back" and "we gave some of it back" are answers to
     different questions, and a client holding this is asking one of them. */
  const fullyRefunded = !gone && refunded > 0 && net <= 0;

  if((await searchParams).view!=="full")return <BarePage><div className="doc doc--return"><article className="doc__sheet docSheet"><div className="dsBody doc__slip">
    <ReceiptPrinter amount={pay.amount} receiptNo={pay.receiptNo} number={inv.number} method={pay.method} at={pay.at} outstanding={remaining} lines={inv.lines.map(l=>({description:l.description,qty:l.qty,amount:lineTotal(l)}))} subtotal={t.subtotal} vat={t.vat} vatRate={inv.vatRate} total={t.total} currency={currencyOf(inv)} refunded={refunded} reversed={Boolean(gone)}/>
    <div className="doc__actions"><Link className="bareBtn" href={`/r/${encodeURIComponent(pay.token)}?view=full`}>View full receipt</Link></div>
    <ReceiptControls token={pay.token} number={pay.receiptNo}/>
  </div></article></div></BarePage>;

  const tag: DocTag =
    gone ? { text: "Reversed", tone: "bad" }
      : fullyRefunded ? { text: "Refunded", tone: "flat" }
        : refunded > 0 ? { text: "Part refunded", tone: "warn" }
          : remaining > 0 ? { text: "Part payment", tone: "warn" }
            : { text: "Paid", tone: "good" };

  return (
    <DocumentShell
      kind="Receipt"
      number={pay.receiptNo}
      url={receiptUrl(pay.token)}
      qrLabel={`Reopen receipt ${pay.receiptNo}`}
      tag={tag}
      /* THE STAMP TELLS THE TRUTH ABOUT THIS RECEIPT, not about the studio's
         hopes for it. A reversed payment keeps its receipt and its number --
         the client may be holding a printout -- so the document stays live and
         says REVERSED rather than turning into a 404 with no explanation. An
         intact payment that settles the invoice is PAID; one that leaves a
         balance is PART PAID, because telling somebody "paid" while they still
         owe money is the kind of mistake that gets found at the worst
         possible moment. */
      stamp={
        gone ? "reversed"
          : fullyRefunded ? "refunded"
            : remaining > 0 ? "part" : "paid"
      }
    >

      {gone ? (
        <DocNote tone="warn"><b>Payment reversed.</b>{gone.reason ? ` ${gone.reason}` : ""}</DocNote>
      ) : fullyRefunded ? (
        <DocNote tone="warn">This payment was refunded in full on {docDay(refunds[refunds.length - 1].at)}. It reaches the bank in the usual time.</DocNote>
      ) : refunded > 0 ? (
        <DocNote tone="warn">{naira(refunded)} of this payment was refunded. The net payment is {naira(net)}.</DocNote>
      ) : remaining > 0 ? (
        <DocNote tone="warn">This is a part payment. {naira(remaining)} is still open on the invoice.</DocNote>
      ) : null}

      <dl className="doc__meta docMetaG">
        <div>
          <dt>Received from</dt>
          <dd><strong>{client?.company ?? "–"}</strong></dd>
        </div>
        <div>
          <dt>Payment date</dt>
          <dd>{docTime(pay.at)}</dd>
        </div>
        <div>
          <dt>Paid with</dt>
          <dd><strong>{pay.method}</strong></dd>
        </div>
        <div>
          <dt>Invoice</dt>
          {/* Linked to the live invoice, so somebody holding a printed receipt
              can check what is still owed without writing to ask. */}
          <dd><a href={invoiceUrl(inv.token)}>{inv.number}</a></dd>
        </div>
        {project ? (
          <div>
            <dt>Project</dt>
            <dd>{project.title}</dd>
          </div>
        ) : null}
        <div>
          {/* THE REFERENCE IS SHOWN ON PURPOSE. It is the one field that ties
              this row to the bank's or the provider's, and it is what either
              side quotes when a payment has to be traced. */}
          <dt>Provider reference</dt>
          <dd>{pay.reference}</dd>
        </div>
      </dl>

      {pay.note ? (
        <p className="doc__note">{pay.note}</p>
      ) : null}

      {/* ITEMISED, BECAUSE A PART REFUND HAS TO BE CHECKABLE. A single "less
          refunds" figure is a number the client has to take on trust; the rows
          are what they reconcile against their own statement. */}
      {refunds.length ? (
        <>
          <h2 className="doc__sub">Payment adjustments</h2>
          <div className="doc__scroll">
            <table className="doc__lines">
              <thead>
                <tr><th>Date</th><th>Reason</th><th>Destination</th><th className="n">Amount</th></tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td className="n">{docDay(r.at)}</td>
                    <td>{r.reason}</td>
                    <td>
                      {r.toCredit ? "Client credit" : "Bank refund"}
                      {r.reference ? <small className="doc__ref">{r.reference}</small> : null}
                    </td>
                    <td className="n">−{naira(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="n">Net payment</td>
                  <td className="n">{naira(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : null}

      <div className="doc__scroll" tabIndex={0} aria-label="Invoice position, scrolls sideways">
        <table className="doc__lines">
          <thead>
            <tr><th scope="col">Description</th><th scope="col" className="n">Invoice total</th><th scope="col" className="n">Paid to date</th><th scope="col" className="n">Outstanding</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Payment against invoice {inv.number}</strong></td>
              <td className="n">{naira(t.total)}</td>
              <td className="n">{naira(inv.paid)}</td>
              <td className="n">{naira(remaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <DocTotals
        rows={[
          ...(refunded > 0 ? [{ k: "Received", v: naira(pay.amount) }, { k: "Refunded", v: `−${naira(refunded)}` }] : []),
          ...(remaining > 0 ? [{ k: "Still open on the invoice", v: naira(remaining) }] : []),
          { k: gone ? "Reversed, was received" : refunded > 0 ? "Net payment" : "Amount paid", v: naira(gone ? pay.amount : refunded > 0 ? net : pay.amount), strong: true },
        ]}
      />

      <ReceiptControls token={pay.token} number={pay.receiptNo} />
      <p className="doc__hint">Keep this receipt for your records. It is a valid proof of payment.</p>
    </DocumentShell>
  );
}
