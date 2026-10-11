import {moneySummary} from "@/lib/money/summary";
import {currencyOf,money} from "@/lib/money/currency";
import Link from "next/link";
import {
  Banknote, Bell, ChevronRight, FileCheck2, FolderKanban, LifeBuoy, MessageSquare, ReceiptText, Wallet,
} from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import {
  getDeliverablesFor, getInvoices, getProjects, getTicketsFor, getUpdatesFor,
} from "@/lib/admin/store";
import { STAGES, invoiceStatus, invoiceTotals, nairaShort } from "@/lib/admin/types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { projectGlyph, projectTileStyle } from "@/components/client/service-glyph";
import { Empty, Panel, Tile, when } from "@/components/admin/bits";
import "@/components/client/portal.css";
import "@/components/admin/dashboard.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PortalExampleNote } from "@/components/admin/example-note";
import { MeetingsPanel } from "@/components/client/meetings-panel";
import { Deck, type DeckItem } from "@/components/admin/deck";

export const metadata = { title: "Overview" };

/* The clock is read here, outside the render, and in Lagos: the server's own
   zone would greet a Lagos client "Good evening" at four in the afternoon. */
function today() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(now));
  return {
    greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    date: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(now),
  };
}


/** Who has the ball, in words a client uses. The studio's stage names stay on the studio's side. */
function plainStatus(stage: string, waitingOnClient: boolean) {
  if (waitingOnClient) return { text: "We're waiting on you", you: true };
  switch (stage) {
    case "Onboarding": return { text: "We're getting set up", you: false };
    case "Discovery": return { text: "We're planning the work", you: false };
    case "In progress": return { text: "We're working on it", you: false };
    case "Review": return { text: "Ready for your look", you: true };
    case "Revisions": return { text: "We're making your changes", you: false };
    case "Delivered": return { text: "Delivered", you: false };
    default: return { text: stage, you: false };
  }
}

/**
 * THE CLIENT'S FRONT PAGE: what is waiting on
 * them, then their projects, with the latest news and the few things they
 * come here to do beside it. Every figure and line is read from the same
 * records the studio works from; a board showing something the records do
 * not hold is left out, not invented.
 */
