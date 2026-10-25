import { nowMs } from "@/lib/admin/when";
import CurrencyBalances from "@/components/money/currency-balances";
import { currencyOf, money as formatMoney } from "@/lib/money/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FileText, FolderKanban, Mail, MessageSquareWarning, Phone, Users, Wallet } from "lucide-react";
import { SERVICES } from "@/lib/services";
import { hydrateSettings } from "@/lib/settings/store";
import {
  creditBalance, financeDefaults, findDuplicateClient, getClient, getClients, getCreditsFor, getDeliverablesFor, getEstimatesFor, getInvoicesFor, getPaymentsFor, getProjectsFor, getSubmissions, getTasks, getTicketsFor,
} from "@/lib/admin/store";
import { noticeBlock, reconcileClient } from "@/lib/admin/money-rules";
import ClientReconciliation from "@/components/admin/reconciliation";
import { STAGES, estimateState, estimateTotals, invoiceStatus, invoiceTotals, naira,  paymentNet, paymentState, projectAttention, type Project } from "@/lib/admin/types";
import { ApprovalPill, Empty, InvoicePill, Panel } from "@/components/admin/bits";
import { InvoiceMenu, ProjectMenu } from "@/components/admin/row-actions";
import { AddProject } from "@/components/admin/project-forms";
import { InvoiceBuilder, RecordAnyPayment } from "@/components/admin/money-forms";
import CommsLog from "@/components/admin/comms-log";
import CreditPanel from "@/components/admin/credit-panel";
import TicketPanel from "@/components/admin/ticket-panel";
import { listDepartments } from "@/lib/departments";
import { ClientDepartments } from "@/components/admin/departments";
import AuditLog from "@/components/admin/audit-log";
import PortalAccess from "@/components/admin/portal-access";
import { adminRole } from "@/lib/admin/guard";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
import { AdminState as ScopeState } from "@/components/admin/admin-state";
import { can } from "@/lib/admin/permissions";
import { CopyText } from "@/components/admin/copy-text";
import { MessageActions } from "@/components/admin/log-message";
import { whatsappLink } from "@/lib/admin/whatsapp";
import { SITE_URL } from "@/lib/site";
import { nairaTile } from "@/lib/admin/short-money";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { avTone, initials } from "@/lib/admin/client-mark";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, StatTiles, Workbench } from "@/components/admin/workbench";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { Stepper } from "@/components/admin/stepper";
import { ClientChores } from "@/components/admin/client-chores";
import { RemindButton } from "@/components/admin/client-bits";
import { SavedToast } from "@/components/admin/saved-toast";
import { activityFeed } from "@/lib/admin/activity-feed";
import { dateTimeWords, dateWords, daysFrom, monthYear } from "@/lib/admin/when";
import { portalMaps } from "@/lib/admin/client-signals";
import { meetingList } from "@/lib/meetings/store";
import { projectGlyph, projectTileStyle } from "@/components/client/service-glyph";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { remindInvoice, reinviteClient } from "@/lib/admin/client-deck-actions";
import { db } from "@/lib/db/pool";

/* NO generateStaticParams. The client list is written to now, and a route
   prerendered from the list as it stood at build time would 404 on the client
   added a minute ago. The admin layout is force-dynamic for the same reason. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const c = getClient(id);
  if (!c) notFound();
  return { title: `${c.company} · Client` };
}

type Q = { tab?: string; only?: string; act?: string; saved?: string };
const TABS = ["overview", "money", "files", "people", "activity"] as const;
type Tab = (typeof TABS)[number];

/**
 * ONE CLIENT, five tabs (the approved board): Overview (their projects as
 * steppers, what changed, with money, the next meeting and people in the
 * rail), Money (invoices, payments, credit, reconciliation), Files (versioned
 * deliverables), People (contacts, portal access, onboarding, departments,
 * notes) and Activity (what changed, what we sent, what they raised). The tab
 * is in the address so a reload and a shared link keep it. Staff see the
 * relationship and the work, never the books: no Money tab, no amounts.
 */
