import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, FileClock, CalendarClock, CircleDollarSign, ClipboardList, Clock, FolderClock, FolderKanban, LifeBuoy, MailWarning, MessageSquareWarning, Send, TrendingUp, Users, Wallet } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { getBoard, getClient, getClients, getDeliverablesFor, getInvoices, getMonthly, getPayments, getProjects, getSubmissions, getSummary, getTasks, getTickets, providerAttentionCount } from "@/lib/admin/store";
import { failedLoggedCount } from "@/lib/message-log";
import { reviewCount } from "@/lib/blog-db";
import { invoiceStatus, invoiceTotals, naira, nairaShort, projectAttention, STAGES } from "@/lib/admin/types";

/* Worst first. The attention queue is read top-down in the morning, so the
   order has to be the order somebody should act in rather than the order the
   projects happen to be stored in. */
const TONE_RANK = { bad: 0, warn: 1, info: 2 } as const;
/* The combined queue mixes invoices, projects and unfinished onboarding, and
   each carries one of these three tones. Anything unexpected sorts last rather
   than first, so a new kind of row added later cannot silently take the top. */
const ROW_RANK: Record<string, number> = { bad: 0, warn: 1, neutral: 2 };
import { AddClient } from "./client-form";
import { MyWork } from "./my-work";
import { unreadTotal } from "@/lib/forms/entries";
import { AddExpense, InvoiceBuilder, RecordAnyPayment } from "./money-forms";
import { AddProject } from "./project-forms";
import { InvoiceMenu, ProjectMenu, SubmissionMenu } from "./row-actions";
import { Empty, Panel, Tile, when } from "./bits";
import { RecentLeads, RecentLeadsSkeleton } from "./recent-leads";
import PageTourButton from "./tour/page-tour-button";
import { CashflowChart } from "./cashflow-chart";
import { CountUp } from "./count-up";
import "./dashboard.css";
import { ExampleNote } from "@/components/admin/example-note";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * `money` is false for staff (lib/admin/permissions.ts): the books are not on
 * their dashboard at all -- no figures, no invoice rows in the queue, no
 * money quick actions -- rather than shown and then refused.
 */
