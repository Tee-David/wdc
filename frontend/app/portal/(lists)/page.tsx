import Link from "next/link";
import { ArrowRight, Banknote, FileCheck2, LifeBuoy } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import {
  getDeliverablesFor, getInvoicesFor, getProjectsFor, getTicketsFor, getUpdatesFor,
} from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira, nairaShort } from "@/lib/admin/types";
import { DemoNote, Empty, Panel, StagePill, Tile, when } from "@/components/admin/bits";

export const metadata = { title: "Overview" };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function PortalOverview() {
  const { client } = await getPortalRequest();
  if (!client) return null; // the layout already renders the "not linked" state

  const projects = getProjectsFor(client.id);
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

  const answeredTickets = tickets.filter((t) => t.status === "Answered");

  const attentionCount = awaitingApproval.length + outstandingInvoices.length + answeredTickets.length;

  const balance = invoices.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const live = projects.filter((p) => p.stage !== "Delivered");

  const recentUpdates = projects
    .flatMap((project) => getUpdatesFor(project.id).map((u) => ({ update: u, project })))
    .filter((x) => x.update.clientVisible)
    .sort((a, b) => b.update.at.localeCompare(a.update.at))
    .slice(0, 4);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
          <h1>{greeting()}, {firstName}</h1>
          <p>Here is where things stand on your projects with us today.</p>
        </div>
      </header>

      <DemoNote>
        This portal currently uses labelled demonstration records for this account. Figures reconcile with what the studio sees, but reset with the server.
      </DemoNote>

      <dl className="adDash__kpis" data-tour="portal-kpis">
        <Tile label="Active projects" value={String(live.length)} note={`${projects.length} total`} />
        <Tile label="Balance owed" value={nairaShort(balance)} tone={balance > 0 ? "bad" : "good"} note={balance > 0 ? "Across your invoices" : "Nothing outstanding"} />
        <Tile label="Awaiting your review" value={String(awaitingApproval.length)} tone={awaitingApproval.length ? "accent" : undefined} note="Deliverables ready to look at" />
        <Tile label="Support" value={String(tickets.filter((t) => t.status !== "Closed").length)} note="Open conversations" />
      </dl>

      <div className="adDash__layout">
        <main className="adDash__work">
          <Panel title="Needs your attention" dataTour="portal-attention" action={<Link href="/portal/projects">Open projects <ArrowRight aria-hidden="true" /></Link>}>
            {attentionCount ? (
              <div className="adDash__attention">
                {awaitingApproval.map(({ deliverable, project }) => (
                  <div className="adDash__attentionItem" key={deliverable.id}>
                    <span className="adDash__attentionIcon adDash__attentionIcon--accent"><FileCheck2 aria-hidden="true" /></span>
                    <span className="adDash__attentionCopy">
                      <Link href={`/portal/projects/${project.id}`}><b>{deliverable.name} is ready for your review</b></Link>
                      <small>{project.title}</small>
                    </span>
                  </div>
                ))}
                {outstandingInvoices.map((inv) => (
                  <div className="adDash__attentionItem" key={inv.id}>
                    <span className={`adDash__attentionIcon adDash__attentionIcon--${invoiceStatus(inv) === "Overdue" ? "bad" : "warn"}`}><Banknote aria-hidden="true" /></span>
                    <span className="adDash__attentionCopy">
                      <Link href="/portal/billing"><b>{inv.number} {invoiceStatus(inv) === "Overdue" ? "is overdue" : "has a balance due"}</b></Link>
                      <small>{naira(invoiceTotals(inv).due)} outstanding · due {when(inv.due)}</small>
                    </span>
                  </div>
                ))}
                {answeredTickets.map((t) => (
                  <div className="adDash__attentionItem" key={t.id}>
                    <span className="adDash__attentionIcon"><LifeBuoy aria-hidden="true" /></span>
                    <span className="adDash__attentionCopy">
                      <Link href={`/portal/support/${t.id}`}><b>{t.subject}</b></Link>
                      <small>We replied · {when(t.updatedAt)}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="You're all caught up" icon={FileCheck2}>Deliverables to review, invoices due, and replies to your questions will appear here.</Empty>
            )}
          </Panel>

          <Panel title="Recent updates" action={<Link href="/portal/projects">View all projects <ArrowRight aria-hidden="true" /></Link>}>
            {recentUpdates.length ? (
              <div className="adDash__compactList">
                {recentUpdates.map(({ update, project }) => (
                  <Link href={`/portal/projects/${project.id}`} key={update.id}>
                    <span className="adDash__listIcon"><FileCheck2 aria-hidden="true" /></span>
                    <span><b>{project.title}</b><small>{update.progress}</small></span>
                    <time>{when(update.at)}</time>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="No updates yet" icon={FileCheck2}>Progress notes the studio shares with you will show up here.</Empty>
            )}
          </Panel>
        </main>

        <aside className="adDash__rail">
          <Panel title="Your projects">
            {projects.length ? (
              <div className="adDash__pipeline">
                {projects.map((project) => (
                  <Link href={`/portal/projects/${project.id}`} key={project.id}>
                    <StagePill stage={project.stage} />
                    <b>{project.title}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="No projects yet" icon={FileCheck2}>Once a project starts, it will show up here.</Empty>
            )}
          </Panel>

          <Panel title="Quick actions">
            <div className="adDash__actions">
              <Link className="ad__btn" href="/portal/support?new=1"><LifeBuoy aria-hidden="true" /> Ask a question</Link>
              <Link className="ad__btn" href="/portal/billing"><Banknote aria-hidden="true" /> View billing</Link>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
