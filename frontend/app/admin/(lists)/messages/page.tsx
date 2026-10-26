import Link from "next/link";
import { Archive, ArrowLeft, Check, CheckCheck, Pin, Building2, FolderKanban, LifeBuoy, MessagesSquare } from "lucide-react";
import { getClient, getProject, getProjects, getTicket, getTicketMessages, getTickets } from "@/lib/admin/store";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { db } from "@/lib/db/pool";
import { requireProjectActor } from "@/lib/workspace/access";
import { inScope, staffScope } from "@/lib/admin/staff-scope";
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
import { ConvDetails, MarkAllRead, MarkRead, NewTeamThread, SavedReplies, ScheduleSend, TeamReply, ThreadFlags } from "@/components/admin/messages-ui";
import { marksFor, scheduledFor } from "@/lib/messages/marks";
import { hydrateSettings } from "@/lib/settings/store";
import { getSetting } from "@/lib/admin/store";
import { messagesReady, othersRead, readStates, unreadCounts, teamMessages, teamThreadsFor, type TeamThread } from "@/lib/messages/store";
import type { Project, Ticket } from "@/lib/admin/types";
import { ThreadLines, ThreadProvider, type ThreadLine } from "@/components/admin/thread";
import { attachmentsFor } from "@/lib/messages/attachments";
import "@/components/admin/conversation.css";
import "@/components/admin/messages.css";

export const metadata = { title: "Messages" };

type Query = { q?: string; kind?: string; box?: string; c?: string; page?: string; per?: string };
type Conv = {
  key: string; kind: "client" | "project" | "team"; name: string; sub: string; mark: string;
  /** The short context on the row's second line: the question, the client, or Team. */
  ctx: string;
  last: string | null; lastAt: string | null; waiting: boolean; count: number;
  /** Who wrote the last message: "me" or someone else, for unread. */
  lastMine: boolean;
  unread?: boolean; pinned?: boolean; archived?: boolean;
  /** Unread messages, when they can be counted; and, for my own last message in a team chat, whether everyone else has read it. */
  unreadN?: number; seen?: boolean;
  ticket?: Ticket; project?: Project | null; team?: TeamThread;
};
type Line = { id: string; who: string; mine: boolean; at: string; body: string; tag?: { text: string; tone: "live" | "flat" }; visibility?: "client" | "internal"; replyTo?: string | null };
type NoteRow = { id: string; project_id: string; author_id: string; author_name: string; visibility: "client" | "internal"; body: string; created_at: string | Date; reply_to?: string | null };