export async function AdminDashboardView({ firstName, money = true, me }: { firstName?: string; money?: boolean; me?: { id: string; name: string } }) {
  const failedMail = money ? await failedLoggedCount() : 0;
  /* The owner is the one who publishes, so the queue is theirs. */
  const inReview = money && (process.env.DATABASE_URL || process.env.COCKROACHDB_URL) ? await reviewCount().catch(() => 0) : 0;
  const clients = getClients();
  const projects = getProjects();
  const invoices = getInvoices();
  const payments = getPayments().sort((a, b) => b.at.localeCompare(a.at));
  const summary = getSummary();
  const board = getBoard();
  const monthly = getMonthly();
  const collectionRate = summary.invoiced ? Math.round((summary.collected / summary.invoiced) * 100) : 0;

  const tasks = getTasks();
  const attention = [
    ...(money ? invoices : [])
      .filter((invoice) => invoiceStatus(invoice) === "Overdue")
      .map((invoice) => ({
        href: `/admin/money/${invoice.id}`,
        title: `${invoice.number} is overdue`,
        detail: `${getClient(invoice.clientId)?.company ?? "Unknown client"} · ${naira(invoiceTotals(invoice).due)} outstanding`,
        meta: `Due ${when(invoice.due)}`,
        icon: AlertTriangle,
        tone: "bad",
        menu: <InvoiceMenu invoice={invoice} />,
      })),
    /* PROJECTS THAT ARE ACTUALLY ASKING FOR SOMEBODY, not projects that happen
       to sit in a particular stage.

       This used to list everything in Onboarding or Revisions, which is a
       proxy and a poor one: a project can sit in Onboarding for a fortnight
       while the client fills the form, which is fine, and one can rot in "In
       progress" for a month with nobody chasing it, which is not. Both were
       the wrong way round on the only screen anybody reads in the morning.

       `projectAttention` derives the real reasons -- overdue, blocked, waiting
       on a client, in revision, a task that has slipped -- from the project,
       its tasks and today's date. A project with none of them does not appear,
       which is what makes an empty queue mean something. */
    ...projects
      .map((project) => ({ project, why: projectAttention(project, tasks) }))
      .filter((x) => x.why.length)
      /* Worst first, so the top of the list is the thing to do first. */
      .sort((a, b) => TONE_RANK[a.why[0].tone] - TONE_RANK[b.why[0].tone])
      .map(({ project, why }) => ({
        href: `/admin/projects/${project.id}`,
        title: project.title,
        detail: `${getClient(project.clientId)?.company ?? "Unknown client"} · ${why.map((w) => w.label).join(" · ")}`,
        meta: project.due ? `Due ${when(project.due)}` : "Date not set",
        icon: FolderClock,
        tone: why[0].tone === "bad" ? "bad" : why[0].tone === "warn" ? "warn" : "neutral",
        menu: <ProjectMenu project={project} clientName={getClient(project.clientId)?.company} />,
      })),
    /* WHAT THE BANK AND THE MAIL SERVER DID NOT DO CLEANLY. Money that
       matched no invoice, and messages that did not go, are an absence on
       every other screen; here they are a row with the fix one click away. */
    ...(money && providerAttentionCount() ? [{
      href: "/admin/money/reconciliation",
      title: `${providerAttentionCount()} payment event${providerAttentionCount() === 1 ? "" : "s"} did not land cleanly`,
      detail: "Money Paystack reported that is not matched to an invoice, or an event that failed its checks",
      meta: "Reconciliation",
      icon: AlertTriangle,
      tone: "bad",
      menu: null,
    }] : []),
    ...(money && failedMail ? [{
      href: "/admin/money/reconciliation",
      title: `${failedMail} message${failedMail === 1 ? "" : "s"} did not go`,
      detail: "Emails the mail server refused or that could not be sent",
      meta: "Reconciliation",
      icon: MailWarning,
      tone: "warn",
      menu: null,
    }] : []),
    ...(inReview ? [{
      href: "/admin/blog?state=review",
      title: `${inReview} blog post${inReview === 1 ? "" : "s"} waiting for review`,
      detail: "Submitted by staff. Publish, or send back with a note",
      meta: "Blog",
      icon: FileClock,
      tone: "warn",
      menu: null,
    }] : []),
    /* WHAT A CLIENT DID IN THE PORTAL AND IS WAITING ON US FOR. */
    ...projects.flatMap((project) => getDeliverablesFor(project.id)
      .filter((d) => d.approval === "Revision requested")
      .map((d) => ({
        href: `/admin/projects/${project.id}`,
        title: `Changes asked for on ${d.name}`,
        detail: `${getClient(project.clientId)?.company ?? "Unknown client"} · ${d.approvalNote ?? "No note given"}`,
        meta: project.title,
        icon: MessageSquareWarning,
        tone: "warn",
        menu: null,
      }))),
    ...getTickets()
      .filter((t) => t.status === "Open")
      .map((t) => ({
        href: `/admin/clients/${t.clientId}`,
        title: `${getClient(t.clientId)?.company ?? "A client"} is waiting for a reply`,
        detail: t.subject,
        meta: `Asked ${when(t.updatedAt)}`,
        icon: LifeBuoy,
        tone: "warn",
        menu: null,
      })),
    ...getSubmissions()
      .filter((submission) => submission.status === "In progress")
      .map((submission) => ({
        href: `/admin/forms/${submission.id}`,
        title: `${String(submission.answers.company ?? submission.answers.first_name ?? "Unnamed lead")} has not finished onboarding`,
        detail: SERVICES.find((service) => service.slug === submission.service)?.short ?? submission.service,
        meta: `Started ${when(submission.startedAt)}`,
        icon: ClipboardList,
        tone: "neutral",
        menu: <SubmissionMenu submission={submission} clients={clients} />,
      })),
  ]
    /* SORTED ACROSS THE WHOLE QUEUE, not within each kind.
       This list is built by concatenating invoices, then projects, then
       onboarding, and it is cut to six for the panel. Without this sort the
       order is the order of concatenation, so three overdue invoices push
       every blocked project off a panel titled "Attention needed" — the two
       loudest things on the screen never appearing together because of how the
       array happened to be assembled. Severity decides, whatever kind the row
       is. `sort` on the array literal is fine here: it is built fresh on every
       render and nothing else holds a reference to it. */
    .sort((a, b) => (ROW_RANK[a.tone] ?? 9) - (ROW_RANK[b.tone] ?? 9));

  /* Live projects with no agreed date, for the deadlines panel's empty state. */
  const undated = projects.filter((project) => project.stage !== "Delivered" && !project.due).length;
  const upcoming = projects
    .filter((project) => project.stage !== "Delivered" && project.due)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 4);

  /* COLLECTED OF BILLED, AND HOW PROMPTLY. Derived from the invoices and the
     payments on them, never typed: an invoice counts as paid on time when the
     payment that cleared it landed on or before its due date, and days to pay
     run from the issue date to that payment. Voided and draft invoices are
     not bills anybody was asked to pay. */
  const settled = invoices
    .filter((invoice) => !invoice.voided && invoice.status !== "Draft" && invoiceStatus(invoice) === "Paid")
    .map((invoice) => {
      const last = payments.filter((p) => p.invoiceId === invoice.id).map((p) => p.at).sort().at(-1);
      return last ? { onTime: last.slice(0, 10) <= invoice.due.slice(0, 10), days: Math.max(0, Math.round((Date.parse(last) - Date.parse(invoice.issued)) / 86_400_000)) } : null;
    })
    .filter((x): x is { onTime: boolean; days: number } => x !== null);
  const onTime = settled.filter((x) => x.onTime).length;
  const avgDays = settled.length ? Math.round(settled.reduce((n, x) => n + x.days, 0) / settled.length) : null;
  const overdueCount = invoices.filter((invoice) => invoiceStatus(invoice) === "Overdue").length;
  const openInvoices = invoices.filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0).length;

  const stageCounts = STAGES.map((stage) => ({ stage, n: board.get(stage)?.length ?? 0 }));
  const busiest = Math.max(1, ...stageCounts.filter((x) => x.stage !== "Delivered").map((x) => x.n));
  const peakStage = stageCounts.filter((x) => x.stage !== "Delivered").sort((a, b) => b.n - a.n)[0]?.stage;
  const pipelineTop = Math.max(1, ...stageCounts.map((x) => x.n));

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(new Date())}</span>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p>{money ? "Start with what needs a decision, a reply, or a payment follow-up." : "Start with what needs a decision or a reply."}</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <AddProject clients={clients} />
        </div>
      </header>

      <ExampleNote />

      {me ? <MyWork me={me} quietWhenEmpty={money} unread={await unreadTotal().catch(() => 0)} /> : null}

      <dl className="adDash__kpis" data-tour="dash-kpis">
        {money ? <>
        <Tile label="Collected" href="/admin/money?status=Paid" value={nairaShort(summary.collected)} tone="good" icon={Wallet} iconTone="good" note={`${collectionRate}% of everything billed`} />
        <Tile label="Outstanding" href="/admin/money?status=Sent" value={nairaShort(summary.outstanding)} icon={Clock} iconTone="live"
          badge={overdueCount ? { label: `${overdueCount} overdue`, tone: "bad" } : undefined}
          note={`Across ${openInvoices} open invoice${openInvoices === 1 ? "" : "s"}`} />
        </> : <>
        <Tile label="Clients" href="/admin/clients" value={String(clients.length)} icon={Users} note="Active records" />
        <Tile label="Open tickets" href="/admin/clients/support?status=Open" value={String(getTickets().filter((t) => t.status === "Open").length)} icon={LifeBuoy} iconTone="live" note="Waiting on a reply" />
        </>}
        <Tile label="Live projects" href="/admin/projects" value={String(summary.liveProjects)} icon={FolderKanban}
          badge={summary.needsUs ? { label: `${summary.needsUs} need attention`, tone: "warn" } : undefined}
          note={`${board.get("Review")?.length ?? 0} in review · ${board.get("Revisions")?.length ?? 0} in revisions`} />
        {money ? (
          <Tile label="Cash position" href="/admin/money" value={nairaShort(summary.profit)} tone={summary.profit >= 0 ? "good" : "bad"} icon={TrendingUp} iconTone={summary.profit >= 0 ? "good" : "bad"} note={`Collected less ${nairaShort(summary.spend)} recorded spend`} />
        ) : (
          <Tile label="Open forms" value={String(getSubmissions().filter((x) => x.status === "In progress").length)} icon={ClipboardList} note="Onboarding not finished" />
        )}
      </dl>

      {money ? (
        <div className="adDash__row">
          <Panel title="Cashflow, last six months" dataTour="dash-cashflow" action={<Link href="/admin/money">Open Money <ArrowRight aria-hidden="true" /></Link>}>
            <p className="adDash__sub">Money collected against money spent, by month.</p>
            {/* Six empty columns on a ₦0 axis say nothing; say why instead. */}
            {monthly.some((m) => m.in || m.out) ? (
              <CashflowChart months={monthly} totals={[
                { label: "Collected", value: summary.collected, key: "in" },
                { label: "Spend", value: summary.spend, key: "out" },
                { label: "Billed", value: summary.invoiced },
              ]} />
            ) : (
              <Empty kind="first-use" title="No money in or out yet" icon={TrendingUp} action={<AddExpense />}>
                The chart draws once a payment or an expense is recorded.
              </Empty>
            )}
          </Panel>

          <Panel title="Collected of billed">
            {/* A 0% gauge on a new install reads as a collection problem. */}
            {!summary.invoiced ? (
              <Empty kind="first-use" title="Nothing billed yet" icon={CircleDollarSign} action={<InvoiceBuilder clients={clients} projects={projects} />}>
                Your collection rate appears after the first invoice is sent.
              </Empty>
            ) : <>
            <div className="adDash__gauge">
              <Gauge percent={collectionRate} />
              <div className="adDash__gaugeText">
                <b><CountUp value={`${collectionRate}%`} /></b>
                <small>{nairaShort(summary.collected)} of {nairaShort(summary.invoiced)} billed</small>
              </div>
            </div>
            <dl className="adDash__facts">
              <div><dt>Paid on time</dt><dd>{settled.length ? `${onTime} of ${settled.length}` : "None paid yet"}</dd></div>
              <div><dt>Average days to pay</dt><dd>{avgDays === null ? "Not yet" : `${avgDays} day${avgDays === 1 ? "" : "s"}`}</dd></div>
            </dl>
            <div className="adDash__panelFoot"><Link className="ad__btn" href="/admin/money">Open Money <ArrowRight aria-hidden="true" /></Link></div>
            </>}
          </Panel>
        </div>
      ) : null}

      <div className="adDash__row">
        <Panel
          title="Attention needed"
          dataTour="dash-attention"
          action={attention.length ? <span className="ad__count" aria-label={`${attention.length} waiting`}>{attention.length}</span> : undefined}
        >
          {attention.length ? (
            <div className="adDash__attention">
              {attention.slice(0, 6).map((item) => {
                const Icon = item.icon;
                return (
                  <div className="adDash__attentionItem" key={`${item.href}-${item.title}`}>
                    <span className={`adDash__attentionIcon adDash__attentionIcon--${item.tone}`}><Icon aria-hidden="true" /></span>
                    <span className="adDash__attentionCopy"><Link href={item.href}><b>{item.title}</b></Link><small>{item.detail}</small></span>
                    <span className="adDash__attentionMeta">{item.meta}</span>
                    <span className="adDash__attentionActions">{item.menu}</span>
                  </div>
                );
              })}
              {attention.length > 6 ? (
                /* SAID, NOT HIDDEN. The panel shows the six worst; a queue
                   that silently drops the rest reads as "that is all". */
                <p className="adDash__more" role="status">
                  {attention.length - 6} more not shown. They are on the Money, Projects, Clients and Blog screens.
                </p>
              ) : null}
            </div>
          ) : (
            /* A new install and a cleared queue are different moments: the
               first needs a way in, the second only needs to be said. */
            clients.length ? (
              <Empty kind="cleared" title="You’re caught up" icon={ClipboardList}>Nothing is overdue, stuck or waiting on a reply.</Empty>
            ) : (
              <Empty kind="first-use" title="Start with your first client" icon={Users} action={<AddClient />}>
                Add a client, then open a project and raise an invoice. This queue fills as work comes in.
              </Empty>
            )
          )}
        </Panel>

        <div className="adDash__rail">
          <Panel title="Project pipeline" dataTour="dash-pipeline" action={<Link href="/admin/projects?view=board">Board <ArrowRight aria-hidden="true" /></Link>}>
            <div className="adDash__pipeline" role="list">
              {stageCounts.map(({ stage, n }) => (
                <Link role="listitem" href={`/admin/projects?stage=${encodeURIComponent(stage)}#project-list`} key={stage}
                  className={stage === peakStage && n ? "is-peak" : undefined}
                  aria-label={`${stage}: ${n} project${n === 1 ? "" : "s"}`}>
                  <b>{n}</b>
                  <span className="adDash__pipeBar" style={{ height: `${n ? Math.max(8, n / (stage === "Delivered" ? pipelineTop : busiest) * 100) : 4}%` }} />
                  <small>{STAGE_SHORT[stage] ?? stage}</small>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Upcoming deadlines" dataTour="dash-deadlines">
            {upcoming.length ? (
              <div className="adDash__deadlines">
                {upcoming.map((project) => {
                  const days = daysUntil(String(project.due));
                  const d = new Date(String(project.due).slice(0, 10) + "T00:00:00Z");
                  return (
                    <Link href={`/admin/projects/${project.id}`} key={project.id}>
                      <span className="adDash__date" aria-hidden="true">
                        <b>{d.getUTCDate()}</b>
                        <small>{d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</small>
                      </span>
                      <span className="adDash__deadlineCopy"><b>{project.title}</b><small>{getClient(project.clientId)?.company ?? "Unknown client"}{project.owner ? ` · ${project.owner}` : ""}</small></span>
                      <span className={`ad__pill ${days < 0 ? "ad__pill--bad" : days <= 7 ? "ad__pill--warn" : "ad__pill--flat"}`}>
                        {days < 0 ? `${-days} day${days === -1 ? "" : "s"} late` : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              undated ? (
                <Empty kind="cleared" title="No due dates set" icon={CalendarClock}
                  action={<Link className="ad__btn" href="/admin/projects">Open projects</Link>}>
                  {undated} live project{undated === 1 ? " has" : "s have"} no agreed date. Set one and it shows here.
                </Empty>
              ) : (
                <Empty kind="first-use" title="No live projects" icon={FolderKanban} action={<AddProject clients={clients} />}>
                  Open a project and give it a due date to see it here.
                </Empty>
              )
            )}
          </Panel>
        </div>
      </div>

      <div className="adDash__row">
        {money ? <Panel title="Recent payments" dataTour="dash-payments" action={<Link href="/admin/money">View all <ArrowRight aria-hidden="true" /></Link>}>
          {payments.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Client</th><th>Invoice</th><th>Method</th><th>When</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {payments.slice(0, 5).map((payment) => {
                    const invoice = invoices.find((item) => item.id === payment.invoiceId);
                    const client = invoice ? getClient(invoice.clientId) : undefined;
                    return (
                      <tr key={payment.id}>
                        <td>
                          <span className="adDash__who">
                            <span className="adDash__av" aria-hidden="true">{initials(client?.company ?? "?")}</span>
                            <span><b>{client?.company ?? "Unknown client"}</b>{invoice?.projectId ? <small>{projects.find((p) => p.id === invoice.projectId)?.title}</small> : null}</span>
                          </span>
                        </td>
                        <td>{invoice ? <Link href={`/admin/money/${invoice.id}`}>{invoice.number}</Link> : "Unknown"}</td>
                        <td><span className="ad__pill ad__pill--flat">{payment.method}</span></td>
                        <td className="ad__dim">{when(payment.at)}</td>
                        <td className="num">{naira(payment.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No payments yet" icon={CircleDollarSign} action={<Link className="ad__btn" href="/admin/money">Open Money</Link>}>
              Online payments land here by themselves. Money that arrived another way can be recorded on the invoice.
            </Empty>
          )}
        </Panel> : (
          <Suspense fallback={<RecentLeadsSkeleton />}>
            <RecentLeads />
          </Suspense>
        )}

        <div className="adDash__rail">
          <Panel title="Quick actions" dataTour="dash-quick-actions">
            <div className="adDash__actions">
              <AddClient />
              {money ? <>
              <InvoiceBuilder clients={clients} projects={projects} />
              <AddExpense />
              <RecordAnyPayment open={invoices
                .filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0)
                .map((i) => ({ id: i.id, label: `${i.number} · ${getClient(i.clientId)?.company ?? "Unknown client"}`, owed: invoiceTotals(i).due }))} />
              </> : null}
              <Link className="ad__btn" href="/admin/forms"><ClipboardList aria-hidden="true" /> Review forms</Link>
              {/* The public form, opened in its own tab so its address can be
                  copied into a message to a new client. */}
              <a className="ad__btn" href="/onboarding" target="_blank" rel="noopener"><Send aria-hidden="true" /> Onboarding form</a>
            </div>
          </Panel>
          {money ? (
            <Suspense fallback={<RecentLeadsSkeleton />}>
              <RecentLeads />
            </Suspense>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const STAGE_SHORT: Record<string, string> = { Onboarding: "Onbrd", Discovery: "Discov", "In progress": "Build", Review: "Review", Revisions: "Revise", Delivered: "Done" };

/** Whole days from today in Lagos to a date; negative when it has passed. */
function daysUntil(iso: string) {
  const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
  return Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(today)) / 86_400_000);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/**
 * The collected-of-billed gauge: a half ring of ticks, the share collected
 * in green and the rest in the line colour. Drawn here in SVG, not by a
 * charting package, for the same reason as the bars.
 */
function Gauge({ percent }: { percent: number }) {
  const ticks = 36;
  const on = Math.round((Math.min(100, Math.max(0, percent)) / 100) * ticks);
  return (
    <svg className="adDash__gaugeSvg" viewBox="0 0 220 120" aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => {
        const a = Math.PI - (i / (ticks - 1)) * Math.PI;
        const x1 = 110 + Math.cos(a) * 78, y1 = 110 - Math.sin(a) * 78;
        const x2 = 110 + Math.cos(a) * 100, y2 = 110 - Math.sin(a) * 100;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={i < on ? "is-on" : undefined} style={{ "--i": i } as React.CSSProperties} />;
      })}
    </svg>
  );
}
