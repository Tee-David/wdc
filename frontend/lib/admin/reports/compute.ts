import { getClient, getCreditsFor, getDeliverablesFor, getTicketMessages } from "../store";
import {
  estimateState, estimateTotals, invoiceStatus, invoiceTotals, paymentNet, refundedTotal, STAGES,
  type Client, type Invoice, type Project,
} from "../types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { DAY, type GroupKey, type Span } from "./filters";
import { daysBetween, day, inside, owners, type Scope } from "./scope";

/**
 * THE FIGURES, one function per question the reports page answers.
 *
 * Each takes the scoped books and a span of days and adds things up. They are
 * written to be read: where a figure rests on a rule ("what was paid", "what
 * counts as recurring") the rule is in the name or the comment, and the page
 * says it in a line under the figure. Amounts are kobo, in the report's one
 * currency.
 */
export type Row = { label: string; amount: number; n?: number; share?: number; sub?: string; href?: string };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const serviceName = (slug: string) => SERVICE_BY_SLUG.get(slug as never)?.short ?? slug;

/** A map of label to amount, as rows biggest first, each with its share of the whole. */
function rowsFrom(m: Map<string, { amount: number; n: number; href?: string; sub?: string }>, limit = 50): Row[] {
  const total = sum([...m.values()].map((v) => Math.max(0, v.amount)));
  return [...m.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, limit)
    .map(([label, v]) => ({ label, amount: v.amount, n: v.n, href: v.href, sub: v.sub, share: total > 0 ? Math.max(0, v.amount) / total : 0 }));
}
function bump(m: Map<string, { amount: number; n: number; href?: string; sub?: string }>, key: string, amount: number, extra: { href?: string; sub?: string } = {}) {
  const cur = m.get(key) ?? { amount: 0, n: 0, ...extra };
  cur.amount += amount; cur.n += 1; m.set(key, cur);
}
const clientName = (id: string) => getClient(id)?.company ?? "Unknown";
const serviceOf = (inv: Invoice, s: Scope) => {
  const p = inv.projectId ? s.projectById.get(inv.projectId) : null;
  if (p) return serviceName(p.service);
  const c = getClient(inv.clientId);
  return c?.services[0] ? serviceName(c.services[0]) : "No service";
};

/* ---------------------------------------------------------------- totals */

export function totals(s: Scope, span: Span) {
  const invoiced = sum(s.invoices.filter((i) => inside(i.issued, span)).map((i) => invoiceTotals(i).total));
  const inPeriod = s.payments.filter(({ p }) => inside(p.at, span));
  const collected = sum(inPeriod.map(({ p }) => paymentNet(p)));
  const received = sum(inPeriod.filter(({ p }) => !p.reversed).map(({ p }) => p.amount));
  const refunded = sum(s.payments.flatMap(({ p }) => (p.refunds ?? []).filter((r) => inside(r.at, span)).map((r) => r.amount)));
  const spent = sum(s.expenses.filter((e) => inside(e.at, span)).map((e) => e.amount));
  const issued = s.invoices.filter((i) => inside(i.issued, span));
  const paidOff = issued.filter((i) => invoiceTotals(i).due === 0 && invoiceTotals(i).total > 0);
  return {
    invoiced, collected, received, refunded, spent, net: collected - spent,
    invoiceCount: issued.length, paymentCount: inPeriod.length, paidCount: paidOff.length,
    avgInvoice: issued.length ? Math.round(invoiced / issued.length) : 0,
    /* Of what was invoiced in these days, how much has been kept so far. */
    collectionRate: invoiced > 0 ? sum(issued.map((i) => Math.min(i.paid, invoiceTotals(i).total))) / invoiced : null as number | null,
    newClients: [...s.clients.values()].filter((c) => inside(c.since, span)).length,
    projectsStarted: s.projects.filter((p) => p.events[0] && inside(p.events[0].at, span)).length,
  };
}
export type Totals = ReturnType<typeof totals>;

