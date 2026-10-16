import {moneySummary} from "@/lib/money/summary";
import {currencyOf,money} from "@/lib/money/currency";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays, CheckCircle2, ChevronRight, CreditCard, Download, Eye, FileCheck2, FileText, MessageSquare,
  MessageSquareReply, ScrollText,
} from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getClient, getDeliverablesFor, getInvoicesFor, getProject, getProjects, getUpdatesFor } from "@/lib/admin/store";
import { STAGES, invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { ApprovalPill, Empty, HealthPill, Panel, when } from "@/components/admin/bits";
import { PageHead } from "@/components/admin/page-head";
import { MiniBar, RailCard, Workbench } from "@/components/admin/workbench";
import { Stepper } from "@/components/admin/stepper";
import { Tabs } from "@/components/admin/tabs";
import { avTone, initials } from "@/lib/admin/client-mark";
import { dateWords, nowMs } from "@/lib/admin/when";
import "@/components/admin/project-page.css";
import type {Deliverable} from "@/lib/admin/types";
import {clientDeliverable} from "@/lib/workspace/service-deliverable-policy";
import { DeliverableActions } from "@/components/client/deliverable-actions";
import "@/components/client/portal.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { deliverableFileLinks } from "@/lib/deliverable-files";
import { ProjectTimeline } from "@/components/client/project-timeline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const request = await getPortalRequest();
  const p = getProject(id);
  if (!p || !request.allowedProjectIds.includes(p.id)) notFound();
  return { title: p.title };
}

/**
 * ONE PROJECT, AS ITS CLIENT SEES IT: where it
 * is and what happens next, the work waiting for them, what the studio has
 * said, and the facts and money beside it. Only what the records hold: the
 * board's "who is on it" list is the one person answerable, because that is
 * the one name a project carries.
 */
type Q = { tab?: string };
const TABS = ["overview", "yes", "files", "money", "activity"] as const;
type Tab = (typeof TABS)[number];

