import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalRequest } from "@/lib/portal/session";
import { getTicket, getTicketMessages } from "@/lib/admin/store";
import { Panel, when } from "@/components/admin/bits";
import { TicketReplyForm } from "@/components/client/ticket-reply-form";
import { Conversation } from "@/components/admin/conversation";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await syncStore();
  const { id } = await params;
  const { client } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || t.clientId !== client.id) notFound();
  return { title: t.subject };
}

const STATUS_CLASS: Record<string, string> = {
  Open: "ad__pill--warn",
  Answered: "ad__pill--good",
  Closed: "ad__pill--flat",
};

export default async function PortalTicketThread({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  const { id } = await params;
  const { client } = await getPortalRequest();
  const t = client ? getTicket(id) : null;
  if (!t || !client || t.clientId !== client.id) notFound();

  const messages = getTicketMessages(t.id);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <span className="adDash__eyebrow">Support</span>
          <h1>{t.subject}</h1>
          <p>Started {when(t.createdAt)} · <span className={`ad__pill ${STATUS_CLASS[t.status]}`}>{t.status}</span></p>
        </div>
      </header>

      <Panel title="Conversation">
        <Conversation messages={messages} me="client" />
        <div className="adConv__reply">
          {/* Always open: writing on a closed question reopens it. */}
          <TicketReplyForm ticketId={t.id} />
        </div>
      </Panel>
    </div>
  );
}
