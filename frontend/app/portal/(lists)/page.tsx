import Link from "next/link";
import {
  Banknote, Bell, ChevronRight, CircleCheck, FileCheck2, FolderKanban, LifeBuoy, MessageSquare, ReceiptText, Wallet,
} from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import {
  getDeliverablesFor, getInvoicesFor, getProjectsFor, getTicketsFor, getUpdatesFor,
} from "@/lib/admin/store";
import { STAGES, invoiceStatus, invoiceTotals, naira, nairaShort } from "@/lib/admin/types";
import { SERVICE_BY_SLUG } from "@/lib/services";
import { projectGlyph } from "@/components/client/service-glyph";
import { Empty, Panel, StagePill, Tile, when } from "@/components/admin/bits";
import "@/components/client/portal.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PortalExampleNote } from "@/components/admin/example-note";

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
  const { client, session } = await getPortalRequest();
  const fromStudioLink = (await searchParams).studio === "1";
  if (!client) return null; // the layout already renders the "not linked" state

  const { greeting, date } = today();
  const projects = getProjectsFor(client.id);
  /* Archived work still belongs to the client; it is what "nothing in
     progress" points them to, rather than "no projects yet". */
  const finished = getProjectsFor(client.id, true).length - projects.length;
  const invoices = getInvoicesFor(client.id);
  const tickets = getTicketsFor(client.id);
  const firstName = client.name.split(" ")[0];

  const deliverables = projects.flatMap((project) => (
    getDeliverablesFor(project.id).map((d) => ({ deliverable: d, project }))
  ));
  const awaitingApproval = deliverables.filter((x) => x.deliverable.approval === "Awaiting client");

  const outstandingInvoices = invoices.filter((inv) => {
    const s = invoiceStatus(inv);
    return s === "Overdue" || (s === "Sent" && invoiceTotals(inv).due > 0) || s === "Part paid";
  });
  const nextDue = outstandingInvoices.map((inv) => inv.due).filter(Boolean).sort()[0] ?? null;
  const answeredTickets = tickets.filter((t) => t.status === "Answered");
  const openTickets = tickets.filter((t) => t.status !== "Closed");
  const attentionCount = awaitingApproval.length + outstandingInvoices.length + answeredTickets.length;

  const balance = outstandingInvoices.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const live = projects.filter((p) => p.stage !== "Delivered");
  const byStage = STAGES.map((s) => [s, live.filter((p) => p.stage === s).length] as const).filter(([, n]) => n);

  const updates = projects
    .flatMap((project) => getUpdatesFor(project.id).map((u) => ({ update: u, project })))
    .filter((x) => x.update.clientVisible)
    .sort((a, b) => b.update.at.localeCompare(a.update.at));
  const nextFor = (projectId: string) => updates.find((x) => x.project.id === projectId)?.update.next || null;

  return (
    <div className="adDash">
      {/* Sent here from a studio link (a CC'd email, a forwarded address). */}
      {fromStudioLink ? (
        <p className="ad__banner" role="status">
          That link is for the studio team. You&rsquo;re signed in as {session?.user?.email ?? client.email}, a client, so here is your own portal instead.
        </p>
      ) : null}
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{date}</span>
          <h1>{greeting}, {firstName}</h1>
          <p>Here is where things stand on your projects with us today.</p>
        </div>
        <div className="ad__row">
          <Link className="ad__btn" href="/portal/billing"><Wallet aria-hidden="true" /> View billing</Link>
          <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1"><MessageSquare aria-hidden="true" /> Ask a question</Link>
        </div>
      </header>

      <PortalExampleNote clientId={client.id} />

      <dl className="adDash__kpis" data-tour="portal-kpis">
        <Tile label="Active projects" href="/portal/projects" value={String(live.length)} icon={FolderKanban}
          note={byStage.length ? byStage.map(([s, n]) => `${n} ${s.toLowerCase()}`).join(", ") : `${projects.length} delivered`} />
        <Tile label="Awaiting your review" href="/portal/projects" value={String(awaitingApproval.length)} icon={FileCheck2} iconTone="live"
          note={awaitingApproval.length ? `${awaitingApproval[0].deliverable.name}${awaitingApproval.length > 1 ? ` and ${awaitingApproval.length - 1} more` : ""}` : "Nothing to look at yet"} />
        <Tile label="Balance owed" href="/portal/billing" value={nairaShort(balance)} icon={Banknote} iconTone="warn"
          note={balance ? `${naira(balance)}${nextDue ? `, due ${when(nextDue)}` : " across your invoices"}` : "Nothing outstanding"} />
        <Tile label="Support" href="/portal/support" value={`${openTickets.length} open`} icon={LifeBuoy} iconTone="neutral"
          note={answeredTickets.length ? `Reply from the studio ${when(answeredTickets[0].updatedAt)}` : openTickets.length ? "Waiting on the studio" : "No open questions"} />
      </dl>

      <div className="adDash__row">
        <div className="adDash__rail">
          <Panel title="Needs your attention" dataTour="portal-attention">
            <p className="adDash__sub">The quickest way to keep your projects moving.</p>
            {attentionCount ? (
              <div className="adDash__attention">
                {awaitingApproval.map(({ deliverable, project }) => {
                  const latest = deliverable.versions[deliverable.versions.length - 1];
                  return (
                    <div className="adDash__attentionItem" key={deliverable.id}>
                      <span className="adDash__attentionIcon adDash__attentionIcon--live"><FileCheck2 aria-hidden="true" /></span>
                      <span className="adDash__attentionCopy">
                        <b>{deliverable.name} is ready for your review</b>
                        <small>{project.title}{latest ? ` · version ${latest.v}, sent ${when(latest.at)}` : ""}</small>
                      </span>
                      <span className="adDash__attentionActions"><Link className="ad__btn ad__btn--primary" href={`/portal/projects/${project.id}`}>Review now</Link></span>
                    </div>
                  );
                })}
                {outstandingInvoices.map((inv) => {
                  const overdue = invoiceStatus(inv) === "Overdue";
                  return (
                    <div className="adDash__attentionItem" key={inv.id}>
                      <span className={`adDash__attentionIcon adDash__attentionIcon--${overdue ? "bad" : "warn"}`}><ReceiptText aria-hidden="true" /></span>
                      <span className="adDash__attentionCopy">
                        <b>{naira(invoiceTotals(inv).due)} left on {inv.number}</b>
                        <small>{overdue ? "Overdue" : "Due"} {when(inv.due)}</small>
                      </span>
                      <span className="adDash__attentionActions"><a className="ad__btn" href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer">Pay now</a></span>
                    </div>
                  );
                })}
                {answeredTickets.map((t) => (
                  <div className="adDash__attentionItem" key={t.id}>
                    <span className="adDash__attentionIcon"><MessageSquare aria-hidden="true" /></span>
                    <span className="adDash__attentionCopy">
                      <b>{t.subject}</b>
                      <small>We replied · {when(t.updatedAt)}</small>
                    </span>
                    <span className="adDash__attentionActions"><Link className="ad__btn" href={`/portal/support/${t.id}`}>Read</Link></span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="You're all caught up" icon={CircleCheck}>Deliverables to review, invoices due, and replies to your questions will appear here.</Empty>
            )}
          </Panel>

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
                        <span className="cpProject__icon">{projectGlyph(project)}</span>
                        <StagePill stage={project.stage} />
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
                    action={<Link className="ad__btn" href="/portal/support?new=1">Ask us a question</Link>}>
                    Once we start work together, each project shows here with its stage.
                  </Empty>
            )}
          </Panel>
        </div>

        <aside className="adDash__rail">
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
