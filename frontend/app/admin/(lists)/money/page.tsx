import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { hydrateSettings } from "@/lib/settings/store";
import {
  creditBalances, financeDefaults, getAging, getClient, getClients, getCollectionRate,
  getEstimates, getExpenses, getInvoice, getInvoices, getMonthly, getPayments,
  getPipeline, getProjects, getSummary, providerAttentionCount,
} from "@/lib/admin/store";
import { failedLoggedCount } from "@/lib/message-log";
import { noticeBlock, noticeBlocks } from "@/lib/admin/money-rules";
import {
  estimateState, estimateTotals, invoiceStatus, invoiceTotals, naira, nairaShort, paymentState, refundedTotal,
} from "@/lib/admin/types";
import { Empty, InvoicePill, Panel, Tile, when } from "@/components/admin/bits";
import { avTone, initials } from "@/lib/admin/client-mark";
import { AddExpense, EstimateBuilder, InvoiceBuilder } from "@/components/admin/money-forms";
import {
  EstimateMenu, ExpenseMenu, InvoiceMenu, PaymentMenu,
} from "@/components/admin/row-actions";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { CashflowChart } from "@/components/admin/cashflow-chart";
import { AlertTriangle, BarChart3, Clock, CreditCard, TrendingUp, Wallet } from "lucide-react";
import "@/components/admin/dashboard.css";
import { Pager, readPer } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { ExampleNote } from "@/components/admin/example-note";

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
  await syncStore();
  persistSoon();
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
  /* The two small facts the invoice and payment forms need about a client,
     computed once: who holds stored credit (to offer "use their credit"), and
     who cannot be emailed and why (the ticks disable with the reason). Only the
     exceptions are sent, because most clients have neither. */
  const credits = creditBalances();
  const noEmail = noticeBlocks(getClients());
  const pipeline = getPipeline();
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const months = getMonthly(6);
  const peak = Math.max(1, ...months.flatMap((m) => [m.in, m.out]));
  const onBooks = allInvoices.filter((i) => i.status !== "Draft" && !i.voided);
  const openCount = onBooks.filter((i) => invoiceTotals(i).due > 0).length;
  const overdueCount = onBooks.filter((i) => invoiceStatus(i) === "Overdue").length;
  const rebillable = expenses.filter((e) => e.rebillable).reduce((n, e) => n + e.amount, 0);
  const today = lagosToday();

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
          <Link className="ad__btn" href="/admin/reports"><BarChart3 aria-hidden="true" /> Reports</Link>
          <AddExpense projects={projects} />
          <EstimateBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} noEmail={noEmail} />
          <InvoiceBuilder
            clients={getClients()} projects={projects} dataTour="money-add"
            defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays}
            credits={credits} noEmail={noEmail}
          />
        </div>
      </div>

      <ExampleNote />

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

      <dl className="ad__tiles ad__tiles--5" data-tour="money-tiles">
        {/* HOW MUCH OF WHAT WE BILLED ACTUALLY ARRIVED rides on Collected:
            null rather than 0% when nothing has been invoiced, because a red
            0% for a studio that has simply not billed yet is not a problem. */}
        <Tile label="Collected" href="/admin/money?status=Paid" value={nairaShort(s.collected)} tone="good" icon={Wallet} iconTone="good"
              note={rate === null ? "Nothing invoiced yet" : `${Math.round(rate * 100)}% of ${nairaShort(s.invoiced)} billed`} />
        <Tile label="Outstanding" href="/admin/money?status=Sent" value={nairaShort(s.outstanding)} icon={Clock} iconTone="live"
              note={`${openCount} invoice${openCount === 1 ? "" : "s"} open`} />
        <Tile label="Overdue" href="/admin/money?status=Overdue" value={nairaShort(s.overdue)} tone={s.overdue ? "bad" : "good"} icon={AlertTriangle} iconTone={s.overdue ? "bad" : "good"}
              note={overdueCount ? `${overdueCount} invoice${overdueCount === 1 ? "" : "s"} late` : "Nothing late"} />
        <Tile label="Spend" value={nairaShort(s.spend)} icon={CreditCard}
              note={rebillable ? `${nairaShort(rebillable)} can be billed back` : "Nothing to bill back"} />
        <Tile label="Net" value={nairaShort(s.profit)} tone={s.profit >= 0 ? "good" : "bad"} icon={TrendingUp} iconTone={s.profit >= 0 ? "good" : "bad"}
              note="Collected less spend" />
      </dl>

      <div className="adDash__row">
        <Panel title="Last six months" action={<span className="ad__dim ad__num">Peak {nairaShort(peak)}</span>}>
          <p className="adDash__sub">Collected each month against what was spent.</p>
          <CashflowChart months={months} totals={[
            { label: "Collected", value: months.reduce((n, m) => n + m.in, 0), key: "in" },
            { label: "Spend", value: months.reduce((n, m) => n + m.out, 0), key: "out" },
          ]} />
        </Panel>

        {/* HOW OLD THE MONEY IS, which "outstanding" cannot say.

            One outstanding figure treats an invoice sent last Tuesday and one
            sent in March as the same thing. They are not: the first is a
            cashflow line, the second is a conversation somebody has to have.
            The buckets are the conventional 30-day steps so they mean to an
            accountant what they mean here, and every row drills into the
            invoices behind it rather than asking anybody to trust a total. */}
        <Panel title="Who owes what" action={owed ? <span className="ad__dim ad__num">{nairaShort(owed)}</span> : undefined}>
          {owed ? (
            <div className="ad__aging">
              <div className="ad__agingBar" role="img" aria-label={aging.map((b) => `${b.label} ${naira(b.amount)}`).join(", ")}>
                {aging.map((b, n) => b.amount ? <span key={b.label} className={`ad__agingSeg ad__agingSeg--${n}`} style={{ flexGrow: b.amount }} /> : null)}
              </div>
              <ul className="ad__agingList">
                {aging.map((b, n) => (
                  <li key={b.label}>
                    <i className={`ad__agingSeg--${n}`} aria-hidden="true" />
                    <span>{b.label}</span>
                    <b className="ad__num">{b.amount ? naira(b.amount) : <span className="ad__dim">Nil</span>}</b>
                  </li>
                ))}
              </ul>
              {/* WHO, not just how much: the three biggest balances, oldest
                  bucket first, each a link to the invoice behind it. */}
              <ul className="ad__agingWho">
                {aging.flatMap((b) => b.invoices).map((i) => ({ i, due: invoiceTotals(i).due }))
                  .sort((x, y) => y.due - x.due).slice(0, 3).map(({ i, due }) => {
                    const c = getClient(i.clientId);
                    const late = Math.floor((Date.parse(today) - Date.parse(i.due.slice(0, 10))) / 86_400_000);
                    return (
                      <li key={i.id}>
                        <Link href={`/admin/money/${i.id}`} className="ad__who">
                          <span className="ad__av" aria-hidden="true">{(c?.company ?? "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
                          <span><b>{c?.company ?? "Unknown"}</b><small>{i.number} · {late > 0 ? `${late} day${late === 1 ? "" : "s"} late` : `due ${when(i.due)}`}</small></span>
                        </Link>
                        <b className="ad__num">{nairaShort(due)}</b>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ) : (
            onBooks.length ? (
              <Empty title="Nothing outstanding">
                Every invoice that has been sent is paid.
              </Empty>
            ) : (
              <Empty title="No invoices sent yet" action={<InvoiceBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}>
                What clients owe shows here once the first invoice goes out.
              </Empty>
            )
          )}
        </Panel>
      </div>

      <div className="ad__stack">
        <Panel title="Invoices">
          <div className="ad__filterBar" data-tour="money-invoice-filters">
          <form className="ad__filterForm" method="get" action="/admin/money#invoice-list" aria-label="Filter invoices">
            <label className="ad__filterSearch">
              <span className="ad__sr">Search invoices</span>
              <input name="q" type="search" defaultValue={query.q} placeholder="Search number or client" />
            </label>
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            {query.per ? <input type="hidden" name="per" value={per} /> : null}
            <button className="ad__sr" type="submit">Search</button>
          </form>
            {/* THE STATUSES AS TABS, one press each, as the mockup draws them;
                each is a link, so a filtered list has its own address. */}
            <nav className="ad__switch ad__switch--wrap" aria-label="Invoice status">
              {(["", "Draft", "Sent", "Part paid", "Overdue", "Paid", "Void"] as const).map((st) => (
                <Link key={st || "all"} aria-current={statusFilter === st ? "true" : undefined}
                  href={queryHref(query, { status: st || undefined, page: undefined })}>{st || "All"}</Link>
              ))}
            </nav>
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
            <>
              <BulkBar target="invoices-table" noun="invoices" actions={[
                { kind: "invoices:remind", label: "Send reminder", icon: "mail", confirm: "Email a reminder about {n} invoices? Paid ones and clients who turned reminders off are skipped." },
              ]} />
            <div className="ad__scroll" id="invoices-table">
              <table className="ad__t">
                <thead>
                  <tr>
                    <th aria-sort={sort === "number" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <span className="ad__pickRow"><PickAll label="Select every invoice" /><Link href={invoiceSortHref("number")}>Number</Link></span>
                    </th>
                    <th aria-sort={sort === "client" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("client")}>Client</Link>
                    </th>
                    <th>Against</th>
                    <th>Issued</th>
                    <th>Status</th>
                    <th className="num" aria-sort={sort === "due" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("due")}>Due</Link>
                    </th>
                    <th className="num" aria-sort={sort === "total" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("total")}>Total</Link>
                    </th>
                    <th className="num" aria-sort={sort === "owed" ? direction === "asc" ? "ascending" : "descending" : undefined}>
                      <Link href={invoiceSortHref("owed")}>Owed</Link>
                    </th>
                    <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(({ invoice: i, client, computedStatus, totals: t }) => (
                    <tr key={i.id}>
                      <td><span className="ad__pickRow"><RowPick id={i.id} label={i.number} /><Link href={`/admin/money/${i.id}`}><b className="ad__docNo">{i.number}</b></Link></span></td>
                      <td>
                        <span className="ad__who">
                          <span className={`ad__av ad__av--sm ad__av--${avTone(client?.company ?? "?")}`} aria-hidden="true">{initials(client?.company ?? "?")}</span>
                          <span>{client?.company ?? "Unknown"}</span>
                        </span>
                      </td>
                      <td className="ad__dim">{i.projectId ? projectById.get(i.projectId)?.title ?? "–" : "–"}</td>
                      <td className="ad__dim ad__num ad__docNo">{i.status === "Draft" ? "–" : when(i.issued)}</td>
                      <td><InvoicePill status={computedStatus} /></td>
                      <td className={`num ad__docNo${computedStatus === "Overdue" ? " ad__lateDue" : ""}`}>{when(i.due)}</td>
                      <td className="num">{naira(t.total)}</td>
                      <td className="num">{t.due ? naira(t.due) : <span className="ad__dim">Nil</span>}</td>
                      <td className="ad__rmC">
                        <InvoiceMenu invoice={i} noReceipt={noticeBlock(client)}
                          edit={client ? { clientName: client.company, projects: projects.filter((p) => p.clientId === client.id).map((p) => ({ id: p.id, title: p.title, clientId: p.clientId })) } : undefined} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <Empty
              title={hasInvoiceFilters ? "No invoices match these filters" : "No invoices yet"}
              action={hasInvoiceFilters
                ? <Link className="ad__btn" href="/admin/money#invoice-list">Clear filters</Link>
                : <InvoiceBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}
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

        {/* The order of the mockup: what is owed, then where money went,
            then what is quoted beside what came in. */}
        <div className="ad__grid2 ad__grid2--side">
          <Panel title="Where the spend goes">
            <div style={{ padding: ".8rem 1rem" }}>
              {categories.map(([cat, amount]) => (
                <div key={cat} style={{ padding: ".4rem 0" }}>
                  <div className="ad__row" style={{ justifyContent: "space-between" }}>
                    <span>{cat}</span>
                    <b className="ad__num">{naira(amount)}</b>
                  </div>
                  <span className="ad__barTrack" aria-hidden="true">
                    <span style={{ width: `${(amount / (categories[0]?.[1] || 1)) * 100}%` }} />
                  </span>
                </div>
              ))}
              {!categories.length && (
                /* The Expenses panel beside this one carries the Add button;
                   two of them for one fact was one too many. */
                <Empty title="No spending to break down">Categories appear once an expense is recorded.</Empty>
              )}
            </div>
          </Panel>
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
                          <td className="num ad__docNo">{when(e.at)}</td>
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

        <div className="ad__grid2 ad__grid2--even">
          {/* A quote is not money and is not added to any total on the page. */}
          <Panel
            title="Estimates"
            action={<EstimateBuilder clients={getClients()} projects={projects} trigger="New estimate" defaultVatRate={finance.vatRate} noEmail={noEmail} />}
          >
            {/* WHAT IS QUOTED AND STILL LIVE, the only forward-looking figure on
                this screen and deliberately not added to anything else. A quote
                is not money; putting it in the same sum as collected income is
                how a studio talks itself into spending it. */}
            <p className="ad__dim ad__panelNote ad__panelNote--top">
              {nairaShort(pipeline.open)} out for quote · {pipeline.winRate === null ? "nothing answered yet" : `${Math.round(pipeline.winRate * 100)}% of answered quotes won`}
            </p>
            {estimates.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead>
                    <tr>
                      <th>Number</th><th>Client</th><th>Holds until</th>
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
                              ? <b className="ad__docNo">{e.number}</b>
                              : <a href={`/q/${e.token}`} target="_blank" rel="noopener noreferrer"><b className="ad__docNo">{e.number}</b></a>}
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
                            <span className={`ad__pill ad__subPill ${
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
                          <td>{c ? <Link href={`/admin/clients/${c.id}`}>{c.company}</Link> : "–"}</td>
                          <td className="ad__num ad__dim ad__docNo">{when(e.expires)}</td>
                          <td className="num">{naira(estimateTotals(e).total)}</td>
                          <td className="ad__rmC"><EstimateMenu estimate={e} noEmail={noEmail[e.clientId]} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nothing out for quote"
                action={<EstimateBuilder clients={getClients()} projects={projects} defaultVatRate={finance.vatRate} noEmail={noEmail} />}
              >
                An estimate is its own document with its own number, not a draft
                invoice. Accepting one raises the invoice and keeps the quote as
                the record of what was agreed.
              </Empty>
            )}
          </Panel>
          <Panel title="Payments received">
            {payments.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>When</th><th>Invoice</th><th>Method</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {payments.map((p) => {
                      const inv = allInvoices.find((i) => i.id === p.invoiceId);
                      return (
                        <tr key={p.id}>
                          <td className="num ad__docNo">{when(p.at)}</td>
                          <td>
                            {inv ? <Link className="ad__docNo" href={`/admin/money/${inv.id}`}>{inv.number}</Link> : "Unknown"}
                            <small className="ad__dim ad__num ad__subLine">{p.reference}</small>
                          </td>
                          <td>{p.method}</td>
                          <td className="num">{naira(p.amount)}{paymentState(p) !== "Received" ? <small className="ad__dim">{paymentState(p)}{paymentState(p) === "Part refunded" ? `, ${naira(refundedTotal(p))} back` : ""}</small> : null}</td>
                          <td className="ad__rmC">
                            <PaymentMenu payment={p} invoiceNumber={inv?.number} noEmail={inv ? noEmail[inv.clientId] : undefined} />
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

        </div>
      </div>
    </>
  );
}

/** Today in Lagos (UTC+1, no daylight saving), as YYYY-MM-DD. */
function lagosToday() {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}
