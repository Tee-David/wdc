import Link from "next/link";
import {
  Banknote, CalendarClock, CircleDollarSign, Clock, FileText, Handshake, Hourglass, Landmark, Percent, PiggyBank,
  Receipt, Repeat, ShieldCheck, TrendingUp, UserPlus, Users, Wallet, Zap,
} from "lucide-react";
import { Panel, Tile, when } from "@/components/admin/bits";
import {
  clientInsights, collectedBy, compare, creditsHeld, departments, held, invoicedBy, latePayers, payDays, receivables,
  recurring, refundsIn, reversalsIn, sales, series, spentBy, team, totals, vat, work,
} from "@/lib/admin/reports/compute";
import { REPORTS } from "@/lib/admin/reports/datasets";
import { filterQuery, type Filters, type Span } from "@/lib/admin/reports/filters";
import type { Scope } from "@/lib/admin/reports/scope";
import type { Department } from "@/lib/departments";
import { Columns, FlowChart, Funnel, HList } from "./charts";
import { days, full, hours, percent, short } from "./fmt";
import { RTable } from "./table";

type Raw = Record<string, string | string[] | undefined>;
export type Ctx = { s: Scope; f: Filters; span: Span; prev: Span | null; depts: Department[] | null; sp: Raw };

const Note = ({ children }: { children: React.ReactNode }) => <p className="rp__note">{children}</p>;
const Split = ({ children }: { children: React.ReactNode }) => <div className="rp__split">{children}</div>;

