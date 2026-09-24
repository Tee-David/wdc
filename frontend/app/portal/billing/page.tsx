import Link from "next/link";
import { Banknote, FileText } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getCreditsFor, getInvoicesFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";

export const metadata = { title: "Billing" };

export default async function PortalBilling() {
  const { client } = await getPortalRequest();
  if (!client) return null;

  const invoices = getInvoicesFor(client.id).filter((inv) => inv.status !== "Draft");
  const credits = getCreditsFor(client.id).filter((c) => !c.applied);
  const balance = invoices.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const creditBalance = credits.reduce((n, c) => n + c.amount, 0);
  const paidTotal = invoices.reduce((n, inv) => n + inv.paid, 0);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Billing</h1>
          <p>Every invoice and receipt for {client.company}.</p>
        </div>
      </header>

      <dl className="adDash__kpis">
        <Tile label="Balance owed" value={naira(balance)} tone={balance > 0 ? "bad" : "good"} />
        <Tile label="Paid to date" value={naira(paidTotal)} tone="good" />
        {creditBalance > 0 ? <Tile label="Credit on account" value={naira(creditBalance)} tone="accent" note="Applied to your next invoice" /> : null}
      </dl>

      <Panel dataTour="portal-billing" title={`${invoices.length} document${invoices.length === 1 ? "" : "s"}`}>
        {invoices.length ? (
          <div className="adDash__compactList">
            {invoices.map((inv) => {
              const t = invoiceTotals(inv);
              return (
                <Link href={`/i/${inv.token}`} key={inv.id} target="_blank" rel="noopener noreferrer">
                  <span className="adDash__listIcon"><FileText aria-hidden="true" /></span>
                  <span><b>{inv.number}</b><small>Issued {when(inv.issued)} · due {when(inv.due)}</small></span>
                  <span className="ad__row">
                    <b>{naira(t.total)}</b>
                    <InvoicePill status={invoiceStatus(inv)} />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty title="No invoices yet" icon={Banknote}>Invoices raised against your projects will appear here, with a link to the full document and its payment status.</Empty>
        )}
      </Panel>
    </div>
  );
}
