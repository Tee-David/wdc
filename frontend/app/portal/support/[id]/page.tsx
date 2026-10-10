import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getProject, getTicket, getTicketMessages } from "@/lib/admin/store";
import { when } from "@/components/admin/bits";
import { CloseTicketButton, TicketReplyForm } from "@/components/client/ticket-reply-form";
import { Conversation } from "@/components/admin/conversation";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import "@/components/client/portal.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();
  return { title: t.subject };
}

const STATUS: Record<string, { cls: string; label: string }> = {
  Open: { cls: "ad__pill--live", label: "Open" },
  Answered: { cls: "ad__pill--good", label: "Answered" },
  Closed: { cls: "ad__pill--flat", label: "Closed" },
};

/**
 * ONE CONVERSATION, as PConversation.dc.html draws it: the thread in a card
 * with its title and state, the reply under it, and what the conversation is
 * about beside it. A closed thread stays readable, and writing on it reopens
 * it, so nobody is ever shut out of their own question.
 */
export default async function PortalTicketThread({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const { client, isPrimaryContact } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || !isPrimaryContact || t.clientId !== client.id) notFound();

  const messages = getTicketMessages(t.id);
  const project = t.projectId ? getProject(t.projectId) : null;
  const studio = [...messages].reverse().find((m) => m.from === "studio");
  const st = STATUS[t.status] ?? STATUS.Open;
  const closed = t.status === "Closed";

  return (
    <div className="adDash">
      <nav className="pConv__crumbs" aria-label="Breadcrumb">
        <Link href="/portal/support">Support</Link>
        <ChevronRight aria-hidden="true" />
        <span aria-current="page">{t.subject}</span>
      </nav>

      <div className="pSup">
        <section className="ad__panel pConv" aria-labelledby="conv-title">
          <header className="pConv__head">
            <div>
              <h1 id="conv-title">{t.subject}</h1>
              <p>{project ? `${project.title} · ` : ""}opened {when(t.createdAt)}</p>
            </div>
            <span className="pConv__state">
              <span className={`ad__pill ${st.cls}`}>{st.label}</span>
              {closed ? null : <CloseTicketButton ticketId={t.id} />}
            </span>
          </header>
          {messages.length
            ? <Conversation messages={messages} me="client" />
            : <p className="pConv__none ad__dim">No messages yet. Write the first one below.</p>}
          <div className="adConv__reply">
            <TicketReplyForm ticketId={t.id} closed={closed} />
          </div>
        </section>

        <aside className="ad__panel pSup__aside pConv__about">
          <h2>About this conversation</h2>
          <dl>
            <div><dt>Project</dt><dd>{project ? <Link href={`/portal/projects/${project.id}`}>{project.title}</Link> : "Not about one project"}</dd></div>
            <div><dt>Answered by</dt><dd>{studio ? studio.author : "Not answered yet"}</dd></div>
            <div><dt>Opened</dt><dd>{when(t.createdAt)}</dd></div>
            <div><dt>Last message</dt><dd>{when(messages.at(-1)?.at ?? t.createdAt)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