function Rail({ f, children, quick = true }: { f: Filters; children?: React.ReactNode; quick?: boolean }) {
  const q = filterQuery(f);
  const link = (r: string, fmt: string) => `/admin/reports/export?${q ? `${q}&` : ""}report=${r}&format=${fmt}`;
  return (
    <aside className="adFlow__rail" aria-label="Report notes and files">
      {children}
      {quick ? (
        <Panel title="Quick generate" dataTour="reports-quick">
          <ul className="rp__quick">
            {REPORTS.map(([k, label, hint]) => (
              <li key={k}>
                <span><b>{label}</b><small>{hint}</small></span>
                <span className="rp__quickActs"><a className="ad__btn" href={link(k, "csv")} aria-label={`${label} as CSV`}>CSV</a><a className="ad__btn" href={link(k, "xlsx")} aria-label={`${label} as Excel`}>Excel</a></span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </aside>
  );
}

const Kpis = ({ children }: { children: React.ReactNode }) => <dl className="rp__kpis" data-tour="reports-tiles">{children}</dl>;
const cmpNote = (prev: Span | null, text: string) => (prev ? `${text} before` : "");

/* ---------------------------------------------------------------- overview */

export function Overview({ s, f, span, prev, sp }: Ctx) {
  const t = totals(s, span), p = prev ? totals(s, prev) : null, r = receivables(s), h = held(s), pd = payDays(s, span), sl = sales(s, span), rc = recurring(s), w = work(s, span);
  const pts = series(s, span, f.group);
  const cur = f.cur;
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Money in" value={short(t.collected, cur)} icon={Wallet} iconTone="good" badge={compare(t.collected, p?.collected ?? null) ?? undefined} note={p ? cmpNote(prev, short(p.collected, cur)) : "Kept after refunds"} />
          <Tile label="Money out" value={short(t.spent, cur)} icon={Banknote} iconTone="warn" badge={compare(t.spent, p?.spent ?? null, false) ?? undefined} note={p ? cmpNote(prev, short(p.spent, cur)) : "Expenses recorded"} />
          <Tile label="Net" value={short(t.net, cur)} tone={t.net >= 0 ? "good" : "bad"} icon={TrendingUp} iconTone={t.net >= 0 ? "good" : "bad"} badge={compare(t.net, p?.net ?? null) ?? undefined} note="Money in less money out" />
          <Tile label="Invoiced" value={short(t.invoiced, cur)} icon={FileText} badge={compare(t.invoiced, p?.invoiced ?? null) ?? undefined} note={`${t.invoiceCount} invoice${t.invoiceCount === 1 ? "" : "s"} issued`} />
          <Tile label="Owed to us" value={short(r.total, cur)} icon={Hourglass} iconTone="warn" note={r.overdue ? `${short(r.overdue, cur)} is late` : "Nothing is late"} href="/admin/money?tab=invoices" />
          <Tile label="Held for clients" value={short(h.credit + h.unearned, cur)} icon={PiggyBank} iconTone="neutral" note="Credit and work not yet delivered" />
          <Tile label="Collection rate" value={percent(t.collectionRate)} icon={Percent} iconTone="good" badge={compare(Math.round((t.collectionRate ?? 0) * 100), p?.collectionRate != null ? Math.round(p.collectionRate * 100) : null) ?? undefined} note="Of what was invoiced, kept so far" />
          <Tile label="Days to pay" value={days(pd.avg)} icon={Clock} iconTone="neutral" note={`${pd.n} paid invoice${pd.n === 1 ? "" : "s"}`} />
          <Tile label="Quote win rate" value={percent(sl.winRate)} icon={Handshake} iconTone="live" note={`${sl.accepted.n} won, ${sl.declined.n} declined`} />
          <Tile label="Monthly recurring" value={short(rc.mrr, cur)} icon={Repeat} iconTone="brand" note={rc.mrrMonth ? `${rc.activeClients} client${rc.activeClients === 1 ? "" : "s"}, ${rc.mrrMonth}` : "No retainers found"} />
          <Tile label="New clients" value={String(t.newClients)} icon={UserPlus} iconTone="live" badge={compare(t.newClients, p?.newClients ?? null) ?? undefined} note={`${t.projectsStarted} project${t.projectsStarted === 1 ? "" : "s"} started`} />
          <Tile label="On time" value={percent(w.onTimeRate)} icon={CalendarClock} iconTone="good" note={`${w.delivered} delivered, ${w.overdue.length} overdue now`} />
        </Kpis>
        <Panel title="Money in and out" dataTour="reports-flow" action={<span className="rp__sub">By {f.group}</span>}>
          {pts.some((x) => x.collected || x.spent) ? <FlowChart points={pts} cur={cur} /> : <p className="rp__empty">Nothing was collected or spent in these days. Widen the dates or take a filter off.</p>}
        </Panel>
        <Split>
          <Panel title="Where money came from"><HList rows={collectedBy(s, span, "method")} cur={cur} empty="No payments in these days." count={6} noun="payment" /></Panel>
          <Panel title="Where money went"><HList rows={spentBy(s, span, "category")} cur={cur} empty="No expenses in these days." count={6} noun="expense" /></Panel>
        </Split>
        <Split>
          <Panel title="Who owes us, by age"><Columns tone="age" items={r.buckets.map((b) => ({ label: b.label.replace(" days late", "").replace("Not due yet", "Not due"), value: b.amount }))} cur={cur} /></Panel>
          <Panel title="Top clients"><HList rows={collectedBy(s, span, "client")} cur={cur} empty="No payments in these days." count={6} /></Panel>
        </Split>
        <Panel title="Month by month">
          <RTable id="flow" sp={sp} f={f} empty="No periods in this range." total={pts.length} noun="period" num={[1, 2, 3, 4, 5]}
            head={["Period", "Invoiced", "Collected", "Spent", "Net", "Running net"]}
            rows={pts.map((x) => [<b key="l">{x.label}</b>, full(x.invoiced, cur), full(x.collected, cur), full(x.spent, cur), full(x.net, cur), full(x.cumulative, cur)])} />
        </Panel>
      </div>
      <Rail f={f}>
        <Panel title="How this is counted">
          <ul className="rp__rules">
            <li><b>Money in</b> is what was paid in these days, less refunds and payments reversed.</li>
            <li><b>Money out</b> is expenses by the date they were recorded.</li>
            <li><b>Owed to us</b> is every open invoice as of today, whatever the dates above say.</li>
            <li><b>Held</b> is client credit plus payments kept for projects not yet delivered.</li>
            {s.otherCurrencies.length ? <li><b>Other currencies</b> ({s.otherCurrencies.join(", ")}) are not in these figures. Pick one in Filters.</li> : null}
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------------- money */

export function Money({ s, f, span, prev, sp }: Ctx) {
  const t = totals(s, span), p = prev ? totals(s, prev) : null, cur = f.cur, pts = series(s, span, f.group), v = vat(s, span), h = held(s);
  const refunds = refundsIn(s, span), rev = reversalsIn(s, span);
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Invoiced" value={short(t.invoiced, cur)} icon={FileText} badge={compare(t.invoiced, p?.invoiced ?? null) ?? undefined} note={`Average ${short(t.avgInvoice, cur)}`} />
          <Tile label="Received" value={short(t.received, cur)} icon={Wallet} iconTone="good" note={`${t.paymentCount} payment${t.paymentCount === 1 ? "" : "s"}, before refunds`} />
          <Tile label="Refunded" value={short(t.refunded, cur)} icon={Receipt} iconTone="warn" badge={compare(t.refunded, p?.refunded ?? null, false) ?? undefined} note={`${refunds.length} refund${refunds.length === 1 ? "" : "s"}`} />
          <Tile label="Spent" value={short(t.spent, cur)} icon={Banknote} iconTone="warn" badge={compare(t.spent, p?.spent ?? null, false) ?? undefined} note="Expenses recorded" />
        </Kpis>
        <Panel title="Money in and out" action={<span className="rp__sub">By {f.group}</span>}>
          {pts.some((x) => x.collected || x.spent) ? <FlowChart points={pts} cur={cur} /> : <p className="rp__empty">Nothing was collected or spent in these days.</p>}
        </Panel>
        <Split>
          <Panel title="Collected by method"><HList rows={collectedBy(s, span, "method")} cur={cur} empty="No payments in these days." noun="payment" /></Panel>
          <Panel title="Collected by service"><HList rows={collectedBy(s, span, "service")} cur={cur} empty="No payments in these days." noun="payment" /></Panel>
        </Split>
        <Split>
          <Panel title="Invoiced by service"><HList rows={invoicedBy(s, span, "service")} cur={cur} empty="Nothing invoiced in these days." noun="invoice" /></Panel>
          <Panel title="Collected by department"><HList rows={collectedBy(s, span, "department")} cur={cur} empty="No payments in these days." noun="payment" /></Panel>
        </Split>
        <Split>
          <Panel title="Spent by category"><HList rows={spentBy(s, span, "category")} cur={cur} empty="No expenses in these days." noun="expense" /></Panel>
          <Panel title="Spent by vendor"><HList rows={spentBy(s, span, "vendor")} cur={cur} empty="No expenses in these days." noun="expense" count={8} /></Panel>
        </Split>
        <Split>
          <Panel title="Spent by project"><HList rows={spentBy(s, span, "project")} cur={cur} empty="No expenses in these days." noun="expense" count={8} /></Panel>
          <Panel title="Spent by how it left"><HList rows={spentBy(s, span, "method")} cur={cur} empty="No expenses in these days." noun="expense" /></Panel>
        </Split>
        <Panel title="Refunds">
          <RTable id="refunds" sp={sp} f={f} empty="No refunds in these days." total={refunds.length} noun="refund" num={[3]}
            head={["Date", "Client", "Invoice", "Amount", "Went to", "Reason"]}
            rows={refunds.map((r) => [when(r.at), r.client, r.invoice, full(r.amount, cur), r.toCredit ? "Client credit" : "Back to the client", r.reason])} />
        </Panel>
        <Panel title="Payments reversed">
          <RTable id="reversed" sp={sp} f={f} empty="No payments were reversed in these days." total={rev.length} noun="payment" num={[3]}
            head={["Date", "Client", "Invoice", "Amount", "Reason", "By"]}
            rows={rev.map((r) => [when(r.at), r.client, r.invoice, full(r.amount, cur), r.reason, r.by])} />
        </Panel>
      </div>
      <Rail f={f}>
        <Panel title="Where money is held">
          <ul className="rp__held">
            <li><span><b>Client credit</b><small>On account, not yet spent</small></span><b className="ad__num">{full(h.credit, cur)}</b></li>
            <li><span><b>Kept for work in progress</b><small>Paid on projects not yet delivered</small></span><b className="ad__num">{full(h.unearned, cur)}</b></li>
            <li><span><b>Card payments settling</b><small>Paystack and Flutterwave, last two days</small></span><b className="ad__num">{full(h.settling, cur)}</b></li>
          </ul>
        </Panel>
        <Panel title="VAT on invoices issued">
          <ul className="rp__held">
            <li><span><b>Written</b><small>{v.invoices} invoice{v.invoices === 1 ? "" : "s"} with VAT</small></span><b className="ad__num">{full(v.charged, cur)}</b></li>
            <li><span><b>On paid invoices</b></span><b className="ad__num">{full(v.onPaid, cur)}</b></li>
            <li><span><b>On open invoices</b></span><b className="ad__num">{full(v.outstanding, cur)}</b></li>
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------- receivables */

export function Receivables({ s, f, span, sp }: Ctx) {
  const r = receivables(s), pd = payDays(s, span), cur = f.cur, late = latePayers(s, span), t = totals(s, span);
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Owed to us" value={short(r.total, cur)} icon={Hourglass} iconTone="warn" note={`${r.open.length} open invoice${r.open.length === 1 ? "" : "s"}`} />
          <Tile label="Late" value={short(r.overdue, cur)} tone={r.overdue ? "bad" : "good"} icon={Clock} iconTone={r.overdue ? "bad" : "good"} note={r.total ? `${Math.round((r.overdue / r.total) * 100)}% of what is owed` : "Nothing is owed"} />
          <Tile label="Days to pay" value={days(pd.avg)} icon={CalendarClock} iconTone="neutral" note={`From issue to the last payment, ${pd.n} invoice${pd.n === 1 ? "" : "s"}`} />
          <Tile label="Collection rate" value={percent(t.collectionRate)} icon={Percent} iconTone="good" note="Of what was invoiced in these days" />
        </Kpis>
        <Panel title="How late it is"><Columns tone="age" items={r.buckets.map((b) => ({ label: b.label.replace(" days late", ""), value: b.amount, sub: `${b.n} invoice${b.n === 1 ? "" : "s"}` }))} cur={cur} /></Panel>
        <Split>
          <Panel title="Owed by client"><HList rows={r.clients} cur={cur} empty="Nobody owes anything." noun="invoice" count={8} /></Panel>
          <Panel title="Owed by service"><HList rows={r.byService} cur={cur} empty="Nothing is owed." noun="invoice" /></Panel>
        </Split>
        <Panel title="How long people take to pay">
          <Columns items={pd.bins.map((b) => ({ label: b.label, value: b.n }))} cur={cur} unit="count" />
          <Note>Invoices issued in these days that are now paid in full, counted from the issue date to the last payment.</Note>
        </Panel>
        <Panel title="Open invoices" dataTour="reports-open">
          <RTable id="open" sp={sp} f={f} empty="No open invoices match these filters." total={r.open.length} noun="invoice" num={[5, 6, 7]}
            head={["Invoice", "Client", "Issued", "Due", "Days late", "Total", "Owed", "Status"]}
            rows={r.open.map((o) => [<Link key="n" href={`/admin/money/${o.id}`}><b>{o.number}</b></Link>, <Link key="c" href={`/admin/clients/${o.clientId}`}>{o.client}</Link>, when(o.issued), when(o.due), o.late ? `${o.late}` : "–", full(o.total, cur), full(o.due$, cur), o.status])} />
        </Panel>
        <Panel title="Slowest to pay, by client">
          <HList rows={late} cur={cur} unit="days" empty="No invoices from these days have been paid yet." noun="invoice" count={8} />
          <Note>Average days past the due date when paid. Negative means early.</Note>
        </Panel>
      </div>
      <Rail f={f}>
        <Panel title="How this is counted">
          <ul className="rp__rules">
            <li>The ageing is as of today. It does not change with the dates above.</li>
            <li>An invoice is late the day after its due date.</li>
            <li>Drafts and voided invoices are never owed.</li>
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------------ owing */

export function Owing({ s, f, span, sp }: Ctx) {
  const cur = f.cur, h = held(s), credits = creditsHeld(s), refunds = refundsIn(s, span);
  const projects = s.projects.filter((p) => p.stage !== "Delivered" && !p.archived);
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Credit we hold" value={short(h.credit, cur)} icon={PiggyBank} iconTone="neutral" note={`${credits.length} client${credits.length === 1 ? "" : "s"}, taken off their next invoice`} />
          <Tile label="Kept for work in progress" value={short(h.unearned, cur)} icon={Landmark} iconTone="brand" note={`${projects.length} live project${projects.length === 1 ? "" : "s"}`} />
          <Tile label="Refunded in these days" value={short(refunds.reduce((n, r) => n + r.amount, 0), cur)} icon={Receipt} iconTone="warn" note={`${refunds.length} refund${refunds.length === 1 ? "" : "s"}`} />
          <Tile label="Card payments settling" value={short(h.settling, cur)} icon={Zap} iconTone="live" note="Last two days, not yet in the bank" />
        </Kpis>
        <Panel title="Credit held for clients"><HList rows={credits} cur={cur} empty="No client has credit on account." noun="credit" /></Panel>
        <Panel title="Kept for projects not yet delivered">
          <RTable id="unearned" sp={sp} f={f} empty="No payments are held against live projects." total={projects.length} noun="project" num={[2]}
            head={["Project", "Client", "Kept so far", "Stage"]}
            rows={projects.map((p) => {
              const kept = s.payments.filter(({ inv }) => inv.projectId === p.id).reduce((n, { p: pay }) => n + (pay.reversed ? 0 : pay.amount - (pay.refunds ?? []).reduce((a, r) => a + r.amount, 0)), 0);
              return [<Link key="t" href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>, s.clients.get(p.clientId)?.company ?? "", full(kept, cur), p.stage];
            }).filter((r) => r[2] !== full(0, cur))} />
        </Panel>
        <Panel title="Refunds in these days">
          <RTable id="refunds2" sp={sp} f={f} empty="No refunds in these days." total={refunds.length} noun="refund" num={[3]}
            head={["Date", "Client", "Invoice", "Amount", "Went to", "Reason"]}
            rows={refunds.map((r) => [when(r.at), r.client, r.invoice, full(r.amount, cur), r.toCredit ? "Client credit" : "Back to the client", r.reason])} />
        </Panel>
      </div>
      <Rail f={f}>
        <Panel title="What this does not show">
          <ul className="rp__rules">
            <li>Bills are recorded when they are paid, so there is no list of bills still to pay. What the studio owes is client credit and work already paid for.</li>
            <li>Card providers do not send a balance feed. The settling figure is a rule on our own payment rows.</li>
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------------ sales */

export function Sales({ s, f, span, prev, sp }: Ctx) {
  const x = sales(s, span), y = prev ? sales(s, prev) : null, cur = f.cur;
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Quotes sent" value={String(x.sent.n)} icon={FileText} badge={compare(x.sent.n, y?.sent.n ?? null) ?? undefined} note={`Worth ${short(x.sent.value, cur)}`} />
          <Tile label="Won" value={short(x.accepted.value, cur)} icon={Handshake} iconTone="good" note={`${x.accepted.n} accepted`} />
          <Tile label="Win rate" value={percent(x.winRate)} icon={Percent} iconTone="live" badge={compare(Math.round((x.winRate ?? 0) * 100), y?.winRate != null ? Math.round(y.winRate * 100) : null) ?? undefined} note="Of quotes someone answered" />
          <Tile label="Still open" value={short(x.waiting.value, cur)} icon={Hourglass} iconTone="warn" note={`${x.waiting.n} waiting for an answer`} />
        </Kpis>
        <Split>
          <Panel title="Quote funnel">
            <Funnel steps={[{ label: "Sent", n: x.sent.n }, { label: "Answered", n: x.accepted.n + x.declined.n }, { label: "Accepted", n: x.accepted.n, note: `Average ${short(x.avgValue, cur)} per quote` }]} />
            <Note>{x.declined.n} declined, {x.expired.n} expired without an answer. Average time to answer: {days(x.avgAnswerDays)}.</Note>
          </Panel>
          <Panel title="Enquiries">
            <Funnel steps={[{ label: "Onboarding forms sent in", n: x.enquiries.n }, { label: "Matched to a client", n: x.enquiries.withClient }]} />
            <Note>{x.enquiries.inProgress} more are started and not yet submitted.</Note>
          </Panel>
        </Split>
        <Split>
          <Panel title="Won, by service"><HList rows={x.wonByService} cur={cur} empty="No quote was accepted in these days." noun="quote" /></Panel>
          <Panel title="Enquiries, by service"><HList rows={x.enquiries.byService.map((r) => ({ ...r }))} cur={cur} unit="count" empty="No onboarding form was submitted in these days." /></Panel>
        </Split>
        <Panel title="Quotes in these days">
          <RTable id="quotes" sp={sp} f={f} empty="No quotes were sent in these days." total={x.list.length} noun="quote" num={[4, 5]}
            head={["Quote", "Client", "Sent", "State", "Total", "Days to answer"]}
            rows={x.list.map((e) => [<b key="n">{e.number}</b>, <Link key="c" href={`/admin/clients/${e.clientId}`}>{e.client}</Link>, when(e.issued), e.state, full(e.total, cur), e.days == null ? "–" : String(e.days)])} />
        </Panel>
      </div>
      <Rail f={f}><Panel title="How this is counted"><ul className="rp__rules"><li>Win rate is accepted over answered. Quotes still waiting are not counted as losses.</li><li>Only quotes in {f.cur} are in these figures.</li></ul></Panel></Rail>
    </div>
  );
}

/* -------------------------------------------------------------- recurring */

export function Recurring({ s, f }: Ctx) {
  const r = recurring(s), cur = f.cur;
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Monthly recurring" value={short(r.mrr, cur)} icon={Repeat} iconTone="brand" note={r.mrrMonth || "No retainers found"} />
          <Tile label="Yearly at this rate" value={short(r.arr, cur)} icon={CircleDollarSign} iconTone="good" note="Twelve times the month" />
          <Tile label="Recurring clients" value={String(r.activeClients)} icon={Users} iconTone="live" note={`${r.gained.length} joined, ${r.lost.length} left last month`} />
          <Tile label="Invoices counted" value={String(r.invoices)} icon={FileText} iconTone="neutral" note="Over all time in this scope" />
        </Kpis>
        <Panel title="Recurring revenue by month">
          <Columns items={r.series.map((m) => ({ label: m.label, value: m.amount, sub: `${m.clients} client${m.clients === 1 ? "" : "s"}` }))} cur={cur} />
        </Panel>
        <Split>
          <Panel title="By client, latest month"><HList rows={r.perClient} cur={cur} empty="No recurring invoices found." noun="invoice" /></Panel>
          <Panel title="Next three months at the current rate">
            {r.next3.length ? <Columns items={r.next3.map((m) => ({ label: m.label, value: m.amount }))} cur={cur} /> : <p className="rp__empty">No recurring revenue to project.</p>}
            <Note>A straight line from the latest month. It does not know about renewals or cancellations.</Note>
          </Panel>
        </Split>
        <Split>
          <Panel title="Joined last month">{r.gained.length ? <ul className="rp__names">{r.gained.map((n) => <li key={n}>{n}</li>)}</ul> : <p className="rp__empty">Nobody new started a retainer.</p>}</Panel>
          <Panel title="Left last month">{r.lost.length ? <ul className="rp__names">{r.lost.map((n) => <li key={n}>{n}</li>)}</ul> : <p className="rp__empty">Nobody stopped.</p>}</Panel>
        </Split>
      </div>
      <Rail f={f}>
        <Panel title="How this is counted">
          <ul className="rp__rules">
            <li>An invoice is recurring when a line says retainer, monthly, per month, care plan or subscription, or its client is tagged retainer.</li>
            <li>There is no billing plan record yet, so this is the books read for that pattern.</li>
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------------- work */

export function Work({ s, f, span, sp }: Ctx) {
  const w = work(s, span);
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Live projects" value={String(w.live)} icon={Zap} iconTone="brand" note={`Average age ${w.avgAgeDays} days`} />
          <Tile label="Delivered" value={String(w.delivered)} icon={ShieldCheck} iconTone="good" note="In these days" />
          <Tile label="Delivered on time" value={percent(w.onTimeRate)} icon={CalendarClock} iconTone="good" note="By the date agreed" />
          <Tile label="Overdue now" value={String(w.overdue.length)} tone={w.overdue.length ? "bad" : "good"} icon={Clock} iconTone={w.overdue.length ? "bad" : "good"} note={`${w.awaiting.length} waiting for a client's yes`} />
        </Kpis>
        <Split>
          <Panel title="Projects by stage"><HList rows={w.byStage} cur={f.cur} unit="count" empty="No projects match." /></Panel>
          <Panel title="Live projects by health"><HList rows={w.byHealth} cur={f.cur} unit="count" empty="No live projects." /></Panel>
        </Split>
        <Split>
          <Panel title="Live projects by service"><HList rows={w.byService} cur={f.cur} unit="count" empty="No live projects." /></Panel>
          <Panel title="Tasks">
            <ul className="rp__held">
              <li><span><b>Open</b></span><b className="ad__num">{w.tasks.open}</b></li>
              <li><span><b>Overdue</b></span><b className="ad__num">{w.tasks.overdue}</b></li>
              <li><span><b>Done in these days</b></span><b className="ad__num">{w.tasks.done}</b></li>
              <li><span><b>Done as a share of done and open</b></span><b className="ad__num">{percent(w.tasks.rate)}</b></li>
            </ul>
          </Panel>
        </Split>
        <Panel title="Support">
          <ul className="rp__held">
            <li><span><b>Opened in these days</b></span><b className="ad__num">{w.tickets.opened}</b></li>
            <li><span><b>Still open</b><small>Now, whatever the dates</small></span><b className="ad__num">{w.tickets.open}</b></li>
            <li><span><b>Average first reply</b></span><b className="ad__num">{hours(w.tickets.firstReplyHours)}</b></li>
          </ul>
        </Panel>
        <Panel title="Overdue projects">
          <RTable id="overdue" sp={sp} f={f} empty="Nothing is overdue." total={w.overdue.length} noun="project" num={[3]}
            head={["Project", "Client", "Led by", "Days late", "Stage"]}
            rows={w.overdue.map((p) => [<Link key="t" href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>, p.client, p.owner || "No one", `${p.days}`, p.stage])} />
        </Panel>
        <Panel title="Delivered in these days">
          <RTable id="delivered" sp={sp} f={f} empty="No project was delivered in these days." total={w.deliveredList.length} noun="project"
            head={["Project", "Client", "Delivered", "Due", "On time"]}
            rows={w.deliveredList.map((p) => [<Link key="t" href={`/admin/projects/${p.id}`}><b>{p.title}</b></Link>, p.client, when(p.at), p.due ? when(p.due) : "No date", p.onTime ? "Yes" : "Late"])} />
        </Panel>
        <Panel title="Waiting for a client's yes">
          <RTable id="awaiting" sp={sp} f={f} empty="No client is holding anything up." total={w.awaiting.length} noun="deliverable"
            head={["Project", "Deliverable"]} rows={w.awaiting.map((a) => [<Link key="t" href={`/admin/projects/${a.id}`}><b>{a.project}</b></Link>, a.name])} />
        </Panel>
      </div>
      <Rail f={f}><Panel title="How this is counted"><ul className="rp__rules"><li>A project is delivered on the date its history says so, and on time when that is on or before its due date.</li><li>Live means not delivered and not archived.</li></ul></Panel></Rail>
    </div>
  );
}

/* ------------------------------------------------------------------- team */

export function Team({ s, f, span, depts, sp }: Ctx) {
  const people = team(s, span), cur = f.cur, ds = depts ? departments(s, span, depts) : null;
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="People with work" value={String(people.length)} icon={Users} iconTone="brand" note="Leading a project or holding a task" />
          <Tile label="Tasks done" value={String(people.reduce((n, p) => n + p.tasksDone, 0))} icon={ShieldCheck} iconTone="good" note="In these days" />
          <Tile label="Tasks overdue" value={String(people.reduce((n, p) => n + p.tasksOverdue, 0))} tone={people.some((p) => p.tasksOverdue) ? "bad" : "good"} icon={Clock} iconTone="warn" note="Open and past their date" />
          <Tile label="Support replies" value={String(people.reduce((n, p) => n + p.replies, 0))} icon={Handshake} iconTone="live" note="Sent in these days" />
        </Kpis>
        <Panel title="People" dataTour="reports-people">
          <RTable id="people" sp={sp} f={f} empty="No one has work in this scope." total={people.length} noun="person" num={[1, 2, 3, 4, 5, 6, 7, 8]}
            head={["Person", "Live projects", "Delivered", "Tasks open", "Tasks done", "Overdue", "Done share", "Replies", "Collected on their projects"]}
            rows={people.map((p) => [<b key="n">{p.name}</b>, p.live, p.delivered, p.tasksOpen, p.tasksDone, p.tasksOverdue, percent(p.completion), p.replies, full(p.collected, cur)])} />
        </Panel>
        <Panel title="Collected on each person's projects"><HList rows={people.filter((p) => p.collected > 0).map((p) => ({ label: p.name, amount: p.collected }))} cur={cur} empty="No payments landed on anyone's projects in these days." /></Panel>
        <Panel title="Departments">
          {ds ? (
            <RTable id="depts" sp={sp} f={f} empty="No departments are set up yet." total={ds.length} noun="department" num={[1, 2, 3, 4, 5, 6]}
              head={["Department", "People", "Clients", "Live projects", "Open tasks", "Collected", "Spent"]}
              rows={ds.map((d) => [<b key="n">{d.name}</b>, d.people, d.clients, d.projects, d.tasksOpen, full(d.collected, cur), full(d.spent, cur)])} />
          ) : <p className="rp__empty">Departments are not set up on this database yet. Apply the pending migration in Settings, System.</p>}
        </Panel>
      </div>
      <Rail f={f}>
        <Panel title="How this is counted">
          <ul className="rp__rules">
            <li>A person leads a project when their name is on it. Money on a project is split between the people who lead it.</li>
            <li>A client in two departments counts half toward each.</li>
            <li>Replies are support messages sent under the person&apos;s name.</li>
          </ul>
        </Panel>
      </Rail>
    </div>
  );
}

/* ---------------------------------------------------------------- clients */

export function Clients({ s, f, span, sp }: Ctx) {
  const c = clientInsights(s, span), cur = f.cur;
  const rows = [...c.rows].sort((a, b) => b.collected - a.collected || b.lifetime - a.lifetime);
  return (
    <div className="adFlow__grid">
      <div className="adFlow__main">
        <Kpis>
          <Tile label="Clients in scope" value={String(c.active)} icon={Users} iconTone="brand" note={`${c.newClients} new in these days`} />
          <Tile label="Paying clients" value={String(c.paying.length)} icon={Wallet} iconTone="good" note="Paid something in these days" />
          <Tile label="Top three share" value={percent(c.concentration)} icon={Percent} iconTone={c.concentration && c.concentration > 0.6 ? "warn" : "neutral"} note="Of money collected" />
          <Tile label="Average lifetime" value={short(c.avgLifetime, cur)} icon={CircleDollarSign} iconTone="live" note="Collected per client, all time" />
        </Kpis>
        <Split>
          <Panel title="Top clients"><HList rows={collectedBy(s, span, "client")} cur={cur} empty="No payments in these days." count={8} noun="payment" /></Panel>
          <Panel title="Clients by service"><HList rows={c.byService} cur={cur} unit="count" empty="No clients in this scope." /></Panel>
        </Split>
        <Split>
          <Panel title="Money collected by sector"><HList rows={c.bySector} cur={cur} empty="No payments in these days." /></Panel>
          <Panel title="Billed in these days">
            <ul className="rp__held">
              <li><span><b>New clients</b></span><b className="ad__num">{c.billedNew}</b></li>
              <li><span><b>Returning clients</b></span><b className="ad__num">{c.billedReturning}</b></li>
            </ul>
          </Panel>
        </Split>
        <Panel title="Every client" dataTour="reports-clients">
          <RTable id="clients" sp={sp} f={f} empty="No clients match these filters." total={rows.length} noun="client" num={[1, 2, 3, 4, 5, 6]}
            head={["Client", "Invoiced", "Collected", "Owed now", "Credit held", "Live projects", "Lifetime collected", "Last payment"]}
            rows={rows.map((r) => [<Link key="n" href={`/admin/clients/${r.id}`}><b>{r.name}</b></Link>, full(r.invoiced, cur), full(r.collected, cur), full(r.outstanding, cur), full(r.credit, cur), r.projects, full(r.lifetime, cur), r.last ? when(r.last) : "Never"])} />
        </Panel>
        <Panel title="Gone quiet">
          <RTable id="quiet" sp={sp} f={f} empty="Every client has paid or has work in the last 90 days." total={c.inactive.length} noun="client" num={[1]}
            head={["Client", "Lifetime collected", "Last payment"]}
            rows={c.inactive.map((r) => [<Link key="n" href={`/admin/clients/${r.id}`}><b>{r.name}</b></Link>, full(r.lifetime, cur), r.last ? when(r.last) : "Never"])} />
        </Panel>
      </div>
      <Rail f={f}><Panel title="How this is counted"><ul className="rp__rules"><li>Gone quiet means no live project and no payment for 90 days.</li><li>Lifetime is every kept payment, whatever the dates above.</li></ul></Panel></Rail>
    </div>
  );
}
