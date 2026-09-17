import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortalRequest } from "@/lib/portal/session";
import { getTicket, getTicketMessages } from "@/lib/admin/data";
import { Panel, when } from "@/components/admin/bits";
import { TicketReplyForm } from "@/components/client/ticket-reply-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const t = client ? await getTicket(id) : null;
  if (!t || !client || t.clientId !== client.id) notFound();
  return { title: t.subject };
}

const STATUS_CLASS: Record<string, string> = {
  Open: "ad__pill--warn",
  Answered: "ad__pill--good",
  Closed: "ad__pill--flat",
};

export default async function PortalTicketThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await getPortalRequest();
  const t = client ? await getTicket(id) : null;
  if (!t || !client || t.clientId !== client.id) notFound();

  const messages = await getTicketMessages(t.id);

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
        <div style={{ display: "grid", gap: ".75rem" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className="ad__panel"
              style={{
                padding: ".85rem 1rem",
                marginLeft: m.from === "studio" ? "0" : "2rem",
                marginRight: m.from === "studio" ? "2rem" : "0",
                background: m.from === "studio" ? "var(--ad-bg)" : "var(--ad-panel)",
              }}
            >
              <div className="ad__row" style={{ justifyContent: "space-between" }}>
                <b>{m.from === "studio" ? "WDC" : m.author}</b>
                <small style={{ color: "var(--ad-dim)" }}>{when(m.at)}</small>
              </div>
              <p style={{ margin: ".4rem 0 0", fontSize: ".9rem", whiteSpace: "pre-wrap" }}>{m.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      {t.status !== "Closed" ? (
        <section className="ad__panel" style={{ padding: "1rem", marginTop: ".9rem" }}>
          <TicketReplyForm ticketId={t.id} />
        </section>
      ) : null}
    </div>
  );
}
