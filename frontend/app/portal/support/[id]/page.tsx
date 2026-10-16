import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderKanban, LifeBuoy, MessagesSquare, Plus } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getProject, getTicket, getTicketMessages, getTicketsFor } from "@/lib/admin/store";
import { CloseTicketButton, TicketReplyForm } from "@/components/client/ticket-reply-form";
import { initialsOf } from "@/components/admin/focus";
import { PageHead } from "@/components/admin/page-head";
import { Chips } from "@/components/admin/chips";
import { Empty } from "@/components/admin/bits";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/admin/conversation.css";
import "@/components/admin/messages.css";
import "@/components/client/portal.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();
  return { title: t.subject };
}

const STATE: Record<string, { cls: string; label: string }> = {
  Open: { cls: "ad__pill--live", label: "Waiting on the studio" },
  Answered: { cls: "ad__pill--good", label: "Answered" },
  Closed: { cls: "ad__pill--flat", label: "Closed" },
};
const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));

/**
 * ONE CONVERSATION, as C-Messages draws it: the client's conversations on the
 * left and the open one beside them with its reply box. On a phone it is one
 * pane with Back. A closed thread stays readable, and writing on it reopens
 * it, so nobody is shut out of their own question.
 */
export default async function PortalTicketThread({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const sp = await searchParams;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();

  const now = nowMs();
  const all = getTicketsFor(client.id).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = all.filter((x) => x.status !== "Closed");
  const closedAll = all.filter((x) => x.status === "Closed");
  const show = sp.show === "closed" || (sp.show !== "open" && t.status === "Closed") ? "closed" : "open";
  const rows = show === "closed" ? closedAll : open;
  const messages = getTicketMessages(t.id);
  const project = t.projectId ? getProject(t.projectId) : null;
  const st = STATE[t.status] ?? STATE.Open;
  const closed = t.status === "Closed";

  return (
    <>
      <PageHead title="Messages"
        lede={<>{open.length} open. <strong>We usually reply the same working day.</strong></>}
        action={<Link className="ad__btn ad__btn--primary" href="/portal/support?new=1#ask"><Plus aria-hidden="true" />Ask a question</Link>} />
      <div className="adMxBox">
        <div className="adMx is-thread">
          <section className="adMx__list" aria-label="Your conversations">
            <div className="adList__hd"><h2>Conversations</h2><span className="adList__n">{all.length}</span></div>
            <div className="adMx__kinds"><Chips label="Which conversations" current={show} items={[
              { key: "open", label: "Open", count: open.length, href: `/portal/support/${t.id}?show=open` },
              { key: "closed", label: "Closed", count: closedAll.length, href: `/portal/support/${t.id}?show=closed` },
            ]} /></div>
            {rows.length ? (
              <ul className="adMx__rows" data-lenis-prevent>
                {rows.map((x) => {
                  const last = getTicketMessages(x.id).at(-1);
                  const on = x.id === t.id;
                  return (
                    <li key={x.id}>
                      <Link className={`adMx__row${on ? " is-on" : ""}`} href={`/portal/support/${x.id}`} aria-current={on ? "true" : undefined}>
                        <span className="adMk adMk--brand" aria-hidden="true"><LifeBuoy width={16} height={16} /></span>
                        <span className="adMx__rowText">
                          <span className="adMx__rowTop"><b>{x.subject}</b><time dateTime={x.updatedAt}>{whenWords(x.updatedAt, now)}</time></span>
                          <span className="adMx__rowLast">{last ? `${last.from === "client" ? "You" : last.author.split(/\s+/)[0]}: ${last.body}` : "No messages yet"}</span>
                        </span>
                        {x.status === "Answered" ? <span className="ad__pill ad__pill--live adMx__tag">New</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title={show === "closed" ? "Nothing closed yet" : "No open conversations"} icon={MessagesSquare}>{show === "closed" ? "Conversations move here once the question is settled." : "Ask us anything about your project."}</Empty>
            )}
          </section>

          <section className="adMx__thread" aria-label={t.subject}>
            <header className="adMx__head">
              <Link className="ad__btn adMx__back" href="/portal/support" aria-label="Back to your conversations"><ArrowLeft aria-hidden="true" /></Link>
              <div className="adMx__headText">
                <h2>{t.subject}</h2>
                <p>Opened {dateWords(t.createdAt, now, false)}{messages.length ? ` · ${messages.length} ${messages.length === 1 ? "message" : "messages"}` : ""}</p>
              </div>
              {closed ? null : <div className="adMx__headActs"><CloseTicketButton ticketId={t.id} /></div>}
            </header>
            <nav className="adMx__ctx" aria-label="About this conversation">
              <span className={`ad__pill ${st.cls}`}>{st.label}</span>
              {project ? <Link href={`/portal/projects/${project.id}`}><FolderKanban aria-hidden="true" /><span>{project.title}</span></Link> : null}
            </nav>
            <div className="adMx__body" data-lenis-prevent tabIndex={0} aria-label="Messages, newest at the bottom">
              {messages.length ? (
                <ol className="adConv">
                  {messages.map((m, i) => {
                    const mine = m.from === "client";
                    const day = dateWords(m.at, now, true);
                    const prev = messages[i - 1];
                    return (
                      <li key={m.id} className="adMx__item">
                        {!prev || dateWords(prev.at, now, true) !== day ? <p className="adMx__day"><span>{day}</span></p> : null}
                        <div className={`adConv__msg${mine ? " is-mine" : ""}`}>
                          <span className={`adConv__av ad__av${mine ? " ad__av--live" : ""}`} aria-hidden="true">{initialsOf({ name: m.author }, m.from)}</span>
                          <div className="adConv__bubble">
                            <p className="adConv__who"><b>{mine ? "You" : m.author}</b> <time dateTime={m.at}>{time(m.at)}</time></p>
                            <p className="adConv__body">{m.body}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : <Empty title="No messages yet" icon={MessagesSquare}>Write the first one below.</Empty>}
            </div>
            <div className="adMx__reply"><TicketReplyForm ticketId={t.id} closed={closed} /></div>
          </section>
        </div>
      </div>
    </>
  );
}
