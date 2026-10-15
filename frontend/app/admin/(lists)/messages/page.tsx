import Link from "next/link";
import { ArrowLeft, Building2, FolderKanban, LifeBuoy, MessagesSquare } from "lucide-react";
import { getClient, getProject, getProjects, getTicket, getTicketMessages, getTickets } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { db } from "@/lib/db/pool";
import { requireProjectActor } from "@/lib/workspace/access";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { initialsOf } from "@/components/admin/focus";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { Empty } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { StudioReply, TicketStatusButtons } from "@/components/admin/ticket-controls";
import { ProjectReply } from "@/components/admin/project-reply";
import type { Project, Ticket } from "@/lib/admin/types";
import "@/components/admin/conversation.css";
import "@/components/admin/messages.css";

export const metadata = { title: "Messages" };

type Query = { q?: string; kind?: string; c?: string; page?: string; per?: string };
type Conv = {
  key: string; kind: "client" | "project"; name: string; sub: string; mark: string;
  last: string | null; lastAt: string | null; waiting: boolean; count: number;
  ticket?: Ticket; project?: Project | null;
};
type Line = { id: string; who: string; mine: boolean; at: string; body: string; tag?: { text: string; tone: "live" | "flat" } };
type NoteRow = { id: string; project_id: string; author_id: string; author_name: string; visibility: "client" | "internal"; body: string; created_at: string | Date };

const KINDS = [["", "All"], ["waiting", "Waiting on us"], ["client", "Clients"], ["project", "Projects"]] as const;
const LABEL: Record<string, string> = { Open: "Waiting on us", Answered: "Answered", Closed: "Closed" };
const PILL: Record<string, string> = { Open: "ad__pill--warn", Answered: "ad__pill--good", Closed: "ad__pill--flat" };
const iso = (v: string | Date) => new Date(v).toISOString();
const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function hrefFor(query: Query, patch: Partial<Query>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return `/admin/messages${s ? `?${s}` : ""}`;
}

/* The projects this person may read: every project for the owner, and for
   staff the ones they lead or were added to. The thread itself is checked
   again by requireProjectActor before anything is shown or written. */
async function readableProjects(role: string, me: string) {
  const live = getProjects().filter((p) => !p.archived);
  if (role === "owner") return live;
  let members = new Set<string>();
  try {
    const r = await db.query<{ project_id: string }>("SELECT project_id FROM workspace_project_members WHERE user_id=$1 AND revoked_at IS NULL", [me]);
    members = new Set(r.rows.map((x) => x.project_id));
  } catch { /* No membership table means leads only. */ }
  return live.filter((p) => p.ownerIds?.includes(me) || members.has(p.id));
}