const KINDS = [["", "All"], ["waiting", "Waiting on us"], ["client", "Clients"], ["project", "Projects"], ["team", "Team"]] as const;
/* One row of filters, the way a phone's chat app has one: the inbox views and the kinds together. Archived is a row at the top of the list. */
const FILTERS = [["all", "All"], ["unread", "Unread"], ["waiting", "Waiting on us"], ["client", "Clients"], ["project", "Projects"], ["team", "Team"], ["pinned", "Pinned"]] as const;
const BOXES = [["", "Inbox"], ["unread", "Unread"], ["pinned", "Pinned"], ["archived", "Archived"]] as const;
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
  const box = BOXES.some(([k]) => k === query.box) ? query.box ?? "" : "";
  /* A chat list is read as one column, so it shows 20 before it pages (owner, 2026-10-25). */
  const per = readPer(query.per, 20);

  /* The owner reads every live project; staff read the projects in their scope (lib/admin/staff-scope.ts). */
  const scope = await staffScope(role);
  const projects = getProjects().filter((p) => !p.archived && inScope(scope, "projects", p.id));
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

  /* Team chats and per-person state wait for migration 0054; until then they are simply absent. */
  const ready = await messagesReady();
  const team = ready ? await teamThreadsFor(me) : [];

  /* Client questions: the owner reads all of them; staff read those from clients in their scope. */
  const tickets = getTickets().filter((t) => can(role, "clients") && inScope(scope, "clients", t.clientId));

  const convs: Conv[] = [
    ...tickets.map((t): Conv => {
      const msgs = getTicketMessages(t.id), last = msgs.at(-1), client = getClient(t.clientId);
      const name = client?.name ?? "Unknown client";
      return {
        key: `t-${t.id}`, kind: "client", name, sub: `${client?.company ?? "Client"} · ${t.subject}`, ctx: t.subject, mark: initialsOf({ name }, "client"),
        last: last ? `${last.from === "studio" ? "You: " : ""}${last.body || "Sent an attachment"}` : null, lastAt: last?.at ?? t.updatedAt, waiting: t.status === "Open", count: msgs.length, lastMine: !last || last.from === "studio",
        ticket: t, project: t.projectId ? getProject(t.projectId) : null,
      };
    }),
    ...projects.map((p): Conv => {
      const n = latest.get(p.id), client = getClient(p.clientId);
      return {
        key: `p-${p.id}`, kind: "project", name: p.title, sub: `${client?.company ?? "Client"} · Project channel`, ctx: client?.company ?? "Project channel", mark: initialsOf({ name: p.title }, "studio"),
        last: n ? `${n.author_id === me ? "You" : n.author_name.split(" ")[0]}: ${n.body || "Sent an attachment"}` : null, lastAt: n ? iso(n.created_at) : null, waiting: false, count: counts.get(p.id) ?? 0, lastMine: !n || n.author_id === me,
        project: p,
      };
    }),
    ...team.map((t): Conv => {
      const others = t.members.filter((m) => m.id !== me);
      const name = t.kind === "group" ? t.title || others.map((m) => m.name.split(" ")[0]).join(", ") : others[0]?.name ?? "Just you";
      return {
        key: `d-${t.id}`, kind: "team", name, sub: t.kind === "group" ? `Team · ${others.map((m) => m.name.split(" ")[0]).join(", ")} and you` : "Team · direct", ctx: "Team", mark: initialsOf({ name }, "studio"),
        last: t.last ? `${t.last.authorId === me ? "You" : t.last.author.split(" ")[0]}: ${t.last.body.trim() || "Sent an attachment"}` : null, lastAt: t.lastAt, waiting: false, count: 0, lastMine: !t.last || t.last.authorId === me,
        team: t,
      };
    }),
  ];
  /* THIS PERSON'S STATE (migration 0054): unread is a message from someone else
     after they last opened it; pinned conversations sit on top; archived ones
     leave the inbox until someone writes again. */
  const [states, counts2, seenBy] = await Promise.all([
    readStates(me, convs.map((c) => c.key)),
    ready ? unreadCounts(me, projectIds, team.map((t) => t.id)) : Promise.resolve(new Map<string, number>()),
    ready ? othersRead(me, team.map((t) => `d-${t.id}`)) : Promise.resolve(new Map<string, Map<string, string | null>>()),
  ]);
  for (const c of convs) {
    const st = states.get(c.key);
    c.pinned = !!st?.pinned;
    c.unread = ready && !c.lastMine && !!c.lastAt && (!st?.lastReadAt || c.lastAt > st.lastReadAt);
    c.archived = !!st?.archived && !(c.unread);
    if (c.unread) {
      c.unreadN = c.ticket
        ? getTicketMessages(c.ticket.id).filter((m) => m.from === "client" && (!st?.lastReadAt || m.at > st.lastReadAt)).length
        : counts2.get(c.key);
    }
    /* Read ticks only where reading is recorded for everyone in it: team chats. */
    if (c.team && c.lastMine && c.team.last && c.lastAt) {
      const reads = seenBy.get(c.key), others = c.team.members.filter((m) => m.id !== me);
      c.seen = others.length > 0 && others.every((m) => { const at = reads?.get(m.id); return !!at && at >= c.lastAt!; });
    }
  }
  convs.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
  const inBox = (c: Conv, b: string) => (b === "archived" ? !!c.archived : !c.archived && (b === "" || (b === "unread" ? !!c.unread : !!c.pinned)));

  const tally = { "": convs.length, waiting: convs.filter((c) => c.waiting).length, client: convs.filter((c) => c.kind === "client").length, project: convs.filter((c) => c.kind === "project").length, team: convs.filter((c) => c.kind === "team").length };
  const boxN = Object.fromEntries(BOXES.map(([b]) => [b, convs.filter((c) => inBox(c, b)).length])) as Record<string, number>;
  const filter = box === "unread" || box === "pinned" ? box : box === "archived" ? "" : kind || "all";
  const filters = FILTERS
    .filter(([k]) => (k === "unread" || k === "pinned" ? ready : k === "all" || k === "waiting" || tally[k] > 0))
    .map(([k, label]) => ({
      key: k, label,
      count: k === "unread" ? (boxN.unread ? (boxN.unread > 99 ? "99+" : boxN.unread) : undefined) : k === "waiting" ? tally.waiting || undefined : undefined,
      href: hrefFor(query, k === "unread" || k === "pinned" ? { box: k, kind: undefined, page: undefined, c: undefined } : { box: undefined, kind: k === "all" ? undefined : k, page: undefined, c: undefined }),
    }));
  /* SEARCH READS THE MESSAGES TOO, not only names and the last line: question replies from memory, project notes
     and team chats from two bounded queries. */
  const inText = new Set<string>();
  if (search.length >= 2) {
    for (const c of convs) if (c.ticket && getTicketMessages(c.ticket.id).some((m) => m.body.toLocaleLowerCase().includes(search))) inText.add(c.key);
    const like = `%${search.replace(/[%_\\]/g, (x) => `\\${x}`)}%`;
    await Promise.all([
      projectIds.length ? db.query<{ k: string }>("SELECT DISTINCT 'p-'||project_id AS k FROM workspace_team_notes WHERE project_id=ANY($1::STRING[]) AND body ILIKE $2 LIMIT 200", [projectIds, like]).then((r) => r.rows.forEach((x) => inText.add(x.k)), () => {}) : null,
      team.length ? db.query<{ k: string }>("SELECT DISTINCT 'd-'||thread_id::STRING AS k FROM team_messages WHERE thread_id=ANY($1::UUID[]) AND body ILIKE $2 LIMIT 200", [team.map((t) => t.id), like]).then((r) => r.rows.forEach((x) => inText.add(x.k)), () => {}) : null,
    ]);
  }
  const rows = convs
    .filter((c) => inBox(c, box))
    .filter((c) => !kind || (kind === "waiting" ? c.waiting : c.kind === kind))
    .filter((c) => !search || inText.has(c.key) || `${c.name} ${c.sub} ${c.last ?? ""}`.toLocaleLowerCase().includes(search));
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
    lines = getTicketMessages(open.ticket.id).map((m) => ({ id: m.id, who: m.from === "studio" ? m.author : open.name, mine: m.from === "studio", at: m.at, body: m.body, replyTo: m.replyTo ?? null }));
  } else if (open?.project) {
    try {
      const actor = await requireProjectActor(open.project.id, "read");
      canPublish = actor.canManage;
      const r = await db.query<NoteRow>("SELECT id,project_id,author_id,author_name,visibility,body,created_at,reply_to FROM workspace_team_notes WHERE project_id=$1 ORDER BY created_at DESC LIMIT 80", [open.project.id]);
      lines = r.rows.reverse().map((n) => ({ id: n.id, who: n.author_name, mine: n.author_id === me, at: iso(n.created_at), body: n.body, visibility: n.visibility, replyTo: n.reply_to ?? null, tag: n.visibility === "client" ? { text: "Client sees it", tone: "live" } : { text: "Team only", tone: "flat" } }));
    } catch { threadError = "This channel could not be read. Reload the page, or open the project."; }
  } else if (open?.team) {
    const msgs = await teamMessages(open.team.id, me);
    if (msgs) lines = msgs.map((m) => ({ id: m.id, who: m.authorName, mine: m.authorId === me, at: m.at, body: m.body, replyTo: m.replyTo ?? null }));
    else threadError = "This chat could not be read. Reload the page.";
  }
  /* Pictures and files on the open conversation's messages, with signed links. */
  const files = open ? await attachmentsFor(open.key, lines.map((l) => l.id)) : new Map();
  const openClient = open?.ticket ? getClient(open.ticket.clientId) : open?.project ? getClient(open.project.clientId) : null;
  /* Reactions, tags and scheduled sends for the open conversation (migration 0062; empty before it). */
  const marks = open ? await marksFor(open.key, lines.map((l) => l.id), me) : new Map();
  const scheduled = open && role === "owner" && /^[td]-/.test(open.key) ? await scheduledFor(open.key) : [];
  /* Saved replies (Settings key "messages.saved"), written into the reply box with {name} filled in. */
  await hydrateSettings();
  const saved = (() => { try { return JSON.parse(getSetting("messages.saved") ?? "[]") as { t: string; s: string }[]; } catch { return []; } })();
  const replyName = (open?.team ? open.team.members.find((m) => m.id !== me)?.name : openClient?.name)?.split(/\s+/)[0] ?? "";
  /* A fresh ticket read, so a reply that just changed its status shows it. */
  const ticket = open?.ticket ? getTicket(open.ticket.id) ?? open.ticket : null;

  if (!convs.length && !search && !kind) {
    return (
      <>
        <PageHead title="Messages" lede="Client questions, project channels and team chats, in one list." action={ready ? <NewTeamThread /> : undefined} />
        <section className="adList"><Empty title="No conversations yet" icon={MessagesSquare}
          action={can(role, "projects") ? <Link className="ad__btn ad__btn--primary" href="/admin/projects">Open projects</Link> : undefined}>
          {role === "owner" ? "A project gets its channel when it starts, and client questions from the portal land here." : "Your projects and their channels show here once Admin adds you to one."}
        </Empty></section>
      </>
    );
  }

  return (
    <>
      <div className={`adMxHead${picked ? " is-thread" : ""}`}>
      <PageHead title="Messages"
        /* Only a line worth reading: who is waiting and for how long. Unread is on its chip; a quiet inbox needs no sentence. */
        lede={tally.waiting ? <>{`${tally.waiting} ${tally.waiting === 1 ? "client is" : "clients are"} waiting on us.`}{oldest?.lastAt ? <> <strong>Longest wait {whenWords(oldest.lastAt, now)}.</strong></> : null}</> : undefined}
        action={ready ? <NewTeamThread /> : undefined}
        chores={<ChoresMenu label="messages, more" items={[
          ...(can(role, "clients") ? [{ label: "Support questions table", href: "/admin/clients/support", icon: "file" as const }] : []),
          ...(role === "owner" ? [{ label: "Email marketing", href: "/admin/email", icon: "file" as const }, { label: "Help centre articles", href: "/admin/settings/faq", icon: "file" as const }] : []),
        ]} />} />
      </div>
      {!ready && role === "owner" ? <p className="adMx__note" role="status">Unread, pinning, archiving and team chats arrive once migration 0054 is applied in Settings, System.</p> : null}
      {notesFailed ? <p className="adMx__warn" role="status">Project channels could not be loaded just now. Client questions are complete; reload to try the channels again.</p> : null}
      <div className="adMxBox">
        <div className={`adMx ${picked ? "is-thread" : "is-list"}`}>
          <section className="adMx__list" aria-label="Conversations" data-tour="messages-list">
            <div className="adMx__tools"><UrlSearch label="Search messages" placeholder="Search names and messages" />{ready && boxN.unread ? <MarkAllRead keys={convs.filter((c) => c.unread).map((c) => c.key)} /> : null}</div>
            <div className="adMx__kinds"><Chips label="Show" current={filter} items={filters} /></div>
            {ready && box !== "archived" && boxN.archived ? (
              <Link className="adMx__arch" href={hrefFor(query, { box: "archived", kind: undefined, page: undefined, c: undefined })}>
                <Archive aria-hidden="true" /><span>Archived</span><b>{boxN.archived}</b>
              </Link>
            ) : box === "archived" ? (
              <Link className="adMx__arch" href={hrefFor(query, { box: undefined, page: undefined, c: undefined })}>
                <ArrowLeft aria-hidden="true" /><span>Archived conversations</span><b>Back to the inbox</b>
              </Link>
            ) : null}
            {rows.length ? (
              <>
                <ul className="adMx__rows" data-lenis-prevent>
                  {shown.map((c) => {
                    /* Lit only when it is the one being read: picked, or the default
                       beside the thread on a wide screen. A phone's list lights nothing. */
                    const on = open?.key === c.key;
                    return (
                      <li key={c.key}>
                        <Link className={`adMx__row${on ? (picked ? " is-on" : " is-default") : ""}${c.unread ? " is-unread" : ""}`} href={hrefFor(query, { c: c.key })} aria-current={on && picked ? "true" : undefined} title={c.sub}>
                          <span className={`adMk adMx__av ${c.kind === "client" ? "adMk--live" : "adMk--brand"}`} aria-hidden="true">{c.mark}</span>
                          <span className="adMx__rowText">
                            <span className="adMx__rowTop"><b>{c.pinned ? <span className="ad__sr">Pinned. </span> : null}{c.name}</b>{c.lastAt ? <time dateTime={c.lastAt}>{whenWords(c.lastAt, now)}</time> : null}</span>
                            <span className="adMx__rowBottom">
                              <span className="adMx__rowLast">{c.team && c.lastMine && c.team.last ? <span className={`adMx__tick${c.seen ? " is-seen" : ""}`} role="img" aria-label={c.seen ? "Read" : "Sent"}>{c.seen ? <CheckCheck aria-hidden="true" /> : <Check aria-hidden="true" />}</span> : null}{c.last && c.last.replace(/^You: /, "").toLocaleLowerCase().startsWith(c.ctx.toLocaleLowerCase()) ? clip(c.last) : <><span className="adMx__ctxWord">{c.ctx}</span>{c.last ? <> · {clip(c.last)}</> : null}</>}</span>
                              {c.waiting ? <span className="ad__pill ad__pill--warn adMx__tag">Waiting</span> : null}
                              {c.unread ? (c.unreadN ? <span className="adMx__badge" aria-label={`${c.unreadN} unread`}>{c.unreadN > 99 ? "99+" : c.unreadN}</span> : <span className="adMx__dot" role="img" aria-label="Unread" />) : null}
                              {c.pinned ? <Pin className="adMx__pin" aria-hidden="true" /> : null}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {rows.length > 5 ? <Pager label="Conversation pages" total={rows.length} page={page} per={per} noun={rows.length === 1 ? "conversation" : "conversations"}
                  href={(patch) => hrefFor(query, { page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per, c: undefined })} /> : null}
              </>
            ) : (
              <Empty title="No conversations match" icon={MessagesSquare} action={<Link className="ad__btn" href="/admin/messages">Clear filters</Link>}>Try a broader search, or show every conversation.</Empty>
            )}
          </section>

          <ThreadProvider key={open?.key ?? "none"}>
          <section className="adMx__thread" aria-label={open ? `Conversation with ${open.name}` : "Conversation"} data-tour="messages-thread">
            {open ? (
              <>
                <header className="adMx__head">
                  <Link className="ad__btn adMx__back" href={hrefFor(query, { c: undefined })} aria-label="Back to conversations"><ArrowLeft aria-hidden="true" /></Link>
                  <span className={`adMk ${open.kind === "client" ? "adMk--round adMk--live" : "adMk--brand"}`} aria-hidden="true">{open.mark}</span>
                  <div className="adMx__headText">
                    <h2>{open.name}</h2>
                    <p>{open.kind === "client" ? ticket?.subject : open.kind === "team" ? open.sub : `${openClient?.company ?? "Client"} · ${open.count} ${open.count === 1 ? "message" : "messages"}`}</p>
                  </div>
                  {ticket || ready ? <div className="adMx__headActs">{ticket ? <TicketStatusButtons ticketId={ticket.id} status={ticket.status} /> : null}{ready ? <ThreadFlags threadKey={open.key} pinned={!!open.pinned} archived={!!open.archived} /> : null}<ConvDetails name={open.name}
                    people={[...new Set(lines.map((l) => (l.mine ? "You" : l.who)))]}
                    files={lines.slice().reverse().flatMap((l) => (files.get(l.id) ?? []).map((f: { key: string; name: string; kind: string; open: string; download: string }) => ({ key: f.key, name: f.name, kind: f.kind, open: f.open, download: f.download, at: l.at })))}
                    links={lines.slice().reverse().flatMap((l) => (l.body.match(/https?:\/\/[^\s)>"']+/g) ?? []).map((url) => ({ url, at: l.at })))} /></div> : null}
                  {ready ? <MarkRead threadKey={open.key} /> : null}
                </header>
                <nav className="adMx__ctx" aria-label="Linked records">
                  {ticket ? <span className={`ad__pill ${PILL[ticket.status]}`}>{LABEL[ticket.status]}</span> : null}
                  {openClient && can(role, "clients") ? <Link href={`/admin/clients/${openClient.id}`}><Building2 aria-hidden="true" /><span>{openClient.company}</span></Link> : null}
                  {open.project ? <Link href={`/admin/projects/${open.project.id}`}><FolderKanban aria-hidden="true" /><span>{open.project.title}</span></Link> : null}
                  {ticket ? <Link href="/admin/clients/support"><LifeBuoy aria-hidden="true" /><span>Opened {dateWords(ticket.createdAt, now, false)} · All questions</span></Link> : null}
                </nav>
                <div className="adMx__body" data-lenis-prevent tabIndex={0} aria-label="Messages, newest at the bottom">
                  {threadError ? <AdminState kind="error" title="This channel did not load" description={threadError} /> : lines.length ? (
                    <ThreadLines label="Messages" markKey={ready ? open.key : undefined} taskProject={can(role, "projects") ? open.project?.id ?? undefined : undefined} lines={lines.map((m, i): ThreadLine => {
                      const day = dateWords(m.at, now, true), prev = lines[i - 1];
                      return {
                        ...m, files: files.get(m.id), marks: marks.get(m.id), day: !prev || dateWords(prev.at, now, true) !== day ? day : undefined,
                        time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(m.at)),
                        initials: initialsOf({ name: m.who }, m.mine ? "studio" : "client"),
                      };
                    })} />
                  ) : (
                    <Empty title="No messages yet" icon={MessagesSquare}>{open.kind === "project" ? "Write the first note below. It stays with the team unless you choose Client sees it." : open.kind === "team" ? "Write the first message below." : "This question has no messages."}</Empty>
                  )}
                </div>
                <div className="adMx__reply">
                  {!threadError && !(ticket?.status === "Closed") ? <div className="adMx__replyTools"><SavedReplies replies={saved} firstName={replyName} canEdit={role === "owner"} />{role === "owner" && ready && /^[td]-/.test(open.key) ? <ScheduleSend threadKey={open.key} waiting={scheduled} /> : null}</div> : null}
                  {ticket ? (ticket.status === "Closed"
                    ? <p className="ad__dim">Closed. Reopen it to reply, or it reopens by itself if the client writes again.</p>
                    : <StudioReply ticketId={ticket.id} />)
                    : open.project && !threadError ? <ProjectReply key={open.project.id} projectId={open.project.id} canPublish={canPublish} />
                    : open.team && !threadError ? <TeamReply key={open.team.id} threadId={open.team.id} /> : null}
                </div>
              </>
            ) : (
              <Empty title="Pick a conversation" icon={MessagesSquare}>Choose one from the list to read it and reply.</Empty>
            )}
          </section>
          </ThreadProvider>
        </div>
      </div>
    </>
  );
}
