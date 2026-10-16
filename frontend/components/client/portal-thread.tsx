import Link from "next/link";
import { ArrowLeft, FolderKanban, LifeBuoy, MessagesSquare, Plus } from "lucide-react";
import { db } from "@/lib/db/pool";
import { getProject, getProjects, getTicketMessages, getTicketsFor } from "@/lib/admin/store";
import type { Client, Ticket } from "@/lib/admin/types";
import { CloseTicketButton, TicketReplyForm } from "@/components/client/ticket-reply-form";
import { ClientProjectReply } from "@/components/client/client-project-reply";
import { initialsOf } from "@/components/admin/focus";
import { PageHead } from "@/components/admin/page-head";
import { Chips } from "@/components/admin/chips";
import { Empty } from "@/components/admin/bits";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import "@/components/admin/conversation.css";
import "@/components/admin/messages.css";
import "@/components/client/portal.css";

const STATE: Record<string, { cls: string; label: string }> = {
  Open: { cls: "ad__pill--live", label: "Waiting on the studio" },
  Answered: { cls: "ad__pill--good", label: "Answered" },
  Closed: { cls: "ad__pill--flat", label: "Closed" },
};
const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));
type Note = { id: string; project_id: string; author_id: string; author_name: string; body: string; created_at: string | Date };
type Row = { key: string; href: string; title: string; last: string; at: string | null; fresh: boolean; kind: "ticket" | "project" };

/**
 * THE CLIENT'S MESSAGES, as C-Messages draws them: their questions and their
 * projects' channels on the left, the open one beside it with its reply box.
 * A project channel shows only what is shared with the client (published
 * updates and the client's own messages); team-only notes never reach here.
 * On a phone it is one pane with Back.
 */
