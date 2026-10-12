import {
  clientInsights, collectedBy, creditsHeld, departments, held, invoicedBy, latePayers, payDays, receivables, recurring, refundsIn, reversalsIn,
  sales, series, spentBy, team, totals, vat, work,
} from "./compute";
import { compareSpan, type Filters, type Span } from "./filters";
import type { Scope } from "./scope";

/**
 * THE SAME FIGURES AS PLAIN TABLES, for the file.
 *
 * A report a person takes away has to match the screen to the kobo, so the file
 * is made from the same functions the screen calls, never from a second query.
 * Money is written in major units with two decimals as numbers (Excel adds
 * numbers; it does not add text). One list of sections per report; the CSV is
 * the sections stacked, the workbook is the same.
 */
export type Section = { title: string; head: string[]; rows: (string | number)[][] };
const m = (kobo: number) => Math.round(kobo) / 100;
const pct = (x: number | null) => (x == null ? "" : Math.round(x * 1000) / 10);

export const REPORTS = [
  ["income", "Income statement", "Invoiced, collected, refunded and spent, by period."],
  ["cashflow", "Cash flow", "Money in against money out, with the running balance."],
  ["aging", "Receivables aging", "Who owes what, and how late."],
  ["sales", "Sales summary", "Quotes, win rate and enquiries."],
  ["recurring", "Recurring revenue", "Retainers, monthly revenue and who left or joined."],
  ["team", "Team performance", "People and departments: work, delivery, replies, money."],
  ["clients", "Client report", "Revenue, what each owes, credit and activity."],
  ["tax", "Tax summary", "VAT written on invoices and what is still outstanding."],
] as const;
export type ReportKey = (typeof REPORTS)[number][0];

export function header(f: Filters, span: Span, title: string): Section {
  const filt = [f.svc.length && `Service ${f.svc.join(", ")}`, f.client.length && `${f.client.length} client(s)`, f.dept.length && `${f.dept.length} department(s)`, f.staff.length && `Staff ${f.staff.join(", ")}`, f.method.length && `Method ${f.method.join(", ")}`, f.status.length && `Status ${f.status.join(", ")}`, f.min != null && `Over ${f.min}`, f.max != null && `Under ${f.max}`, f.q && `Search "${f.q}"`].filter(Boolean).join("; ");
  return { title: `WDC ${title}`, head: [], rows: [[`${span.from} to ${span.to}`], [`Currency ${f.cur}, amounts in major units`], [filt ? `Filters: ${filt}` : "No filters"]] };
}