export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

/* ---------------------------------------------------------------- series */

function bucketKey(iso: string, g: GroupKey): string {
  const d = new Date(`${day(iso)}T00:00:00Z`);
  if (g === "day") return day(iso);
  if (g === "week") { const off = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - off * DAY).toISOString().slice(0, 10); }
  if (g === "month") return day(iso).slice(0, 7);
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}
function bucketLabel(key: string, g: GroupKey): string {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (g === "quarter") return key.replace("-", " ");
  if (g === "month") return `${M[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;
  const d = new Date(`${key}T00:00:00Z`);
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
}
function bucketKeys(span: Span, g: GroupKey): string[] {
  const out: string[] = [];
  for (let t = Date.parse(span.from); t <= Date.parse(span.to); t += DAY) {
    const k = bucketKey(new Date(t).toISOString(), g);
    if (out[out.length - 1] !== k && !out.includes(k)) out.push(k);
  }
  return out;
}

export type Point = { key: string; label: string; invoiced: number; collected: number; refunded: number; spent: number; net: number; cumulative: number; invoices: number; payments: number };
export function series(s: Scope, span: Span, g: GroupKey): Point[] {
  const keys = bucketKeys(span, g);
  const m = new Map<string, Point>(keys.map((k) => [k, { key: k, label: bucketLabel(k, g), invoiced: 0, collected: 0, refunded: 0, spent: 0, net: 0, cumulative: 0, invoices: 0, payments: 0 }]));
  for (const i of s.invoices) if (inside(i.issued, span)) { const p = m.get(bucketKey(i.issued, g)); if (p) { p.invoiced += invoiceTotals(i).total; p.invoices += 1; } }
  for (const { p: pay } of s.payments) {
    if (inside(pay.at, span)) { const p = m.get(bucketKey(pay.at, g)); if (p) { p.collected += paymentNet(pay); p.payments += 1; } }
    for (const r of pay.refunds ?? []) if (inside(r.at, span)) { const p = m.get(bucketKey(r.at, g)); if (p) p.refunded += r.amount; }
  }
  for (const e of s.expenses) if (inside(e.at, span)) { const p = m.get(bucketKey(e.at, g)); if (p) p.spent += e.amount; }
  let run = 0;
  return keys.map((k) => { const p = m.get(k)!; p.net = p.collected - p.spent; run += p.net; p.cumulative = run; return p; });
}

/* ------------------------------------------------------------ breakdowns */

export function collectedBy(s: Scope, span: Span, by: "method" | "service" | "client" | "department" | "month-of-issue") {
  const m = new Map<string, { amount: number; n: number; href?: string }>();
  for (const { p, inv } of s.payments) {
    if (!inside(p.at, span)) continue;
    const amt = paymentNet(p);
    if (by === "method") bump(m, p.method, amt);
    else if (by === "service") bump(m, serviceOf(inv, s), amt);
    else if (by === "client") bump(m, clientName(inv.clientId), amt, { href: `/admin/clients/${inv.clientId}` });
    else if (by === "department") {
      const ds = getClient(inv.clientId)?.departments ?? [];
      if (!ds.length) bump(m, "No department", amt); else for (const d of ds) bump(m, d, Math.round(amt / ds.length));
    } else bump(m, day(inv.issued).slice(0, 7), amt);
  }
  return rowsFrom(m);
}

export function spentBy(s: Scope, span: Span, by: "category" | "vendor" | "project" | "client" | "method") {
  const m = new Map<string, { amount: number; n: number; href?: string }>();
  for (const e of s.expenses) {
    if (!inside(e.at, span)) continue;
    const pr = e.projectId ? s.projectById.get(e.projectId) : null;
    if (by === "category") bump(m, e.category, e.amount);
    else if (by === "vendor") bump(m, e.vendor || "No vendor named", e.amount);
    else if (by === "project") bump(m, pr ? pr.title : "Overhead, no project", e.amount, pr ? { href: `/admin/projects/${pr.id}` } : {});
    else if (by === "client") { const cid = e.clientId ?? pr?.clientId; bump(m, cid ? clientName(cid) : "Overhead, no client", e.amount, cid ? { href: `/admin/clients/${cid}` } : {}); }
    else bump(m, e.method ?? "Not recorded", e.amount);
  }
  return rowsFrom(m);
}

/** Invoiced (what was billed, not what was kept) by service, so margin by service can be read beside it. */
export function invoicedBy(s: Scope, span: Span, by: "service" | "client") {
  const m = new Map<string, { amount: number; n: number; href?: string }>();
  for (const i of s.invoices) if (inside(i.issued, span)) {
    if (by === "service") bump(m, serviceOf(i, s), invoiceTotals(i).total);
    else bump(m, clientName(i.clientId), invoiceTotals(i).total, { href: `/admin/clients/${i.clientId}` });
  }
  return rowsFrom(m);
}

/** VAT written on invoices issued in the span, and the share of it whose invoice is paid. */
export function vat(s: Scope, span: Span) {
  const rows = s.invoices.filter((i) => inside(i.issued, span) && i.vatRate > 0);
  const charged = sum(rows.map((i) => invoiceTotals(i).vat));
  const onPaid = sum(rows.filter((i) => invoiceTotals(i).due === 0).map((i) => invoiceTotals(i).vat));
  return { charged, onPaid, outstanding: charged - onPaid, invoices: rows.length };
}

/* -------------------------------------------------- held, owed and owing */

/**
 * WHERE MONEY IS SITTING THAT IS NOT YET OURS TO SPEND, said as three rules.
 *  credit: balance clients have with us that nobody has spent.
 *  unearned: kept payments on projects that are not yet delivered.
 *  settling: card payments from the last two days, which the providers usually settle the next working day.
 * There is no provider balance feed, so the third is a rule on our own rows, not a bank figure.
 */
export function held(s: Scope) {
  const credit = sum([...s.clients.keys()].flatMap((id) => getCreditsFor(id).filter((c) => !c.applied && (c.currency ?? "NGN") === s.f.cur).map((c) => c.amount)));
  const unearned = sum(s.payments.filter(({ inv }) => { const p = inv.projectId ? s.projectById.get(inv.projectId) : null; return p && p.stage !== "Delivered"; }).map(({ p }) => paymentNet(p)));
  const twoDays = new Date(s.now.getTime() - 2 * DAY).toISOString();
  const settling = sum(s.payments.filter(({ p }) => (p.method === "Paystack" || p.method === "Flutterwave") && p.at >= twoDays).map(({ p }) => paymentNet(p)));
  return { credit, unearned, settling };
}

export function creditsHeld(s: Scope): Row[] {
  const out: Row[] = [];
  for (const id of s.clients.keys()) {
    const cs = getCreditsFor(id).filter((c) => !c.applied && (c.currency ?? "NGN") === s.f.cur);
    if (cs.length) out.push({ label: clientName(id), amount: sum(cs.map((c) => c.amount)), n: cs.length, href: `/admin/clients/${id}`, sub: cs[0]?.reason });
  }
  const total = sum(out.map((r) => r.amount));
  return out.sort((a, b) => b.amount - a.amount).map((r) => ({ ...r, share: total ? r.amount / total : 0 }));
}

export function refundsIn(s: Scope, span: Span) {
  return s.payments.flatMap(({ p, inv }) => (p.refunds ?? []).filter((r) => inside(r.at, span)).map((r) => ({
    at: r.at, client: clientName(inv.clientId), invoice: inv.number, amount: r.amount, toCredit: r.toCredit, reason: r.reason, by: r.by,
  }))).sort((a, b) => b.at.localeCompare(a.at));
}
export function reversalsIn(s: Scope, span: Span) {
  return s.payments.filter(({ p }) => p.reversed && inside(p.reversed.at, span)).map(({ p, inv }) => ({
    at: p.reversed!.at, client: clientName(inv.clientId), invoice: inv.number, amount: p.amount, reason: p.reversed!.reason, by: p.reversed!.by,
  })).sort((a, b) => b.at.localeCompare(a.at));
}

/* ------------------------------------------------------------ receivables */

export type OpenInvoice = { id: string; number: string; client: string; clientId: string; issued: string; due: string; late: number; total: number; due$: number; status: string; service: string };
export const AGE_BUCKETS = ["Not due yet", "1 to 30 days late", "31 to 60 days late", "61 to 90 days late", "Over 90 days late"] as const;

export function receivables(s: Scope) {
  const open: OpenInvoice[] = s.invoices.flatMap((i) => {
    const t = invoiceTotals(i);
    if (t.due <= 0) return [];
    return [{ id: i.id, number: i.number, client: clientName(i.clientId), clientId: i.clientId, issued: i.issued, due: i.due, late: Math.max(0, daysBetween(i.due, s.today)), total: t.total, due$: t.due, status: invoiceStatus(i, s.now), service: serviceOf(i, s) }];
  }).sort((a, b) => b.late - a.late || b.due$ - a.due$);
  const idx = (late: number) => (late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4);
  const buckets = AGE_BUCKETS.map((label) => ({ label, amount: 0, n: 0 }));
  for (const o of open) { const b = buckets[idx(o.late)]; b.amount += o.due$; b.n += 1; }
  const total = sum(open.map((o) => o.due$));
  const overdue = sum(open.filter((o) => o.late > 0).map((o) => o.due$));
  const byClient = new Map<string, { amount: number; n: number; href?: string; sub?: string }>();
  for (const o of open) bump(byClient, o.client, o.due$, { href: `/admin/clients/${o.clientId}` });
  const oldest = new Map<string, number>();
  for (const o of open) oldest.set(o.client, Math.max(oldest.get(o.client) ?? 0, o.late));
  const clients = rowsFrom(byClient).map((r) => ({ ...r, sub: (oldest.get(r.label) ?? 0) > 0 ? `Oldest ${oldest.get(r.label)} days late` : "Nothing late" }));
  return { open, buckets, total, overdue, clients, byService: rowsFrom(open.reduce((m, o) => { bump(m, o.service, o.due$); return m; }, new Map<string, { amount: number; n: number }>())) };
}

/** Days from issue to the last payment on invoices that are now fully paid, for those issued in the span. */
export function payDays(s: Scope, span: Span) {
  const days: number[] = [];
  for (const i of s.invoices) {
    if (!inside(i.issued, span) || invoiceTotals(i).due > 0) continue;
    const last = s.payments.filter(({ p }) => p.invoiceId === i.id && !p.reversed).map(({ p }) => p.at).sort().pop();
    if (last) days.push(Math.max(0, daysBetween(i.issued, last)));
  }
  const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : null;
  const bins = [["Within a week", 0, 7], ["8 to 14 days", 8, 14], ["15 to 30 days", 15, 30], ["Over 30 days", 31, 9999]] as const;
  return { avg, n: days.length, bins: bins.map(([label, a, b]) => ({ label, n: days.filter((d) => d >= a && d <= b).length })) };
}

/** Late payers: clients whose paid invoices in the span were kept longest past the due date. */
export function latePayers(s: Scope, span: Span): Row[] {
  const m = new Map<string, { sum: number; n: number; href: string }>();
  for (const i of s.invoices) {
    if (!inside(i.issued, span) || invoiceTotals(i).due > 0) continue;
    const last = s.payments.filter(({ p }) => p.invoiceId === i.id && !p.reversed).map(({ p }) => p.at).sort().pop();
    if (!last) continue;
    const late = daysBetween(i.due, last);
    const c = clientName(i.clientId);
    const cur = m.get(c) ?? { sum: 0, n: 0, href: `/admin/clients/${i.clientId}` };
    cur.sum += late; cur.n += 1; m.set(c, cur);
  }
  return [...m.entries()].map(([label, v]) => ({ label, amount: Math.round(v.sum / v.n), n: v.n, href: v.href })).sort((a, b) => b.amount - a.amount);
}

/* ------------------------------------------------------------------ sales */

export function sales(s: Scope, span: Span) {
  const inSpan = s.estimates.filter((e) => e.state !== "Draft" && inside(e.issued, span));
  const state = (e: (typeof inSpan)[number]) => estimateState(e, s.now);
  const val = (xs: typeof inSpan) => sum(xs.map((e) => estimateTotals(e).total));
  const sent = inSpan, accepted = inSpan.filter((e) => state(e) === "Accepted"), declined = inSpan.filter((e) => state(e) === "Declined");
  const expired = inSpan.filter((e) => state(e) === "Expired"), waiting = inSpan.filter((e) => state(e) === "Sent");
  const answered = accepted.length + declined.length;
  const answerDays = [...accepted, ...declined].filter((e) => e.answered).map((e) => Math.max(0, daysBetween(e.issued, e.answered!.at)));
  const bySvc = new Map<string, { amount: number; n: number }>();
  for (const e of accepted) bump(bySvc, e.projectId && s.projectById.get(e.projectId) ? serviceName(s.projectById.get(e.projectId)!.service) : "No project yet", estimateTotals(e).total);
  const subs = s.submissions.filter((x) => x.status === "Submitted" && inside(x.submittedAt, span));
  const subSvc = new Map<string, { amount: number; n: number }>();
  for (const x of subs) bump(subSvc, serviceName(x.service), 1);
  return {
    sent: { n: sent.length, value: val(sent) }, accepted: { n: accepted.length, value: val(accepted) }, declined: { n: declined.length, value: val(declined) },
    expired: { n: expired.length, value: val(expired) }, waiting: { n: waiting.length, value: val(waiting) },
    winRate: answered ? accepted.length / answered : null as number | null,
    avgValue: sent.length ? Math.round(val(sent) / sent.length) : 0,
    avgAnswerDays: answerDays.length ? answerDays.reduce((a, b) => a + b, 0) / answerDays.length : null as number | null,
    wonByService: rowsFrom(bySvc),
    enquiries: { n: subs.length, withClient: subs.filter((x) => x.clientId).length, byService: [...subSvc.entries()].map(([label, v]) => ({ label, amount: v.n })).sort((a, b) => b.amount - a.amount), inProgress: s.submissions.filter((x) => x.status === "In progress").length },
    list: inSpan.map((e) => ({ number: e.number, client: clientName(e.clientId), clientId: e.clientId, issued: e.issued, state: state(e), total: estimateTotals(e).total, days: e.answered ? Math.max(0, daysBetween(e.issued, e.answered.at)) : null as number | null })).sort((a, b) => b.issued.localeCompare(a.issued)),
  };
}

/* -------------------------------------------------------------- recurring */

/**
 * WHAT COUNTS AS RECURRING: an invoice with a line that says retainer, monthly, per month, care plan or subscription,
 * or any invoice to a client the studio has tagged "retainer". There is no billing-plan record to read, so the rule is
 * stated on the page and the list of invoices it picked is one click away.
 */
const RECUR = /retainer|monthly|per month|care plan|subscription|a month/i;
export const isRecurring = (i: Invoice, c: Client | undefined) => i.lines.some((l) => RECUR.test(l.description)) || (c?.tags ?? []).includes("retainer");

export function recurring(s: Scope, months = 6) {
  const end = new Date(`${s.today.slice(0, 7)}-01T00:00:00Z`);
  const keys: string[] = [];
  for (let k = months - 1; k >= 0; k--) keys.push(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - k, 1)).toISOString().slice(0, 7));
  const rec = s.invoices.filter((i) => isRecurring(i, s.clients.get(i.clientId)));
  const byMonth = keys.map((k) => {
    const rows = rec.filter((i) => day(i.issued).slice(0, 7) === k);
    return { key: k, label: bucketLabel(k, "month"), amount: sum(rows.map((i) => invoiceTotals(i).total)), n: rows.length, clients: new Set(rows.map((i) => i.clientId)) };
  });
  const cur = byMonth[byMonth.length - 1], prev = byMonth[byMonth.length - 2], before = byMonth[byMonth.length - 3];
  /* The last month that has a full set of invoices is the one to quote as MRR: the current month is still being billed. */
  const base = cur && cur.amount >= (prev?.amount ?? 0) ? cur : prev ?? cur;
  const lost = before && prev ? [...before.clients].filter((c) => !prev.clients.has(c)) : [];
  const gained = prev && before ? [...prev.clients].filter((c) => !before.clients.has(c)) : [];
  const perClient = new Map<string, { amount: number; n: number; href?: string }>();
  for (const i of rec.filter((i) => day(i.issued).slice(0, 7) === (base?.key ?? ""))) bump(perClient, clientName(i.clientId), invoiceTotals(i).total, { href: `/admin/clients/${i.clientId}` });
  const next3 = base ? [1, 2, 3].map((n) => ({ label: bucketLabel(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + n, 1)).toISOString().slice(0, 7), "month"), amount: base.amount })) : [];
  return {
    mrr: base?.amount ?? 0, mrrMonth: base?.label ?? "", activeClients: base?.clients.size ?? 0, arr: (base?.amount ?? 0) * 12,
    series: byMonth.map((m) => ({ key: m.key, label: m.label, amount: m.amount, n: m.n, clients: m.clients.size })),
    lost: lost.map((id) => clientName(id)), gained: gained.map((id) => clientName(id)), perClient: rowsFrom(perClient), next3,
    invoices: rec.length,
  };
}

/* ------------------------------------------------------------------- work */

const delivered = (p: Project) => p.stage === "Delivered";
const deliveredAt = (p: Project) => [...p.events].reverse().find((e) => /deliver/i.test(e.text))?.at ?? null;

export function work(s: Scope, span: Span) {
  const live = s.projects.filter((p) => !delivered(p) && !p.archived);
  const byStage = STAGES.map((st) => ({ label: st as string, amount: s.projects.filter((p) => p.stage === st && !p.archived).length }));
  const byHealth = ["On track", "At risk", "Waiting on client", "Blocked"].map((h) => ({ label: h, amount: live.filter((p) => p.health === h).length }));
  const byService = new Map<string, { amount: number; n: number }>();
  for (const p of live) bump(byService, serviceName(p.service), 1);
  const done = s.projects.filter((p) => delivered(p) && deliveredAt(p) && inside(deliveredAt(p), span));
  const onTime = done.filter((p) => !p.due || day(deliveredAt(p)!) <= day(p.due));
  const overdue = live.filter((p) => p.due && day(p.due) < s.today);
  const tasksOpen = s.tasks.filter((t) => !t.done);
  const taskOverdue = tasksOpen.filter((t) => t.due && day(t.due) < s.today);
  const tasksDone = s.tasks.filter((t) => t.done && inside(t.doneAt, span));
  const tk = s.tickets.filter((t) => inside(t.createdAt, span));
  const firstReply: number[] = [];
  for (const t of tk) { const m = getTicketMessages(t.id).find((x) => x.from === "studio"); if (m) firstReply.push((Date.parse(m.at) - Date.parse(t.createdAt)) / 3_600_000); }
  const awaiting = s.projects.flatMap((p) => getDeliverablesFor(p.id).filter((d) => d.approval === "Awaiting client").map((d) => ({ project: p.title, id: p.id, name: d.name })));
  return {
    live: live.length, delivered: done.length, onTimeRate: done.length ? onTime.length / done.length : null as number | null,
    overdue: overdue.map((p) => ({ id: p.id, title: p.title, client: clientName(p.clientId), due: p.due!, days: daysBetween(p.due!, s.today), owner: p.owner, stage: p.stage })).sort((a, b) => b.days - a.days),
    byStage, byHealth, byService: rowsFrom(byService),
    avgAgeDays: live.length ? Math.round(sum(live.map((p) => daysBetween(p.events[0]?.at ?? s.today, s.today))) / live.length) : 0,
    tasks: { open: tasksOpen.length, overdue: taskOverdue.length, done: tasksDone.length, rate: tasksDone.length + tasksOpen.length ? tasksDone.length / (tasksDone.length + tasksOpen.length) : null as number | null },
    tickets: { opened: tk.length, open: s.tickets.filter((t) => t.status !== "Closed").length, firstReplyHours: firstReply.length ? firstReply.reduce((a, b) => a + b, 0) / firstReply.length : null as number | null, closed: tk.filter((t) => t.status === "Closed").length },
    awaiting,
    deliveredList: done.map((p) => ({ id: p.id, title: p.title, client: clientName(p.clientId), at: deliveredAt(p)!, due: p.due, onTime: !p.due || day(deliveredAt(p)!) <= day(p.due) })),
  };
}

/* ------------------------------------------------------------------- team */

export type StaffRow = { name: string; live: number; delivered: number; tasksOpen: number; tasksDone: number; tasksOverdue: number; completion: number | null; replies: number; collected: number };
export function team(s: Scope, span: Span): StaffRow[] {
  const names = new Set<string>();
  s.projects.forEach((p) => owners(p).forEach((o) => names.add(o)));
  s.tasks.forEach((t) => t.assignee && names.add(t.assignee));
  const rows: StaffRow[] = [];
  const msgs = s.tickets.flatMap((t) => getTicketMessages(t.id).filter((m) => m.from === "studio" && inside(m.at, span)));
  for (const name of names) {
    const mine = s.projects.filter((p) => owners(p).includes(name));
    const t = s.tasks.filter((x) => x.assignee === name);
    const open = t.filter((x) => !x.done), done = t.filter((x) => x.done && inside(x.doneAt, span));
    /* Money on the projects somebody leads, split between the people who lead each one. */
    const collected = sum(s.payments.filter(({ p, inv }) => inside(p.at, span) && inv.projectId && mine.some((m) => m.id === inv.projectId)).map(({ p, inv }) => Math.round(paymentNet(p) / Math.max(1, owners(s.projectById.get(inv.projectId!)!).length))));
    rows.push({
      name, live: mine.filter((p) => !delivered(p) && !p.archived).length, delivered: mine.filter((p) => delivered(p) && deliveredAt(p) && inside(deliveredAt(p), span)).length,
      tasksOpen: open.length, tasksDone: done.length, tasksOverdue: open.filter((x) => x.due && day(x.due) < s.today).length,
      completion: open.length + done.length ? done.length / (open.length + done.length) : null, replies: msgs.filter((m) => m.author === name).length, collected,
    });
  }
  return rows.sort((a, b) => b.collected - a.collected || b.tasksDone - a.tasksDone);
}

export type DeptRow = { id: string; name: string; people: number; clients: number; projects: number; tasksOpen: number; collected: number; spent: number };
export function departments(s: Scope, span: Span, list: { id: string; name: string; members: { id: string; name: string; active: boolean }[] }[]): DeptRow[] {
  return list.map((d) => {
    const cs = [...s.clients.values()].filter((c) => (c.departments ?? []).includes(d.id));
    const ids = new Set(cs.map((c) => c.id));
    const projects = s.projects.filter((p) => ids.has(p.clientId) && !delivered(p) && !p.archived);
    const share = (c: string) => 1 / Math.max(1, (getClient(c)?.departments ?? []).length);
    return {
      id: d.id, name: d.name, people: d.members.filter((m) => m.active).length, clients: cs.length, projects: projects.length,
      tasksOpen: s.tasks.filter((t) => !t.done && projects.some((p) => p.id === t.projectId)).length,
      collected: Math.round(sum(s.payments.filter(({ p, inv }) => inside(p.at, span) && ids.has(inv.clientId)).map(({ p, inv }) => paymentNet(p) * share(inv.clientId)))),
      spent: Math.round(sum(s.expenses.filter((e) => inside(e.at, span) && (e.clientId ?? (e.projectId ? s.projectById.get(e.projectId)?.clientId : undefined)) && ids.has((e.clientId ?? s.projectById.get(e.projectId!)?.clientId)!)).map((e) => e.amount * share((e.clientId ?? s.projectById.get(e.projectId!)?.clientId)!)))),
    };
  });
}

/* ---------------------------------------------------------------- clients */

export type ClientRow = { id: string; name: string; collected: number; invoiced: number; outstanding: number; projects: number; credit: number; lifetime: number; last: string | null; since: string };
export function clientRows(s: Scope, span: Span): ClientRow[] {
  return [...s.clients.values()].map((c) => {
    const inv = s.invoices.filter((i) => i.clientId === c.id);
    const pays = s.payments.filter(({ inv: i }) => i.clientId === c.id);
    const last = pays.map(({ p }) => p.at).sort().pop() ?? null;
    return {
      id: c.id, name: c.company, since: c.since, last,
      collected: sum(pays.filter(({ p }) => inside(p.at, span)).map(({ p }) => paymentNet(p))),
      invoiced: sum(inv.filter((i) => inside(i.issued, span)).map((i) => invoiceTotals(i).total)),
      outstanding: sum(inv.map((i) => invoiceTotals(i).due)),
      lifetime: sum(pays.map(({ p }) => paymentNet(p))),
      projects: s.projects.filter((p) => p.clientId === c.id && !delivered(p) && !p.archived).length,
      credit: sum(getCreditsFor(c.id).filter((x) => !x.applied && (x.currency ?? "NGN") === s.f.cur).map((x) => x.amount)),
    };
  });
}

export function clientInsights(s: Scope, span: Span) {
  const rows = clientRows(s, span);
  const paying = rows.filter((r) => r.collected > 0).sort((a, b) => b.collected - a.collected);
  const total = sum(paying.map((r) => r.collected));
  const top3 = sum(paying.slice(0, 3).map((r) => r.collected));
  const inactive = rows.filter((r) => !r.last || daysBetween(r.last, s.today) > 90 || false).filter((r) => r.projects === 0);
  const withInvoice = new Set(s.invoices.filter((i) => inside(i.issued, span)).map((i) => i.clientId));
  const fresh = [...withInvoice].filter((id) => s.clients.get(id) && inside(s.clients.get(id)!.since, span)).length;
  const bySector = new Map<string, { amount: number; n: number }>();
  for (const r of rows) bump(bySector, s.clients.get(r.id)?.sector || "Not set", r.collected);
  const byService = new Map<string, { amount: number; n: number }>();
  for (const c of s.clients.values()) for (const sv of c.services) bump(byService, serviceName(sv), 1);
  return {
    rows, paying, active: rows.length, newClients: [...s.clients.values()].filter((c) => inside(c.since, span)).length, billedNew: fresh, billedReturning: withInvoice.size - fresh,
    concentration: total ? top3 / total : null as number | null, inactive, bySector: rowsFrom(bySector), byService: rowsFrom(byService),
    avgLifetime: rows.length ? Math.round(sum(rows.map((r) => r.lifetime)) / rows.length) : 0,
  };
}

/* ------------------------------------------------------------------ quick */

export function compare(now: number, before: number | null, goodWhenUp = true) {
  if (before == null) return null;
  const c = change(now, before);
  if (c === null) return { label: "New", tone: "live" as const };
  if (c === 0) return { label: "No change", tone: "flat" as const };
  return { label: `${c > 0 ? "+" : ""}${c}%`, tone: (c > 0) === goodWhenUp ? ("good" as const) : ("bad" as const) };
}

export { refundedTotal };
