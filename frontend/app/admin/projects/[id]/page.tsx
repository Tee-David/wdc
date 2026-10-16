import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDollarSign, FileCheck2, Hourglass, ListChecks, Wallet } from "lucide-react";
import { SERVICES } from "@/lib/services";
import {
  creditBalance, financeDefaults, getClient, getDeliverablesFor, getExpensesFor, getInvoicesFor, getProject,
  getTasksFor, getUpdatesFor, projectMargin,
} from "@/lib/admin/store";
import { noticeBlock } from "@/lib/admin/money-rules";
import { STAGES, invoiceStatus, invoiceTotals, naira, taskIsWaiting, type Task } from "@/lib/admin/types";
import { ApprovalPill, Empty, InvoicePill, Panel } from "@/components/admin/bits";
import { InvoiceMenu } from "@/components/admin/row-actions";
import { AddNote, SetDue, StageMover } from "@/components/admin/project-forms";
import { AddTask, Deliverables, Tasks, Updates } from "@/components/admin/delivery";
import { AddExpense, InvoiceBuilder } from "@/components/admin/money-forms";
import AuditLog from "@/components/admin/audit-log";
import { ProjectChores } from "@/components/admin/project-chores";
import { PageHead } from "@/components/admin/page-head";
import { MiniBar, RailCard, StatTiles, Workbench } from "@/components/admin/workbench";
import { Stepper } from "@/components/admin/stepper";
import { Tabs } from "@/components/admin/tabs";
import { RemindButton } from "@/components/admin/client-bits";
import { Calendar } from "@/components/admin/calendar/calendar";
import { studioStamp } from "@/components/admin/calendar/studio-time";
import { ProjectWorkspace } from "@/components/workspace/project-workspace";
import { listServiceRecords } from "@/lib/workspace/service-store";
import type { ServiceRecord } from "@/lib/workspace/service-model";
import { postCalendar } from "@/lib/admin/content-calendar";
import { meetingList } from "@/lib/meetings/store";
import { avTone, initials } from "@/lib/admin/client-mark";
import { dateTimeWords, dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { nairaTile } from "@/lib/admin/short-money";
import { adminRole } from "@/lib/admin/guard";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { AdminState as ScopeState } from "@/components/admin/admin-state";
import { can } from "@/lib/admin/permissions";
import { hydrateSettings } from "@/lib/settings/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { deliverableFileLinks } from "@/lib/deliverable-files";
import "@/components/admin/project-page.css";

/* NO generateStaticParams: projects are created at runtime now, and a route
   list frozen at build time would 404 on anything opened since. */

/* See the note beside the same function in clients/[id]/page.tsx: calling
   `notFound()` from here as well as the page body is the recommended way to
   get a missing id decided before anything streams. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const p = getProject(id);
  if (!p) notFound();
  return { title: `${p.title} · Project` };
}

type Q = { tab?: string };
const TABS = ["overview", "tasks", "work", "approvals", "files", "money", "activity"] as const;
type Tab = (typeof TABS)[number];

/** What each service calls the working tab: the content calendar for social, design rounds for branding, and so on. */
const WORK: Record<string, string> = {
  social: "Content calendar", branding: "Design rounds", web: "Build and launch", apps: "Builds", software: "Milestones", seo: "Content",
};
const DAY = 86_400_000;

/**
 * ONE PROJECT, seven tabs (the approved board): Overview (what is in the way, what happens next, with progress, the
 * team and the facts in the rail), Tasks, the service's own work (the content calendar for a social project, design
 * rounds for branding, builds for apps and so on, from the service workspace), Approvals, Files, Money and Activity.
 * The tab is in the address so a reload and a shared link keep it. Staff run the work and never see the money: no
 * Money tab, no budget, no amounts. Everything on the page is read from the store; nothing is invented.
 */
export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const query = await searchParams;
  const p = getProject(id);
  if (!p) notFound();
  await hydrateSettings();
  const finance = financeDefaults();
  const role = await adminRole();
  /* A staff member opens only the projects in their scope; the address of any other is refused, not shown. */
  if (!inScope(await staffScope(role), "projects", p.id)) {
    return <section className="ad__panel"><ScopeState kind="forbidden" title="This project is not one of yours" description="Ask Admin to add you to the project or to its client's department." back={{ href: "/admin/projects", label: "Back to your projects" }} /></section>;
  }
  const money = can(role, "money");
  const isOwner = role === "owner";
  const now = nowMs();
  const today = studioStamp(now);

  const client = getClient(p.clientId);
  const service = SERVICES.find((x) => x.slug === p.service);
  const invoices = client ? getInvoicesFor(client.id).filter((i) => i.projectId === p.id) : [];
  const held = client ? creditBalance(client.id) : 0;
  const credits = client && held > 0 ? { [client.id]: held } : undefined;
  const why = client ? noticeBlock(client) : undefined;
  const noEmail = client && why ? { [client.id]: why } : undefined;
  const at = STAGES.indexOf(p.stage);
  const tasks = getTasksFor(p.id);
  const updates = getUpdatesFor(p.id);
  const deliverables = getDeliverablesFor(p.id);
  const fileLinks = Object.fromEntries(deliverables.flatMap((deliverable) => deliverable.versions.flatMap((version) =>
    deliverableFileLinks(version.files).map((file) => [`${deliverable.id}:${version.v}:${file.key}`, { open: file.open, download: file.download }]),
  )));
  const margin = projectMargin(p.id);
  const costs = getExpensesFor(p.id);

  const asked: Tab = TABS.find((t) => t === query.tab) ?? "overview";
  const tab: Tab = asked === "money" && !money ? "overview" : asked;
  const tabHref = (t: Tab) => `/admin/projects/${p.id}${t === "overview" ? "" : `?tab=${t}`}`;

  /* The service's own records (content calendar posts, design rounds...) come from the workspace tables; a missing
     table is "none to show", and the workspace panel itself says what to apply. */
  let records: ServiceRecord[] = [];
  let recordsFailed = false;
  if (tab === "work" || tab === "overview") {
    try { records = await listServiceRecords(p.id, false); } catch { recordsFailed = true; }
  }
  const posts = p.service === "social" ? postCalendar(records, p.id) : null;

  /* WHAT NEEDS ATTENTION, derived from the records so it cannot go stale. */
  const openTasks = tasks.filter((t) => !t.done);
  const lateTasks = openTasks.filter((t) => t.due && Date.parse(t.due) < now);
  const waitingTasks = openTasks.filter((t) => taskIsWaiting(t, tasks));
  const awaiting = deliverables.filter((d) => d.approval === "Awaiting client");
  const revising = deliverables.filter((d) => d.approval === "Revision requested");
  const approved = deliverables.filter((d) => d.approval === "Approved");
  const lastBlockers = updates.slice().sort((a, b) => b.at.localeCompare(a.at)).find((u) => u.blockers.trim())?.blockers.trim();
  const unpaid = money ? invoices.filter((i) => !i.voided && i.status !== "Draft" && invoiceTotals(i).due > 0) : [];

  type Way = { key: string; tone: "bad" | "warn" | "live"; icon: typeof AlertTriangle; title: string; body: string; actions?: React.ReactNode };
  const way: Way[] = [];
  if (p.stage !== "Delivered") {
    if (p.health === "Blocked") way.push({ key: "blocked", tone: "bad", icon: AlertTriangle, title: "Blocked", body: lastBlockers ?? "The project is marked blocked. Say what is in the way in an update.", actions: <Link className="ad__btn" href={tabHref("activity")}>Post an update</Link> });
    if (p.health === "Waiting on client") way.push({ key: "waiting", tone: "warn", icon: Hourglass, title: "Waiting on the client", body: lastBlockers ?? `Work has paused until ${client?.company ?? "the client"} answers.`, actions: client ? <Link className="ad__btn" href={`/admin/clients/${client.id}`}>Open {client.company}</Link> : undefined });
    if (p.health === "At risk") way.push({ key: "risk", tone: "warn", icon: AlertTriangle, title: "At risk", body: lastBlockers ?? "The project is marked at risk. Post an update to say why.", actions: <Link className="ad__btn" href={tabHref("activity")}>Post an update</Link> });
  }
  for (const i of unpaid) {
    const st = invoiceStatus(i);
    way.push({
      key: `inv-${i.id}`, tone: st === "Overdue" ? "bad" : "warn", icon: CircleDollarSign, title: `${i.number} ${st === "Overdue" ? "is overdue" : "is unpaid"}`,
      body: `${naira(invoiceTotals(i).due)} ${st === "Overdue" ? "was due" : "due"} ${dateWords(i.due, now)}.`,
      actions: <><Link className="ad__btn" href={`/admin/money/${i.id}`}>Preview invoice</Link><RemindButton invoiceId={i.id} label="Send a reminder" /></>,
    });
  }
  if (awaiting.length) way.push({ key: "awaiting", tone: "warn", icon: FileCheck2, title: `${awaiting.length} ${awaiting.length === 1 ? "file is" : "files are"} with the client`, body: awaiting.slice(0, 3).map((d) => d.name).join(", "), actions: <Link className="ad__btn" href={tabHref("approvals")}>Open approvals</Link> });
  if (revising.length) way.push({ key: "revising", tone: "warn", icon: FileCheck2, title: `${revising.length} ${revising.length === 1 ? "file needs" : "files need"} changes`, body: revising.slice(0, 3).map((d) => `${d.name}: ${d.approvalNote ?? "changes requested"}`).join(". "), actions: <Link className="ad__btn" href={tabHref("files")}>Open files</Link> });
  if (lateTasks.length) way.push({ key: "late", tone: "bad", icon: ListChecks, title: `${lateTasks.length} ${lateTasks.length === 1 ? "task is" : "tasks are"} overdue`, body: lateTasks.slice(0, 3).map((t) => t.title).join(", "), actions: <Link className="ad__btn" href={tabHref("tasks")}>Open tasks</Link> });
  if (waitingTasks.length) way.push({ key: "stuck", tone: "live", icon: ListChecks, title: `${waitingTasks.length} ${waitingTasks.length === 1 ? "task is" : "tasks are"} waiting on another`, body: waitingTasks.slice(0, 3).map((t) => t.title).join(", "), actions: <Link className="ad__btn" href={tabHref("tasks")}>Open tasks</Link> });

  /* WHAT HAPPENS NEXT: dated things only, soonest first. */
  type Next = { key: string; when: string; title: string; sub: string; who?: string };
  const next: Next[] = [];
  for (const t of openTasks) if (t.due) next.push({ key: `t-${t.id}`, when: t.due, title: t.title, sub: t.assignee ? `With ${t.assignee}` : "Nobody has it yet", who: t.assignee || undefined });
  if (p.due && p.stage !== "Delivered") next.push({ key: "due", when: p.due, title: "Project due", sub: client?.company ?? "", who: p.owner || undefined });
  for (const i of unpaid) next.push({ key: `i-${i.id}`, when: i.due, title: `${i.number} due`, sub: naira(invoiceTotals(i).due) });
  if (isOwner && client) {
    try {
      const emails = new Set([client.email, ...(client.contacts ?? []).map((c) => c.email ?? "")].map((e) => e.trim().toLowerCase()).filter(Boolean));
      const list = await meetingList(new Date(now).toISOString(), new Date(now + 60 * DAY).toISOString());
      for (const b of list) if (["accepted", "confirmed", "pending"].includes(b.status.toLowerCase()) && (b.attendees ?? []).some((a) => emails.has(a.email.trim().toLowerCase()))) next.push({ key: `m-${b.uid}`, when: b.start, title: b.title, sub: b.status.toLowerCase() === "pending" ? "Awaiting confirmation" : "Meeting" });
    } catch { /* No bookings table or provider: no meeting is listed. */ }
  }
  next.sort((a, b) => Date.parse(a.when) - Date.parse(b.when));

  const lead = p.owner || "";
  const people = [...new Set([lead, ...tasks.map((t: Task) => t.assignee.trim())].filter(Boolean))];
  const stageNote = updates.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
  const attentionTone = way.some((w) => w.tone === "bad") ? ("bad" as const) : way.length ? ("warn" as const) : undefined;

  const workLabel = WORK[p.service] ?? "Service work";
  const tabItems = [
    { key: "overview", label: "Overview", href: tabHref("overview") },
    { key: "tasks", label: "Tasks", href: tabHref("tasks"), count: openTasks.length || undefined, tone: lateTasks.length ? ("bad" as const) : undefined },
    { key: "work", label: workLabel, href: tabHref("work") },
    { key: "approvals", label: "Approvals", href: tabHref("approvals"), count: awaiting.length || undefined, tone: awaiting.length ? ("warn" as const) : undefined },
    { key: "files", label: "Files", href: tabHref("files"), count: deliverables.length || undefined },
    ...(money ? [{ key: "money", label: "Money", href: tabHref("money"), count: invoices.length || undefined, tone: unpaid.some((i) => invoiceStatus(i) === "Overdue") ? ("bad" as const) : undefined }] : []),
    { key: "activity", label: "Activity", href: tabHref("activity") },
  ];

  /* The budget is money: staff never get it, in the page or in what the details form is sent. */
  const safe = money ? p : { ...p, budget: null };

  return (
    <>
      <PageHead
        crumbs={[{ href: "/admin/projects", label: "Projects" }, ...(client ? [{ href: `/admin/clients/${client.id}`, label: client.company }] : [])]}
        title={p.title}
        lede={<>{client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link> : "Unknown client"}{lead ? ` · led by ${lead}` : ""}{p.due ? ` · due ${dateWords(p.due, now)}` : " · no due date yet"}</>}
        action={<AddTask project={p} tasks={tasks} dataTour="proj-tasks" />}
        chores={<ProjectChores project={safe} clientName={client?.company} />}
      >
        <p className="adT__row" style={{ marginTop: ".6rem" }}>
          <span className="ad__pill ad__pill--flat">{service?.short ?? p.service}</span>
          {p.health !== "On track" ? <span className={`ad__pill ${p.health === "Blocked" ? "ad__pill--bad" : "ad__pill--warn"}`}>{p.health}</span> : null}
          {p.stage === "Delivered" ? <span className="ad__pill ad__pill--good">Delivered</span> : null}
          {p.archived ? <span className="ad__pill ad__pill--flat">Archived</span> : null}
        </p>
      </PageHead>

      <section className="adPg__stage" aria-label="Stage" data-tour="proj-stage">
        <Stepper steps={STAGES} at={at} done={p.stage === "Delivered"} label={`Stage: ${p.stage}, ${at + 1} of ${STAGES.length}`} />
        <p className="adPg__note">
          {stageNote ? <><b>{p.stage}:</b> {stageNote.progress || stageNote.next || "No note yet."}</> : <><b>{p.stage}.</b> No update has been written yet.</>}
        </p>
        <StageMover project={p} />
      </section>

      <div className="adPg__tabs"><Tabs label="Project sections" items={tabItems} current={tab} /></div>

      {tab === "overview" ? (
        <Workbench
          railLabel="Progress, team and facts"
          rail={<>
            <RailCard title="Progress">
              {[
                { t: "Stage", v: `${at + 1} of ${STAGES.length}`, s: (at + 1) / STAGES.length, tone: "var(--ad-series-1)" },
                { t: "Tasks done", v: `${tasks.length - openTasks.length} of ${tasks.length}`, s: tasks.length ? (tasks.length - openTasks.length) / tasks.length : 0, tone: "var(--ad-series-2)" },
                { t: "Files approved", v: `${approved.length} of ${deliverables.length}`, s: deliverables.length ? approved.length / deliverables.length : 0, tone: "var(--ad-tone-good)" },
              ].map((r) => (
                <div key={r.t} className="adRc__row adPg__prog">
                  <span className="adRc__line"><strong>{r.t}</strong><span className="ad__num">{r.v}</span></span>
                  <MiniBar share={r.s} tone={r.tone} />
                </div>
              ))}
            </RailCard>
            <RailCard title="Team">
              {people.length ? people.map((n) => {
                const mine = openTasks.filter((t) => t.assignee.trim() === n).length;
                return (
                  <div key={n} className="adRc__split adPg__person">
                    <span className={`adMk adMk--round adMk--${avTone(n)}`} aria-hidden="true">{initials(n)}</span>
                    <span><span className="adRc__line"><strong>{n}</strong></span><span className="adRc__sub">{n === lead ? "Lead" : "On tasks"}{mine ? ` · ${mine} open` : ""}</span></span>
                  </div>
                );
              }) : <p className="ad__dim" style={{ margin: 0 }}>Nobody is on this yet. Choose a lead under Edit details.</p>}
            </RailCard>
            <RailCard title="Key facts">
              <dl className="adPg__facts">
                <div><dt>Client</dt><dd>{client ? <Link href={`/admin/clients/${client.id}`}>{client.company}</Link> : "Unknown"}</dd></div>
                <div><dt>Service</dt><dd>{service?.name ?? p.service}</dd></div>
                <div><dt>Updates go through</dt><dd>{p.channel}</dd></div>
                <div><dt>Due</dt><dd>{p.due ? dateWords(p.due, now) : <span className="ad__dim">Not set</span>}</dd></div>
                {money ? <div><dt>Budget</dt><dd className="ad__num">{p.budget === null ? <span className="ad__dim">No figure agreed</span> : naira(p.budget)}</dd></div> : null}
                <div><dt>Scope</dt><dd>{p.scope || <span className="ad__dim">Not written down yet</span>}</dd></div>
              </dl>
            </RailCard>
          </>}
        >
          <section className="adList adPg__way" aria-label="What is in the way" data-tour="proj-way">
            <div className="adList__hd"><h2>What is in the way</h2><span className="adList__sp" />{way.length ? <span className={`adPg__count adPg__count--${attentionTone}`}>{way.length}</span> : null}</div>
            {way.length ? (
              <ul className="adPg__list">
                {way.map((w) => {
                  const Icon = w.icon;
                  return (
                    <li key={w.key} className="adPg__item">
                      <span className={`adPg__ic adPg__ic--${w.tone}`} aria-hidden="true"><Icon /></span>
                      <span className="adPg__txt"><b>{w.title}</b><span>{w.body}</span></span>
                      {w.actions ? <span className="adPg__acts">{w.actions}</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Nothing is in the way" icon={CheckCircle2}>{p.stage === "Delivered" ? "This project is delivered." : "No blocked work, unpaid invoice, overdue task or file waiting on the client."}</Empty>
            )}
          </section>

          <section className="adList" aria-label="What happens next" data-tour="proj-next">
            <div className="adList__hd"><h2>What happens next</h2><span className="adList__sp" />{next.length ? <span className="adList__n">{Math.min(5, next.length)}</span> : null}</div>
            {next.length ? (
              <ol className="adTl adPg__tl">
                {next.slice(0, 5).map((n) => (
                  <li key={n.key}>
                    <span className="adTl__b"><strong>{n.title}</strong><small>{n.sub}</small></span>
                    {n.who ? <span className={`adMk adMk--sm adMk--round adMk--${avTone(n.who)}`} role="img" aria-label={n.who}>{initials(n.who)}</span> : null}
                    <span className={`adTl__w${Date.parse(n.when) < now && !n.key.startsWith("m-") ? " adPg__late" : ""}`}>{n.key.startsWith("m-") ? dateTimeWords(n.when, now) : dateWords(n.when, now)}</span>
                  </li>
                ))}
              </ol>
            ) : <Empty title="Nothing is dated yet" icon={CalendarDays}>Add a task with a date, or set the project due date, and it shows here in order.</Empty>}
          </section>

          {isOwner ? <ProjectWorkspace projectId={p.id} part="access" /> : null}
        </Workbench>
      ) : null}

      {tab === "tasks" ? <div className="adPg__stack"><Tasks project={p} tasks={tasks} /></div> : null}

      {tab === "work" ? (
        <div className="adPg__stack">
          {posts ? (
            <section className="adList" aria-label="Content calendar" data-tour="proj-calendar">
              <div className="adList__hd">
                <h2>Content calendar</h2><span className="adList__n">{posts.total}</span><span className="adList__sp" />
              </div>
              {posts.events.length ? (
                <Calendar
                  id={`posts-${p.id}`} cals={posts.cals} events={posts.events} today={today.date} now={today.time} listTitle="Platforms"
                  add={isOwner || role === "staff" ? { label: "Plan a post", href: `/admin/projects/${p.id}?tab=work&new=1` } : undefined}
                  exportName={`${p.title} content calendar`} dataTour="proj-calendar-grid"
                  summaryNote={(() => { const n = posts.events.filter((e) => e.tag?.text === "With client").length; return n ? `${n} with the client` : undefined; })()}
                />
              ) : (
                <Empty title={posts.total ? "No post has a planned time yet" : "No posts planned yet"} icon={CalendarDays}
                  action={<Link className="ad__btn ad__btn--primary" href={`/admin/projects/${p.id}?tab=work&new=1`}>Plan a post</Link>}>
                  {posts.total ? `${posts.unplanned} ${posts.unplanned === 1 ? "post has" : "posts have"} no planned time, so it cannot sit on the calendar. Open it below and set one.` : "Each post gets a platform, a caption and a planned time. They appear here by day and go to the client for approval."}
                </Empty>
              )}
              {posts.unplanned && posts.events.length ? <p className="adPg__foot">{posts.unplanned} {posts.unplanned === 1 ? "post has" : "posts have"} no planned time and is not on the calendar. Open it below to set one.</p> : null}
            </section>
          ) : null}
          {recordsFailed && posts ? <p className="adPg__foot" role="status">The calendar could not read this project&rsquo;s posts just now. The panel below says what to check.</p> : null}
          <ProjectWorkspace projectId={p.id} part="service" />
        </div>
      ) : null}

      {tab === "approvals" ? (
        <section className="adList" aria-label="Approvals" data-tour="proj-approvals">
          <div className="adList__hd"><h2>Approvals</h2><span className="adList__n">{deliverables.length}</span></div>
          {deliverables.length ? (
            <div className="ad__scroll" tabIndex={0} role="region" aria-label="Approvals table, scrolls sideways" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>File</th><th>Version</th><th>State</th><th>Last decision</th></tr></thead>
                <tbody>
                  {deliverables.map((d) => {
                    const last = d.decisions?.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
                    return (
                      <tr key={d.id}>
                        <td><Link href={tabHref("files")}><b>{d.name}</b></Link></td>
                        <td className="num">v{d.versions[d.versions.length - 1]?.v ?? 1}</td>
                        <td><ApprovalPill approval={d.approval} /></td>
                        <td>{last ? <>{last.decision}{last.actor ? ` by ${last.actor}` : ""} <small className="ad__dim">{whenWords(last.at, now)}</small>{last.note ? <small className="adT__clip ad__dim">{last.note}</small> : null}</> : <span className="ad__dim">Nothing yet</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty title="Nothing is waiting for approval" icon={FileCheck2} action={<Link className="ad__btn" href={tabHref("files")}>Add a file</Link>}>Add a deliverable under Files and send it to the client. Their answer shows here.</Empty>}
        </section>
      ) : null}

      {tab === "files" ? <div className="adPg__stack"><Deliverables project={p} items={deliverables} fileLinks={fileLinks} /></div> : null}

      {tab === "money" && money ? (
        <div className="adPg__stack">
          <div className="adPg__tiles" data-tour="proj-margin">
            <StatTiles items={[
              { label: "Agreed budget", value: p.budget === null ? "Not agreed" : nairaTile(p.budget), note: "From the project details", icon: Wallet, tone: "brand" },
              { label: "Invoiced", value: nairaTile(margin.invoiced), note: `${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`, icon: CircleDollarSign, tone: "brand" },
              { label: "Collected", value: nairaTile(margin.collected), note: margin.invoiced ? `${Math.round((margin.collected / margin.invoiced) * 100)}% of invoiced` : "Nothing invoiced", icon: Wallet, tone: "good" },
              { label: "Spent on it", value: nairaTile(margin.spend), note: costs.length ? `${costs.length} ${costs.length === 1 ? "expense" : "expenses"}` : "Nothing allocated", icon: Wallet, tone: "neutral" },
              { label: "Net so far", value: nairaTile(margin.net), note: "Collected less spend", icon: Wallet, tone: margin.net >= 0 ? "good" : "bad" },
            ]} />
          </div>
          <section className="adList" aria-label="Invoices">
            <div className="adList__hd"><h2>Invoices</h2><span className="adList__n">{invoices.length}</span><span className="adList__sp" />
              {client ? <InvoiceBuilder clientId={client.id} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} /> : null}
            </div>
            {invoices.length ? (
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Invoices table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Number</th><th>Status</th><th>Due</th><th className="num">Owed</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                        <td><InvoicePill status={invoiceStatus(i)} /></td>
                        <td className="num">{dateWords(i.due, now, false)}</td>
                        <td className="num">{invoiceTotals(i).due ? naira(invoiceTotals(i).due) : <span className="ad__dim">Nil</span>}</td>
                        <td className="ad__rmC">
                          <InvoiceMenu invoice={i} noReceipt={why}
                            edit={client ? { clientName: client.company, projectTitle: i.projectId === p.id ? p.title : undefined } : undefined} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="Nothing invoiced on this project" icon={CircleDollarSign}>Raise an invoice against it to track what is billed and paid.</Empty>}
          </section>
          <Panel title="Spent on it" action={<AddExpense project={p} />}>
            {costs.length ? (
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Expenses table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>When</th><th>What</th><th>Who was paid</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {costs.map((e) => (
                      <tr key={e.id}>
                        <td className="ad__dim ad__num">{dateWords(e.at, now, false)}</td>
                        <td>{e.description}{e.rebillable ? <span className="ad__pill ad__pill--warn" style={{ marginLeft: ".35rem" }}>Rebillable</span> : null}</td>
                        <td className="ad__dim">{e.vendor ?? "None named"}</td>
                        <td className="num">{naira(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing spent on this yet" icon={Wallet}>Book a cost against this project with Add expense and it counts toward its margin. Studio overheads are not spread across jobs.</Empty>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="adPg__stack">
          <Updates project={p} updates={updates} />
          <Panel title="History">
            {/* APPEND-ONLY, newest first. A project's history is evidence: it is
                what answers "when did we send that" three months later. */}
            {p.events.length ? (
              <ol className="adTl adPg__tl">
                {p.events.slice().reverse().map((e, n) => (
                  <li key={n}><span className="adTl__b"><span>{e.text}</span></span><span className="adTl__w">{dateWords(e.at, now)}</span></li>
                ))}
              </ol>
            ) : <Empty title="Nothing recorded yet">Stage moves, sign-offs and changes are written here as they happen.</Empty>}
            <div className="adPg__addnote"><AddNote project={p} /></div>
          </Panel>
          <SetDueRow p={p} />
          <ProjectWorkspace projectId={p.id} part="team" />
          {/* THE SYSTEMS RECORD, which the History panel deliberately is not.
              History is a narrative for whoever opens this next week. This is
              every write with its before and after, which is what gets read
              when somebody asks why a date says what it says. */}
          <AuditLog kind="project" subjectId={p.id} limit={20} title="Changes to this project" />
        </div>
      ) : null}
    </>
  );
}

function SetDueRow({ p }: { p: NonNullable<ReturnType<typeof getProject>> }) {
  return (
    <Panel title="Due date">
      <div className="ad__panelBody"><SetDue project={p} /></div>
    </Panel>
  );
}