export async function PortalThread({ client, userId, primary, allowedProjectIds, open, show }: {
  client: Client; userId: string; primary: boolean; allowedProjectIds: string[];
  open: { kind: "ticket"; ticket: Ticket } | { kind: "project"; projectId: string };
  show?: string;
}) {
  const now = nowMs();
  const tickets = primary ? getTicketsFor(client.id).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  const projects = getProjects().filter((p) => allowedProjectIds.includes(p.id) && !p.archived);
  const ids = projects.map((p) => p.id);
  const latest = new Map<string, Note>();
  if (ids.length) {
    try {
      const r = await db.query<Note>("SELECT DISTINCT ON (project_id) id,project_id,author_id,author_name,body,created_at FROM workspace_team_notes WHERE project_id=ANY($1::STRING[]) AND visibility='client' ORDER BY project_id,created_at DESC", [ids]);
      for (const n of r.rows) latest.set(n.project_id, n);
    } catch { /* channels show without their last line */ }
  }
  const closedView = show === "closed" || (show !== "open" && open.kind === "ticket" && open.ticket.status === "Closed");
  const rows: Row[] = [
    ...projects.map((p): Row => {
      const n = latest.get(p.id);
      return { key: `p-${p.id}`, kind: "project", href: `/portal/support/project/${p.id}`, title: p.title, at: n ? new Date(n.created_at).toISOString() : null, fresh: false,
        last: n ? `${n.author_id === userId ? "You" : n.author_name.split(" ")[0]}: ${n.body}` : "Project channel" };
    }),
    ...tickets.filter((t) => (t.status === "Closed") === closedView).map((t): Row => {
      const last = getTicketMessages(t.id).at(-1);
      return { key: `t-${t.id}`, kind: "ticket", href: `/portal/support/${t.id}`, title: t.subject, at: t.updatedAt, fresh: t.status === "Answered",
        last: last ? `${last.from === "client" ? "You" : last.author.split(/\s+/)[0]}: ${last.body}` : "No messages yet" };
    }),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  const openKey = open.kind === "ticket" ? `t-${open.ticket.id}` : `p-${open.projectId}`;
  const openTickets = tickets.filter((t) => t.status !== "Closed").length;
  const here = open.kind === "ticket" ? `/portal/support/${open.ticket.id}` : `/portal/support/project/${open.projectId}`;

  /* The open conversation's lines. */
  type Line = { id: string; who: string; mine: boolean; at: string; body: string };
  let lines: Line[] = [];
  let title = "", sub = "";
  const project = open.kind === "project" ? getProject(open.projectId) : open.ticket.projectId ? getProject(open.ticket.projectId) : null;
  if (open.kind === "ticket") {
    lines = getTicketMessages(open.ticket.id).map((m) => ({ id: m.id, who: m.author, mine: m.from === "client", at: m.at, body: m.body }));
    title = open.ticket.subject; sub = `Opened ${dateWords(open.ticket.createdAt, now, false)}`;
  } else {
    try {
      const r = await db.query<Note>("SELECT id,project_id,author_id,author_name,body,created_at FROM workspace_team_notes WHERE project_id=$1 AND visibility='client' ORDER BY created_at DESC LIMIT 80", [open.projectId]);
      lines = r.rows.reverse().map((n) => ({ id: n.id, who: n.author_name, mine: n.author_id === userId, at: new Date(n.created_at).toISOString(), body: n.body }));
    } catch { lines = []; }
    title = project?.title ?? "Project"; sub = "Project channel · your team and you";
  }
  const st = open.kind === "ticket" ? STATE[open.ticket.status] ?? STATE.Open : null;

  return (
    <>
      <PageHead title="Messages"
        lede={<>{openTickets} open {openTickets === 1 ? "question" : "questions"}. <strong>We usually reply the same working day.</strong></>}
        action={primary ? <Link className="ad__btn ad__btn--primary" href="/portal/support?new=1#ask"><Plus aria-hidden="true" />Ask a question</Link> : undefined} />
      <div className="adMxBox">
        <div className="adMx is-thread">
          <section className="adMx__list" aria-label="Your conversations">
            <div className="adList__hd"><h2>Conversations</h2><span className="adList__n">{rows.length}</span></div>
            {primary ? <div className="adMx__kinds"><Chips label="Which conversations" current={closedView ? "closed" : "open"} items={[
              { key: "open", label: "Open", count: openTickets + projects.length, href: `${here}?show=open` },
              { key: "closed", label: "Closed questions", count: tickets.length - openTickets, href: `${here}?show=closed` },
            ]} /></div> : null}
            {rows.length ? (
              <ul className="adMx__rows" data-lenis-prevent>
                {rows.map((r) => {
                  const on = r.key === openKey;
                  return (
                    <li key={r.key}>
                      <Link className={`adMx__row${on ? " is-on" : ""}`} href={r.href} aria-current={on ? "true" : undefined}>
                        <span className={`adMk ${r.kind === "project" ? "adMk--brand" : "adMk--round adMk--live"}`} aria-hidden="true">{r.kind === "project" ? <FolderKanban width={16} height={16} /> : <LifeBuoy width={16} height={16} />}</span>
                        <span className="adMx__rowText">
                          <span className="adMx__rowTop"><b>{r.title}</b>{r.at ? <time dateTime={r.at}>{whenWords(r.at, now)}</time> : null}</span>
                          <span className="adMx__rowLast">{r.last}</span>
                        </span>
                        {r.fresh ? <span className="ad__pill ad__pill--live adMx__tag">New</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title={closedView ? "Nothing closed yet" : "No conversations yet"} icon={MessagesSquare}>{closedView ? "Questions move here once they are settled." : "Ask us anything about your project."}</Empty>
            )}
          </section>

          <section className="adMx__thread" aria-label={title}>
            <header className="adMx__head">
              <Link className="ad__btn adMx__back" href="/portal/support" aria-label="Back to your conversations"><ArrowLeft aria-hidden="true" /></Link>
              <div className="adMx__headText">
                <h2>{title}</h2>
                <p>{sub}{lines.length ? ` · ${lines.length} ${lines.length === 1 ? "message" : "messages"}` : ""}</p>
              </div>
              {open.kind === "ticket" && open.ticket.status !== "Closed" ? <div className="adMx__headActs"><CloseTicketButton ticketId={open.ticket.id} /></div> : null}
            </header>
            <nav className="adMx__ctx" aria-label="About this conversation">
              {st ? <span className={`ad__pill ${st.cls}`}>{st.label}</span> : null}
              {project ? <Link href={`/portal/projects/${project.id}`}><FolderKanban aria-hidden="true" /><span>{project.title}</span></Link> : null}
            </nav>
            <div className="adMx__body" data-lenis-prevent tabIndex={0} aria-label="Messages, newest at the bottom">
              {lines.length ? (
                <ol className="adConv">
                  {lines.map((m, i) => {
                    const day = dateWords(m.at, now, true), prev = lines[i - 1];
                    return (
                      <li key={m.id} className="adMx__item">
                        {!prev || dateWords(prev.at, now, true) !== day ? <p className="adMx__day"><span>{day}</span></p> : null}
                        <div className={`adConv__msg${m.mine ? " is-mine" : ""}`}>
                          <span className={`adConv__av ad__av${m.mine ? " ad__av--live" : ""}`} aria-hidden="true">{initialsOf({ name: m.who }, m.mine ? "client" : "studio")}</span>
                          <div className="adConv__bubble">
                            <p className="adConv__who"><b>{m.mine ? "You" : m.who}</b> <time dateTime={m.at}>{time(m.at)}</time></p>
                            <p className="adConv__body">{m.body}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : <Empty title="No messages yet" icon={MessagesSquare}>{open.kind === "project" ? "Write to your project team below. They are told straight away." : "Write the first one below."}</Empty>}
            </div>
            <div className="adMx__reply">
              {open.kind === "ticket" ? <TicketReplyForm ticketId={open.ticket.id} closed={open.ticket.status === "Closed"} /> : <ClientProjectReply projectId={open.projectId} />}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
