import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, FileClock, CalendarClock, CircleDollarSign, ClipboardList, Clock, FolderClock, FolderKanban, LifeBuoy, MailWarning, MessageSquareWarning, Send, TrendingUp, Users, Wallet } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { creditBalances, getBoard, getClient, getClients, getDeliverablesFor, getInvoices, getMonthly, getPayments, getProjects, getSubmissions, getSummary, getTasks, getTickets, providerAttentionCount } from "@/lib/admin/store";
import { failedLoggedCount } from "@/lib/message-log";
import { noticeBlock, noticeBlocks } from "@/lib/admin/money-rules";
import { reviewCount } from "@/lib/blog-db";
import { invoiceStatus, invoiceTotals, naira, paymentNet, nairaShort, projectAttention, STAGES } from "@/lib/admin/types";
import { currencyOf, money as currencyMoney } from "@/lib/money/currency";

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
import { Deck, type DeckItem } from "./deck";
import { Tabs } from "./tabs";
import { Pager, readPer } from "./pager";
import { FirstWeek } from "./first-week";
import { CustomiseDashboard } from "./customise-dashboard";
import { HIDEABLE } from "@/lib/admin/dashboard-panels";
import { getSetting } from "@/lib/admin/store";
import { unreadTotal } from "@/lib/forms/entries";
import { AddExpense, InvoiceBuilder, RecordAnyPayment } from "./money-forms";
import { AddProject } from "./project-forms";
import { InvoiceMenu, ProjectMenu, SubmissionMenu } from "./row-actions";
import { Empty, InvoicePill, Panel, Tile, when } from "./bits";
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
export async function AdminDashboardView({ firstName, money = true, me, params }: { firstName?: string; money?: boolean; me?: { id: string; name: string }; params?: Record<string, string | string[] | undefined> }) {
  const hidden = (me ? getSetting(`dash.hide.${me.id}`) ?? "" : "").split(",").filter((id) => HIDEABLE.some(([h]) => h === id));
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
        menu: <InvoiceMenu invoice={invoice} noReceipt={noticeBlock(getClient(invoice.clientId))}
          edit={{ clientName: getClient(invoice.clientId)?.company ?? "Client", projectTitle: projects.find((p) => p.id === invoice.projectId)?.title }} />,
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
        menu: <SubmissionMenu submission={submission} />,
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

  /* THE NEXT 30 DAYS: what is owed and falls due (or is already late) against
     what a typical month costs, the average of the last three full months. */
  const horizon = lagosDay(30);
  const dueSoon = invoices
    .filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0 && i.due.slice(0, 10) <= horizon)
    .reduce((n, i) => n + invoiceTotals(i).due, 0);
  const spends = monthly.slice(-4, -1).map((m) => m.out);
  const typicalSpend = spends.length ? Math.round(spends.reduce((n, x) => n + x, 0) / spends.length) : 0;

  const tomorrow = lagosDay(1);
  const dueTomorrow = projects.filter((p) => p.stage !== "Delivered" && p.due?.slice(0, 10) === tomorrow).length;

  /* Collected this week against the week before: a change worth a glance, or nothing. */
  const weekIn = (from: number, to: number) => payments
    .filter((p) => p.at.slice(0, 10) > lagosDay(-to) && p.at.slice(0, 10) <= lagosDay(-from))
    .reduce((n, p) => n + paymentNet(p), 0);
  const thisWeek = weekIn(0, 7), lastWeek = weekIn(7, 14);
  const weekBadge = lastWeek === 0 && thisWeek === 0 ? undefined
    : lastWeek === 0 ? { label: "New this week", tone: "live" as const }
    : { label: `${thisWeek >= lastWeek ? "+" : ""}${Math.round(((thisWeek - lastWeek) / lastWeek) * 100)}% this week`, tone: thisWeek >= lastWeek ? "good" as const : "bad" as const };

  const stageCounts = STAGES.map((stage) => ({ stage, n: board.get(stage)?.length ?? 0 }));
  const busiest = Math.max(1, ...stageCounts.filter((x) => x.stage !== "Delivered").map((x) => x.n));
  const peakStage = stageCounts.filter((x) => x.stage !== "Delivered").sort((a, b) => b.n - a.n)[0]?.stage;
  const pipelineTop = Math.max(1, ...stageCounts.map((x) => x.n));

  /* THE DECK: the worst thing first. Built from the same queue the panel used
     to list, so nothing that needed attention stops being shown; a card says
     what kind of thing it is, how urgent, and where it is dealt with. */
  const deckItems: DeckItem[] = attention.slice(0, 12).map((item, i) => ({
    id: `${item.href}#${i}`,
    kind: kindFor(item.icon),
    urgency: item.tone === "bad" ? "Needs you now" : item.tone === "warn" ? "Waiting" : "Open",
    tone: item.tone === "bad" ? "bad" : item.tone === "warn" ? "warn" : "neutral",
    label: item.meta,
    title: item.title,
    body: item.detail,
    primary: { label: ctaFor(item.icon), href: item.href },
    open: item.href,
  }));

  /* LATER TODAY: the day's meetings, what falls due and what is due, in time order. */
  const todayIso = lagosDay(0);
  const later: { key: string; when: string; title: string; sub: string; tag: string; href: string }[] = [
    ...(money ? invoices.filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0 && i.due.slice(0, 10) <= lagosDay(3)).map((i) => ({
      key: `i${i.id}`, when: i.due.slice(0, 10), title: `${i.number} ${i.due.slice(0, 10) < todayIso ? "is overdue" : "falls due"}`,
      sub: `${getClient(i.clientId)?.company ?? "A client"} · ${naira(invoiceTotals(i).due)}`, tag: "Money", href: `/admin/money/${i.id}`,
    })) : []),
    ...projects.filter((p) => p.stage !== "Delivered" && p.due && p.due.slice(0, 10) <= lagosDay(7)).map((p) => ({
      key: `p${p.id}`, when: String(p.due).slice(0, 10), title: p.title, sub: `${getClient(p.clientId)?.company ?? "A client"} · due ${when(p.due)}`, tag: "Deadline", href: `/admin/projects/${p.id}`,
    })),
    ...tasks.filter((t) => !t.done && t.due && t.due.slice(0, 10) <= lagosDay(3)).map((t) => ({
      key: `t${t.id}`, when: String(t.due).slice(0, 10), title: t.title, sub: `${t.assignee} · due ${when(t.due)}`, tag: "Task", href: `/admin/projects/${t.projectId}`,
    })),
  ].sort((x, y) => x.when.localeCompare(y.when));
  const laterPage = Math.max(1, Number(params?.lp) || 1);
  const laterPer = readPer(params?.lper);
  const laterRows = later.slice((laterPage - 1) * laterPer, laterPage * laterPer);

  /* MONEY MOVING: three tabs over the invoices, each a real filter of the same list. */
  const open = invoices.filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0);
  const overdue = open.filter((i) => invoiceStatus(i) === "Overdue");
  const soon = open.filter((i) => invoiceStatus(i) !== "Overdue");
  const monthStart = lagosDay(0).slice(0, 7);
  const paidThisMonth = payments.filter((p) => p.at.slice(0, 7) === monthStart);
  const tab = ["overdue", "soon", "paid"].includes(String(params?.m)) ? String(params?.m) : overdue.length ? "overdue" : soon.length ? "soon" : "paid";
  const moneyPage = Math.max(1, Number(params?.mp) || 1);
  const moneyPer = readPer(params?.mper);
  const tabHref = (m: string) => `/admin?m=${m}#money-moving`;
  const moneyHref = (patch: { page?: number; per?: number }) => `/admin?m=${tab}&mp=${patch.page ?? moneyPage}&mper=${patch.per ?? moneyPer}#money-moving`;
  const laterHref = (patch: { page?: number; per?: number }) => `/admin?lp=${patch.page ?? laterPage}&lper=${patch.per ?? laterPer}#later`;
  const moneyList = tab === "overdue" ? overdue : tab === "soon" ? soon : [];

  const headline = attention.length ? `${greeting()}${firstName ? `, ${firstName}` : ""}. ${attention.length} thing${attention.length === 1 ? "" : "s"} need${attention.length === 1 ? "s" : ""} you.` : `${greeting()}${firstName ? `, ${firstName}` : ""}. You are caught up.`;
  const dateLine = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(new Date());

  return (
    <div className="adDash adFlow">
      {hidden.length ? <style>{hidden.map((id) => `[data-tour="${id}"]{display:none}`).join("")}</style> : null}
      <header className="adFlow__head">
        <div>
          <h1>{headline}</h1>
          <p className="adFlow__lede">
            {dateLine}. <b>{hourNow() >= 16 ? (dueTomorrow ? `${dueTomorrow} project${dueTomorrow === 1 ? " is" : "s are"} due tomorrow.` : "Nothing is due tomorrow.") : money ? "Money first, then clients waiting, then the team." : "Your tasks first, then what is waiting on you."}</b>
          </p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          {me ? <CustomiseDashboard hidden={hidden} /> : null}
          <AddProject hasClients={clients.length > 0} />
        </div>
      </header>

      <ExampleNote />
      {me && !money ? <FirstWeek userId={me.id} /> : null}

      <div className="adFlow__grid">
        <div className="adFlow__main">
          {me ? <MyWork me={me} quietWhenEmpty={money} unread={await unreadTotal().catch(() => 0)} /> : null}

          <Deck
            id="today"
            title="Up next"
            items={deckItems}
            emptyTitle={clients.length ? "You are caught up." : "Start with your first client."}
            emptyBody={clients.length ? "Nothing is overdue, stuck or waiting on a reply." : "Add a client, then open a project and raise an invoice. This deck fills as work comes in."}
            emptyNext={later[0] ? { label: later[0].title, href: later[0].href } : { label: "Open Projects", href: "/admin/projects" }}
          />

          <Panel title="Later" id="later" dataTour="dash-today" action={<Link href="/admin/meetings">Calendar <ArrowRight aria-hidden="true" /></Link>}>
            {laterRows.length ? (
              <>
                <ul className="adFlow__later">
                  {laterRows.map((r) => (
                    <li key={r.key}>
                      <Link href={r.href}>
                        <span className="adFlow__time ad__num">{r.when === todayIso ? "Today" : when(r.when)}</span>
                        <span className="adFlow__laterCopy"><b>{r.title}</b><small>{r.sub}</small></span>
                        <span className="ad__pill ad__pill--flat">{r.tag}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Pager label="Pages of what is coming" total={later.length} page={laterPage} per={laterPer} noun="items" href={laterHref} />
              </>
            ) : (
              <Empty kind="cleared" title="Nothing is booked in the next few days" icon={CalendarClock}>Meetings, due dates and invoices falling due show here as they come up.</Empty>
            )}
          </Panel>

          {money ? (
            <Panel title="Money moving" id="money-moving" dataTour="dash-payments" action={<Link href="/admin/money">Open Money <ArrowRight aria-hidden="true" /></Link>}>
              <Tabs label="Money moving" current={tab} items={[
                { key: "overdue", label: "Overdue", href: tabHref("overdue"), count: overdue.length, tone: overdue.length ? "bad" : undefined },
                { key: "soon", label: "Due soon", href: tabHref("soon"), count: soon.length },
                { key: "paid", label: "Paid this month", href: tabHref("paid"), count: paidThisMonth.length },
              ]} />
              {tab === "paid" ? (
                paidThisMonth.length ? (
                  <>
                    <div className="ad__scroll">
                      <table className="ad__t">
                        <thead><tr><th>Client</th><th>Invoice</th><th>Method</th><th>When</th><th className="num">Amount</th></tr></thead>
                        <tbody>
                          {paidThisMonth.slice((moneyPage - 1) * moneyPer, moneyPage * moneyPer).map((payment) => {
                            const invoice = invoices.find((item) => item.id === payment.invoiceId);
                            const client = invoice ? getClient(invoice.clientId) : undefined;
                            return (
                              <tr key={payment.id}>
                                <td><span className="adDash__who"><span className="adDash__av" aria-hidden="true">{initials(client?.company ?? "?")}</span><span><b>{client?.company ?? "Unknown client"}</b>{invoice?.projectId ? <small>{projects.find((p) => p.id === invoice.projectId)?.title}</small> : null}</span></span></td>
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
                    <Pager label="Pages of payments" total={paidThisMonth.length} page={moneyPage} per={moneyPer} noun="payments" href={moneyHref} />
                  </>
                ) : (
                  <Empty title="No payments yet this month" icon={CircleDollarSign} action={<Link className="ad__btn" href="/admin/money">Open Money</Link>}>
                    Online payments land here by themselves. Money that arrived another way can be recorded on the invoice.
                  </Empty>
                )
              ) : moneyList.length ? (
                <>
                  <div className="ad__scroll">
                    <table className="ad__t">
                      <thead><tr><th>Invoice</th><th className="num">Owed</th><th>Due</th><th>Status</th><th><span className="ad__srOnly">Actions</span></th></tr></thead>
                      <tbody>
                        {moneyList.slice((moneyPage - 1) * moneyPer, moneyPage * moneyPer).map((invoice) => (
                          <tr key={invoice.id}>
                            <td><Link href={`/admin/money/${invoice.id}`}><b>{invoice.number}</b></Link><small className="adFlow__sub">{getClient(invoice.clientId)?.company ?? "Unknown client"}</small></td>
                            <td className="num">{money_(invoice)}</td>
                            <td className="ad__dim">{when(invoice.due)}</td>
                            <td><InvoicePill status={invoiceStatus(invoice)} /></td>
                            <td className="ad__rowEnd"><InvoiceMenu invoice={invoice} noReceipt={noticeBlock(getClient(invoice.clientId))} edit={{ clientName: getClient(invoice.clientId)?.company ?? "Client", projectTitle: projects.find((p) => p.id === invoice.projectId)?.title }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager label="Pages of invoices" total={moneyList.length} page={moneyPage} per={moneyPer} noun="invoices" href={moneyHref} />
                </>
              ) : (
                <Empty kind="cleared" title={tab === "overdue" ? "Nothing is overdue" : "Nothing is falling due"} icon={CircleDollarSign}>
                  {tab === "overdue" ? "Every open invoice is inside its due date." : "No open invoice is waiting on a date."}
                </Empty>
              )}
            </Panel>
          ) : (
            <Suspense fallback={<RecentLeadsSkeleton />}>
              <RecentLeads />
            </Suspense>
          )}
        </div>

        <aside className="adFlow__rail" aria-label="Studio pulse">
          <div className="adFlow__railHead"><h2>Studio pulse</h2><CustomiseHint hasMe={!!me} /></div>
          <dl className="adFlow__tiles" data-tour="dash-kpis">
            {money ? <>
            <Tile label="Collected" href="/admin/money?status=Paid" value={nairaShort(summary.collected)} tone="good" icon={Wallet} iconTone="good" badge={weekBadge} note={`${collectionRate}% of everything billed`} />
            <Tile label="Outstanding" href="/admin/money?status=Sent" value={nairaShort(summary.outstanding)} icon={Clock} iconTone="live"
              badge={overdueCount ? { label: `${overdueCount} overdue`, tone: "bad" } : undefined}
              note={`Across ${openInvoices} open invoice${openInvoices === 1 ? "" : "s"}`} />
            </> : <>
            <Tile label="Clients" href="/admin/clients" value={String(clients.length)} icon={Users} note="Active records" />
            <Tile label="Open tickets" href="/admin/clients/support?status=Open" value={String(getTickets().filter((t) => t.status === "Open").length)} icon={LifeBuoy} iconTone="live" note="Waiting for a reply" />
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
            <Panel title="Cash in" dataTour="dash-cashflow" action={<Link href="/admin/money?tab=reports">Full report <ArrowRight aria-hidden="true" /></Link>}>
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
          ) : null}

          {money ? (
            <dl className="adFlow__tiles" data-tour="dash-forecast">
              <Tile label="Due in 30 days" href="/admin/money?status=Sent" value={nairaShort(dueSoon)} icon={CalendarClock} iconTone="live" note="Owed, falling due or already late" />
              <Tile label="Typical month's spend" href="/admin/money" value={nairaShort(typicalSpend)} icon={CircleDollarSign} iconTone="warn" note="Average of the last three months" />
              <Tile label="Covers spend by" value={nairaShort(dueSoon - typicalSpend)} tone={dueSoon - typicalSpend >= 0 ? "good" : "bad"} icon={TrendingUp} iconTone={dueSoon - typicalSpend >= 0 ? "good" : "bad"} note="If it is all paid on time" />
            </dl>
          ) : null}

          {money && summary.invoiced ? (
            <Panel title="Collected of billed">
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
            </Panel>
          ) : null}

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
                <Empty kind="first-use" title="No live projects" icon={FolderKanban} action={<AddProject hasClients={clients.length > 0} />}>
                  Open a project and give it a due date to see it here.
                </Empty>
              )
            )}
          </Panel>

          <Panel title="Quick actions" dataTour="dash-quick-actions">
            <div className="adDash__actions">
              <AddClient />
              {money ? <>
              <InvoiceBuilder credits={creditBalances()} noEmail={noticeBlocks(getClients())} />
              <AddExpense />
              <RecordAnyPayment />
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
        </aside>
      </div>
    </div>
  );
}

/** What kind of thing a deck card is, from the icon the queue gave it. */
function kindFor(icon: unknown) {
  if (icon === LifeBuoy) return "Support";
  if (icon === FolderClock) return "Project";
  if (icon === MailWarning) return "Email";
  if (icon === FileClock) return "Blog";
  if (icon === MessageSquareWarning) return "Approval";
  if (icon === ClipboardList) return "Lead";
  return "Money";
}

/** An invoice's amount owed, in its own currency. */
function money_(invoice: Parameters<typeof invoiceTotals>[0]) {
  return currencyMoney(invoiceTotals(invoice).due, currencyOf(invoice));
}

/** Customise lives in the page menu on a phone; this is only the label on a wide screen. */
function CustomiseHint({ hasMe }: { hasMe: boolean }) {
  return hasMe ? <Link href="/admin/settings/general" className="adFlow__more">View all <ArrowRight aria-hidden="true" /></Link> : null;
}

/** The visible action on an attention row, by what the row is about. The menu beside it holds the rest. */
function ctaFor(icon: unknown) {
  if (icon === LifeBuoy) return "Reply";
  if (icon === AlertTriangle) return "Chase";
  if (icon === ClipboardList) return "Follow up";
  return "Open";
}

const STAGE_SHORT: Record<string, string> = { Onboarding: "Onbrd", Discovery: "Discov", "In progress": "Build", Review: "Review", Revisions: "Revise", Delivered: "Done" };

/** A Lagos calendar day, today plus `offset` days. */
function lagosDay(offset: number) {
  return new Date(Date.now() + 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
}

/** The hour in Lagos, so "end of day" means the studio's day, not the server's. */
function hourNow() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
}

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
