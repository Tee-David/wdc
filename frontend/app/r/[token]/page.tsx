import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getInvoice, getPaymentByToken, getProject } from "@/lib/admin/store";
import { invoiceTotals, naira } from "@/lib/admin/types";
import { DocumentShell, Headline, invoiceUrl, receiptUrl } from "@/components/money/document";

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
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pay = getPaymentByToken(token);
  if (!pay) notFound();

  const inv = getInvoice(pay.invoiceId);
  /* A receipt without its invoice cannot say what the money was for, which is
     most of what a receipt is. This should not happen -- reversing a payment
     removes the payment, not the invoice -- so it is a 404 rather than a
     half-rendered document. */
  if (!inv) notFound();

  const client = getClient(inv.clientId);
  const project = inv.projectId ? getProject(inv.projectId) : null;
  const t = invoiceTotals(inv);
  const remaining = t.due;
  const gone = pay.reversed;

  return (
    <DocumentShell
      kind="Receipt"
      number={pay.receiptNo}
      url={receiptUrl(pay.token)}
      qrLabel={`Reopen receipt ${pay.receiptNo}`}
      /* THE STAMP TELLS THE TRUTH ABOUT THIS RECEIPT, not about the studio's
         hopes for it. A reversed payment keeps its receipt and its number --
         the client may be holding a printout -- so the document stays live and
         says REVERSED rather than turning into a 404 with no explanation. An
         intact payment that settles the invoice is PAID; one that leaves a
         balance is PART PAID, because telling somebody "paid" while they still
         owe money is the kind of mistake that gets found at the worst
         possible moment. */
      stamp={gone ? "reversed" : remaining > 0 ? "part" : "paid"}
    >
      {gone ? (
        <p className="doc__void" role="status">
          <b>This receipt has been reversed.</b> The payment it records did not
          stay with us{gone.reason ? `: ${gone.reason}` : "."} It no longer
          counts towards {inv.number}. Nothing here has been altered or
          removed — this is the original receipt, marked.
        </p>
      ) : null}

      <Headline
        label={gone ? "Reversed, originally received" : "Received with thanks"}
        amount={pay.amount}
        clear={!gone}
        pill={
          gone
            ? { text: `Reversed ${new Date(gone.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, tone: "bad" }
            : remaining > 0
              ? { text: `${naira(remaining)} still outstanding`, tone: "warn" }
              : { text: "Invoice settled in full", tone: "good" }
        }
      />

      <dl className="doc__meta">
        <div>
          <dt>From</dt>
          <dd>{client?.company ?? "—"}</dd>
        </div>
        <div>
          <dt>Received</dt>
          <dd>{new Date(pay.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
        <div>
          <dt>How</dt>
          <dd>{pay.method}</dd>
        </div>
        <div>
          <dt>Against</dt>
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
          <dt>Reference</dt>
          <dd>{pay.reference}</dd>
        </div>
      </dl>

      {pay.note ? (
        <p style={{ margin: "0 0 1rem", color: "#5a5a72", lineHeight: 1.6 }}>{pay.note}</p>
      ) : null}

      <div className="doc__scroll">
        <table className="doc__lines">
          <thead>
            <tr><th>Invoice</th><th className="n">Total</th><th className="n">Paid to date</th><th className="n">Outstanding</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{inv.number}</td>
              <td className="n">{naira(t.total)}</td>
              <td className="n">{naira(inv.paid)}</td>
              <td className="n">{naira(remaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocumentShell>
  );
}
