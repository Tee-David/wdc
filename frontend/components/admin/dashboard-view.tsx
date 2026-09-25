import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, FileClock, CalendarClock, CircleDollarSign, ClipboardList, FolderClock, LifeBuoy, MailWarning, MessageSquareWarning, Send } from "lucide-react";
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
import { AddExpense, InvoiceBuilder, RecordAnyPayment } from "./money-forms";
import { AddProject } from "./project-forms";
import { InvoiceMenu, ProjectMenu, SubmissionMenu } from "./row-actions";
import { DemoNote, Empty, Panel, StagePill, Tile, when } from "./bits";
import { RecentLeads, RecentLeadsSkeleton } from "./recent-leads";
import PageTourButton from "./tour/page-tour-button";
import "./dashboard.css";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * `money` is false for staff (lib/admin/permissions.ts): the books are not on
 * their dashboard at all -- no figures, no invoice rows in the queue, no
 * money quick actions -- rather than shown and then refused.
 */
export async function AdminDashboardView({ firstName, money = true }: { firstName?: string; money?: boolean }) {
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
  const maxMonthly = Math.max(1, ...monthly.flatMap((month) => [month.in, month.out]));
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

  const upcoming = projects
    .filter((project) => project.stage !== "Delivered" && project.due)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 4);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p>{money ? "Start with what needs a decision, a reply, or a payment follow-up." : "Start with what needs a decision or a reply."}</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          <AddProject clients={clients} />
        </div>
      </header>

      <DemoNote>
        This dashboard currently uses labelled demonstration records. Figures reconcile with the Money and Projects screens, but are not production trading data and reset with the server.
      </DemoNote>

      <dl className="adDash__kpis" data-tour="dash-kpis">
        {money ? <>
        <Tile label="Collected" value={nairaShort(summary.collected)} tone="good" note={`${collectionRate}% collection rate`} />
        <Tile label="Outstanding" value={nairaShort(summary.outstanding)} tone={summary.overdue ? "bad" : undefined} note={`${nairaShort(summary.overdue)} overdue`} />
        <Tile label="Cash position" value={nairaShort(summary.profit)} tone={summary.profit >= 0 ? "good" : "bad"} note="Collected less recorded spend" />
        </> : <>
        <Tile label="Clients" value={String(clients.length)} note="Active records" />
        <Tile label="Open forms" value={String(getSubmissions().filter((x) => x.status === "In progress").length)} note="Onboarding not finished" />
        <Tile label="Open tickets" value={String(getTickets().filter((t) => t.status === "Open").length)} tone={getTickets().some((t) => t.status === "Open") ? "accent" : undefined} note="Waiting on a reply" />
        </>}
        <Tile label="Live projects" value={String(summary.liveProjects)} tone={summary.needsUs ? "accent" : undefined} note={`${summary.needsUs} need attention`} />
      </dl>

      <div className="adDash__layout">
        <main className="adDash__work">
          <Panel
            title="Attention needed"
            dataTour="dash-attention"
            action={<Link href="/admin/projects">Open projects <ArrowRight aria-hidden="true" /></Link>}
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
              <Empty title="You’re caught up" icon={ClipboardList}>Overdue invoices, stuck projects, client requests, unanswered questions, unmatched payments and failed messages will appear here.</Empty>
            )}
          </Panel>

          {money ? <Panel title="Cashflow, last six months" dataTour="dash-cashflow" action={<Link href="/admin/money">Open Money <ArrowRight aria-hidden="true" /></Link>}>
            <div className="adDash__cashSummary">
              <span><small>Billed</small><b>{nairaShort(summary.invoiced)}</b></span>
              <span><small>Collected</small><b>{nairaShort(summary.collected)}</b></span>
              <span><small>Recorded spend</small><b>{nairaShort(summary.spend)}</b></span>
            </div>
            <div className="adDash__chart" role="img" aria-label="Monthly collected income and recorded expenditure">
              {monthly.map((month) => (
                <div className="adDash__chartMonth" key={month.month}>
                  <div className="adDash__chartBars">
                    <span className="adDash__chartBar adDash__chartBar--in" style={{ height: `${Math.max(4, month.in / maxMonthly * 100)}%` }} title={`Collected ${naira(month.in)}`} />
                    <span className="adDash__chartBar adDash__chartBar--out" style={{ height: `${Math.max(4, month.out / maxMonthly * 100)}%` }} title={`Spend ${naira(month.out)}`} />
                  </div>
                  <small>{month.label}</small>
                </div>
              ))}
            </div>
            <div className="adDash__legend"><span>Collected</span><span>Spend</span></div>
          </Panel> : null}
        </main>

        <aside className="adDash__rail">
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

          <Suspense fallback={<RecentLeadsSkeleton />}>
            <RecentLeads />
          </Suspense>

          <Panel title="Project pipeline" dataTour="dash-pipeline" action={<Link href="/admin/projects">View all <ArrowRight aria-hidden="true" /></Link>}>
            <div className="adDash__pipeline">
              {STAGES.map((stage) => (
                <Link href={`/admin/projects?stage=${encodeURIComponent(stage)}#project-list`} key={stage}>
                  <StagePill stage={stage} />
                  <b>{board.get(stage)?.length ?? 0}</b>
                </Link>
              ))}
            </div>
          </Panel>

          {money ? <Panel title="Recent payments" dataTour="dash-payments" action={<Link href="/admin/money">View all <ArrowRight aria-hidden="true" /></Link>}>
            {payments.length ? (
              <div className="adDash__compactList">
                {payments.slice(0, 4).map((payment) => {
                  const invoice = invoices.find((item) => item.id === payment.invoiceId);
                  return (
                    <Link href={`/admin/money/${payment.invoiceId}`} key={payment.id}>
                      <span className="adDash__listIcon"><CircleDollarSign aria-hidden="true" /></span>
                      <span><b>{naira(payment.amount)}</b><small>{invoice ? getClient(invoice.clientId)?.company : "Unknown client"} · {payment.method}</small></span>
                      <time>{when(payment.at)}</time>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Empty title="No payments yet" icon={CircleDollarSign}>
                Payments recorded against an invoice will appear here.
              </Empty>
            )}
          </Panel> : null}

          <Panel title="Upcoming deadlines" dataTour="dash-deadlines">
            {upcoming.length ? (
              <div className="adDash__compactList">
                {upcoming.map((project) => (
                  <Link href={`/admin/projects/${project.id}`} key={project.id}>
                    <span className="adDash__listIcon"><CalendarClock aria-hidden="true" /></span>
                    <span><b>{project.title}</b><small>{getClient(project.clientId)?.company ?? "Unknown client"}</small></span>
                    <time>{when(project.due)}</time>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="Nothing due yet" icon={CalendarClock}>
                Live projects with a due date will appear here.
              </Empty>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
