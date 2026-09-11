import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient, getInvoice, getPaymentsFor, getProject, getProjectsFor,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, lineTotal, naira } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";
import {
  DeleteDraft, InvoiceBuilder, IssueInvoice, RecordPayment, ReversePayment,
} from "@/components/admin/money-forms";

/* NO generateStaticParams: invoices are raised at runtime, and a prerendered
   list would 404 on the one just created. */

/**
 * One invoice, as the client will see it and as the studio needs it.
 *
 * EVERY FIGURE IS RECOMPUTED FROM THE LINES. Nothing here reads a stored
 * total, because a stored total is a second source of truth that can disagree
 * with the first one, and the day it does is the day somebody is billed wrong.
 * See `invoiceTotals` in lib/admin/types.ts.
 */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
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
        <div className="ad__row">
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
          ) : (
            <RecordPayment invoice={inv} owed={t.due} />
          )}
        </div>
      </div>

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

        <Panel title="Payments">
          {payments.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>When</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th /></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="num">{when(p.at)}</td>
                      <td>{p.method}</td>
                      {/* THE IDEMPOTENCY KEY, shown on purpose. When a payment
                          is queried, this is the one field that ties our row to
                          the provider's, and it is unique so the webhook, the
                          callback and a manual entry cannot double-count. */}
                      <td className="ad__dim ad__num">{p.reference}</td>
                      <td className="num">{naira(p.amount)}</td>
                      <td className="num"><ReversePayment id={p.id} invoiceId={inv.id} /></td>
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
      </div>
    </>
  );
}
