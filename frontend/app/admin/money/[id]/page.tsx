import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient, getInvoice, getPaymentsFor, getProject, getProjectsFor,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, lineTotal, naira } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";
import QrCode from "@/components/ui/qr-code";
import { invoiceUrl } from "@/components/money/document";
import { PaymentMenu } from "@/components/admin/row-actions";
import {
  DeleteDraft, InvoiceBuilder, IssueInvoice, RecordPayment, } from "@/components/admin/money-forms";
import { EmailInvoice, EmailReminder } from "@/components/admin/reconcile-forms";
import CommsLog from "@/components/admin/comms-log";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/* NO generateStaticParams: invoices are raised at runtime, and a prerendered
   list would 404 on the one just created. */

/* See the note beside the same function in clients/[id]/page.tsx. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const inv = getInvoice(id);
  if (!inv) notFound();
  return { title: `${inv.number} · Invoice` };
}

/**
 * One invoice, as the client will see it and as the studio needs it.
 *
 * EVERY FIGURE IS RECOMPUTED FROM THE LINES. Nothing here reads a stored
 * total, because a stored total is a second source of truth that can disagree
 * with the first one, and the day it does is the day somebody is billed wrong.
 * See `invoiceTotals` in lib/admin/types.ts.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const inv = getInvoice(id);
  if (!inv) notFound();
  const client = getClient(inv.clientId);
  const project = inv.projectId ? getProject(inv.projectId) : null;
  const payments = getPaymentsFor(inv.id);
  const t = invoiceTotals(inv);
  const status = invoiceStatus(inv);

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/money">Money</Link></p>
          <h1>{inv.number}</h1>
          <p>
            {client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link> : "Unknown client"}
            {project ? <> · <Link href={`/admin/projects/${project.id}`}>{project.title}</Link></> : null}
            {" · issued "}{when(inv.issued)}
          </p>
        </div>
        <div className="ad__row" data-tour="inv-actions">
          <PageTourButton />
          <InvoicePill status={status} />
          {/* A DRAFT AND AN ISSUED INVOICE OFFER DIFFERENT THINGS, because
              they are different objects: a draft is still being written, and
              an issued one is a document somebody outside the studio is
              holding. Editing or deleting it after that is how the two copies
              stop matching, so neither is offered. */}
          {inv.status === "Draft" ? (
            <>
              {client ? (
                <InvoiceBuilder
                  clients={[client]}
                  projects={getProjectsFor(inv.clientId)}
                  invoice={inv}
                  trigger="Edit the draft"
                />
              ) : null}
              <IssueInvoice invoice={inv} />
              <DeleteDraft invoice={inv} />
            </>
          ) : inv.voided ? (
            /* A STRUCK INVOICE OFFERS NOTHING, because there is nothing left
               to do to it. Not emailing it, not chasing it, not taking money
               against it. What is offered is what is true. */
            null
          ) : (
            <>
              {/* SENDING IT IS AN ACTION ON THE INVOICE, not a step buried in
                  a menu. Both are safe to press twice -- the message log's
                  dedupe key means the second press sends nothing and says so
                  -- so neither asks for a confirmation. */}
              <EmailInvoice id={inv.id} />
              {t.due > 0 && status === "Overdue" ? <EmailReminder id={inv.id} /> : null}
              <RecordPayment invoice={inv} owed={t.due} />
            </>
          )}
        </div>
      </div>

      {inv.voided ? (
        <p className="ad__banner" role="status">
          <b>Struck on {when(inv.voided.at)} by {inv.voided.by}.</b>{" "}
          {inv.voided.reason} The number stays taken and the client&apos;s copy
          still opens, saying nothing is owed. It is out of the outstanding
          total, out of the aging and out of the collection rate.
        </p>
      ) : null}

      <dl className="ad__tiles">
        <Tile label="Total" value={naira(t.total)} />
        <Tile label="Paid" value={naira(inv.paid)} tone={inv.paid ? "good" : undefined} />
        <Tile label="Owed" value={naira(t.due)} tone={t.due ? "bad" : "good"} />
        <Tile label="Due" value={when(inv.due)}
              note={status === "Overdue" ? "Past its terms" : undefined}
              tone={status === "Overdue" ? "bad" : undefined} />
      </dl>

      <div className="ad__stack">
        <Panel title="Lines">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr><th>Description</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {inv.lines.map((l, n) => (
                  <tr key={n}>
                    <td><b>{l.description}</b></td>
                    <td className="num">{l.qty}</td>
                    <td className="num">{naira(l.unit)}</td>
                    <td className="num">{naira(lineTotal(l))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="num ad__dim">Subtotal</td>
                  <td className="num">{naira(t.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="num ad__dim">VAT at {inv.vatRate}%</td>
                  <td className="num">{naira(t.vat)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="num"><b>Total</b></td>
                  <td className="num"><b>{naira(t.total)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        <Panel title="Payments" dataTour="inv-payments">
          {payments.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Receipt</th><th>When</th><th>Method</th><th>Reference</th><th>Taken by</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      {/* Opens the client's own copy, which is the document to
                          send when somebody asks for "the receipt". */}
                      <td>
                        <a href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer">
                          <b>{p.receiptNo}</b>
                        </a>
                      </td>
                      <td className="num">{when(p.at)}</td>
                      <td>{p.method}{p.note ? <small className="ad__dim">{p.note}</small> : null}</td>
                      {/* THE IDEMPOTENCY KEY, shown on purpose. When a payment
                          is queried, this is the one field that ties our row to
                          the provider's, and it is unique so the webhook, the
                          callback and a manual entry cannot double-count. */}
                      <td className="ad__dim ad__num">
                        {p.reference}
                        {p.method === "Paystack" ? (
                          /* PAYSTACK'S OWN RECORD OF THE SAME CHARGE, one click
                             away rather than a copy-paste into their search box.
                             The dashboard itself decides test vs. live from
                             whichever the signed-in staff account has open --
                             there is no mode parameter in this URL to get
                             wrong. */
                          <a
                            href={`https://dashboard.paystack.com/#/transactions?search=${encodeURIComponent(p.reference)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "block", fontSize: ".75rem" }}
                          >
                            View on Paystack
                          </a>
                        ) : null}
                      </td>
                      <td className="ad__dim">{p.by}</td>
                      <td className="num">{naira(p.amount)}</td>
                      <td className="ad__rmC">
                        <PaymentMenu payment={p} invoiceNumber={inv.number} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nothing received against this yet">
              {status === "Draft" ? "It has not been sent." : "The pay link has not been used."}
            </Empty>
          )}
        </Panel>

        {/* THE CLIENT'S COPY, and the code that gets them back to it.

            An invoice is printed, attached to an email, or photographed and
            sent on WhatsApp, and at that point it is a dead piece of paper
            that does not know whether the money has since arrived. The code
            reopens the live version, which does.

            It is addressed by a random token and NOT by the invoice number:
            the numbers are sequential by design, so a public page at
            /i/INV-2026-004 would hand anyone holding one invoice every other
            one the studio has raised, by subtracting one. A draft has no
            public page at all, because a draft has not been sent to anybody. */}
        {inv.status !== "Draft" ? (
          <Panel title="The client's copy" dataTour="inv-client-copy">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", alignItems: "center", padding: ".9rem 1rem" }}>
              <div className="ad__qr">
                <QrCode url={invoiceUrl(inv.token)} label={`Open invoice ${inv.number}`} animate={false} boxPx={160} />
              </div>
              <div style={{ minWidth: 0, flex: "1 1 16rem" }}>
                <p style={{ margin: "0 0 .4rem" }}>
                  Print this code on the invoice, or send the link. It opens a
                  one-page version of {inv.number} showing what is owed now,
                  every payment received against it, and a receipt for each.
                </p>
                <p className="ad__dim ad__num" style={{ margin: "0 0 .6rem", overflowWrap: "anywhere", fontSize: ".82rem" }}>
                  /i/{inv.token}
                </p>
                <a className="ad__btn" href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer">
                  Open it as the client sees it
                </a>
              </div>
            </div>
          </Panel>
        ) : null}

        {/* Said where it is true rather than at the top of the screen: an
            overpaid invoice is a thing somebody has to decide about, and it is
            invisible from the totals alone. */}
        {inv.paid > t.total ? (
          <p className="ad__msg is-bad" role="status">
            <span>
              This invoice has taken {naira(inv.paid - t.total)} more than it is
              for. Nothing was rejected, because the money did arrive. Reverse
              the payment that is wrong, or credit the difference.
            </span>
          </p>
        ) : null}

        {inv.status !== "Draft" ? (
          <CommsLog
            aboutIds={[inv.id, ...payments.map((p) => p.id)]}
            title={`What we have sent about ${inv.number}`}
          />
        ) : null}
      </div>
    </>
  );
}
