import Link from "next/link";
import { hydrateSettings } from "@/lib/settings/store";
import {
  financeDefaults, getAging, getClient, getClients, getCollectionRate,
  getEstimates, getExpenses, getInvoice, getInvoices, getMonthly, getPayments,
  getPipeline, getProjects, getSummary, providerAttentionCount,
} from "@/lib/admin/store";
import { failedLoggedCount } from "@/lib/message-log";
import {
  estimateState, estimateTotals, invoiceStatus, invoiceTotals, naira, nairaShort,
} from "@/lib/admin/types";
import { DemoNote, Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";
import { AddExpense, EstimateBuilder, InvoiceBuilder } from "@/components/admin/money-forms";
import {
  EstimateMenu, ExpenseMenu, InvoiceMenu, PaymentMenu,
} from "@/components/admin/row-actions";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { Pager, readPer } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";

export const metadata = { title: "Money" };

/* `from` and `to` are the invoice's issue date, as Lagos calendar days. */
type MoneyQuery = { q?: string; status?: string; sort?: string; dir?: string; page?: string; per?: string; from?: string; to?: string };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const INVOICE_SORTS = ["number", "client", "due", "total", "owed"] as const;
type InvoiceSort = (typeof INVOICE_SORTS)[number];

function queryHref(query: MoneyQuery, changes: Partial<MoneyQuery>) {
  const params = new URLSearchParams();
  const next = { ...query, ...changes };
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const suffix = params.toString();
  return `/admin/money${suffix ? `?${suffix}` : ""}#invoice-list`;
}

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
export default async function MoneyPage({
  searchParams,
}: { searchParams: Promise<MoneyQuery> }) {
  const query = await searchParams;
  await hydrateSettings();
  const finance = financeDefaults();
  const s = getSummary();
  const unreconciled = providerAttentionCount();
  const failedMail = await failedLoggedCount();
  const aging = getAging();
  const rate = getCollectionRate();
  const owed = aging.reduce((n, b) => n + b.amount, 0);
  /* UNFILTERED, because the Payments panel below looks an invoice up by id
     off this list -- a payment against an invoice the Invoices filter is
     currently hiding must still show which invoice it was. */
  const allInvoices = getInvoices();
  const payments = getPayments().slice().sort((a, b) => b.at.localeCompare(a.at));
  const expenses = getExpenses();
  const projects = getProjects();
  const estimates = getEstimates();
  const pipeline = getPipeline();
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const months = getMonthly(6);
  const peak = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));

  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const statusFilter = query.status ?? "";
  const per = readPer(query.per);
  const from = query.from && DAY_RE.test(query.from) ? query.from : undefined;
  const to = query.to && DAY_RE.test(query.to) ? query.to : undefined;
  const sort: InvoiceSort = INVOICE_SORTS.includes(query.sort as InvoiceSort) ? query.sort as InvoiceSort : "due";
  const direction = query.dir === "asc" || query.dir === "desc"
    ? query.dir
    : sort === "number" || sort === "client" ? "asc" : "desc";
  const invoiceRows = allInvoices
    .map((invoice) => ({ invoice, client: getClient(invoice.clientId), computedStatus: invoiceStatus(invoice), totals: invoiceTotals(invoice) }))
    .filter(({ computedStatus }) => !statusFilter || computedStatus === statusFilter)
    .filter(({ invoice }) => (!from || invoice.issued.slice(0, 10) >= from) && (!to || invoice.issued.slice(0, 10) <= to))
    .filter(({ invoice, client }) => !search
      || invoice.number.toLocaleLowerCase().includes(search)
      || (client?.company ?? "").toLocaleLowerCase().includes(search))
    .sort((a, b) => {
      const order = direction === "asc" ? 1 : -1;
      if (sort === "number") return order * a.invoice.number.localeCompare(b.invoice.number);
      if (sort === "client") return order * (a.client?.company ?? "").localeCompare(b.client?.company ?? "");
      if (sort === "total") return order * (a.totals.total - b.totals.total);
      if (sort === "owed") return order * (a.totals.due - b.totals.due);
      return order * a.invoice.due.localeCompare(b.invoice.due);
    });
  const hasInvoiceFilters = Boolean(search || statusFilter || from || to);
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const invoicePageCount = Math.max(1, Math.ceil(invoiceRows.length / per));
  const invoicePage = Math.min(requestedPage, invoicePageCount);
  const invoices = invoiceRows.slice((invoicePage - 1) * per, invoicePage * per);
  const invoiceSortHref = (column: InvoiceSort) => queryHref(query, {
    sort: column,
    dir: sort === column ? direction === "asc" ? "desc" : "asc" : column === "number" || column === "client" ? "asc" : "desc",
    page: undefined,
  });
  const invoiceExportParams = new URLSearchParams();
  for (const key of ["q", "status", "sort", "dir", "from", "to"] as const) {
    if (query[key]) invoiceExportParams.set(key, query[key]);
  }
  const invoiceExportHref = `/admin/money/export${invoiceExportParams.size ? `?${invoiceExportParams}` : ""}`;

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
          <PageTourButton />
          <AddExpense projects={projects} />
          <EstimateBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} />
          <InvoiceBuilder
            clients={getClients()} projects={projects} dataTour="money-add"
            defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays}
          />
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

      <dl className="ad__tiles" data-tour="money-tiles">
        <Tile label="Collected" value={nairaShort(s.collected)} tone="good" />
        <Tile label="Outstanding" value={nairaShort(s.outstanding)} tone={s.outstanding ? "bad" : undefined} />
        <Tile label="Overdue" value={nairaShort(s.overdue)} tone={s.overdue ? "bad" : "good"} />
        <Tile label="Spend" value={nairaShort(s.spend)} />
        <Tile label="Net" value={nairaShort(s.profit)} tone={s.profit >= 0 ? "good" : "bad"}
              note="Collected less spend" />
        {/* WHAT IS QUOTED AND STILL LIVE, which is the only forward-looking
            figure on this screen and is deliberately not added to anything
            else. A quote is not money; putting it in the same sum as
            collected income is how a studio talks itself into spending it. */}
        <Tile label="Out for quote" value={nairaShort(pipeline.open)}
              note={pipeline.winRate === null
                ? "Nothing answered yet"
                : `${Math.round(pipeline.winRate * 100)}% of answered quotes won`} />
        {/* HOW MUCH OF WHAT WE BILLED ACTUALLY ARRIVED, which is the one
            figure the five beside it cannot say. Null rather than 0% when
            nothing has been invoiced: a red 0% for a studio that has simply
            not billed yet is a different thing and not a problem. */}
        <Tile
          label="Collected of billed"
          value={rate === null ? "–" : `${Math.round(rate * 100)}%`}
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
                        {b.amount ? naira(b.amount) : <span className="ad__dim">–</span>}
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

        {/* QUOTES BEFORE INVOICES, because that is the order the work happens
            in and the panel above it is the one somebody opens this screen
            for. A quote is not money and is not added to any total on the
            page; the tile above says what is out and what share of answered
            ones the studio wins. */}
        <Panel
          title="Estimates"
          action={<EstimateBuilder clients={getClients()} projects={projects} trigger="New estimate" defaultVatRate={finance.vatRate} />}
        >
          {estimates.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr>
                    <th>Number</th><th>Client</th><th>State</th><th>Holds until</th>
                    <th className="num">Total</th>
                    <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e) => {
                    const st = estimateState(e);
                    const c = getClient(e.clientId);
                    return (
                      <tr key={e.id}>
                        <td>
                          {e.state === "Draft"
                            ? <b>{e.number}</b>
                            : <a href={`/q/${e.token}`} target="_blank" rel="noopener noreferrer"><b>{e.number}</b></a>}
                          {/* NAMED, NOT "that invoice". The number is the
                              thing somebody is looking for, and a link whose
                              text is a pronoun is one they have to open to
                              find out whether it is the right one. */}
                          {e.invoiceId ? (
                            <p className="ad__dim" style={{ margin: ".15rem 0 0", fontSize: ".78rem" }}>
                              Billed as{" "}
                              <Link href={`/admin/money/${e.invoiceId}`}>
                                {getInvoice(e.invoiceId)?.number ?? "an invoice"}
                              </Link>
                            </p>
                          ) : null}
                        </td>
                        <td>{c ? <Link href={`/admin/clients/${c.id}`}>{c.company}</Link> : "–"}</td>
                        <td>
                          <span className={`ad__pill ${
                            st === "Accepted" ? "ad__pill--good"
                              : st === "Declined" ? "ad__pill--bad"
                                : st === "Expired" ? "ad__pill--warn"
                                  : st === "Draft" ? "ad__pill--flat" : ""
                          }`}>{st}</span>
                          {e.answered ? (
                            <p className="ad__dim" style={{ margin: ".2rem 0 0", fontSize: ".78rem" }}>
                              {e.answered.by}, {when(e.answered.at)}
                            </p>
                          ) : null}
                        </td>
                        <td className="ad__num ad__dim">{when(e.expires)}</td>
                        <td className="num">{naira(estimateTotals(e).total)}</td>
                        <td className="ad__rmC"><EstimateMenu estimate={e} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nothing out for quote"
              action={<EstimateBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} />}
            >
              An estimate is its own document with its own number, not a draft
              invoice. Accepting one raises the invoice and keeps the quote as
              the record of what was agreed.
            </Empty>
          )}
        </Panel>

        <Panel title="Invoices">
          <div className="ad__filterBar" data-tour="money-invoice-filters">
          <form className="ad__filterForm" method="get" action="/admin/money#invoice-list" aria-label="Filter invoices">
            <label className="ad__filterSearch">
              <span className="ad__sr">Search invoices</span>
              <input name="q" type="search" defaultValue={query.q} placeholder="Search number or client" />
            </label>
            <label>
              <span className="ad__sr">Status</span>
              <select name="status" defaultValue={statusFilter}>
                <option value="">All statuses</option>
                {(["Draft", "Sent", "Part paid", "Paid", "Overdue", "Void"] as const).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </label>
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            {query.per ? <input type="hidden" name="per" value={per} /> : null}
            <button className="ad__btn ad__btn--primary" type="submit">Apply</button>
          </form>
            <DateRange
              label="Issued"
              value={{ from, to }}
              href={(r) => queryHref(query, { from: r.from, to: r.to, page: undefined })}
              keep={{ q: query.q, status: query.status, sort: query.sort, dir: query.dir, per: query.per }}
              action="/admin/money#invoice-list"
            />
            {hasInvoiceFilters ? <Link className="ad__btn" href="/admin/money#invoice-list">Clear</Link> : null}
            <a className="ad__btn" href={invoiceExportHref}>Export CSV</a>
          </div>
          <div className="ad__listMeta" id="invoice-list" aria-live="polite">
            <span>{invoiceRows.length} {invoiceRows.length === 1 ? "invoice" : "invoices"}</span>
          </div>
          {invoices.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead>
                  <tr>
                    <th aria-sort={sort === "number" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("number")}>Number</Link>
                    </th>
                    <th aria-sort={sort === "client" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("client")}>Client</Link>
                    </th>
                    <th>Status</th>
                    <th className="num" aria-sort={sort === "due" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("due")}>Due</Link>
                    </th>
                    <th className="num" aria-sort={sort === "total" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("total")}>Total</Link>
                    </th>
                    <th className="num">Paid</th>
                    <th className="num" aria-sort={sort === "owed" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("owed")}>Owed</Link>
                    </th>
                    <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(({ invoice: i, client, computedStatus, totals: t }) => (
                    <tr key={i.id}>
                      <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                      <td>{client?.company ?? "Unknown"}</td>
                      <td><InvoicePill status={computedStatus} /></td>
                      <td className="num">{when(i.due)}</td>
                      <td className="num">{naira(t.total)}</td>
                      <td className="num">{naira(i.paid)}</td>
                      <td className="num">{t.due ? naira(t.due) : <span className="ad__dim">Nil</span>}</td>
                      <td className="ad__rmC"><InvoiceMenu invoice={i} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={hasInvoiceFilters ? "No invoices match these filters" : "No invoices yet"}
              action={hasInvoiceFilters
                ? <Link className="ad__btn" href="/admin/money#invoice-list">Clear filters</Link>
                : <InvoiceBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} />}
            >
              {hasInvoiceFilters
                ? "Try a broader search or clear the filters to see every invoice."
                : "Create the first invoice to track what is billed, paid, and still outstanding."}
            </Empty>
          )}
          {invoiceRows.length ? (
            <Pager
              label="Invoice pages"
              total={invoiceRows.length}
              page={invoicePage}
              per={per}
              noun={invoiceRows.length === 1 ? "invoice" : "invoices"}
              href={(patch) => queryHref(query, {
                page: patch.page && patch.page > 1 ? String(patch.page) : undefined,
                per: patch.per ? String(patch.per) : query.per,
              })}
            />
          ) : null}
        </Panel>

        <div className="ad__grid2">
          <Panel title="Payments received">
            {payments.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>When</th><th>Invoice</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {payments.map((p) => {
                      const inv = allInvoices.find((i) => i.id === p.invoiceId);
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
                <thead><tr><th>When</th><th>What</th><th>Who was paid</th><th>Against</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {expenses.map((e) => {
                    const on = e.projectId ? projectById.get(e.projectId) : null;
                    return (
                      <tr key={e.id}>
                        <td className="num">{when(e.at)}</td>
                        <td>
                          <b>{e.description}</b>
                          <p className="ad__dim" style={{ margin: ".15rem 0 0", fontSize: ".78rem" }}>
                            <span className="ad__pill ad__pill--flat">{e.category}</span>
                            {e.method ? <> · {e.method}</> : null}
                            {e.by ? <> · {e.by}</> : null}
                            {/* THE LINK IS OFFERED WHERE THE ROW IS, because
                                "do we have a receipt for this" is asked of the
                                row and not of a detail screen. */}
                            {e.receiptUrl ? (
                              <> · <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer">Receipt</a></>
                            ) : null}
                          </p>
                        </td>
                        <td>{e.vendor ?? <span className="ad__dim">–</span>}</td>
                        <td>
                          {on
                            ? <Link href={`/admin/projects/${on.id}`}>{on.title}</Link>
                            : <span className="ad__dim">Overhead</span>}
                          {e.rebillable ? (
                            <span className="ad__pill ad__pill--warn" style={{ marginLeft: ".35rem" }}>Rebillable</span>
                          ) : null}
                        </td>
                        <td className="num">{naira(e.amount)}</td>
                        <td className="ad__rmC"><ExpenseMenu expense={e} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No expenses recorded" action={<AddExpense projects={projects} />}>
              Add the first one with who was paid, what it was for, and the
              project it belongs against if it belongs to one.
            </Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
