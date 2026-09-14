import Link from "next/link";
import {
  failedMessageCount, getAging, getClient, getClients, getCollectionRate,
  getExpenses, getInvoices, getMonthly, getPayments, getProjects,
  getSummary, providerAttentionCount,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira, nairaShort } from "@/lib/admin/types";
import { DemoNote, Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";
import { AddExpense, InvoiceBuilder } from "@/components/admin/money-forms";
import { ExpenseMenu, InvoiceMenu, PaymentMenu } from "@/components/admin/row-actions";

export const metadata = { title: "Money" };

/**
 * Invoices, payments, expenses and the reports that fall out of them.
 *
 * ONE SCREEN, not four menu items, because they are one subject: what came in,
 * what went out, and what is still owed. Splitting them would mean three
 * places to look before you know where you stand.
 *
 * THE CHART IS BARS AND IT IS DRAWN HERE, not by a library. Six months of two
 * series is twelve rectangles; a charting package for that is 40KB to draw
 * what `flex` and a percentage height already draw, on a page that has to stay
 * fast because it is opened every day.
 */
export default function MoneyPage() {
  const s = getSummary();
  const unreconciled = providerAttentionCount();
  const failedMail = failedMessageCount();
  const aging = getAging();
  const rate = getCollectionRate();
  const owed = aging.reduce((n, b) => n + b.amount, 0);
  const invoices = getInvoices();
  const payments = getPayments().slice().sort((a, b) => b.at.localeCompare(a.at));
  const expenses = getExpenses();
  const months = getMonthly(6);
  const peak = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));

  /* Expenses by category, biggest first: the question an expense list is
     always asked is "where is it going", not "what happened on the 4th". */
  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Money</h1>
          <p>In, out, and what is still owed.</p>
        </div>
        <div className="ad__row">
          <AddExpense />
          <InvoiceBuilder clients={getClients()} projects={getProjects()} />
        </div>
      </div>

      <DemoNote>
        Raising an invoice, issuing it, recording a payment and logging an
        expense all work, and so does the pay link: an issued invoice has a
        public page with a card checkout on it, the webhook and the browser
        callback both verify with Paystack before anything is banked, and every
        payment goes through one function keyed on its <code>reference</code>,
        so all three routes can fire and the money is counted once. What is
        still missing is a generated PDF; printing the public page produces a
        correct document today. Paystack needs its keys set on the deployment
        before a real card will go through.
      </DemoNote>

      {/* THE ONE THING ON THIS SCREEN THAT IS ASKING FOR SOMEBODY, and it is
          above the figures because the figures are wrong while it is here: an
          unmatched charge is money in the bank that the Collected tile does
          not know about. Rendered only when there is something in it, so a
          good week shows no banner at all rather than a green all-clear
          nobody reads. */}
      {unreconciled || failedMail ? (
        <p className="ad__banner">
          <Link href="/admin/money/reconciliation">
            <b>
              {unreconciled
                ? `${unreconciled} payment event${unreconciled === 1 ? "" : "s"} the books and the bank do not agree on`
                : `${failedMail} message${failedMail === 1 ? "" : "s"} did not go`}
            </b>
            {unreconciled && failedMail
              ? `, and ${failedMail} message${failedMail === 1 ? "" : "s"} did not go.`
              : "."}{" "}
            Open reconciliation
          </Link>
        </p>
      ) : null}

      <dl className="ad__tiles">
        <Tile label="Collected" value={nairaShort(s.collected)} tone="good" />
        <Tile label="Outstanding" value={nairaShort(s.outstanding)} tone={s.outstanding ? "bad" : undefined} />
        <Tile label="Overdue" value={nairaShort(s.overdue)} tone={s.overdue ? "bad" : "good"} />
        <Tile label="Spend" value={nairaShort(s.spend)} />
        <Tile label="Net" value={nairaShort(s.profit)} tone={s.profit >= 0 ? "good" : "bad"}
              note="Collected less spend" />
        {/* HOW MUCH OF WHAT WE BILLED ACTUALLY ARRIVED, which is the one
            figure the five beside it cannot say. Null rather than 0% when
            nothing has been invoiced: a red 0% for a studio that has simply
            not billed yet is a different thing and not a problem. */}
        <Tile
          label="Collected of billed"
          value={rate === null ? "—" : `${Math.round(rate * 100)}%`}
          tone={rate === null ? undefined : rate >= 0.9 ? "good" : rate >= 0.7 ? undefined : "bad"}
          note={rate === null ? "Nothing invoiced yet" : undefined}
        />
      </dl>

      <div className="ad__stack">
        {/* HOW OLD THE MONEY IS, which "outstanding" cannot say.

            One outstanding figure treats an invoice sent last Tuesday and one
            sent in March as the same thing. They are not: the first is a
            cashflow line, the second is a conversation somebody has to have.
            The buckets are the conventional 30-day steps so they mean to an
            accountant what they mean here, and every row drills into the
            invoices behind it rather than asking anybody to trust a total. */}
        <Panel title="Who owes what, and for how long">
          {owed ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr><th>Age</th><th className="num">Owed</th><th>Invoices</th></tr>
                </thead>
                <tbody>
                  {aging.map((b) => (
                    <tr key={b.label}>
                      <td><b>{b.label}</b></td>
                      <td className="num">
                        {b.amount ? naira(b.amount) : <span className="ad__dim">—</span>}
                      </td>
                      <td>
                        {b.invoices.length ? (
                          <span className="ad__row" style={{ flexWrap: "wrap", gap: ".35rem" }}>
                            {b.invoices.map((i) => (
                              <Link key={i.id} href={`/admin/money/${i.id}`} className="ad__pill">
                                {i.number} · {getClient(i.clientId)?.company ?? "Unknown"}
                              </Link>
                            ))}
                          </span>
                        ) : <span className="ad__dim">Nothing</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><b>Total outstanding</b></td>
                    {/* Summed from the same buckets the rows draw, so the
                        footer cannot disagree with what is above it. */}
                    <td className="num"><b>{naira(owed)}</b></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <Empty title="Nothing outstanding">
              Every invoice that has been sent is paid.
            </Empty>
          )}
        </Panel>
        <Panel title="Last six months">
          <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: ".8rem", height: "150px" }}>
              {months.map((m) => (
                <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: ".3rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "120px" }}>
                    <span
                      title={`In ${naira(m.in)}`}
                      style={{ flex: 1, background: "var(--ad-good)", borderRadius: "3px 3px 0 0",
                               height: `${Math.max(2, (m.in / peak) * 100)}%` }}
                    />
                    <span
                      title={`Out ${naira(m.out)}`}
                      style={{ flex: 1, background: "var(--ad-accent)", borderRadius: "3px 3px 0 0",
                               height: `${Math.max(2, (m.out / peak) * 100)}%` }}
                    />
                  </div>
                  <small className="ad__dim" style={{ textAlign: "center" }}>{m.label}</small>
                </div>
              ))}
            </div>
            <div className="ad__row" style={{ marginTop: ".8rem", gap: "1rem" }}>
              <span className="ad__pill" style={{ color: "var(--ad-good)" }}>In</span>
              <span className="ad__pill" style={{ color: "var(--ad-accent)" }}>Out</span>
              <span className="ad__dim">Peak month {nairaShort(peak)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Invoices">
          {invoices.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr>
                    <th>Number</th><th>Client</th><th>Status</th><th>Due</th>
                    <th className="num">Total</th><th className="num">Paid</th><th className="num">Owed</th>
                    <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const t = invoiceTotals(i);
                    return (
                      <tr key={i.id}>
                        <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                        <td>{getClient(i.clientId)?.company ?? "Unknown"}</td>
                        <td><InvoicePill status={invoiceStatus(i)} /></td>
                        <td className="num">{when(i.due)}</td>
                        <td className="num">{naira(t.total)}</td>
                        <td className="num">{naira(i.paid)}</td>
                        <td className="num">{t.due ? naira(t.due) : <span className="ad__dim">Nil</span>}</td>
                        <td className="ad__rmC"><InvoiceMenu invoice={i} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No invoices yet" action={<InvoiceBuilder clients={getClients()} projects={getProjects()} />}>
              Create the first invoice to track what is billed, paid, and still outstanding.
            </Empty>
          )}
        </Panel>

        <div className="ad__grid2">
          <Panel title="Payments received">
            {payments.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>When</th><th>Invoice</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {payments.map((p) => {
                      const inv = invoices.find((i) => i.id === p.invoiceId);
                      return (
                        <tr key={p.id}>
                          <td className="num">{when(p.at)}</td>
                          <td>{inv ? <Link href={`/admin/money/${inv.id}`}>{inv.number}</Link> : "Unknown"}</td>
                          <td>{p.method}</td>
                          <td className="ad__dim ad__num">{p.reference}</td>
                          <td className="num">{naira(p.amount)}</td>
                          <td className="ad__rmC">
                            <PaymentMenu payment={p} invoiceNumber={inv?.number} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No payments received yet">
                Payments will appear here after they are recorded against an invoice.
              </Empty>
            )}
          </Panel>

          <Panel title="Where the spend goes">
            <div style={{ padding: ".8rem 1rem" }}>
              {categories.map(([cat, amount]) => (
                <div key={cat} style={{ padding: ".4rem 0" }}>
                  <div className="ad__row" style={{ justifyContent: "space-between" }}>
                    <span>{cat}</span>
                    <b className="ad__num">{naira(amount)}</b>
                  </div>
                  <span style={{
                    display: "block", height: "4px", marginTop: ".3rem", borderRadius: "3px",
                    background: "var(--ad-accent)",
                    width: `${(amount / (categories[0]?.[1] || 1)) * 100}%`,
                  }} />
                </div>
              ))}
              {!categories.length && (
                <Empty title="No expenses yet" action={<AddExpense />}>
                  Record business spending to keep the net view accurate.
                </Empty>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Expenses">
          {expenses.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>When</th><th>What</th><th>Category</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="num">{when(e.at)}</td>
                      <td><b>{e.description}</b></td>
                      <td><span className="ad__pill ad__pill--flat">{e.category}</span></td>
                      <td className="num">{naira(e.amount)}</td>
                      <td className="ad__rmC"><ExpenseMenu expense={e} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No expenses recorded" action={<AddExpense />}>
              Add the first expense with its date, category, and amount.
            </Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