export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const query = await searchParams;
  const shown = Math.min(200, Math.max(5, Math.floor(Number(query.act)) || 5));
  const c = getClient(id);
  if (!c) notFound();
  await hydrateSettings();
  const finance = financeDefaults();
  const role = await adminRole();
  /* A staff member opens only the clients in their scope; the address of any other is refused, not shown. */
  if (!inScope(await staffScope(role), "clients", c.id)) {
    return <section className="ad__panel"><ScopeState kind="forbidden" title="This client is not assigned to you" description="Ask Admin to add you to one of their projects or departments." back={{ href: "/admin/clients", label: "Back to your clients" }} /></section>;
  }
  const money = can(role, "money");
  const destructive = can(role, "destructive");
  const departments = await listDepartments();
  const now = nowMs();

  const projects = getProjectsFor(c.id);
  const invoices = getInvoicesFor(c.id);
  const forms = getSubmissions().filter((s) => s.clientId === c.id);
  const tickets = getTicketsFor(c.id);
  const payments = invoices
    .flatMap((invoice) => getPaymentsFor(invoice.id).map((payment) => ({ invoice, payment })))
    .sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  const deliverables = projects.flatMap((project) => getDeliverablesFor(project.id).map((deliverable) => ({ deliverable, project })));
  const versions = deliverables.reduce((n, d) => n + d.deliverable.versions.length, 0);
  const billed = invoices.filter((i) => i.status !== "Draft" && !i.voided);
  const ngn = billed.filter((i) => currencyOf(i) === "NGN");
  const invoicedN = ngn.reduce((n, i) => n + invoiceTotals(i).total, 0);
  const paidN = ngn.reduce((n, i) => n + i.paid, 0);
  const owedN = ngn.reduce((n, i) => n + invoiceTotals(i).due, 0);
  const overdue = billed.some((i) => invoiceStatus(i) === "Overdue");
  const nextDue = ngn.filter((i) => invoiceTotals(i).due > 0).sort((a, b) => a.due.localeCompare(b.due))[0];
  const held = creditBalance(c.id);
  const credits = held > 0 ? { [c.id]: held } : undefined;
  const why = noticeBlock(c);
  const noEmail = why ? { [c.id]: why } : undefined;
  const recon = money ? reconcileClient(invoices, payments.map((x) => x.payment), getCreditsFor(c.id)) : null;
  const tasks = getTasks();

  const asked: Tab = TABS.find((t) => t === query.tab) ?? "overview";
  const tab: Tab = asked === "money" && !money ? "overview" : asked;
  const people = [{ name: c.name, role: "Main contact", email: c.email, phone: c.phone }, ...(c.contacts ?? []).map((x) => ({ name: x.name, role: x.role ?? "Contact", email: x.email ?? "", phone: x.phone ?? "" }))];
  const portal = await portalMaps();
  const hasAccount = portal.accounts.has(c.email.trim().toLowerCase());
  const invited = portal.invites.has(c.email.trim().toLowerCase());
  const first = c.name.trim().split(/\s+/)[0];

  const tabHref = (t: Tab) => `/admin/clients/${c.id}${t === "overview" ? "" : `?tab=${t}`}`;
  const tabItems = [
    { key: "overview", label: "Overview", href: tabHref("overview") },
    ...(money ? [{ key: "money", label: "Money", href: tabHref("money"), count: invoices.length, tone: overdue ? ("bad" as const) : undefined }] : []),
    { key: "files", label: "Files", href: tabHref("files"), count: versions },
    { key: "people", label: "People", href: tabHref("people"), count: people.length },
    { key: "activity", label: "Activity", href: tabHref("activity") },
  ];

  const likely = getClients().filter((x) => x.id !== c.id && findDuplicateClient(x.email, x.phone, x.id)?.id === c.id).map((x) => ({ id: x.id, company: x.company }));
  const state = c.archived ? (c.mergedInto ? "Merged" : "Archived") : "Active";

  /* A staff member sees whether the deposit is in, never the figure. */
  const chipFor = (p: Project) => {
    const mine = invoices.filter((i) => i.projectId === p.id && i.status !== "Draft" && !i.voided);
    if (!mine.length) return "Not billed";
    return mine.some((i) => i.paid > 0) ? "Deposit paid" : "Awaiting deposit";
  };
  const svc = (p: Project) => SERVICES.find((s) => s.slug === p.service)?.short ?? p.service;

  /* NEXT MEETING, from the bookings the studio holds: a booking whose attendee
     is this client's address. A missing table or provider is "none booked". */
  let meeting: Awaited<ReturnType<typeof meetingList>>[number] | undefined;
  if (tab === "overview") {
    try {
      const emails = new Set(people.map((p) => p.email.trim().toLowerCase()).filter(Boolean));
      const list = await meetingList(new Date(now).toISOString(), new Date(now + 90 * 86_400_000).toISOString());
      meeting = list.find((b) => ["accepted", "confirmed", "pending"].includes(b.status.toLowerCase()) && (b.attendees ?? []).some((a) => emails.has(a.email.trim().toLowerCase())));
    } catch { meeting = undefined; }
  }

  const projectIds = projects.map((p) => p.id);
  const moneyIds = [...invoices.map((i) => i.id), ...payments.map(({ payment }) => payment.id)];
  const workIds = [c.id, ...projectIds, ...deliverables.map(({ deliverable }) => deliverable.id), ...forms.map((f) => f.id)];
  const only = query.only === "money" && money ? "money" : query.only === "work" ? "work" : "all";
  const auditIds = only === "money" ? moneyIds : only === "work" ? workIds : [...workIds, ...(money ? moneyIds : [])];
  /* WHAT THIS CLIENT NEEDS FROM US, OR WE FROM THEM (the approved board's deck),
     read only from persisted records: work waiting on their approval, changes
     they asked for, money owed, what they still have to provide, questions
     waiting on us, portal access and a meeting coming up. Every card opens the
     place where it is done. */
  const deck: DeckItem[] = [];
  let notes: { id: string; project_id: string; author_name: string; body: string; created_at: string | Date }[] = [];
  if (tab === "overview") {
    const ago = (iso: string) => Math.max(0, Math.floor((now - Date.parse(iso)) / 86_400_000));
    for (const { deliverable: d, project: p } of deliverables) {
      const v = d.versions.at(-1);
      if (d.approval === "Awaiting client" && v) {
        const n = ago(v.sharedAt ?? v.at);
        deck.push({ id: `appr-${d.id}-${v.v}`, kind: "Approval", urgency: n >= 3 ? `${n} days waiting` : "With them", tone: n >= 5 ? "bad" : "warn", label: p.title,
          title: `${d.name} v${v.v} is waiting on ${first}`, body: `Shared ${dateWords(v.sharedAt ?? v.at, now)}. Nothing moves on ${p.title} until they approve it or ask for changes.`,
          facts: [{ k: "Project", v: p.title }, { k: "Version", v: `v${v.v}` }], why: n >= 3 ? "A gentle nudge keeps the timeline honest." : undefined,
          primary: { label: "Open the file", href: `/admin/projects/${p.id}?tab=files` }, secondary: { label: "Message the channel", href: `/admin/messages?c=p-${p.id}` }, open: `/admin/projects/${p.id}` });
      }
      if (d.approval === "Revision requested") {
        deck.push({ id: `rev-${d.id}`, kind: "Changes", urgency: "Waiting on us", tone: "live", label: p.title,
          title: `${first} asked for changes to ${d.name}`, body: d.approvalNote ? `In their words: “${d.approvalNote.slice(0, 160)}”` : "Read what they asked for, then share the next version.",
          primary: { label: "Open the file", href: `/admin/projects/${p.id}?tab=files` }, open: `/admin/projects/${p.id}` });
      }
    }
    if (money) for (const i of billed.filter((x) => invoiceTotals(x).due > 0 && invoiceStatus(x) === "Overdue")) {
      deck.push({ id: `late-${i.id}`, kind: "Money", urgency: `Due ${dateWords(i.due, now)}`, tone: "bad", label: i.number,
        title: `${c.company} owes ${formatMoney(invoiceTotals(i).due, currencyOf(i))}`, body: `${i.number} is past due. Send a reminder with the pay link, or record a payment that came in another way.`,
        facts: [{ k: "Invoice", v: i.number }, { k: "Paid so far", v: formatMoney(i.paid, currencyOf(i)) }],
        primary: { label: "Send a reminder", run: remindInvoice.bind(null, i.id) }, secondary: { label: "Record a payment", href: `/admin/money/${i.id}` }, open: `/admin/money/${i.id}` });
    }
    for (const t of tickets.filter((x) => x.status === "Open")) {
      deck.push({ id: `q-${t.id}`, kind: "Question", urgency: `Since ${dateWords(t.updatedAt, now)}`, tone: "warn", label: "Support",
        title: `${first} is waiting on an answer`, body: t.subject, primary: { label: "Reply", href: `/admin/messages?c=t-${t.id}` }, open: `/admin/messages?c=t-${t.id}` });
    }
    if (projectIds.length) {
      try {
        const [asks, latest] = await Promise.all([
          db.query<{ id: string; project_id: string; title: string; updated_at: string | Date }>(
            "SELECT id,project_id,title,updated_at FROM workspace_service_items WHERE project_id=ANY($1::STRING[]) AND kind='request' AND state NOT IN ('received','supplied','closed') ORDER BY updated_at LIMIT 10", [projectIds]),
          db.query<{ id: string; project_id: string; author_name: string; body: string; created_at: string | Date }>(
            "SELECT id,project_id,author_name,body,created_at FROM workspace_team_notes WHERE project_id=ANY($1::STRING[]) AND visibility='internal' ORDER BY created_at DESC LIMIT 3", [projectIds]),
        ]);
        for (const r of asks.rows) {
          const p = projects.find((x) => x.id === r.project_id);
          deck.push({ id: `ask-${r.id}`, kind: "From them", urgency: `Asked ${dateWords(new Date(r.updated_at).toISOString(), now)}`, tone: "neutral", label: p?.title,
            title: `Still waiting for ${r.title.charAt(0).toLowerCase()}${r.title.slice(1)}`, body: `${p?.title ?? "The project"} needs it from ${c.company} before that part of the work can start.`,
            primary: { label: "Open the request", href: `/admin/projects/${r.project_id}?tab=work&item=${r.id}` }, secondary: { label: "Ask in the channel", href: `/admin/messages?c=p-${r.project_id}` } });
        }
        notes = latest.rows;
      } catch { /* workspace tables not migrated: the deck shows the rest */ }
    }
    if (!hasAccount && !c.archived) {
      deck.push({ id: `portal-${c.id}`, kind: "Access", urgency: invited ? "Invitation sent" : "No account", tone: "neutral",
        title: invited ? `${first} has not accepted the portal invitation` : `${first} has no portal account`, body: "With an account they approve files, pay invoices and message the team in one place.",
        primary: { label: invited ? "Send a new invitation" : "Invite to the portal", run: reinviteClient.bind(null, c.id) }, open: tabHref("people") });
    }
    if (meeting && daysFrom(meeting.start, now) <= 2) {
      deck.push({ id: `meet-${meeting.uid ?? meeting.start}`, kind: "Meeting", urgency: daysFrom(meeting.start, now) <= 0 ? "Today" : `In ${daysFrom(meeting.start, now)} days`, tone: "brand",
        title: meeting.title, body: `${dateTimeWords(meeting.start, now)}. Check what is waiting on them above before you meet.`, primary: { label: "Open meetings", href: "/admin/meetings" } });
    }
  }

  const feed = tab === "overview" ? await activityFeed({ money, subjectIds: [...workIds, ...(money ? moneyIds : [])], limit: 4 }) : [];

  return (
    <>
      {query.saved ? <SavedToast message={`Saved. ${c.company} is on the books.`} /> : null}
      <PageHead
        crumbs={[{ href: "/admin/clients", label: "Clients" }]}
        title={c.company}
        mark={initials(c.company)}
        markTone={avTone(c.company)}
        lede={<>{c.name} · {c.email}{c.phone ? ` · ${c.phone}` : ""} · client since {monthYear(c.since)}{hasAccount ? " · has a portal account" : invited ? " · portal invitation sent" : ""}</>}
        action={<MessageActions clientId={c.id} clientName={c.name} waHref={whatsappLink(c.phone, `Hi ${first}, it's We Dig Creativity.`)} />}
        chores={<ClientChores client={c} likely={likely} hasOthers={destructive && getClients().some((x) => x.id !== c.id)} />}
      >
        <p className="adT__row" style={{ marginTop: ".6rem" }}>
          <span className={`ad__pill ad__pill--${c.archived ? "flat" : "good"}`}>{state}</span>
          {overdue && money ? <span className="ad__pill ad__pill--bad">Overdue</span> : null}
          {c.services.map((s) => <span key={s} className="ad__pill ad__pill--flat">{SERVICES.find((x) => x.slug === s)?.short ?? s}</span>)}
          {(c.tags ?? []).map((t) => <span key={t} className="ad__pill ad__pill--flat">{t}</span>)}
        </p>
      </PageHead>

      {c.mergedInto ? (
        <p className="ad__banner" role="status" style={{ marginBottom: "1rem" }}>
          <Link href={`/admin/clients/${c.mergedInto}`}>
            <b>This record was merged into {getClient(c.mergedInto)?.company ?? "another client"}.</b> Its work moved there; open that record.
          </Link>
        </p>
      ) : null}

      <div style={{ marginBottom: "1.25rem" }}><Tabs label="Client sections" items={tabItems} current={tab} /></div>

      {tab === "overview" ? (
        <Workbench
          railLabel="Money, meeting and people"
          rail={<>
            {money ? (
              <RailCard title="Money" link={{ href: tabHref("money"), label: "Invoices" }}>
                {invoicedN ? (
                  <div className="adRc__split">
                    <span className="adRing" style={{ "--p": Math.round((paidN / invoicedN) * 100) } as React.CSSProperties} role="img" aria-label={`${Math.round((paidN / invoicedN) * 100)} percent paid`}>
                      <b>{Math.round((paidN / invoicedN) * 100)}%<small>paid</small></b>
                    </span>
                    <span style={{ display: "grid" }}><small className="ad__dim">Paid so far</small><b style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "1.4rem" }}>{nairaTile(paidN)}</b><small className="ad__dim">of {naira(invoicedN)} invoiced</small></span>
                  </div>
                ) : <p className="ad__dim" style={{ margin: 0 }}>Nothing is invoiced yet. Raise the first invoice from the Money tab.</p>}
                {nextDue ? (
                  <div className="adNote" style={{ alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{naira(invoiceTotals(nextDue).due)} {invoiceStatus(nextDue) === "Overdue" ? "was due" : "due"} {dateWords(nextDue.due, now)}</b>
                      <p style={{ margin: 0 }}>{nextDue.number}</p>
                    </div>
                    <RemindButton invoiceId={nextDue.id} />
                  </div>
                ) : null}
              </RailCard>
            ) : null}
            <RailCard title="Next meeting" aside={meeting ? (daysFrom(meeting.start, now) <= 0 ? "Today" : `In ${daysFrom(meeting.start, now)} days`) : undefined}>
              {meeting ? (
                <div className="adRc__split">
                  <span className="adDateTile" aria-hidden="true"><span>{new Date(Date.parse(meeting.start) + 3_600_000).toLocaleString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase()}</span><b>{new Date(Date.parse(meeting.start) + 3_600_000).getUTCDate()}</b></span>
                  <span style={{ display: "grid" }}><b>{dateTimeWords(meeting.start, now)}</b><small className="ad__dim">{meeting.title}</small></span>
                </div>
              ) : <p className="ad__dim" style={{ margin: 0 }}>No meeting is booked with {c.company}.</p>}
              <Link className="adRc__foot" href="/admin/meetings">{meeting ? "Open meetings" : "Open meetings to book one"}</Link>
            </RailCard>
            <RailCard title="People" link={{ href: tabHref("people"), label: `All ${people.length}` }}>
              {people.slice(0, 2).map((p, i) => (
                <div key={`${p.name}-${i}`} className="adPpl">
                  <span className={`adMk adMk--${avTone(p.name)}`} aria-hidden="true">{initials(p.name)}</span>
                  <div><b>{p.name}</b><small>{p.role}</small></div>
                  {i === 0 ? <span className={`ad__pill ad__pill--${hasAccount ? "good" : invited ? "warn" : "flat"}`}>{hasAccount ? "Active" : invited ? "Invited" : "No account"}</span> : null}
                </div>
              ))}
            </RailCard>
            <RailCard title="Team notes" link={projects[0] ? { href: `/admin/messages?c=p-${(notes[0]?.project_id ?? projects[0].id)}`, label: "Open the channel" } : undefined}>
              {notes.length ? notes.map((n) => (
                <div key={n.id} className="adRc__row">
                  <span className="adRc__line"><strong>{n.author_name}</strong><span className="ad__dim">{dateWords(new Date(n.created_at).toISOString(), now)}</span></span>
                  <span className="adRc__sub">{n.body.length > 120 ? `${n.body.slice(0, 119)}…` : n.body || "Shared a file"}</span>
                </div>
              )) : <p className="ad__dim" style={{ margin: 0 }}>No team notes on {c.company}&apos;s projects yet. Notes written in a project channel show here; the client never sees them.</p>}
            </RailCard>
          </>}
        >
          <Deck id={`client-${c.id}`} title={`${first} needs`} items={deck}
            emptyTitle={`Nothing is waiting with ${c.company}.`}
            emptyBody="No file waits on their approval, nothing is owed late and no question is unanswered."
            emptyNext={meeting ? { label: `Next: ${meeting.title}`, href: "/admin/meetings" } : { label: "Book a meeting", href: "/admin/meetings" }} />
          <section className="adList" aria-label="Projects" data-tour="client-projects">
            <div className="adList__hd"><h2>Projects</h2><span className="adList__n">{projects.length}</span><span className="adList__sp" />{c.archived ? null : <AddProject clientId={c.id} />}</div>
            <div className="adPanelPad">
              {projects.length ? projects.map((p) => {
                const at = STAGES.indexOf(p.stage);
                const reasons = projectAttention(p, tasks);
                const last = p.events.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
                const extra = reasons.map((r) => r.label).filter((l) => l !== p.health);
                const headline = extra.length ? extra.join(", ") : last ? last.text : "Nothing waiting";
                const ownerName = p.owner || "Studio";
                return (
                  <article key={p.id} className="adPj">
                    <div className="adPj__hd">
                      <span className="adRc__ic" style={projectTileStyle(p)} aria-hidden="true">{projectGlyph(p)}</span>
                      <div>
                        <h3><Link href={`/admin/projects/${p.id}`}>{p.title}</Link></h3>
                        <span className="adPj__sub">{svc(p)}{money && p.budget ? ` · ${naira(p.budget)}` : ""}{p.due ? ` · due ${dateWords(p.due, now)}` : ""}</span>
                      </div>
                      <span className={`ad__pill ${p.stage === "Delivered" ? "ad__pill--good" : p.health === "On track" ? "ad__pill--flat" : p.health === "Blocked" ? "ad__pill--bad" : "ad__pill--warn"}`}>{p.stage === "Delivered" ? "Delivered" : p.health}</span>
                      {!money ? <span className="ad__pill ad__pill--flat">{chipFor(p)}</span> : null}
                      <ProjectMenu project={p} clientName={c.company} />
                    </div>
                    <Stepper steps={STAGES} at={at} done={p.stage === "Delivered"} label={`${p.title} stages`} />
                    <div className="adPj__ft">
                      <span className={`adMk adMk--sm adMk--${avTone(ownerName)}`} aria-hidden="true">{initials(ownerName)}</span>
                      <span>{headline}</span>
                    </div>
                  </article>
                );
              }) : (
                <Empty title="No projects yet" action={c.archived ? undefined : <AddProject clientId={c.id} />}>
                  Open a project for {c.company} to track its stage, files and updates.
                </Empty>
              )}
            </div>
          </section>

          <section className="adList" aria-label="Recent activity">
            <div className="adList__hd"><h2>Recent activity</h2><span className="adList__sp" /><Link className="ad__btn" href={tabHref("activity")}>All activity</Link></div>
            <div className="adPanelPad">
              {feed.length ? (
                <ol className="adTl">
                  {feed.map((f) => (
                    <li key={f.id}>
                      <span className={`adMk adMk--sm adMk--${avTone(f.who)}`} aria-hidden="true">{initials(f.who)}</span>
                      <span className="adTl__b"><span><strong>{f.who}</strong> {f.what}</span></span>
                      <span className="adTl__w">{f.when}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="ad__dim" style={{ margin: 0 }}>Nothing has changed for {c.company} yet. Every change to their work, money and records shows here.</p>}
            </div>
          </section>
        </Workbench>
      ) : null}

      {tab === "money" && money ? (
        <Workbench
          railLabel="Money figures"
          rail={<>
            <StatTiles items={[
              { label: "Invoiced", value: nairaTile(invoicedN), note: `${billed.length} ${billed.length === 1 ? "invoice" : "invoices"}`, icon: FileText, tone: "brand" },
              { label: "Paid", value: nairaTile(paidN), note: invoicedN ? `${Math.round((paidN / invoicedN) * 100)}% of invoiced` : "Nothing invoiced", icon: Wallet, tone: "good" },
              { label: "Outstanding", value: owedN ? nairaTile(owedN) : "Nil", note: overdue ? "Something is overdue" : owedN ? "Not yet due" : "Nothing owed", noteTone: overdue ? "bad" : undefined, icon: Wallet, tone: overdue ? "bad" : "neutral" },
              { label: "Credit held", value: nairaTile(held), note: held ? "Applies to their next invoice" : "None on account", icon: Wallet, tone: "live" },
            ]} />
            <RailCard title="Quotes">
              {getEstimatesFor(c.id).length ? getEstimatesFor(c.id).map((e) => (
                <Link key={e.id} href="/admin/money" className="adRc__row">
                  <span className="adRc__line"><strong>{e.number}</strong><span className="ad__num">{naira(estimateTotals(e).total)}</span></span>
                  <span className="adRc__sub">{estimateState(e)}{e.state === "Sent" ? `, stands until ${dateWords(e.expires, now)}` : ""}</span>
                </Link>
              )) : <p className="ad__dim" style={{ margin: 0 }}>No quote has been sent to {c.company}.</p>}
            </RailCard>
          </>}
        >
          <CurrencyBalances invoices={invoices} />
          <section className="adList" aria-label="Invoices" data-tour="client-invoices">
            <div className="adList__hd"><h2>Invoices</h2><span className="adList__n">{invoices.length}</span><span className="adList__sp" />
              <InvoiceBuilder clientId={c.id} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />
            </div>
            {invoices.length ? (
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Invoices table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Number</th><th>Status</th><th>Due</th><th className="num">Total</th><th className="num">Owed</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {invoices.map((i) => {
                      const t = invoiceTotals(i);
                      return (
                        <tr key={i.id}>
                          <td><Link href={`/admin/money/${i.id}`}><b>{i.number}</b></Link></td>
                          <td><InvoicePill status={invoiceStatus(i)} /></td>
                          <td className="num">{dateWords(i.due, now, false)}</td>
                          <td className="num">{formatMoney(t.total, currencyOf(i))}</td>
                          <td className="num">{t.due ? formatMoney(t.due, currencyOf(i)) : <span className="ad__dim">Nil</span>}</td>
                          <td className="ad__rmC"><InvoiceMenu invoice={i} noReceipt={why} edit={{ clientName: c.company, projectTitle: projects.find((p) => p.id === i.projectId)?.title }} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nothing invoiced yet" action={<InvoiceBuilder clientId={c.id} defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays} credits={credits} noEmail={noEmail} />}>
                Raise an invoice for {c.company}. It gets a pay link they can use without signing in.
              </Empty>
            )}
          </section>

          <section className="adList" aria-label="Payment history" data-tour="client-payments">
            <div className="adList__hd"><h2>Payment history</h2><span className="adList__sp" /><RecordAnyPayment clientId={c.id} /></div>
            {payments.length ? (
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Payments table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Receipt</th><th>Invoice</th><th>Method</th><th>Status</th><th>Date</th><th className="num">Received</th><th className="num">Kept</th></tr></thead>
                  <tbody>
                    {payments.map(({ invoice, payment }) => {
                      const st = paymentState(payment);
                      return (
                        <tr key={payment.id}>
                          <td><Link href={`/r/${payment.token}`}><b>{payment.receiptNo}</b></Link></td>
                          <td><Link href={`/admin/money/${invoice.id}`}>{invoice.number}</Link></td>
                          <td>{payment.method}</td>
                          <td><span className={`ad__pill ${st === "Received" ? "ad__pill--good" : "ad__pill--flat"}`}>{st}</span></td>
                          <td className="num">{dateWords(payment.at, now, false)}</td>
                          <td className="num">{formatMoney(payment.amount, currencyOf(invoice))}</td>
                          <td className="num">{formatMoney(paymentNet(payment), currencyOf(invoice))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="No payments recorded">Payments appear here with their receipt, method, reversals and refunds kept intact.</Empty>}
          </section>
          <CreditPanel clientId={c.id} />
          {recon ? <ClientReconciliation recon={recon} /> : null}
        </Workbench>
      ) : null}

      {tab === "files" ? (
        <Workbench
          railLabel="File figures"
          rail={<StatTiles items={[
            { label: "Files", value: String(versions), note: `${deliverables.length} ${deliverables.length === 1 ? "deliverable" : "deliverables"}`, icon: FileText, tone: "brand" },
            { label: "Awaiting approval", value: String(deliverables.filter((d) => d.deliverable.approval === "Awaiting client").length), note: "With the client now", icon: CalendarDays, tone: "warn" },
            { label: "Changes asked for", value: String(deliverables.filter((d) => d.deliverable.approval === "Revision requested").length), note: "Waiting on us", noteTone: "accent", icon: MessageSquareWarning, tone: "live" },
            { label: "Projects", value: String(projects.length), note: "Files live under their project", icon: FolderKanban, tone: "neutral" },
          ]} />}
        >
          <section className="adList" aria-label="Files and deliverables">
            <div className="adList__hd"><h2>Files and deliverables</h2><span className="adList__n">{versions}</span></div>
            {deliverables.length ? (
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Files table, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Deliverable</th><th>Project</th><th>Version</th><th>Added</th><th>File</th></tr></thead>
                  <tbody>
                    {deliverables.flatMap(({ deliverable, project }) => deliverable.versions.map((version, index) => (
                      <tr key={`${deliverable.id}-${version.v}`}>
                        <td><Link href={`/admin/projects/${project.id}?tab=files`}><b>{deliverable.name}</b></Link>{" "}{index === 0 ? <ApprovalPill approval={deliverable.approval} /> : null}</td>
                        <td>{project.title}</td>
                        <td>v{version.v}</td>
                        <td className="num">{dateWords(version.at, now, false)}</td>
                        <td>{version.url ? <a href={version.url} target="_blank" rel="noopener noreferrer">Open file</a> : <span className="ad__dim">Not linked</span>}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="No deliverables yet">Versioned project files will appear here without replacing earlier work or approvals.</Empty>}
          </section>
        </Workbench>
      ) : null}

      {tab === "people" ? (
        <Workbench
          railLabel="Access and onboarding"
          rail={<>
            <PortalAccess clientId={c.id} email={c.email} />
            <Panel title="Onboarding">
              {forms.length ? (
                <div className="adPanelPad">
                  {forms.map((f) => (
                    <div key={f.id} className="adRc__row">
                      <Link href={`/admin/forms/${f.id}`}><b>{SERVICES.find((x) => x.slug === f.service)?.short}</b></Link>
                      <small className="ad__dim">{f.status === "Submitted" ? `Sent ${dateWords(f.submittedAt ?? f.startedAt, now)}` : "Still filling it in"}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="No brief yet" action={<CopyText text={`${SITE_URL}/onboarding`} label="Copy the onboarding link" />}>
                  Send them the onboarding form. Their answers link here once they send it.
                </Empty>
              )}
            </Panel>
          </>}
        >
          <section className="adList" aria-label="People">
            <div className="adList__hd"><h2>People</h2><span className="adList__n">{people.length}</span></div>
            <div className="adPanelPad">
              {people.map((p, i) => (
                <div key={`${p.name}-${i}`} className="adPpl">
                  <span className={`adMk adMk--${avTone(p.name)}`} aria-hidden="true">{initials(p.name)}</span>
                  <div>
                    <b>{p.name}</b>
                    <small>{p.role}</small>
                    <span className="adT__row" style={{ marginTop: ".25rem" }}>
                      {p.email ? <a href={`mailto:${p.email}`} className="adRc__foot" style={{ minHeight: "2.75rem" }}><Mail aria-hidden="true" />{p.email}</a> : null}
                      {p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="adRc__foot" style={{ minHeight: "2.75rem" }}><Phone aria-hidden="true" />{p.phone}</a> : null}
                    </span>
                  </div>
                  {i === 0 ? <span className={`ad__pill ad__pill--${hasAccount ? "good" : invited ? "warn" : "flat"}`}>{hasAccount ? "Active" : invited ? "Invited" : "No account"}</span> : null}
                </div>
              ))}
            </div>
          </section>
          {departments?.length ? (
            <Panel title="Departments">
              <div className="adPanelPad"><ClientDepartments clientId={c.id} all={departments.map((d) => ({ id: d.id, name: d.name }))} current={c.departments ?? []} /></div>
            </Panel>
          ) : null}
          {c.notes ? <Panel title="Notes"><p style={{ padding: ".8rem 1.25rem", margin: 0 }}>{c.notes}</p></Panel> : null}
        </Workbench>
      ) : null}

      {tab === "activity" ? (
        <div className="adWb__work" id="activity">
          <Chips label="Show" current={only} items={[
            { key: "all", label: "All", href: `${tabHref("activity")}` },
            ...(money ? [{ key: "money", label: "Money", href: `${tabHref("activity")}&only=money` }] : []),
            { key: "work", label: "Work", href: `${tabHref("activity")}&only=work` },
          ]} />
          <AuditLog
            subjectIds={auditIds}
            limit={shown}
            title="Activity"
            more={`${tabHref("activity")}${only === "all" ? "" : `&only=${only}`}&act=${shown + 10}#activity`}
          />
          <CommsLog clientId={c.id} title="What we have sent them" />
          <TicketPanel clientId={c.id} />
          {!tickets.length ? null : <p className="ad__dim" style={{ margin: 0 }}><Users aria-hidden="true" style={{ width: ".9rem", verticalAlign: "-2px" }} /> {tickets.length} support {tickets.length === 1 ? "conversation" : "conversations"} with {c.company}.</p>}
        </div>
      ) : null}
    </>
  );
}