/**
 * EVERY CONVERSATION IN ONE PLACE: client questions and project channels in
 * one list, the open one beside it with its reply box. Client questions are
 * support tickets (the client is emailed and sees the reply in their portal);
 * a project channel is the project's notes, team only unless the lead
 * publishes one to the client.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const role = await adminRole();
  const { session } = await getAdminRequest();
  const me = session?.user?.id ?? "";
  if (!role || !me) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Messages need a studio account" description="Sign in again with your studio account to read and answer conversations." /></section>;
  }
  const query = await searchParams;
  const now = nowMs();
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const kind = KINDS.some(([k]) => k === query.kind) ? query.kind ?? "" : "";
  const per = readPer(query.per);

  const projects = await readableProjects(role, me);
  const projectIds = projects.map((p) => p.id);

  /* Latest note and count per project, two bounded queries. */
  let notesFailed = false;
  const latest = new Map<string, NoteRow>();
  const counts = new Map<string, number>();
  if (projectIds.length) {
    try {
      const [a, b] = await Promise.all([
        db.query<NoteRow>("SELECT DISTINCT ON (project_id) id,project_id,author_id,author_name,visibility,body,created_at FROM workspace_team_notes WHERE project_id=ANY($1::STRING[]) ORDER BY project_id,created_at DESC", [projectIds]),
        db.query<{ project_id: string; n: string | number }>("SELECT project_id,count(*) AS n FROM workspace_team_notes WHERE project_id=ANY($1::STRING[]) GROUP BY project_id", [projectIds]),
      ]);
      for (const r of a.rows) latest.set(r.project_id, r);
      for (const r of b.rows) counts.set(r.project_id, Number(r.n));
    } catch { notesFailed = true; }
  }

  /* Client questions: all of them for anyone with Clients; staff without it see
     only questions about clients whose projects they work on. */
  const clientIds = new Set(projects.map((p) => p.clientId));
  const tickets = getTickets().filter((t) => can(role, "clients") && (role === "owner" || clientIds.has(t.clientId)));

  const convs: Conv[] = [
    ...tickets.map((t): Conv => {
      const msgs = getTicketMessages(t.id), last = msgs.at(-1), client = getClient(t.clientId);
      const name = client?.name ?? "Unknown client";
      return {
        key: `t-${t.id}`, kind: "client", name, sub: `${client?.company ?? "Client"} · ${t.subject}`, mark: initialsOf({ name }, "client"),
        last: last ? `${last.from === "studio" ? "You: " : ""}${last.body}` : null, lastAt: last?.at ?? t.updatedAt, waiting: t.status === "Open", count: msgs.length,
        ticket: t, project: t.projectId ? getProject(t.projectId) : null,
      };
    }),
    ...projects.map((p): Conv => {
      const n = latest.get(p.id), client = getClient(p.clientId);
      return {
        key: `p-${p.id}`, kind: "project", name: p.title, sub: `${client?.company ?? "Client"} · Project channel`, mark: initialsOf({ name: p.title }, "studio"),
        last: n ? `${n.author_id === me ? "You" : n.author_name.split(" ")[0]}: ${n.body}` : null, lastAt: n ? iso(n.created_at) : null, waiting: false, count: counts.get(p.id) ?? 0,
        project: p,
      };
    }),
  ].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));

  const tally = { "": convs.length, waiting: convs.filter((c) => c.waiting).length, client: convs.filter((c) => c.kind === "client").length, project: convs.filter((c) => c.kind === "project").length };
  const rows = convs
    .filter((c) => !kind || (kind === "waiting" ? c.waiting : c.kind === kind))
    .filter((c) => !search || `${c.name} ${c.sub} ${c.last ?? ""}`.toLocaleLowerCase().includes(search));
  const pageCount = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1), pageCount);
  const shown = rows.slice((page - 1) * per, page * per);

  /* The open conversation: the one in the URL, else the first in the list (a
     phone shows the list until one is picked). */
  const picked = query.c ? convs.find((c) => c.key === query.c) ?? null : null;
  const open = picked ?? shown[0] ?? null;
  const oldest = convs.filter((c) => c.waiting).sort((a, b) => (a.lastAt ?? "").localeCompare(b.lastAt ?? ""))[0];

  /* The thread's lines, read only for the open conversation. */
  let lines: Line[] = [];
  let canPublish = false, threadError = "";
  if (open?.ticket) {
    lines = getTicketMessages(open.ticket.id).map((m) => ({ id: m.id, who: m.from === "studio" ? m.author : open.name, mine: m.from === "studio", at: m.at, body: m.body }));
  } else if (open?.project) {
    try {
      const actor = await requireProjectActor(open.project.id, "read");
      canPublish = actor.canManage;
      const r = await db.query<NoteRow>("SELECT id,project_id,author_id,author_name,visibility,body,created_at FROM workspace_team_notes WHERE project_id=$1 ORDER BY created_at DESC LIMIT 80", [open.project.id]);
      lines = r.rows.reverse().map((n) => ({ id: n.id, who: n.author_name, mine: n.author_id === me, at: iso(n.created_at), body: n.body, tag: n.visibility === "client" ? { text: "Client sees it", tone: "live" } : { text: "Team only", tone: "flat" } }));
    } catch { threadError = "This channel could not be read. Reload the page, or open the project."; }
  }
  const openClient = open?.ticket ? getClient(open.ticket.clientId) : open?.project ? getClient(open.project.clientId) : null;
  /* A fresh ticket read, so a reply that just changed its status shows it. */
  const ticket = open?.ticket ? getTicket(open.ticket.id) ?? open.ticket : null;

  if (!convs.length && !search && !kind) {
    return (
      <>
        <PageHead title="Messages" lede="Client questions and project channels, in one list." />
        <section className="adList"><Empty title="No conversations yet" icon={MessagesSquare}
          action={can(role, "projects") ? <Link className="ad__btn ad__btn--primary" href="/admin/projects">Open projects</Link> : undefined}>
          {role === "owner" ? "A project gets its channel when it starts, and client questions from the portal land here." : "Your projects and their channels show here once Admin adds you to one."}
        </Empty></section>
      </>
    );
  }

  return (
    <>
      <PageHead title="Messages"
        lede={<>{tally.waiting ? `${tally.waiting} ${tally.waiting === 1 ? "client is" : "clients are"} waiting on us.` : "Nobody is waiting on us."}{oldest?.lastAt ? <> <strong>Longest wait {whenWords(oldest.lastAt, now)}.</strong></> : null}</>}
        chores={<ChoresMenu label="messages, more" items={[
          ...(can(role, "clients") ? [{ label: "Support questions table", href: "/admin/clients/support", icon: "file" as const }] : []),
          ...(role === "owner" ? [{ label: "Email marketing", href: "/admin/email", icon: "file" as const }, { label: "Help centre articles", href: "/admin/settings/faq", icon: "file" as const }] : []),
        ]} />} />
      {notesFailed ? <p className="adMx__warn" role="status">Project channels could not be loaded just now. Client questions are complete; reload to try the channels again.</p> : null}
      <div className="adMxBox">
        <div className={`adMx ${picked ? "is-thread" : "is-list"}`}>
          <section className="adMx__list" aria-label="Conversations" data-tour="messages-list">
            <div className="adList__hd"><h2>Conversations</h2><span className="adList__n">{convs.length}</span></div>
            <div className="adMx__tools"><UrlSearch label="Search messages" placeholder="Name, company or words" /></div>
            <div className="adMx__kinds"><Chips label="Show" current={kind} items={KINDS.map(([k, label]) => ({ key: k, label, count: tally[k], href: hrefFor(query, { kind: k || undefined, page: undefined, c: undefined }) }))} /></div>
            {rows.length ? (
              <>
                <ul className="adMx__rows" data-lenis-prevent>
                  {shown.map((c) => {
                    const on = open?.key === c.key;
                    return (
                      <li key={c.key}>
                        <Link className={`adMx__row${on ? " is-on" : ""}`} href={hrefFor(query, { c: c.key })} aria-current={on ? "true" : undefined}>
                          <span className={`adMk ${c.kind === "client" ? "adMk--round adMk--live" : "adMk--brand"}`} aria-hidden="true">{c.mark}</span>
                          <span className="adMx__rowText">
                            <span className="adMx__rowTop"><b>{c.name}</b>{c.lastAt ? <time dateTime={c.lastAt}>{whenWords(c.lastAt, now)}</time> : null}</span>
                            <span className="adMx__rowSub">{c.sub}</span>
                            <span className="adMx__rowLast">{c.last ? clip(c.last) : "No messages yet"}</span>
                          </span>
                          {c.waiting ? <span className="ad__pill ad__pill--warn adMx__tag">Waiting</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Pager label="Conversation pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "conversation" : "conversations"}
                  href={(patch) => hrefFor(query, { page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per, c: undefined })} />
              </>
            ) : (
              <Empty title="No conversations match" icon={MessagesSquare} action={<Link className="ad__btn" href="/admin/messages">Clear filters</Link>}>Try a broader search, or show every conversation.</Empty>
            )}
          </section>

          <section className="adMx__thread" aria-label={open ? `Conversation with ${open.name}` : "Conversation"} data-tour="messages-thread">
            {open ? (
              <>
                <header className="adMx__head">
                  <Link className="ad__btn adMx__back" href={hrefFor(query, { c: undefined })} aria-label="Back to conversations"><ArrowLeft aria-hidden="true" /></Link>
                  <span className={`adMk ${open.kind === "client" ? "adMk--round adMk--live" : "adMk--brand"}`} aria-hidden="true">{open.mark}</span>
                  <div className="adMx__headText">
                    <h2>{open.name}</h2>
                    <p>{open.kind === "client" ? ticket?.subject : `${openClient?.company ?? "Client"} · ${open.count} ${open.count === 1 ? "message" : "messages"}`}</p>
                  </div>
                  {ticket ? <div className="adMx__headActs"><TicketStatusButtons ticketId={ticket.id} status={ticket.status} /></div> : null}
                </header>
                <nav className="adMx__ctx" aria-label="Linked records">
                  {ticket ? <span className={`ad__pill ${PILL[ticket.status]}`}>{LABEL[ticket.status]}</span> : null}
                  {openClient && can(role, "clients") ? <Link href={`/admin/clients/${openClient.id}`}><Building2 aria-hidden="true" /><span>{openClient.company}</span></Link> : null}
                  {open.project ? <Link href={`/admin/projects/${open.project.id}`}><FolderKanban aria-hidden="true" /><span>{open.project.title}</span></Link> : null}
                  {ticket ? <Link href="/admin/clients/support"><LifeBuoy aria-hidden="true" /><span>Opened {dateWords(ticket.createdAt, now, false)} · All questions</span></Link> : null}
                </nav>
                <div className="adMx__body" data-lenis-prevent tabIndex={0} aria-label="Messages, newest at the bottom">
                  {threadError ? <AdminState kind="error" title="This channel did not load" description={threadError} /> : lines.length ? (
                    <ol className="adConv">
                      {lines.map((m, i) => {
                        const day = dateWords(m.at, now, true), prev = lines[i - 1];
                        return (
                          <li key={m.id} className="adMx__item">
                            {!prev || dateWords(prev.at, now, true) !== day ? <p className="adMx__day"><span>{day}</span></p> : null}
                            <div className={`adConv__msg${m.mine ? " is-mine" : ""}`}>
                              <span className={`adConv__av ad__av${m.mine ? "" : " ad__av--live"}`} aria-hidden="true">{initialsOf({ name: m.who }, m.mine ? "studio" : "client")}</span>
                              <div className="adConv__bubble">
                                <p className="adConv__who"><b>{m.mine ? "You" : m.who}</b> <time dateTime={m.at}>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(m.at))}</time>{m.tag ? <span className={`ad__pill ad__pill--${m.tag.tone} adMx__vis`}>{m.tag.text}</span> : null}</p>
                                <p className="adConv__body">{m.body}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <Empty title="No messages yet" icon={MessagesSquare}>{open.kind === "project" ? "Write the first note below. It stays with the team unless you choose Client sees it." : "This question has no messages."}</Empty>
                  )}
                </div>
                <div className="adMx__reply">
                  {ticket ? (ticket.status === "Closed"
                    ? <p className="ad__dim">Closed. Reopen it to reply, or it reopens by itself if the client writes again.</p>
                    : <StudioReply ticketId={ticket.id} />)
                    : open.project && !threadError ? <ProjectReply key={open.project.id} projectId={open.project.id} canPublish={canPublish} /> : null}
                </div>
              </>
            ) : (
              <Empty title="Pick a conversation" icon={MessagesSquare}>Choose one from the list to read it and reply.</Empty>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
