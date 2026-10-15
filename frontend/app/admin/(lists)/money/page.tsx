import CurrencyBalances from "@/components/money/currency-balances";
import {currencyOf,money} from "@/lib/money/currency";
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
import { Empty, InvoicePill, when } from "@/components/admin/bits";
import { avTone, initials } from "@/lib/admin/client-mark";
import { AddExpense, EstimateBuilder, InvoiceBuilder } from "@/components/admin/money-forms";
import {
  EstimateMenu, ExpenseMenu, InvoiceMenu, PaymentMenu,
} from "@/components/admin/row-actions";
import { CashflowChart } from "@/components/admin/cashflow-chart";
import { AlertTriangle, Clock, CreditCard, FileText, Plus, Wallet } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { MiniBar, RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { dateWords, nowMs } from "@/lib/admin/when";
import "@/components/admin/money-page.css";
import "@/components/admin/dashboard.css";
import { Pager, readPer } from "@/components/admin/pager";
import { ExampleNote } from "@/components/admin/example-note";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { DateRange } from "@/components/admin/date-range";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata = { title: "Money" };

/* `from` and `to` are the invoice's issue date, as Lagos calendar days. */
type MoneyQuery = { tab?: string; q?: string; status?: string; sort?: string; dir?: string; page?: string; per?: string; from?: string; to?: string };

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
  const tab = ["invoices", "quotes", "payments", "expenses"].includes(String(query.tab)) ? String(query.tab) : "invoices";
  /* THE DECK: late invoices, money the bank holds that no invoice claims, mail that did not go, and quotes waiting on an answer. */
  const moneyDeck: DeckItem[] = [
    ...onBooks.filter((i) => invoiceStatus(i) === "Overdue").map((i) => ({
      id: `late-${i.id}`, kind: "Money", urgency: "Late", tone: "bad" as const, label: i.number,
      title: `${getClient(i.clientId)?.company ?? "A client"} owes ${naira(invoiceTotals(i).due)}`,
      body: `${i.number} was due ${when(i.due)}. A reminder with the Paystack and Flutterwave link is one step away.`,
      facts: [{ k: "Client", v: getClient(i.clientId)?.company ?? "Unknown" }, { k: "Due", v: when(i.due) }],
      primary: { label: "Open the invoice", href: `/admin/money/${i.id}` }, open: `/admin/money/${i.id}`,
    })),
    ...(unreconciled ? [{ id: "recon", kind: "Money", urgency: "Does not match", tone: "warn" as const, title: `${unreconciled} payment event${unreconciled === 1 ? "" : "s"} the books and the bank do not agree on`, body: "Money the provider reported that no invoice claims, or an event that failed its checks. Collected is wrong until they are matched.", primary: { label: "Open reconciliation", href: "/admin/money/reconciliation" } }] : []),
    ...(failedMail ? [{ id: "mail", kind: "Email", urgency: "Did not go", tone: "warn" as const, title: `${failedMail} message${failedMail === 1 ? "" : "s"} did not go`, body: "Emails the mail server refused or that could not be sent. The client has not seen them.", primary: { label: "Open the message log", href: "/admin/money/reconciliation" } }] : []),
    ...estimates.filter((e) => estimateState(e) === "Sent").map((e) => ({
      id: `est-${e.id}`, kind: "Quote", urgency: "Waiting", tone: "warn" as const, label: e.number,
      title: `${getClient(e.clientId)?.company ?? "A client"} has not answered ${e.number}`,
      body: `Sent ${when(e.issued)}, valid until ${when(e.expires)}. A nudge now is better than a late quote.`,
      primary: { label: "Open the quote", href: `/admin/money?tab=quotes` },
    })),
  ];

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
  const statusCounts = allInvoices.reduce((m, i) => m.set(invoiceStatus(i), (m.get(invoiceStatus(i)) ?? 0) + 1), new Map<string, number>());
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

  /* THIS MONTH, for the lede and How people pay: payments received since the 1st, by method. */
  const monthStart = today.slice(0, 7);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Africa/Lagos" }).format(new Date(`${today}T12:00:00Z`));
  const monthPays = payments.filter((p) => p.at.slice(0, 7) === monthStart && !p.reversed);
  const monthIn = monthPays.reduce((n, p) => n + p.amount, 0);
  const byMethod = [...monthPays.reduce((m, p) => m.set(p.method, (m.get(p.method) ?? 0) + p.amount), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const methodPeak = Math.max(1, ...byMethod.map(([, v]) => v));
  /* COMING UP: sent invoices falling due in the next fortnight, soonest first. */
  const soon = onBooks.filter((i) => invoiceTotals(i).due > 0 && invoiceStatus(i) !== "Overdue" && i.due.slice(0, 10) >= today && i.due.slice(0, 10) <= new Date(Date.parse(today) + 14 * 86_400_000).toISOString().slice(0, 10))
    .sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);

  const rail = (
    <>
      <RailHead title="Money pulse" />
      <div data-tour="money-tiles">
        <StatTiles items={[
          /* null rather than 0% when nothing has been invoiced: a red 0% for a studio that has not billed yet is not a problem. */
          { label: "Collected", value: nairaShort(s.collected), note: rate === null ? "Nothing invoiced yet" : `${Math.round(rate * 100)}% of ${nairaShort(s.invoiced)} billed`, icon: Wallet, tone: "good", href: "/admin/money?status=Paid#invoice-list" },
          { label: "Outstanding", value: nairaShort(s.outstanding), note: `${openCount} ${openCount === 1 ? "invoice" : "invoices"} open`, icon: Clock, tone: "live", href: "/admin/money?status=Sent#invoice-list" },
          { label: "Overdue", value: nairaShort(s.overdue), note: overdueCount ? `${overdueCount} ${overdueCount === 1 ? "invoice" : "invoices"} late` : "Nothing late", noteTone: overdueCount ? "accent" : undefined, icon: AlertTriangle, tone: s.overdue ? "bad" : "good", href: "/admin/money?status=Overdue#invoice-list" },
          { label: "Spent", value: nairaShort(s.spend), note: rebillable ? `${nairaShort(rebillable)} can be billed back` : `Net ${nairaShort(s.profit)}`, icon: CreditCard, tone: "brand", href: "/admin/money?tab=expenses#invoice-list" },
        ]} />
      </div>
      <RailCard title="How people pay" aside={monthName}>
        {byMethod.length ? (
          <ul className="adMoney__methods">
            {byMethod.map(([m, v]) => (
              <li key={m}><span className="adMoney__mLine"><b>{m}</b><span className="ad__num">{nairaShort(v)}</span></span><MiniBar share={v / methodPeak} /></li>
            ))}
          </ul>
        ) : <p className="ad__dim adMoney__none">No payments yet this month. Each method shows here as money arrives.</p>}
      </RailCard>
      <RailCard title="Coming up" aside="Next 14 days">
        <RailRows empty="Nothing falls due in the next two weeks." rows={soon.map((i) => ({
          key: i.id, title: getClient(i.clientId)?.company ?? "Client", sub: `${i.number} · ${money(invoiceTotals(i).due, currencyOf(i))}`, icon: FileText, tone: "neutral" as const, href: `/admin/money/${i.id}`,
          tag: { text: dateWords(i.due, nowMs(), false), tone: "flat" as const },
        }))} />
      </RailCard>
      {/* HOW OLD THE MONEY IS, which "outstanding" cannot say: the conventional 30-day buckets, each drilling into the invoices behind it. */}
      <RailCard title="Who owes what" aside={owed ? nairaShort(owed) : undefined}>
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
              <Empty title="No invoices sent yet" action={<InvoiceBuilder defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}>
                What clients owe shows here once the first invoice goes out.
              </Empty>
            )
          )}
      </RailCard>
      <RailCard title="Last six months" aside={`Peak ${nairaShort(peak)}`}>
        <p className="ad__dim adMoney__none">Collected each month against what was spent.</p>
        <CashflowChart months={months} totals={[
          { label: "Collected", value: months.reduce((n, m) => n + m.in, 0), key: "in" },
          { label: "Spend", value: months.reduce((n, m) => n + m.out, 0), key: "out" },
        ]} />
      </RailCard>
      <CurrencyBalances invoices={allInvoices} />
    </>
  );

  return (
    <>
      <PageHead title="Money"
        lede={<>{nairaShort(monthIn)} collected in {monthName}. {naira(s.outstanding)} outstanding{s.overdue ? <>, <strong>{naira(s.overdue)} of it late.</strong></> : <>. <strong>Nothing is late.</strong></>}</>}
        action={<Link href="/admin/money/new" className="ad__btn ad__btn--primary" data-tour="money-add"><Plus aria-hidden="true" /> New invoice</Link>}
        chores={<ChoresMenu label="money, more" items={[
          { label: "New quote", href: "/admin/money/new?type=quote", icon: "file" },
          { label: "Reconciliation", href: "/admin/money/reconciliation", icon: "file" },
          { label: "Reports", href: "/admin/reports", icon: "file" },
          { label: "Export invoices as CSV", href: invoiceExportHref, icon: "file" },
          { label: "Payment settings", href: "/admin/settings/integrations", icon: "file" },
        ]} />} />

      <ExampleNote />

      <Workbench railLabel="Where the money stands" rail={rail}>
      <Deck
        id="money"
        title="Money needing you"
        items={moneyDeck}
        emptyTitle="The money is looked after."
        emptyBody="Nothing needs you on invoices, quotes or reconciliation."
        emptyNext={{ label: "New invoice", href: "/admin/money?tab=invoices" }}
      />
      <section className="adList adMoney" aria-label="Invoices, quotes, payments and expenses">
      <Tabs label="Money" current={tab} items={[
        { key: "invoices", label: "Invoices", href: "/admin/money?tab=invoices", count: allInvoices.length, tone: overdueCount ? "bad" : undefined },
        { key: "quotes", label: "Quotes", href: "/admin/money?tab=quotes", count: estimates.length },
        { key: "payments", label: "Payments", href: "/admin/money?tab=payments", count: payments.length, tone: unreconciled ? "warn" : undefined },
        { key: "expenses", label: "Expenses", href: "/admin/money?tab=expenses", count: expenses.length },
        { key: "reports", label: "Reports", href: "/admin/reports" },
      ]} />
          <div className="ad__stack">
            {tab === "invoices" ? (
        <Part title="Invoices">
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
            <Chips label="Invoice status" current={statusFilter} items={(["", "Overdue", "Sent", "Part paid", "Paid", "Draft", "Void"] as const)
              .map((st) => ({ key: st, label: st || "All", count: st ? statusCounts.get(st) ?? 0 : allInvoices.length, href: queryHref(query, { status: st || undefined, page: undefined }) }))
              .filter((c) => c.key === "" || c.count || c.key === statusFilter)} />
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
                      <td className="num">{money(t.total,currencyOf(i))}</td>
                      <td className="num">{t.due ? money(t.due,currencyOf(i)) : <span className="ad__dim">Nil</span>}</td>
                      <td className="ad__rmC">
                        <InvoiceMenu invoice={i} noReceipt={noticeBlock(client)}
                          edit={client ? { clientName: client.company, projectTitle: i.projectId ? projectById.get(i.projectId)?.title : undefined } : undefined} />
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
                : <InvoiceBuilder defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}
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
        </Part>
            ) : null}
            {tab === "expenses" ? (
              <>
          <Part title="Where the spend goes (NGN)">
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
          </Part>
          <Part title="Expenses">
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
              <Empty title="No expenses recorded" action={<AddExpense />}>
                Add the first one with who was paid, what it was for, and the
                project it belongs against if it belongs to one.
              </Empty>
            )}
          </Part>
              </>
            ) : null}
            {tab === "quotes" ? (
          <Part
            title="Estimates"
            action={<EstimateBuilder trigger="New estimate" defaultVatRate={finance.vatRate} noEmail={noEmail} />}
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
                          <td className="num">{money(estimateTotals(e).total,currencyOf(e))}</td>
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
                action={<EstimateBuilder defaultVatRate={finance.vatRate} noEmail={noEmail} />}
              >
                An estimate is its own document with its own number, not a draft
                invoice. Accepting one raises the invoice and keeps the quote as
                the record of what was agreed.
              </Empty>
            )}
          </Part>
            ) : null}
            {tab === "payments" ? (
          <Part title="Payments received">
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
                          <td className="num">{money(p.amount,currencyOf(p))}{paymentState(p) !== "Received" ? <small className="ad__dim">{paymentState(p)}{paymentState(p) === "Part refunded" ? `, ${money(refundedTotal(p),currencyOf(p))} back` : ""}</small> : null}</td>
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
          </Part>
            ) : null}
          </div>
      </section>
      </Workbench>
    </>
  );
}

/** One part of the Money card under its tabs: a heading row and what it holds, no second card around it. */
function Part({ title, action, children, dataTour, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; dataTour?: string; id?: string }) {
  return (
    <div className="adMoney__part" data-tour={dataTour} id={id}>
      <div className="adList__hd"><h2>{title}</h2><span className="adList__sp" />{action}</div>
      {children}
    </div>
  );
}

/** Today in Lagos (UTC+1, no daylight saving), as YYYY-MM-DD. */
function lagosToday() {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}