export default async function PortalOverview({ searchParams }: { searchParams: Promise<{ studio?: string }> }) {
  await syncStore();
  persistSoon();
  const { client, session, allowedProjectIds, billingProjectIds, reviewProjectIds, isPrimaryContact } = await getPortalRequest();
  const fromStudioLink = (await searchParams).studio === "1";
  if (!client) return null; // the layout already renders the "not linked" state

  const { greeting, date } = today();
  const projects = getProjects(true).filter(p => allowedProjectIds.includes(p.id) && !p.archived);
  /* Archived work still belongs to the client; it is what "nothing in
     progress" points them to, rather than "no projects yet". */
  const finished = getProjects(true).filter(p => allowedProjectIds.includes(p.id)).length - projects.length;
  const invoices = getInvoices().filter(inv => (isPrimaryContact && inv.clientId === client.id) || (Boolean(inv.projectId) && billingProjectIds.includes(inv.projectId!)));
  const tickets = isPrimaryContact ? getTicketsFor(client.id) : [];
  const firstName = (session?.user.name ?? client.name).split(" ")[0];

  const deliverables = projects.flatMap((project) => (
    getDeliverablesFor(project.id).map((d) => ({ deliverable: d, project }))
  ));
  const awaitingApproval = deliverables.filter((x) => reviewProjectIds.includes(x.project.id) && x.deliverable.approval === "Awaiting client");

  const outstandingInvoices = invoices.filter((inv) => {
    const s = invoiceStatus(inv);
    return s === "Overdue" || (s === "Sent" && invoiceTotals(inv).due > 0) || s === "Part paid";
  });
  const nextDue = outstandingInvoices.map((inv) => inv.due).filter(Boolean).sort()[0] ?? null;
  const answeredTickets = tickets.filter((t) => t.status === "Answered");
  const openTickets = tickets.filter((t) => t.status !== "Closed");
  const attentionCount = awaitingApproval.length + outstandingInvoices.length + answeredTickets.length;

  const waitingProjects = new Set(awaitingApproval.map((x) => x.project.id));

  const balance = outstandingInvoices.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const live = projects.filter((p) => p.stage !== "Delivered");
  const byStage = STAGES.map((s) => [s, live.filter((p) => p.stage === s).length] as const).filter(([, n]) => n);

  const updates = projects
    .flatMap((project) => getUpdatesFor(project.id).map((u) => ({ update: u, project })))
    .filter((x) => x.update.clientVisible)
    .sort((a, b) => b.update.at.localeCompare(a.update.at));
  const nextFor = (projectId: string) => updates.find((x) => x.project.id === projectId)?.update.next || null;

  /* WAITING ON YOU, as a deck: one card at a time, the thing that unblocks the
     studio first, then money, then replies. Same records as the list it replaced. */
  const deckItems: DeckItem[] = [
    ...awaitingApproval.map(({ deliverable, project }): DeckItem => {
      const latest = deliverable.versions[deliverable.versions.length - 1];
      return {
        id: `rev-${deliverable.id}`, kind: "Review", tone: "live", urgency: "Ready for you", label: project.title,
        title: `${deliverable.name} is ready for your review`,
        body: "Open it, then approve it or ask for changes. Your answer keeps the project moving.",
        facts: latest ? [{ k: "Version", v: String(latest.v) }, { k: "Sent", v: when(latest.at) }] : [],
        why: "The next step on this project waits for your answer.",
        primary: { label: "Review now", href: `/portal/projects/${project.id}` },
        open: `/portal/projects/${project.id}`,
      };
    }),
    ...outstandingInvoices.map((inv): DeckItem => {
      const overdue = invoiceStatus(inv) === "Overdue";
      return {
        id: `inv-${inv.id}`, kind: "Billing", tone: overdue ? "bad" : "warn", urgency: overdue ? "Overdue" : `Due ${when(inv.due)}`, label: inv.number,
        title: `${money(invoiceTotals(inv).due, currencyOf(inv))} to pay on ${inv.number}`,
        body: "Pay by card or bank transfer on the invoice page. You get a receipt straight away.",
        facts: [{ k: "Due", v: when(inv.due) }],
        primary: { label: "Pay now", href: `/i/${inv.token}` },
        open: `/i/${inv.token}`,
      };
    }),
    ...answeredTickets.map((t): DeckItem => ({
      id: `tk-${t.id}`, kind: "Reply", tone: "brand", urgency: `Replied ${when(t.updatedAt)}`, label: "Support",
      title: t.subject, body: "The studio has answered your question.",
      primary: { label: "Read the reply", href: `/portal/support/${t.id}` },
      open: `/portal/support/${t.id}`,
    })),
  ];

  return (
    <div className="adFlow">
      {/* Sent here from a studio link (a CC'd email, a forwarded address). */}
      {fromStudioLink ? (
        <p className="ad__banner" role="status">
          That link is for the studio team. You&rsquo;re signed in as {session?.user?.email ?? client.email}, a client, so here is your own portal instead.
        </p>
      ) : null}
      <header className="ad__head">
        <div>
          <p className="ad__dim">{date}</p>
          <h1>{attentionCount ? `${greeting}, ${firstName}. ${attentionCount} ${attentionCount === 1 ? "thing is" : "things are"} waiting on you.` : `${greeting}, ${firstName}.`}</h1>
          <p>{attentionCount ? "Here is what to look at first, then where your projects stand." : "Nothing is waiting on you. Here is where your projects stand."}</p>
        </div>
        <div className="ad__row">
          <Link className="ad__btn" href="/portal/billing"><Wallet aria-hidden="true" /> View billing</Link>
          <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1"><MessageSquare aria-hidden="true" /> Ask a question</Link>
        </div>
      </header>

      {isPrimaryContact ? <PortalExampleNote clientId={client.id} /> : null}



      <div className="adFlow__grid">
        <div className="adFlow__main">
          <div data-tour="portal-attention">
            <Deck id="portal" title="Waiting on you" items={deckItems}
              emptyTitle="You are all caught up."
              emptyBody="Deliverables to review, invoices due and replies to your questions will appear here."
              emptyNext={{ label: "Open your projects", href: "/portal/projects" }} />
          </div>
          <Panel title="Your projects" action={<Link href="/portal/projects">View all projects <ChevronRight aria-hidden="true" /></Link>}>
            {projects.length ? (
              <div className="cpProjects">
                {projects.map((project) => {
                  const service = SERVICE_BY_SLUG.get(project.service);
                  const at = STAGES.indexOf(project.stage);
                  const next = nextFor(project.id);
                  return (
                    <Link className="cpProject" href={`/portal/projects/${project.id}`} key={project.id}>
                      <span className="cpProject__top">
                        <span className="cpProject__icon" style={projectTileStyle(project)}>{projectGlyph(project)}</span>
                        {(() => { const st = plainStatus(project.stage, waitingProjects.has(project.id)); return <span className={`cpStatus${st.you ? " is-you" : ""}`}>{st.text}</span>; })()}
                      </span>
                      <b className="cpProject__title">{project.title}</b>
                      <small className="cpProject__meta">{service?.short ?? project.service} · {project.due ? `due ${when(project.due)}` : "date to be agreed"}</small>
                      <span className="cpStages" role="img" aria-label={`Stage ${at + 1} of ${STAGES.length}: ${project.stage}`}>
                        {STAGES.map((s, i) => <i key={s} className={i < at ? "is-done" : i === at ? "is-now" : undefined} />)}
                      </span>
                      {next ? <small className="cpProject__next"><b>Next:</b> {next}</small> : null}
                    </Link>
                  );
                })}
              </div>
            ) : (
              finished > 0
                ? <Empty title="Nothing in progress right now" icon={FolderKanban}
                    action={<Link className="ad__btn" href="/portal/projects?show=delivered">See finished projects</Link>}>
                    {finished === 1 ? "Your finished project is" : `Your ${finished} finished projects are`} still here, with everything we handed over.
                  </Empty>
                : <Empty title="No projects yet" icon={FolderKanban}
                    action={<Link className="ad__btn" href="/meet">Book a call</Link>}>
                    Once we start work together, each project shows here with its stage.
                  </Empty>
            )}
          </Panel>
        </div>

        <aside className="adFlow__rail" aria-label="Your account at a glance">
      <dl className="adFlow__tiles" data-tour="portal-kpis">
        <Tile label="Active projects" href="/portal/projects" value={String(live.length)} icon={FolderKanban}
          note={byStage.length ? byStage.map(([s, n]) => `${n} ${s.toLowerCase()}`).join(", ") : `${projects.length} delivered`} />
        <Tile label="Awaiting your review" href="/portal/projects" value={String(awaitingApproval.length)} icon={FileCheck2} iconTone="live"
          note={awaitingApproval.length ? `${awaitingApproval[0].deliverable.name}${awaitingApproval.length > 1 ? ` and ${awaitingApproval.length - 1} more` : ""}` : "Nothing to look at yet"} />
        {isPrimaryContact || billingProjectIds.length ? <Tile label="Balance owed" href="/portal/billing" value={nairaShort(balance)} icon={Banknote} iconTone="warn"
          note={balance ? `${moneySummary(outstandingInvoices,inv=>invoiceTotals(inv).due)}${nextDue ? `, due ${when(nextDue)}` : " across your invoices"}` : "Nothing outstanding"} /> : null}
        {isPrimaryContact ? <Tile label="Support" href="/portal/support" value={`${openTickets.length} open`} icon={LifeBuoy} iconTone="neutral"
          note={answeredTickets.length ? `Reply from the studio ${when(answeredTickets[0].updatedAt)}` : openTickets.length ? "Waiting on the studio" : "No open questions"} /> : null}
      </dl>
          <Panel title="Recent updates">
            {updates.length ? (
              <ol className="cpFeed">
                {updates.slice(0, 4).map(({ update, project }) => (
                  <li key={update.id}>
                    <span className="cpFeed__dot" aria-hidden="true" />
                    <Link href={`/portal/projects/${project.id}`}><b>{project.title}</b></Link>
                    <small>{update.author} · {when(update.at)}</small>
                    <p>{update.progress}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No updates yet" icon={FileCheck2}>Progress notes the studio shares with you will show up here.</Empty>
            )}
          </Panel>

          {isPrimaryContact ? <MeetingsPanel email={session?.user.email ?? client.email} /> : null}

          <Panel title="Quick actions">
            <div className="cpQuick">
              <Link href="/portal/support?new=1"><span className="cpQuick__icon"><MessageSquare aria-hidden="true" /></span>Ask a question<ChevronRight aria-hidden="true" /></Link>
              <Link href="/portal/billing"><span className="cpQuick__icon"><ReceiptText aria-hidden="true" /></span>Download an invoice<ChevronRight aria-hidden="true" /></Link>
              <Link href="/portal/settings"><span className="cpQuick__icon"><Bell aria-hidden="true" /></span>Choose what we email you<ChevronRight aria-hidden="true" /></Link>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