export function datasets(key: ReportKey | "all", s: Scope, depts: { id: string; name: string; members: { id: string; name: string; active: boolean }[] }[] | null): Section[] {
  const f = s.f, span: Span = { from: f.from, to: f.to };
  const out: Section[] = [];
  const want = (k: ReportKey) => key === "all" || key === k;
  if (want("income") || want("cashflow")) {
    const pts = series(s, span, f.group), t = totals(s, span), cmp = compareSpan(f), tb = cmp ? totals(s, cmp) : null;
    out.push({ title: "Summary", head: ["Measure", "This period", ...(tb ? ["Comparison"] : [])], rows: [
      ["Invoiced", m(t.invoiced), ...(tb ? [m(tb.invoiced)] : [])], ["Collected (after refunds and reversals)", m(t.collected), ...(tb ? [m(tb.collected)] : [])],
      ["Refunded", m(t.refunded), ...(tb ? [m(tb.refunded)] : [])], ["Spent", m(t.spent), ...(tb ? [m(tb.spent)] : [])], ["Net (collected less spent)", m(t.net), ...(tb ? [m(tb.net)] : [])],
      ["Invoices issued", t.invoiceCount, ...(tb ? [tb.invoiceCount] : [])], ["Collection rate %", pct(t.collectionRate), ...(tb ? [pct(tb.collectionRate)] : [])],
    ] });
    out.push({ title: `By ${f.group}`, head: ["Period", "Invoiced", "Collected", "Refunded", "Spent", "Net", "Running net"], rows: pts.map((p) => [p.label, m(p.invoiced), m(p.collected), m(p.refunded), m(p.spent), m(p.net), m(p.cumulative)]) });
    if (want("income")) {
      for (const [title, rows] of [["Collected by method", collectedBy(s, span, "method")], ["Collected by service", collectedBy(s, span, "service")], ["Collected by client", collectedBy(s, span, "client")], ["Collected by department", collectedBy(s, span, "department")], ["Spent by category", spentBy(s, span, "category")], ["Spent by vendor", spentBy(s, span, "vendor")], ["Spent by project", spentBy(s, span, "project")]] as const)
        out.push({ title, head: ["Name", "Amount", "Share %", "Entries"], rows: rows.map((r) => [r.label, m(r.amount), pct(r.share ?? 0), r.n ?? ""]) });
    }
    if (want("cashflow")) {
      const h = held(s);
      out.push({ title: "Money held", head: ["Where", "Amount"], rows: [["Client credit on account", m(h.credit)], ["Kept for work not yet delivered", m(h.unearned)], ["Card payments in the last two days", m(h.settling)]] });
    }
  }
  if (want("aging")) {
    const r = receivables(s), pd = payDays(s, span);
    out.push({ title: "Aging", head: ["Bucket", "Amount", "Invoices"], rows: r.buckets.map((b) => [b.label, m(b.amount), b.n]) });
    out.push({ title: "Open invoices", head: ["Invoice", "Client", "Service", "Issued", "Due", "Days late", "Total", "Owed", "Status"], rows: r.open.map((o) => [o.number, o.client, o.service, o.issued, o.due, o.late, m(o.total), m(o.due$), o.status]) });
    out.push({ title: "Owed by client", head: ["Client", "Owed", "Invoices", "Note"], rows: r.clients.map((c) => [c.label, m(c.amount), c.n ?? "", c.sub ?? ""]) });
    out.push({ title: "Days to pay", head: ["Band", "Invoices"], rows: [...pd.bins.map((b) => [b.label, b.n]), ["Average days", pd.avg == null ? "" : Math.round(pd.avg * 10) / 10]] });
    out.push({ title: "Average days late by client", head: ["Client", "Average days past due", "Invoices"], rows: latePayers(s, span).map((r2) => [r2.label, r2.amount, r2.n ?? ""]) });
  }
  if (want("sales")) {
    const x = sales(s, span);
    out.push({ title: "Quotes", head: ["Measure", "Count", "Value"], rows: [["Sent", x.sent.n, m(x.sent.value)], ["Accepted", x.accepted.n, m(x.accepted.value)], ["Declined", x.declined.n, m(x.declined.value)], ["Expired", x.expired.n, m(x.expired.value)], ["Waiting", x.waiting.n, m(x.waiting.value)], ["Win rate %", pct(x.winRate), ""], ["Average value", "", m(x.avgValue)]] });
    out.push({ title: "Quote list", head: ["Number", "Client", "Issued", "State", "Total", "Days to answer"], rows: x.list.map((e) => [e.number, e.client, e.issued, e.state, m(e.total), e.days ?? ""]) });
    out.push({ title: "Enquiries by service", head: ["Service", "Submitted"], rows: x.enquiries.byService.map((r) => [r.label, r.amount]) });
  }
  if (want("recurring")) {
    const r = recurring(s);
    out.push({ title: "Recurring revenue", head: ["Month", "Invoiced", "Invoices", "Clients"], rows: r.series.map((p) => [p.label, m(p.amount), p.n, p.clients]) });
    out.push({ title: "Latest monthly revenue by client", head: ["Client", "Amount"], rows: r.perClient.map((c) => [c.label, m(c.amount)]) });
    out.push({ title: "Joined and left", head: ["Joined last month", "Left last month"], rows: [[r.gained.join("; "), r.lost.join("; ")]] });
  }
  if (want("team")) {
    out.push({ title: "People", head: ["Person", "Live projects", "Delivered", "Tasks open", "Tasks done", "Tasks overdue", "Completion %", "Support replies", "Collected on their projects"], rows: team(s, span).map((r) => [r.name, r.live, r.delivered, r.tasksOpen, r.tasksDone, r.tasksOverdue, pct(r.completion), r.replies, m(r.collected)]) });
    if (depts) out.push({ title: "Departments", head: ["Department", "People", "Clients", "Live projects", "Open tasks", "Collected", "Spent"], rows: departments(s, span, depts).map((d) => [d.name, d.people, d.clients, d.projects, d.tasksOpen, m(d.collected), m(d.spent)]) });
    const w = work(s, span);
    out.push({ title: "Delivery", head: ["Measure", "Value"], rows: [["Delivered in period", w.delivered], ["On time %", pct(w.onTimeRate)], ["Overdue now", w.overdue.length], ["Tickets opened", w.tickets.opened], ["Average first reply, hours", w.tickets.firstReplyHours == null ? "" : Math.round(w.tickets.firstReplyHours * 10) / 10]] });
  }
  if (want("clients")) {
    const c = clientInsights(s, span);
    out.push({ title: "Clients", head: ["Client", "Since", "Invoiced", "Collected", "Owed now", "Live projects", "Credit held", "Lifetime collected", "Last payment"], rows: c.rows.sort((a, b) => b.collected - a.collected).map((r) => [r.name, r.since, m(r.invoiced), m(r.collected), m(r.outstanding), r.projects, m(r.credit), m(r.lifetime), r.last ?? ""]) });
  }
  if (want("tax")) {
    const v = vat(s, span);
    out.push({ title: "VAT on invoices issued", head: ["Measure", "Amount"], rows: [["VAT written", m(v.charged)], ["On invoices now paid", m(v.onPaid)], ["On invoices still open", m(v.outstanding)], ["Invoices with VAT", v.invoices]] });
  }
  if (key === "all") {
    out.push({ title: "Credit held for clients", head: ["Client", "Amount", "Note"], rows: creditsHeld(s).map((r) => [r.label, m(r.amount), r.sub ?? ""]) });
    out.push({ title: "Refunds", head: ["Date", "Client", "Invoice", "Amount", "To credit", "Reason", "By"], rows: refundsIn(s, span).map((r) => [r.at.slice(0, 10), r.client, r.invoice, m(r.amount), r.toCredit ? "Yes" : "No", r.reason, r.by]) });
    out.push({ title: "Reversed payments", head: ["Date", "Client", "Invoice", "Amount", "Reason", "By"], rows: reversalsIn(s, span).map((r) => [r.at.slice(0, 10), r.client, r.invoice, m(r.amount), r.reason, r.by]) });
    out.push({ title: "Invoiced by service", head: ["Service", "Amount", "Share %"], rows: invoicedBy(s, span, "service").map((r) => [r.label, m(r.amount), pct(r.share ?? 0)]) });
  }
  return out;
}

/** Sections stacked into one grid, each under its title and followed by a blank row. */
export function stack(head: Section, sections: Section[]): (string | number)[][] {
  const rows: (string | number)[][] = [[head.title], ...head.rows, []];
  for (const s of sections) { rows.push([s.title], s.head, ...s.rows, []); }
  return rows;
}