export default async function PortalProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const query = await searchParams;
  const request = await getPortalRequest();
  const p = getProject(id);
  /* SAME OWNERSHIP CHECK AS THE METADATA ABOVE, deliberately re-run here
     rather than trusted from it: `generateMetadata` and the page body are
     two separate invocations, and a project that belongs to another client
     must 404 from either one on its own. */
  if (!p || !request.allowedProjectIds.includes(p.id)) notFound();
  const client=getClient(p.clientId);
  if(!client)notFound();

  const at = STAGES.indexOf(p.stage);
  const service = SERVICE_BY_SLUG.get(p.service);
  const updates = getUpdatesFor(p.id).filter((u) => u.clientVisible).sort((a, b) => b.at.localeCompare(a.at));
  const next = updates.find((u) => u.next)?.next ?? null;
  const deliverables = getDeliverablesFor(p.id).flatMap(d=>{const shared=clientDeliverable(d);return shared?[shared]:[];});
  const waiting = deliverables.filter((d) => request.reviewProjectIds.includes(p.id) && d.approval === "Awaiting client" && d.clientReviewable!==false);
  const rest = deliverables.filter((d) => !waiting.some(w=>w.id===d.id));
  const approved = deliverables.filter((d) => d.approval === "Approved");
  const started = p.events.filter(event=>event.visibility!=="internal").map((e) => e.at).sort()[0] ?? null;
  const now = nowMs();

  /* Money on this project: its invoices, not a figure typed anywhere. */
  const canBill = request.billingProjectIds.includes(p.id);
  const invoices = (canBill?getInvoicesFor(client.id):[]).filter((inv) => inv.projectId === p.id && !inv.voided && inv.status !== "Draft");
  const billed = invoices.reduce((n, inv) => n + invoiceTotals(inv).total, 0);
  const paid = invoices.reduce((n, inv) => n + Math.min(inv.paid, invoiceTotals(inv).total), 0);
  const owing = invoices.filter((inv) => invoiceTotals(inv).due > 0).sort((a, b) => a.due.localeCompare(b.due))[0] ?? null;
  const askHref = `/portal/support?new=1&project=${p.id}&subject=${encodeURIComponent(`About ${p.title}`)}`;

  const asked: Tab = TABS.find((t) => t === query.tab) ?? "overview";
  const tab: Tab = asked === "money" && !canBill ? "overview" : asked;
  const tabHref = (t: Tab) => `/portal/projects/${p.id}${t === "overview" ? "" : `?tab=${t}`}`;
  const tabItems = [
    { key: "overview", label: "Overview", href: tabHref("overview") },
    { key: "yes", label: "Needs your yes", href: tabHref("yes"), count: waiting.length || undefined, tone: waiting.length ? ("warn" as const) : undefined },
    { key: "files", label: "Files", href: tabHref("files"), count: deliverables.length || undefined },
    ...(canBill ? [{ key: "money", label: "Money", href: tabHref("money"), count: invoices.length || undefined, tone: owing && invoiceStatus(owing) === "Overdue" ? ("bad" as const) : undefined }] : []),
    { key: "activity", label: "Activity", href: tabHref("activity") },
  ];

  /* What we need from you: files to approve, and an invoice to pay. */
  type Need = { key: string; icon: typeof Eye; title: string; body: string; act: React.ReactNode };
  const needs: Need[] = [
    ...waiting.map((d) => ({ key: d.id, icon: Eye, title: `Approve ${d.name}`, body: d.versions[d.versions.length - 1]?.note || "Open it, then approve it or tell us what to change.", act: <Link className="ad__btn ad__btn--primary" href={tabHref("yes")}>Review it</Link> })),
    ...(owing ? [{ key: "pay", icon: CreditCard, title: `${owing.number} is ready to pay`, body: `${money(invoiceTotals(owing).due, currencyOf(owing))} due ${dateWords(owing.due, now)}.`, act: <a className="ad__btn ad__btn--primary" href={`/i/${owing.token}`} target="_blank" rel="noopener noreferrer">Pay {money(invoiceTotals(owing).due, currencyOf(owing))}</a> }] : []),
  ];

  const waitingCards = (
    <div className="cpDeliv">
      {waiting.map((d) => {
        const latest = d.versions[d.versions.length - 1];
        return (
          <article className="cpDeliv__card" key={d.id}>
            <span className="cpDeliv__icon cpDeliv__icon--live" aria-hidden="true"><FileText /></span>
            <div className="cpDeliv__body">
              <div className="cpDeliv__title"><b>{d.name}</b><span className="ad__pill ad__pill--flat">v{latest.v}</span><span className="ad__pill ad__pill--live">Waiting for you</span></div>
              <small>{latest.sharedAt?`Shared ${when(latest.sharedAt)}`:"Shared with you"}{latest.reviewDueAt?` ? review due ${when(latest.reviewDueAt)}`:""}</small>
              {latest.note ? <p>{latest.note}</p> : null}
              <div className="cpDeliv__acts">
                {latest.url ? <a className="ad__btn" href={latest.url} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" /> Open link</a> : null}
                <DeliverableFiles files={latest.files} button />
                <DeliverableActions deliverable={d} />
                <DeliverableDecisionHistory deliverable={d} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
  const restRows = (
    <div className="cpDeliv">
      {rest.map((d) => {
        const versions = d.versions.slice().reverse();
        const [latest, ...older] = versions;
        return (
          <div className="cpDeliv__row" key={d.id}>
            <span className="cpDeliv__icon" aria-hidden="true"><FileCheck2 /></span>
            <div className="cpDeliv__body">
              <div className="cpDeliv__title"><b>{d.name}</b><span className="ad__pill ad__pill--flat">v{latest.v}</span></div>
              <small>
                {d.approval === "Revision requested" && d.approvalNote ? <>Your note: “{d.approvalNote}”</> : `${when(latest.at)}${latest.note ? ` · ${latest.note}` : ""}`}
              </small>
              <DeliverableFiles files={latest.files} />
              <DeliverableDecisionHistory deliverable={d} />
              {older.length ? (
                /* EVERY VERSION IS KEPT, so "which logo did they approve"
                   stays answerable -- see the type's own comment on why
                   versions are appended, never replaced. */
                <details className="cpDeliv__older">
                  <summary>{older.length} earlier version{older.length === 1 ? "" : "s"}</summary>
                  {older.map((v) => (
                    <p key={v.v}>
                      v{v.v} · {when(v.at)}{v.note ? ` · ${v.note}` : ""}
                      {v.url ? <> · <a href={v.url} target="_blank" rel="noopener noreferrer">Open link</a></> : null}
                      <DeliverableFiles files={v.files} compact />
                    </p>
                  ))}
                </details>
              ) : null}
            </div>
            <span className="cpDeliv__end">
              <ApprovalPill approval={d.approval} />
              {latest.url ? <a className="cpDeliv__link" href={latest.url} target="_blank" rel="noopener noreferrer">Open link</a> : null}
            </span>
          </div>
        );
      })}
    </div>
  );

  /* What happens next: dated things the client can see. */
  const upcoming = [
    ...(p.due && p.stage !== "Delivered" ? [{ key: "due", when: p.due, title: "Project due", sub: p.scope || service?.short || "" }] : []),
    ...(owing ? [{ key: "pay", when: owing.due, title: `${owing.number} due`, sub: money(invoiceTotals(owing).due, currencyOf(owing)) }] : []),
    ...waiting.flatMap((d) => { const v = d.versions[d.versions.length - 1]; return v?.reviewDueAt ? [{ key: `r-${d.id}`, when: v.reviewDueAt, title: `Review ${d.name}`, sub: "Your answer is needed" }] : []; }),
  ].sort((a, b) => Date.parse(a.when) - Date.parse(b.when));

  /* The switcher across this client's live projects (C-Projects), when there is more than one. */
  const siblings = getProjects(true).filter((x) => request.allowedProjectIds.includes(x.id) && !x.archived && x.stage !== "Delivered");
  return (
    <>
      {siblings.length > 1 || (siblings.length === 1 && siblings[0].id !== p.id) ? (
        <nav className="ad__switch pProj__switch" aria-label="Your projects">
          {siblings.map((x) => <Link key={x.id} href={`/portal/projects/${x.id}`} aria-current={x.id === p.id ? "true" : undefined}>{x.title}</Link>)}
          <Link href="/portal/projects?show=all">All projects</Link>
        </nav>
      ) : null}
      <PageHead
        crumbs={[{ href: "/portal/projects?show=all", label: "Your projects" }]}
        title={p.title}
        lede={<>{client.company}{p.owner ? ` · led by ${p.owner}` : ""}{p.due ? ` · due ${dateWords(p.due, now)}` : " · no due date agreed yet"}</>}
        action={<Link className="ad__btn ad__btn--primary" href={askHref}><MessageSquare aria-hidden="true" />Message the team</Link>}
      >
        <p className="adT__row" style={{ marginTop: ".6rem" }}>
          <span className="ad__pill ad__pill--flat">{service?.short ?? p.service}</span>
          {p.health === "Waiting on client" ? <span className="ad__pill ad__pill--warn">Waiting on you</span> : null}
          {p.stage === "Delivered" ? <span className="ad__pill ad__pill--good">Delivered</span> : null}
        </p>
      </PageHead>

      <section className="adPg__stage" aria-label="Stage">
        <Stepper steps={STAGES} at={at} done={p.stage === "Delivered"} label={`Stage: ${p.stage}, ${at + 1} of ${STAGES.length}`} />
        <p className="adPg__note"><b>{p.stage}.</b> {next ? <>Next: {next}</> : "The studio will say what comes next here."}</p>
      </section>

      <div className="adPg__tabs"><Tabs label="Project sections" items={tabItems} current={tab} /></div>

      {tab === "overview" ? (
        <Workbench
          railLabel="Progress, team and facts"
          rail={<>
            <RailCard title="Progress">
              {[
                { t: "Stage", v: `${at + 1} of ${STAGES.length}`, s: (at + 1) / STAGES.length, tone: "var(--ad-series-1)" },
                { t: "Files approved", v: `${approved.length} of ${deliverables.length}`, s: deliverables.length ? approved.length / deliverables.length : 0, tone: "var(--ad-tone-good)" },
                ...(canBill && billed ? [{ t: "Paid", v: `${Math.round((paid / billed) * 100)}%`, s: paid / billed, tone: "var(--ad-series-2)" }] : []),
              ].map((r) => (
                <div key={r.t} className="adRc__row adPg__prog">
                  <span className="adRc__line"><strong>{r.t}</strong><span className="ad__num">{r.v}</span></span>
                  <MiniBar share={r.s} tone={r.tone} />
                </div>
              ))}
            </RailCard>
            <RailCard title="Team">
              {p.owner ? (
                <div className="adRc__split adPg__person">
                  <span className={`adMk adMk--round adMk--${avTone(p.owner)}`} aria-hidden="true">{initials(p.owner)}</span>
                  <span><span className="adRc__line"><strong>{p.owner}</strong></span><span className="adRc__sub">Leads this project</span></span>
                  <Link className="ad__btn" href={askHref} aria-label={`Message ${p.owner}`}><MessageSquare aria-hidden="true" /></Link>
                </div>
              ) : <p className="ad__dim" style={{ margin: 0 }}>The studio will name who leads this project.</p>}
            </RailCard>
            <RailCard title="Key facts">
              <dl className="adPg__facts">
                <div><dt>Client</dt><dd>{client.company}</dd></div>
                <div><dt>Service</dt><dd>{service?.name ?? p.service}</dd></div>
                {started ? <div><dt>Started</dt><dd>{dateWords(started, now, false)}</dd></div> : null}
                <div><dt>Due</dt><dd>{p.due ? dateWords(p.due, now) : "To be agreed"}</dd></div>
                <div><dt>Updates come by</dt><dd>{p.channel}</dd></div>
                {canBill && p.budget !== null ? <div><dt>Agreed</dt><dd className="ad__num">{naira(p.budget)}</dd></div> : null}
                {p.scope ? <div><dt>What we are making</dt><dd>{p.scope}</dd></div> : null}
              </dl>
            </RailCard>
          </>}
        >
          <section className="adList adPg__way" aria-label="What we need from you">
            <div className="adList__hd"><h2>What we need from you</h2><span className="adList__sp" />{needs.length ? <span className="adPg__count adPg__count--bad">{needs.length}</span> : null}</div>
            {needs.length ? (
              <ul className="adPg__list">
                {needs.map((n) => {
                  const Icon = n.icon;
                  return (
                    <li key={n.key} className="adPg__item">
                      <span className="adPg__ic adPg__ic--warn" aria-hidden="true"><Icon /></span>
                      <span className="adPg__txt"><b>{n.title}</b><span>{n.body}</span></span>
                      <span className="adPg__acts">{n.act}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty title="Nothing is needed from you" icon={CheckCircle2}>{p.stage === "Delivered" ? "This project is delivered." : "We will tell you here, and by email, the moment we need an answer."}</Empty>}
          </section>
          <section className="adList" aria-label="What happens next">
            <div className="adList__hd"><h2>What happens next</h2><span className="adList__sp" />{upcoming.length ? <span className="adList__n">{upcoming.length}</span> : null}</div>
            {upcoming.length ? (
              <ol className="adTl adPg__tl">
                {upcoming.map((n) => (
                  <li key={n.key}><span className="adTl__b"><strong>{n.title}</strong><small>{n.sub}</small></span><span className="adTl__w">{dateWords(n.when, now)}</span></li>
                ))}
              </ol>
            ) : <Empty title="Nothing is dated yet" icon={CalendarDays}>Dates appear here once the studio and you have agreed them.</Empty>}
          </section>
        </Workbench>
      ) : null}

      {tab === "yes" ? (
        <div className="adPg__stack">
          <Panel title="Needs your yes" id="needs">
            {waiting.length ? <><p className="cpSub">Open each one, then approve it or tell us what to change.</p>{waitingCards}</> : <Empty title="Nothing is waiting for you" icon={CheckCircle2}>When we share something to approve, it appears here and in your email.</Empty>}
          </Panel>
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="adPg__stack">
          <Panel title="Files and drafts" id="deliverables">
            {deliverables.length ? <>{waiting.length ? waitingCards : null}{restRows}</> : <Empty title="Nothing delivered yet" icon={FileCheck2}>Files and drafts the studio shares with you will appear here.</Empty>}
          </Panel>
        </div>
      ) : null}

      {tab === "money" && canBill ? (
        <div className="adPg__stack">
          <Panel title="Money on this project" action={<Link href="/portal/billing">Billing <ChevronRight aria-hidden="true" /></Link>}>
            {invoices.length ? (
              <div className="cpMoney">
                <dl className="cpFacts">
                  {p.budget !== null ? <div><dt>Agreed</dt><dd>{naira(p.budget)}</dd></div> : null}
                  <div><dt>Invoiced</dt><dd>{moneySummary(invoices,inv=>invoiceTotals(inv).total)}</dd></div>
                  <div><dt>Paid</dt><dd>{moneySummary(invoices,inv=>Math.min(inv.paid,invoiceTotals(inv).total))}</dd></div>
                </dl>
                <span className="cpMoney__bar" role="img" aria-label={`${Math.round((paid / billed) * 100)}% of what is invoiced is paid`}>
                  <i style={{ width: `${Math.min(100, (paid / billed) * 100)}%` }} />
                </span>
                {owing ? (
                  <a className="ad__btn ad__btn--primary cpMoney__pay" href={`/i/${owing.token}`} target="_blank" rel="noopener noreferrer">
                    Pay {money(invoiceTotals(owing).due,currencyOf(owing))}
                  </a>
                ) : <p className="cpScope">Everything invoiced is paid.</p>}
              </div>
            ) : (
              <p className="cpScope">Nothing has been invoiced on this project yet.</p>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="adPg__stack">
          <ProjectTimeline project={p} email={request.session?.user?.email||client.email} updates={updates} deliverables={deliverables} started={started} />
          <Panel title="Updates">
            {updates.length ? (
              <ol className="cpFeed cpFeed--cards">
                {updates.map((u) => (
                  <li key={u.id}>
                    <span className="cpFeed__dot" aria-hidden="true" />
                    <div className="cpFeed__card">
                      <div className="cpFeed__head"><HealthPill health={u.health} /><small>{when(u.at)} · {u.author}</small></div>
                      <p className="cpFeed__lead">{u.progress}</p>
                      {u.next ? <p><b>Next:</b> {u.next}</p> : null}
                      <Link className="ad__btn" href={`/portal/support?new=1&project=${p.id}&subject=${encodeURIComponent(`Re: ${p.title} update, ${when(u.at)}`)}`}>
                        <MessageSquareReply aria-hidden="true" /> Reply
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No updates yet" icon={ScrollText}>Progress notes the studio shares with you will show up here.</Empty>
            )}
          </Panel>
          <ProjectWorkspace projectId={p.id} />
        </div>
      ) : null}
    </>
  );
}

async function DeliverableFiles({ files, button = false, compact = false }: { files: { name: string; key: string }[] | undefined; button?: boolean; compact?: boolean }) {
  const { support } = await getPortalRequest();
  const links = deliverableFileLinks(files);
  if (!links.length) return null;
  return (
    <span className={`cpDeliv__files${compact ? " cpDeliv__files--compact" : ""}`}>
      {links.map((file) => (
        <span key={file.key} className="cpDeliv__file">
          <b>{file.name}</b>
          {file.open && !support ? <a className={button ? "ad__btn" : "cpDeliv__link"} href={file.open} target="_blank" rel="noopener noreferrer"><Eye aria-hidden="true" /> Open</a> : <span className="ad__dim">Unavailable</span>}
          {file.download && !support ? <a className={button ? "ad__btn" : "cpDeliv__link"} href={file.download}><Download aria-hidden="true" /> Download</a> : null}
        </span>
      ))}
    </span>
  );
}

function DeliverableDecisionHistory({deliverable}:{deliverable:Deliverable}) {
  if(!deliverable.decisions?.length)return null;
  return <details className="cpDeliv__older"><summary>Decision history</summary>{deliverable.decisions.map((decision,index)=><p key={index}>v{decision.version} - {decision.decision} - {when(decision.at)}{decision.actor?` - ${decision.actor}`:""}{decision.note?` - ${decision.note}`:""}</p>)}</details>;
}
