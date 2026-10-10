import Link from "next/link";
import {money,currencyOf} from "@/lib/money/currency";
import type { ClientRecon, InvoiceRecon } from "@/lib/admin/money-rules";
import { Panel, Tile } from "./bits";

/**
 * WHAT WAS BILLED, WHAT CAME IN, WHAT WENT BACK, WHAT IS STILL OWED, for one
 * client or one invoice, and it always adds up.
 *
 * EVERY FIGURE HERE IS SUMMED FROM THE ROWS (lib/admin/money-rules.ts,
 * `reconcileInvoice` / `reconcileClient`) and nothing is a stored total, so the
 * summary above the table cannot disagree with the table under it: the client's
 * figures are the sum of its invoices' figures, and tests/payments-lifecycle
 * pins that. The one sentence under the table says the identity out loud,
 * because "invoiced = received + outstanding" is what a person checks first.
 *
 * AN OVERPAYMENT IS NEVER HIDDEN INSIDE "RECEIVED". Money kept beyond an
 * invoice's total is a decision waiting to be made (refund it, or credit it),
 * so it is named on its own line instead of making the sums quietly lie.
 */

/** The exact figure under a short one, only when the short one rounded it. */


function Cells({ r }: { r: InvoiceRecon }) {
  const naira=(amount:number)=>money(amount,currencyOf(r));
  return (
    <>
      <td className="num">{naira(r.total)}</td>
      <td className="num">{r.paid ? naira(r.paid) : <span className="ad__dim">Nil</span>}</td>
      <td className="num">
        {r.refunded ? naira(r.refunded) : <span className="ad__dim">Nil</span>}
        {r.heldAsCredit ? <small className="ad__dim">{naira(r.heldAsCredit)} held as credit</small> : null}
      </td>
      <td className="num">{r.fromCredit ? naira(r.fromCredit) : <span className="ad__dim">Nil</span>}</td>
      <td className="num">
        {r.voided ? <span className="ad__dim">Struck</span> : r.due ? <b>{naira(r.due)}</b> : <span className="ad__dim">Nil</span>}
        {r.over ? <small className="ad__dim">{naira(r.over)} over the total</small> : null}
      </td>
    </>
  );
}

const HEAD = (
  <tr>
    <th>Invoice</th><th className="num">Total</th><th className="num">Paid</th>
    <th className="num">Refunded</th><th className="num">Of which credit</th><th className="num">Due</th>
  </tr>
);

/** One invoice, for the invoice's own page. */
export function InvoiceReconciliation({ row }: { row: InvoiceRecon }) {
  const naira=(amount:number)=>money(amount,currencyOf(row));
  return (
    <Panel title="Reconciliation" dataTour="inv-reconcile">
      <div className="ad__scroll">
        <table className="ad__t">
          <caption className="ad__sr">Total, paid, refunded, credit and due for {row.number}</caption>
          <thead>{HEAD}</thead>
          <tbody><tr><td><b>{row.number}</b></td><Cells r={row} /></tr></tbody>
        </table>
      </div>
      <p className="ad__dim" style={{ margin: 0, padding: ".7rem 1rem .9rem", fontSize: ".85rem", lineHeight: 1.6 }}>
        {row.voided
          ? "Struck: nothing is owed and nothing counts towards the books."
          : <>Total {naira(row.total)} = paid {naira(row.paid - row.over)} + due {naira(row.due)}.{" "}
            {row.over ? `${naira(row.over)} was kept beyond the total and is not counted above. ` : ""}
            {row.reversed ? `${naira(row.reversed)} arrived and was reversed, so it is not counted. ` : ""}
            Paid is what arrived less what went back.</>}
      </p>
    </Panel>
  );
}

/** A client: the four figures, then every invoice. */
export default function ClientReconciliation({ recon }: { recon: ClientRecon }) {
  if(recon.groups?.length)return <>{recon.groups.map(group=><ClientReconciliation key={group.currency} recon={group}/>)}</>;
  if (!recon.invoices.length) return null;
  const naira=(amount:number)=>money(amount,currencyOf(recon));
  const nairaShort=naira;const exact=()=>undefined;
  const live = recon.invoices.filter((r) => !r.voided);
  const sum = (pick: (r: InvoiceRecon) => number) => live.reduce((n, r) => n + pick(r), 0);
  return (
    <Panel title={`Reconciliation (${currencyOf(recon)})`} dataTour="client-reconcile">
      <dl className="ad__tiles" style={{ margin: ".9rem 1rem" }}>
        <Tile label="Invoiced" value={nairaShort(recon.invoiced)} note={exact()} />
        <Tile label="Received" value={nairaShort(recon.received)} note={exact()} tone={recon.received ? "good" : undefined} />
        <Tile label="Outstanding" value={nairaShort(recon.outstanding)} note={exact()} tone={recon.outstanding ? "bad" : "good"} />
        <Tile label="Held as credit" value={nairaShort(recon.held)} note={exact()} />
      </dl>
      <div className="ad__scroll">
        <table className="ad__t">
          <caption className="ad__sr">Total, paid, refunded, credit and due for each invoice</caption>
          <thead>{HEAD}</thead>
          <tbody>
            {recon.invoices.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/money/${r.id}`}><b>{r.number}</b></Link></td>
                <Cells r={r} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><b>All invoices</b></td>
              <td className="num"><b>{naira(recon.invoiced)}</b></td>
              <td className="num"><b>{naira(sum((r) => r.paid))}</b></td>
              <td className="num"><b>{naira(sum((r) => r.refunded))}</b></td>
              <td className="num"><b>{naira(sum((r) => r.fromCredit))}</b></td>
              <td className="num"><b>{naira(recon.outstanding)}</b></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="ad__dim" style={{ margin: 0, padding: ".7rem 1rem .9rem", fontSize: ".85rem", lineHeight: 1.6 }}>
        Invoiced {naira(recon.invoiced)} = received {naira(recon.received)} + outstanding {naira(recon.outstanding)}.
        {recon.overpaid ? ` A further ${naira(recon.overpaid)} was kept beyond an invoice total and is waiting for a decision (refund it, or credit it).` : ""}
        {recon.held ? ` ${naira(recon.held)} is held for them as credit and comes off their next invoice.` : ""}
        {" "}Struck and draft invoices are not counted.
      </p>
    </Panel>
  );
}
