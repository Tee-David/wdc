import {
  getClient, getClients, getExpenses, getInvoices, getPayments, getProjects,
} from "./store";
import { invoiceTotals, paymentNet } from "./types";

/**
 * THE NUMBERS BEHIND THE REPORTS PAGE.
 *
 * Everything is derived from the invoices, payments and expenses on the books
 * for the days asked about, and again for the equal stretch just before them,
 * so each figure can say whether it is up or down. Nothing is stored. Drafts
 * and voided invoices are not on the books. Money collected is what stayed:
 * reversed payments and refunds are taken off (paymentNet).
 */
export type Period = { from: string; to: string };

const DAY = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);
const inside = (iso: string, p: Period) => day(iso) >= p.from && day(iso) <= p.to;

export function previousOf(p: Period): Period {
  const span = Math.round((Date.parse(p.to) - Date.parse(p.from)) / DAY) + 1;
  const to = new Date(Date.parse(p.from) - DAY).toISOString().slice(0, 10);
  const from = new Date(Date.parse(to) - (span - 1) * DAY).toISOString().slice(0, 10);
  return { from, to };
}

export function totalsFor(p: Period) {
  const onBooks = getInvoices().filter((i) => i.status !== "Draft" && !i.voided);
  const invoiced = onBooks.filter((i) => inside(i.issued, p)).reduce((n, i) => n + invoiceTotals(i).total, 0);
  const collected = getPayments().filter((x) => inside(x.at, p)).reduce((n, x) => n + paymentNet(x), 0);
  const spent = getExpenses().filter((e) => inside(e.at, p)).reduce((n, e) => n + e.amount, 0);
  return {
    invoiced, collected, spent, net: collected - spent,
    newClients: getClients({ includeArchived: true }).filter((c) => inside(c.since, p)).length,
    projectsStarted: getProjects(true).filter((x) => x.events[0] && inside(x.events[0].at, p)).length,
  };
}
export type Totals = ReturnType<typeof totalsFor>;

/** Percent change, or null when there was nothing before to compare to. */
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

/** One row per calendar month the period touches. */
export function byMonth(p: Period) {
  const out: { month: string; label: string; invoiced: number; collected: number; spent: number; net: number }[] = [];
  const start = new Date(`${p.from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${p.to.slice(0, 7)}-01T00:00:00Z`);
  for (let d = start; d <= end && out.length < 36; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const key = d.toISOString().slice(0, 7);
    const sub: Period = { from: key === p.from.slice(0, 7) ? p.from : `${key}-01`, to: key === p.to.slice(0, 7) ? p.to : `${key}-31` };
    const t = totalsFor(sub);
    out.push({ month: key, label: d.toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }), invoiced: t.invoiced, collected: t.collected, spent: t.spent, net: t.net });
  }
  return out;
}

export function topClients(p: Period, limit = 8) {
  const byClient = new Map<string, number>();
  const inv = new Map(getInvoices().map((i) => [i.id, i]));
  for (const x of getPayments().filter((x) => inside(x.at, p))) {
    const c = inv.get(x.invoiceId)?.clientId;
    if (c) byClient.set(c, (byClient.get(c) ?? 0) + paymentNet(x));
  }
  return [...byClient.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([id, amount]) => ({ id, name: getClient(id)?.company ?? "Unknown", amount }));
}

export function byMethod(p: Period) {
  const m = new Map<string, number>();
  for (const x of getPayments().filter((x) => inside(x.at, p))) m.set(x.method, (m.get(x.method) ?? 0) + paymentNet(x));
  return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([method, amount]) => ({ method, amount }));
}

export function expensesByCategory(p: Period) {
  const m = new Map<string, number>();
  for (const e of getExpenses().filter((e) => inside(e.at, p))) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));
}

/** The URL's dates, held to real calendar days; the last 30 days when absent. */
export function readPeriod(sp: { from?: string; to?: string }): Period {
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : "");
  const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
  let to = ok(sp.to) || today;
  let from = ok(sp.from) || new Date(Date.parse(to) - 29 * DAY).toISOString().slice(0, 10);
  if (from > to) [from, to] = [to, from];
  return { from, to };
}
