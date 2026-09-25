import Link from "next/link";
import { ListSearch } from "@/components/admin/list-search";
import { Banknote, Lock, CheckCircle2, CreditCard, Download, FileText, Receipt, Wallet } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getCreditsFor, getInvoicesFor, getPaymentsFor, getProject } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, when } from "@/components/admin/bits";
import { Pager, readPer } from "@/components/admin/pager";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";

export const metadata = { title: "Billing" };

type Show = "all" | "due" | "paid";
type Query = { show?: string; page?: string; per?: string };

function href(q: Query, patch: Query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/portal/billing${s ? `?${s}` : ""}#invoices`;
}

/**
 * BILLING, as PBilling.dc.html draws it: what is owed with the button that
 * pays it, what has been paid, any credit, then the invoices and the
 * payments. Every figure is read from the same records the studio's Money
 * screen uses; nothing here is summarised from anything else.
 */
export default async function PortalBilling({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const { client } = await getPortalRequest();
  if (!client) return null;
  const query = await searchParams;

  const invoices = getInvoicesFor(client.id).filter((inv) => inv.status !== "Draft");
  const credits = getCreditsFor(client.id).filter((c) => !c.applied);
  const live = invoices.filter((inv) => !inv.voided);
  const balance = live.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const creditBalance = credits.reduce((n, c) => n + c.amount, 0);
  const payments = invoices
    .flatMap((inv) => getPaymentsFor(inv.id).map((p) => ({ p, inv })))
    .sort((a, b) => b.p.at.localeCompare(a.p.at));
  const paidTotal = payments.reduce((n, { p }) => n + p.amount, 0);
  /* The one to pay first: the oldest due date with money still owed. */
  const next = live.filter((inv) => invoiceTotals(inv).due > 0).sort((a, b) => a.due.localeCompare(b.due))[0];
  const canPay = Boolean(client.email?.trim());

  const show: Show = query.show === "due" || query.show === "paid" ? query.show : "all";
  const rows = invoices.filter((inv) => {
    const due = invoiceTotals(inv).due;
    if (show === "due") return !inv.voided && due > 0;
    if (show === "paid") return !inv.voided && due <= 0;
    return true;
  });
  const per = readPer(query.per, 25);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const shown = rows.slice((page - 1) * per, page * per);
  const methods = [...new Set(payments.map(({ p }) => p.method.toLowerCase()))];

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Billing</h1>
          <p>Every invoice for your projects, what you have paid and what is left.</p>
        </div>
      </header>

      <dl className="pBill__kpis">
        <div className="ad__tile pBill__owed">
          <dt><span>Balance owed</span><span className="ad__tileIcon ad__tileIcon--live" aria-hidden="true"><Wallet /></span></dt>
          <dd>{balance > 0 ? naira(balance) : "Nil"}</dd>
          <small>
            {next ? <>On {next.number} · due {when(next.due)}</> : "Nothing to pay. Thank you."}
          </small>
          {next && canPay ? (
            /* A real POST, as on the invoice itself: a link that spends money
               can be followed by a prefetcher. The amount comes off the
               token, never from this page. */
            <form method="post" action={`/api/pay/${next.token}`}>
              <button type="submit" className="pBill__pay">
                <CreditCard aria-hidden="true" /> Pay {naira(invoiceTotals(next).due)}
              </button>
            </form>
          ) : null}
        </div>
        <div className="ad__tile">
          <dt><span>Paid to date</span><span className="ad__tileIcon ad__tileIcon--good" aria-hidden="true"><CheckCircle2 /></span></dt>
          <dd>{paidTotal ? naira(paidTotal) : "Nil"}</dd>
          <small>
            {payments.length
              ? `${payments.length} ${payments.length === 1 ? "payment" : "payments"}${methods.length ? `, by ${methods.join(" and ")}` : ""}`
              : "No payments yet"}
          </small>
        </div>
        <div className="ad__tile">
          <dt><span>Credit on account</span><span className="ad__tileIcon ad__tileIcon--neutral" aria-hidden="true"><Banknote /></span></dt>
          <dd>{creditBalance ? naira(creditBalance) : "Nil"}</dd>
          <small>{creditBalance ? "Taken off your next invoice" : "Overpayments or refunds would show here"}</small>
        </div>
      </dl>

      <Panel dataTour="portal-billing" title="Invoices">
        <div id="invoices" className="ad__filterBar">
          <nav className="ad__switch" aria-label="Which invoices">
            {([["all", "All"], ["due", "To pay"], ["paid", "Paid"]] as const).map(([k, label]) => (
              <Link key={k} aria-current={show === k ? "true" : undefined} href={href(query, { show: k === "all" ? undefined : k, page: undefined })}>{label}</Link>
            ))}
          </nav>
          {invoices.length ? <ListSearch target="portal-invoices" placeholder="Search invoices" noun="invoices" /> : null}
        </div>
        {shown.length ? (
          <div id="portal-invoices">
          {/* On a phone the rows are cards (PMBilling.dc.html): the figure
              that matters and the state, one press to the document. */}
          <ul className="pBill__cards" aria-label="Invoices" data-ls-mirror>
            {shown.map((inv) => {
              const t = invoiceTotals(inv);
              const owing = !inv.voided && t.due > 0;
              return (
                <li key={inv.id} data-row>
                  <a href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer">
                    <span className="ad__tileIcon ad__tileIcon--warn" aria-hidden="true"><FileText /></span>
                    <span className="pBill__cardMain"><b>{inv.number}</b><small>{owing ? `${naira(t.due)} left · due ${when(inv.due)}` : `Issued ${when(inv.issued)}`}</small></span>
                    <span className="pBill__cardEnd"><b className="ad__num">{naira(t.total)}</b><InvoicePill status={invoiceStatus(inv)} /></span>
                  </a>
                  {owing && canPay ? (
                    <form method="post" action={`/api/pay/${inv.token}`} className="pBill__cardPay">
                      <button type="submit" className="ad__btn ad__btn--primary"><CreditCard aria-hidden="true" /> Pay {naira(t.due)}</button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="ad__scroll pBill__table">
            <table className="ad__t">
              <thead>
                <tr>
                  <th>Invoice</th><th>For</th><th>Issued</th><th>Due</th><th>Status</th>
                  <th className="num">Total</th><th className="num">Left to pay</th>
                  <th><span className="ad__sr">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((inv) => {
                  const t = invoiceTotals(inv);
                  const project = inv.projectId ? getProject(inv.projectId) : null;
                  const owing = !inv.voided && t.due > 0;
                  return (
                    <tr key={inv.id}>
                      <td><a href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer"><b className="ad__docNo">{inv.number}</b></a></td>
                      <td>{project?.title ?? <span className="ad__dim">–</span>}</td>
                      <td className="ad__dim ad__docNo">{when(inv.issued)}</td>
                      <td className="ad__docNo">{when(inv.due)}</td>
                      <td><InvoicePill status={invoiceStatus(inv)} /></td>
                      <td className="num">{naira(t.total)}</td>
                      <td className="num">{owing ? naira(t.due) : <span className="ad__dim">Nil</span>}</td>
                      <td>
                        <span className="pBill__acts">
                          {owing && canPay ? (
                            <form method="post" action={`/api/pay/${inv.token}`}>
                              <button type="submit" className="ad__btn ad__btn--primary">Pay now</button>
                            </form>
                          ) : null}
                          <a className="ad__btn" href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${inv.number} to save or print`}>
                            <Download aria-hidden="true" /> PDF
                          </a>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        ) : invoices.length ? (
          <Empty title={show === "due" ? "Nothing to pay" : "Nothing paid yet"} icon={FileText}>
            <Link href={href(query, { show: undefined, page: undefined })}>Show every invoice</Link>
          </Empty>
        ) : (
          <Empty title="No invoices yet" icon={Banknote}>Invoices raised against your projects will appear here, with a link to the full document and its payment status.</Empty>
        )}
        {rows.length ? (
          <Pager label="Invoice pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "invoice" : "invoices"}
            href={(p) => href(query, { page: p.page && p.page > 1 ? String(p.page) : undefined, per: p.per ? String(p.per) : query.per })} />
        ) : null}
      </Panel>

      {canPay && next ? <p className="pBill__safe ad__dim"><Lock aria-hidden="true" /> Card payments are handled by Paystack.</p> : null}

      {payments.length ? (
        <Panel title="Payments you have made">
          <ul className="pBill__cards" aria-label="Payments">
            {payments.map(({ p, inv }) => (
              <li key={p.id}>
                <a href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer">
                  <span className="ad__tileIcon ad__tileIcon--good" aria-hidden="true"><Receipt /></span>
                  <span className="pBill__cardMain"><b>{inv.number}</b><small>{when(p.at)} · {p.method} · receipt</small></span>
                  <span className="pBill__cardEnd"><b className="ad__num">{naira(p.amount)}</b></span>
                </a>
              </li>
            ))}
          </ul>
          <div className="ad__scroll pBill__table">
            <table className="ad__t">
              <thead><tr><th>When</th><th>Invoice</th><th>How</th><th>Reference</th><th className="num">Amount</th><th><span className="ad__sr">Receipt</span></th></tr></thead>
              <tbody>
                {payments.map(({ p, inv }) => (
                  <tr key={p.id}>
                    <td className="ad__docNo">{when(p.at)}</td>
                    <td className="ad__docNo">{inv.number}</td>
                    <td><span className="ad__pill ad__pill--flat">{p.method}</span></td>
                    <td className="ad__dim ad__num">{p.reference}</td>
                    <td className="num">{naira(p.amount)}</td>
                    <td>
                      <a className="ad__btn" href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer" aria-label={`Receipt ${p.receiptNo}`}>
                        <Receipt aria-hidden="true" /> Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
