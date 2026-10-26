import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, CheckCircle2, FileText, Receipt, Server, Wallet } from "lucide-react";
import { getClient, getInvoice, getPaymentsFor, getProjectsFor, getRetainerFor } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { addMonths, remainingParts, termEnd, RETAINER_BILLING, type RetainerBilling } from "@/lib/admin/retainer-rules";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { nairaTile } from "@/lib/admin/short-money";
import { dateWords, nowMs } from "@/lib/admin/when";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, StatTiles, Workbench } from "@/components/admin/workbench";
import { Tabs } from "@/components/admin/tabs";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Empty, InvoicePill } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { billCostsNow } from "@/lib/admin/retainer-actions";
import {
  BillPlanCosts, CostSheet, EndRetainer, RemovePlanRow, ReportSheet, RetainerSheet, SharePlanReport, SystemSheet,
} from "@/components/admin/retainer-card";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  return { title: `${getClient(id)?.company ?? "Client"} · Monthly plan` };
}

const TABS = ["periods", "costs", "systems", "reports"] as const;
type Tab = (typeof TABS)[number];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
const dayW = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.slice(0, 10)}T12:00:00Z`));
const monthW = (m: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));

/**
 * ONE CLIENT'S MONTHLY PLAN (a retainer), money only. It answers "what does
 * this plan need" first (a draft to send, costs not yet billed, a renewal
 * coming, last month's report), then the work on four tabs: every part of the
 * term with its invoice and what was paid (the plan's accounting log), the
 * costs passed on, the systems it looks after, and the monthly reports.
 */
export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; write?: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const q = await searchParams;
  const c = getClient(id);
  if (!c) notFound();
  if (!can(await adminRole(), "money")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Plans carry amounts" description="Ask Admin about this client's plan." back={{ href: `/admin/clients/${c.id}`, label: `Back to ${c.company}` }} /></section>;
  }
  const r = getRetainerFor(c.id);
  if (!r) {
    return (
      <>
        <PageHead crumbs={[{ href: "/admin/clients", label: "Clients" }, { href: `/admin/clients/${c.id}`, label: c.company }]} title="Monthly plan" lede={<>{c.company} has no plan with us.</>} />
        <section className="adList"><Empty title={`No monthly plan with ${c.company}`} icon={CalendarRange}
          action={<RetainerSheet clientId={c.id} company={c.company} plan={null} projects={getProjectsFor(c.id).map((p) => ({ value: p.id, label: p.title }))} notes={null} label="Set up a monthly plan" />}>
          Set one up and each part is drafted on Today for you to send.
        </Empty></section>
      </>
    );
  }

  const now = nowMs(), t = today();
  const tab: Tab = TABS.find((x) => x === q.tab) ?? "periods";
  const total = r.monthly * r.months;
  const drafts = r.drafted.map((d) => ({ ...d, inv: getInvoice(d.invoiceId) }));
  const kept = (invId: string) => getPaymentsFor(invId).reduce((n, p) => n + (p.reversed ? 0 : p.amount), 0);
  const partsPaid = drafts.reduce((n, d) => n + (d.inv && !d.inv.voided ? Math.min(d.amount, kept(d.inv.id)) : 0), 0);
  const draftedSum = drafts.reduce((n, d) => n + d.amount, 0);
  const upcoming = remainingParts(r);
  const costs = (r.costs ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const unbilled = costs.filter((x) => !x.invoiceId);
  const unbilledSum = unbilled.reduce((n, x) => n + x.amount, 0);
  const systems = r.systems ?? [];
  const reports = (r.reports ?? []).slice().sort((a, b) => b.month.localeCompare(a.month));
  const end = termEnd(r.start, r.months);

  /* The months a report can be written for: started, inside the term, newest first. */
  const months: string[] = [];
  for (let i = 0; i < r.months; i++) { const m = addMonths(r.start, i).slice(0, 7); if (m <= t.slice(0, 7)) months.unshift(m); }
  const lastMonth = addMonths(`${t.slice(0, 7)}-01`, -1).slice(0, 7);
  const reportFor = (m: string) => reports.find((x) => x.month === m);

  const projects = getProjectsFor(c.id).map((p) => ({ value: p.id, label: p.title }));
  const describe = (parts: ReturnType<typeof remainingParts>, bl: RetainerBilling) => !parts.length ? "Nothing left to bill this term"
    : parts.length <= 2 ? parts.map((x) => `${naira(x.amount)} ${x.date === r.start ? "before the start" : `on ${dayW(x.date)}`}`).join(", ")
    : `${naira(parts[parts.length - 1].amount)} ${bl === "Quarterly" ? "every three months" : "on the same day each month"}, ${parts.length} parts from ${dayW(parts[0].date)}`;
  const notes = Object.fromEntries(RETAINER_BILLING.map((bl) => [bl, describe(remainingParts({ ...r, billing: bl }), bl)])) as Record<RetainerBilling, string>;
  const planProps = { id: r.id, title: r.title, start: r.start, months: r.months, monthly: r.monthly, includes: r.includes, billing: r.billing, projectId: r.projectId, draftedCount: r.drafted.length };

  /* WHAT THIS PLAN NEEDS, read from the plan and its invoices only. */
  const deck: DeckItem[] = [];
  for (const d of drafts.filter((x) => x.inv && x.inv.status === "Draft" && !x.inv.voided)) {
    deck.push({ id: `send-${d.invoiceId}`, kind: "Money", urgency: "Draft ready", tone: "live", label: d.inv!.number,
      title: `Send the ${dayW(d.date)} invoice`, body: `${naira(invoiceTotals(d.inv!).total)} with VAT. Check it, then send it with the pay link.`,
      facts: [{ k: "Invoice", v: d.inv!.number }, { k: "Part", v: naira(d.amount) }], primary: { label: "Open and send", href: `/admin/money/${d.invoiceId}` }, open: `/admin/money/${d.invoiceId}` });
  }
  if (unbilled.length) {
    deck.push({ id: `costs-${unbilled.map((x) => x.id).join("")}`, kind: "Costs", urgency: `${unbilled.length} not billed`, tone: "warn",
      title: `${naira(unbilledSum)} paid on ${c.company}'s behalf`, body: upcoming[0] ? `They ride on the next part (${dayW(upcoming[0].date)}) unless you bill them now.` : "No part is left on this term, so bill them on their own.",
      facts: unbilled.slice(0, 3).map((x) => ({ k: x.what, v: naira(x.amount) })), primary: { label: "Bill them now", run: billCostsNow.bind(null, r.id) }, secondary: { label: "See the costs", href: `?tab=costs` } });
  }
  for (const s of systems.filter((x) => x.renews && x.renews >= t && x.renews <= addMonths(t, 1))) {
    deck.push({ id: `renew-${s.id}-${s.renews}`, kind: "Renewal", urgency: `Renews ${dayW(s.renews!)}`, tone: "warn", title: `${s.name} renews soon`,
      body: s.notes ? s.notes.slice(0, 160) : "Renew it, or tell the client it lapses.", facts: s.access ? [{ k: "Access", v: s.access }] : undefined,
      primary: { label: "See the systems", href: `?tab=systems` } });
  }
  if (months.includes(lastMonth) && !reportFor(lastMonth)?.sharedAt) {
    deck.push({ id: `report-${lastMonth}`, kind: "Report", urgency: reportFor(lastMonth) ? "Written, not shared" : "Not written", tone: "neutral",
      title: `${monthW(lastMonth)} report for ${c.company}`, body: "Say what was done and what it achieved. It appears on their Billing page once you share it.",
      primary: { label: reportFor(lastMonth) ? "Open the report" : "Write the report", href: `?tab=reports&write=${lastMonth}` } });
  }

  const tabHref = (k: Tab) => (k === "periods" ? "?" : `?tab=${k}`);
  return (
    <>
      <PageHead crumbs={[{ href: "/admin/clients", label: "Clients" }, { href: `/admin/clients/${c.id}`, label: c.company }]}
        title={r.title}
        lede={<>{dayW(r.start)} to {dayW(end)}. <strong>{naira(r.monthly)} a month, billed {r.billing.toLowerCase()}.</strong></>}
        action={<RetainerSheet clientId={c.id} company={c.company} plan={planProps} projects={projects} notes={notes} label="Change billing" />}
        chores={<ChoresMenu label="Plan options" items={[{ label: "Open the client", href: `/admin/clients/${c.id}` }, { label: "Money for this client", href: `/admin/clients/${c.id}?tab=money` }]} />}
      />
      <div style={{ marginBottom: "1.25rem" }}>
        <StatTiles items={[
          { label: "The term", value: nairaTile(total), note: `${r.months} months`, icon: CalendarRange, tone: "brand" },
          { label: "Drafted so far", value: nairaTile(draftedSum), note: `${r.drafted.length} of ${r.drafted.length + upcoming.length} parts`, icon: FileText, tone: "neutral" },
          { label: "Paid", value: nairaTile(partsPaid), note: draftedSum ? `${Math.round((partsPaid / draftedSum) * 100)}% of what was drafted` : "Nothing drafted yet", icon: CheckCircle2, tone: "good" },
          { label: "Costs to bill", value: nairaTile(unbilledSum), note: unbilled.length ? `${unbilled.length} not billed yet` : "All billed", noteTone: unbilled.length ? "accent" : undefined, icon: Receipt, tone: unbilled.length ? "warn" : "neutral" },
        ]} />
      </div>
      <Workbench railLabel="What a month includes and what comes next"
        rail={<>
          <RailCard title="Next">
            {upcoming[0] ? (
              <div className="adPlan__next"><strong>{naira(upcoming[0].amount)} on {dayW(upcoming[0].date)}</strong><span>Part {upcoming[0].n} of {upcoming[0].of}. Drafted on Today that morning{unbilled.length ? `, with ${naira(unbilledSum)} of costs` : ""}.</span></div>
            ) : <p className="ad__dim" style={{ margin: 0 }}>Every part of this term is drafted.</p>}
          </RailCard>
          {r.includes.length ? (
            <RailCard title="A month includes">
              <div className="adPlan__incl">{r.includes.map((x, i) => <span key={i}><strong>{x.t}</strong><span>{x.s}</span></span>)}</div>
            </RailCard>
          ) : null}
          <RailCard title="End the plan">
            <p className="ad__dim" style={{ margin: 0 }}>Parts not yet drafted never will be. Drafts already made stay for you to send or void.</p>
            <EndRetainer id={r.id} title={r.title} />
          </RailCard>
        </>}
      >
        <Deck id={`plan-${r.id}`} title="This plan needs" items={deck}
          emptyTitle="Nothing is waiting on this plan."
          emptyBody="Every draft is sent, every cost is billed and last month's report is shared."
          emptyNext={upcoming[0] ? { label: `Next: ${naira(upcoming[0].amount)} on ${dayW(upcoming[0].date)}`, href: "?" } : { label: "Open the client", href: `/admin/clients/${c.id}` }} />

        <section className="adList" aria-label="Plan records" id="plan-records">
          <Tabs label="Plan sections" current={tab} items={[
            { key: "periods", label: "Parts and payments", href: tabHref("periods"), count: r.drafted.length + upcoming.length },
            { key: "costs", label: "Costs passed on", href: tabHref("costs"), count: costs.length, tone: unbilled.length ? "warn" : undefined },
            { key: "systems", label: "Systems", href: tabHref("systems"), count: systems.length },
            { key: "reports", label: "Reports", href: tabHref("reports"), count: reports.length },
          ]} />

          {tab === "periods" ? (
            <div className="ad__scroll" tabIndex={0} role="region" aria-label="Parts and payments, scrolls sideways" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>Part</th><th>Falls due</th><th>Invoice</th><th>Status</th><th className="num">Amount</th><th className="num">Paid</th></tr></thead>
                <tbody>
                  {drafts.map((d, i) => (
                    <tr key={d.invoiceId}>
                      <td><b>{i + 1} of {r.drafted.length + upcoming.length}</b></td>
                      <td className="ad__docNo">{dayW(d.date)}</td>
                      <td>{d.inv ? <Link href={`/admin/money/${d.inv.id}`} className="ad__docNo">{d.inv.number}</Link> : <span className="ad__dim">Removed</span>}</td>
                      <td>{d.inv ? <InvoicePill status={d.inv.voided ? "Void" : invoiceStatus(d.inv)} /> : null}</td>
                      <td className="num">{naira(d.amount)}</td>
                      <td className="num">{d.inv && !d.inv.voided ? naira(Math.min(d.amount, kept(d.inv.id))) : "Nil"}</td>
                    </tr>
                  ))}
                  {upcoming.map((x) => (
                    <tr key={x.date}>
                      <td><b>{x.n} of {x.of}</b></td>
                      <td className="ad__docNo">{dayW(x.date)}</td>
                      <td><span className="ad__dim">Drafted that day</span></td>
                      <td><span className="ad__pill ad__pill--flat">Scheduled</span></td>
                      <td className="num">{naira(x.amount)}</td>
                      <td className="num">Nil</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "costs" ? (
            <>
              <div className="adList__pad adPlan__bar"><CostSheet planId={r.id} today={t} />{unbilled.length ? <BillPlanCosts planId={r.id} total={naira(unbilledSum)} /> : null}</div>
              {costs.length ? (
                <div className="ad__scroll" tabIndex={0} role="region" aria-label="Costs passed on, scrolls sideways" data-lenis-prevent>
                  <table className="ad__t">
                    <thead><tr><th>What</th><th>Paid on</th><th className="num">Amount</th><th>Billed on</th><th><span className="ad__sr">Actions</span></th></tr></thead>
                    <tbody>
                      {costs.map((x) => {
                        const inv = x.invoiceId ? getInvoice(x.invoiceId) : null;
                        return (
                          <tr key={x.id}>
                            <td><b>{x.what}</b></td>
                            <td className="ad__docNo">{dayW(x.date)}</td>
                            <td className="num">{naira(x.amount)}</td>
                            <td>{inv ? <Link href={`/admin/money/${inv.id}`} className="ad__docNo">{inv.number}</Link> : <span className="ad__pill ad__pill--warn">Not billed yet</span>}</td>
                            <td>{inv ? null : <RemovePlanRow planId={r.id} rowId={x.id} kind="cost" name={x.what} />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No costs passed on" icon={Receipt}>Hosting, a database or API credits paid for {c.company} go here and onto the next invoice.</Empty>}
            </>
          ) : null}

          {tab === "systems" ? (
            <>
              <div className="adList__pad adPlan__bar"><SystemSheet planId={r.id} /></div>
              {systems.length ? (
                <div className="ad__scroll" tabIndex={0} role="region" aria-label="Systems, scrolls sideways" data-lenis-prevent>
                  <table className="ad__t">
                    <thead><tr><th>What</th><th>Access held by</th><th>Renews</th><th>Notes</th><th><span className="ad__sr">Actions</span></th></tr></thead>
                    <tbody>
                      {systems.map((s) => (
                        <tr key={s.id}>
                          <td><b>{s.name}</b></td>
                          <td>{s.access || <span className="ad__dim">Not noted</span>}</td>
                          <td className="ad__docNo">{s.renews ? <>{dayW(s.renews)}{s.renews <= addMonths(t, 1) && s.renews >= t ? <> <span className="ad__pill ad__pill--warn">Soon</span></> : null}</> : <span className="ad__dim">Does not renew</span>}</td>
                          <td style={{ minWidth: "16rem" }}>{s.notes || <span className="ad__dim">No notes</span>}</td>
                          <td><span className="ad__row" style={{ flexWrap: "nowrap" }}><SystemSheet planId={r.id} sys={s} /><RemovePlanRow planId={r.id} rowId={s.id} kind="system" name={s.name} /></span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No systems noted" icon={Server}>Note what this plan looks after (a VPS, a website, an app), who holds the access and when it renews.</Empty>}
            </>
          ) : null}

          {tab === "reports" ? (
            months.length ? (
              <ul className="adPlan__reports">
                {months.map((m) => {
                  const rep = reportFor(m);
                  return (
                    <li key={m}>
                      <span className="adPlan__repHd">
                        <b>{monthW(m)}</b>
                        {rep?.sharedAt ? <span className="ad__pill ad__pill--good">Shared {dateWords(rep.sharedAt, now, false)}</span> : rep ? <span className="ad__pill ad__pill--flat">Draft</span> : <span className="ad__pill ad__pill--flat">Not written</span>}
                      </span>
                      {rep ? <p className="adPlan__repBody">{rep.body}</p> : null}
                      <span className="adPlan__bar">
                        <ReportSheet planId={r.id} month={m} label={`${rep ? "Edit" : "Write"} the ${monthW(m)} report`} body={rep?.body} startOpen={q.write === m} primary={!rep && m === lastMonth} />
                        {rep ? <SharePlanReport planId={r.id} reportId={rep.id} month={monthW(m)} company={c.company} /> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty title="No month has started yet" icon={Wallet}>The first report can be written once the plan starts on {dayW(r.start)}.</Empty>
          ) : null}
        </section>
      </Workbench>
    </>
  );
}
