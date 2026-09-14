import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient, getInvoiceByToken, getPaymentsFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, lineTotal, naira } from "@/lib/admin/types";
import { DocumentShell, Headline, invoiceUrl } from "@/components/money/document";
import { CONTACT_EMAIL } from "@/lib/site";

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

export default async function PublicInvoice({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = getInvoiceByToken(token);
  /* A draft has not been sent to anybody, so there is nothing here to show
     even with the right token: 404 is the truthful answer. */
  if (!inv || inv.status === "Draft") notFound();

  const client = getClient(inv.clientId);
  const t = invoiceTotals(inv);
  const status = invoiceStatus(inv);
  const payments = getPaymentsFor(inv.id);
  const settled = t.due <= 0;

  return (
    <DocumentShell
      kind="Invoice"
      number={inv.number}
      url={invoiceUrl(inv.token)}
      qrLabel={`Reopen invoice ${inv.number}`}
      /* NO STAMP ON AN INVOICE THAT IS SIMPLY WAITING. Settled, part paid and
         overdue are all facts worth pressing into the corner; "sent, not yet
         due" is the default state of every invoice and stamping it would make
         the mark mean nothing. The empty corner is the right answer there. */
      stamp={
        settled ? "paid"
          : status === "Overdue" ? "overdue"
            : status === "Part paid" ? "part"
              : undefined
      }
    >
      <Headline
        label={settled ? "Paid in full" : "Amount due"}
        amount={settled ? t.total : t.due}
        clear={settled}
        pill={
          settled
            ? { text: "Settled", tone: "good" }
            /* ORANGE, NOT RED. Red is where something has gone wrong -- a
               reversed payment, a failed charge. An invoice past its date is
               not a failure, it is a nudge, and the studio has to send these
               to people it wants to keep working with. */
            : status === "Overdue"
              ? { text: "Past its due date", tone: "due" }
              : status === "Part paid"
                ? { text: `${naira(inv.paid)} received so far`, tone: "warn" }
                : undefined
        }
      />

      <dl className="doc__meta">
        <div>
          <dt>Billed to</dt>
          <dd>{client?.company ?? "—"}</dd>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{new Date(inv.issued).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{new Date(inv.due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </div>
      </dl>

      <div className="doc__scroll">
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
              <th>What for</th>
              <th className="n">Qty</th>
              <th className="n">Unit</th>
              <th className="n">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, n) => (
              <tr key={n}>
                <td>{l.description}</td>
                <td className="n">{l.qty}</td>
                <td className="n">{naira(l.unit)}</td>
                <td className="n">{naira(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
          {/* EVERY FIGURE RECOMPUTED FROM THE LINES, never read from a stored
              total. A stored total is a second source of truth, and the day it
              disagrees with the first is the day somebody is billed wrong. */}
          <tfoot>
            <tr>
              <td colSpan={3} className="n">Subtotal</td>
              <td className="n">{naira(t.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="n">VAT at {inv.vatRate}%</td>
              <td className="n">{naira(t.vat)}</td>
            </tr>
            {inv.paid > 0 ? (
              <tr>
                <td colSpan={3} className="n">Received</td>
                <td className="n">−{naira(inv.paid)}</td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={3} className="n">{settled ? "Total" : "Due"}</td>
              <td className="n">{naira(settled ? t.total : t.due)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {payments.length ? (
        <>
          <h2 className="doc__sub">
            Payments received
          </h2>
          <div className="doc__scroll">
            <table className="doc__lines">
              <thead>
                <tr><th>Receipt</th><th>When</th><th>How</th><th className="n">Amount</th></tr>
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
                    <td>{new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
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

      {!settled ? (
        <section className="doc__pay">
          <h2>How to pay</h2>
          {/* NO PAY BUTTON UNTIL THERE IS A PAY BACKEND. Paystack
              initialisation, verification and webhook handling are not built,
              and a button that looks like it takes card payments and does not
              is worse than no button: it costs the client their time and the
              studio its credibility. When that route exists it goes here. */}
          <p>
            Reply to the email this came with, or write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(inv.number)}`}>{CONTACT_EMAIL}</a>,
            and we will send the account details or a card link, whichever suits you.
          </p>
          <p>
            Quote <b>{inv.number}</b> on the transfer so it reaches the right
            project without anybody having to ask.
          </p>
        </section>
      ) : null}
    </DocumentShell>
  );
}
