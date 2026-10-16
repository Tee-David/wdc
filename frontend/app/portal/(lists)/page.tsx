import {moneySummary} from "@/lib/money/summary";
import {currencyOf,money} from "@/lib/money/currency";
import Link from "next/link";
import { ChevronRight, FolderKanban, MessageSquare, Wallet } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { RailCard, Workbench } from "@/components/admin/workbench";
import { getPortalRequest } from "@/lib/portal/session";
import {
  getDeliverablesFor, getInvoices, getProjects, getTicketsFor, getUpdatesFor,
} from "@/lib/admin/store";
import { STAGES, invoiceStatus, invoiceTotals, nairaShort } from "@/lib/admin/types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { projectGlyph, projectTileStyle } from "@/components/client/service-glyph";
import { Empty, when } from "@/components/admin/bits";
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
  const answeredTickets = tickets.filter((t) => t.status === "Answered");
  const openTickets = tickets.filter((t) => t.status !== "Closed");
  const attentionCount = awaitingApproval.length + outstandingInvoices.length + answeredTickets.length;

  const waitingProjects = new Set(awaitingApproval.map((x) => x.project.id));


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

  /* WHAT WE ARE DOING NEXT, from the records only: each project's next step as
     the studio wrote it, its due date, and invoices still to pay, soonest first. */
  const nowIso = new Date().toISOString();
  const nextRows = [
    ...projects.filter((p) => p.stage !== "Delivered").flatMap((p) => {
      const n = nextFor(p.id);
      const tag = SERVICE_BY_SLUG.get(p.service)?.short ?? p.service;
      return [
        ...(n ? [{ key: `n-${p.id}`, title: n, sub: p.title, tag, at: p.due ?? null, href: `/portal/projects/${p.id}` }] : []),
        ...(p.due ? [{ key: `d-${p.id}`, title: `${p.title} is due`, sub: plainStatus(p.stage, waitingProjects.has(p.id)).text, tag, at: p.due, href: `/portal/projects/${p.id}` }] : []),
      ];
    }),
    ...outstandingInvoices.map((inv) => ({ key: `i-${inv.id}`, title: `${money(invoiceTotals(inv).due, currencyOf(inv))} due on ${inv.number}`, sub: invoiceStatus(inv) === "Overdue" ? "Overdue" : "Pay with Paystack or Flutterwave", tag: "Billing", at: inv.due, href: `/i/${inv.token}` })),
  ].sort((x, y) => (x.at ?? "9999").localeCompare(y.at ?? "9999"));
  const nextPer = 5;
  const billed = invoices.filter((inv) => !inv.voided && inv.status !== "Draft");
  const billedTotal = billed.reduce((n, inv) => n + invoiceTotals(inv).total, 0);
  const paidTotal = billed.reduce((n, inv) => n + Math.max(0, invoiceTotals(inv).total - invoiceTotals(inv).due), 0);
  const paidShare = billedTotal ? Math.min(100, Math.round((paidTotal / billedTotal) * 100)) : 0;
  const payFirst = outstandingInvoices.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
  const seesBilling = isPrimaryContact || billingProjectIds.length > 0;

  const rail = (
    <>
      {seesBilling ? (
        <RailCard title="Billing" link={{ href: "/portal/billing", label: "Invoices and receipts" }}>
          <div className="pBill__ring" data-tour="portal-kpis">
            <span className="adRing" style={{ "--p": paidShare } as React.CSSProperties} aria-hidden="true"><b>{paidShare}%<small>paid</small></b></span>
            <span className="pBill__ringText">
              <b className="ad__num">{nairaShort(paidTotal)}</b>
              <small>of {nairaShort(billedTotal)} invoiced{projects.length > 1 ? ` across ${projects.length} projects` : ""}</small>
              {payFirst ? <small className="pBill__ringDue">{moneySummary(outstandingInvoices, (inv) => invoiceTotals(inv).due)} to pay, next due {when(payFirst.due)}</small> : <small>Nothing to pay. Thank you.</small>}
            </span>
          </div>
          {payFirst ? <a className="ad__btn ad__btn--primary pHome__pay" href={`/i/${payFirst.token}`}><Wallet aria-hidden="true" /> Pay {money(invoiceTotals(payFirst).due, currencyOf(payFirst))}</a> : null}
        </RailCard>
      ) : null}
      {isPrimaryContact ? <MeetingsPanel email={session?.user.email ?? client.email} /> : null}
      <RailCard title="Your projects" link={projects.length ? { href: "/portal/projects", label: "All" } : undefined}>
        {projects.length ? (
          <ul className="pHome__projects">
            {projects.slice(0, 4).map((project) => {
              const at = STAGES.indexOf(project.stage);
              const st = plainStatus(project.stage, waitingProjects.has(project.id));
              return (
                <li key={project.id}>
                  <Link href={`/portal/projects/${project.id}`}>
                    <span className="pHome__pTop"><span className="cpProject__icon" style={projectTileStyle(project)}>{projectGlyph(project)}</span><b>{project.title}</b><span className={`cpStatus${st.you ? " is-you" : ""}`}>{st.text}</span></span>
                    <span className="cpStages" role="img" aria-label={`Stage ${at + 1} of ${STAGES.length}: ${project.stage}`}>
                      {STAGES.map((s, i) => <i key={s} className={i < at ? "is-done" : i === at ? "is-now" : undefined} />)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : finished > 0 ? (
          <Empty title="Nothing in progress right now" icon={FolderKanban} action={<Link className="ad__btn" href="/portal/projects?show=delivered">See finished projects</Link>}>
            {finished === 1 ? "Your finished project is" : `Your ${finished} finished projects are`} still here, with everything we handed over.
          </Empty>
        ) : (
          <Empty title="No projects yet" icon={FolderKanban} action={<Link className="ad__btn" href="/meet">Book a call</Link>}>Once we start work together, each project shows here with its stage.</Empty>
        )}
      </RailCard>
      <RailCard title="Recent updates">
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
          <p className="ad__dim pBill__note">Progress notes we share with you show here as the work moves.</p>
        )}
      </RailCard>
    </>
  );

  return (
    <>
      {/* Sent here from a studio link (a CC'd email, a forwarded address). */}
      {fromStudioLink ? (
        <p className="ad__banner" role="status">
          That link is for the studio team. You&rsquo;re signed in as {session?.user?.email ?? client.email}, a client, so here is your own portal instead.
        </p>
      ) : null}
      <PageHead title={attentionCount ? `${greeting}, ${firstName}. ${attentionCount} ${attentionCount === 1 ? "thing is" : "things are"} waiting on you.` : `${greeting}, ${firstName}.`}
        lede={<>{date}. {attentionCount ? "Here is what to look at first, then what we are doing next." : <strong>Nothing is waiting on you.</strong>}{openTickets.length ? ` ${openTickets.length} open ${openTickets.length === 1 ? "conversation" : "conversations"}.` : ""}</>}
        action={<Link className="ad__btn ad__btn--primary" href="/portal/support?new=1"><MessageSquare aria-hidden="true" /> Ask a question</Link>}
        chores={<ChoresMenu label="home, more" items={[
          { label: "Billing", href: "/portal/billing", icon: "file" },
          { label: "Choose what we email you", href: "/portal/settings?s=notifications", icon: "file" },
        ]} />} />
      {isPrimaryContact ? <PortalExampleNote clientId={client.id} /> : null}
      <Workbench railLabel="Your account at a glance" rail={rail}>
        <div data-tour="portal-attention">
          <Deck id="portal" title="Waiting on you" items={deckItems}
            emptyTitle="You are all caught up."
            emptyBody="Work to review, invoices due and replies to your questions will appear here."
            emptyNext={{ label: "Open your projects", href: "/portal/projects" }} />
        </div>
        <section className="adList" aria-label="What we are doing next">
          <div className="adList__hd"><h2>What we are doing next</h2><span className="adList__n">{nextRows.length}</span></div>
          {nextRows.length ? (
            <ol className="pHome__next">
              {nextRows.slice(0, nextPer).map((r) => (
                <li key={r.key}>
                  <Link href={r.href}>
                    <span className="pHome__nText"><b>{r.title}</b><small>{r.sub}</small></span>
                    <span className="ad__pill ad__pill--brand">{r.tag}</span>
                    <span className={`pHome__when${r.at && r.at < nowIso ? " is-late" : ""}`}>{r.at ? when(r.at) : "To agree"}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <Empty title="Nothing scheduled yet" icon={FolderKanban} action={<Link className="ad__btn" href="/portal/support?new=1">Ask a question</Link>}>When we set the next step on a project, it shows here with its date.</Empty>
          )}
          {nextRows.length > nextPer ? <p className="pHome__more"><Link href="/portal/projects">See every project <ChevronRight aria-hidden="true" /></Link></p> : null}
        </section>
      </Workbench>
    </>
  );
}
