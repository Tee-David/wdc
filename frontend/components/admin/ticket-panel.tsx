import { getTicketMessages, getTicketsFor } from "@/lib/admin/data";
import { closeTicket, replyToTicketAsStudio } from "@/lib/admin/actions";
import { Area, Form, Hidden, Submit } from "./form";
import { Panel, when } from "./bits";

const STATUS_CLASS: Record<string, string> = {
  Open: "ad__pill--warn",
  Answered: "ad__pill--good",
  Closed: "ad__pill--flat",
};

/**
 * THE STUDIO'S SIDE OF THE PORTAL'S SUPPORT THREAD.
 *
 * Lives on the client workspace rather than as its own top-level admin nav
 * item -- section 4's own rule caps primary admin pages at six, and this is
 * client-scoped the same way credit and comms already are. A ticket the
 * client hasn't answered in a while is exactly the kind of thing the
 * dashboard's attention queue should eventually surface; not done here,
 * left for whenever tickets have enough volume to be worth a queue entry.
 */
export default async function TicketPanel({ clientId }: { clientId: string }) {
  const tickets = await getTicketsFor(clientId);
  if (!tickets.length) return null;
  const messagesByTicket = new Map(
    await Promise.all(tickets.map(async (t) => [t.id, await getTicketMessages(t.id)] as const)),
  );

  return (
    <Panel title="Support conversations">
      <div style={{ display: "grid", gap: ".8rem", padding: "1rem" }}>
        {tickets.map((t) => {
          const messages = messagesByTicket.get(t.id) ?? [];
          return (
            <details key={t.id} className="ad__panel" style={{ padding: ".85rem 1rem" }}>
              <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", listStyle: "none" }}>
                <span><b>{t.subject}</b> <small style={{ color: "var(--ad-dim)" }}>· {when(t.updatedAt)}</small></span>
                <span className={`ad__pill ${STATUS_CLASS[t.status]}`}>{t.status}</span>
              </summary>
              <div style={{ display: "grid", gap: ".5rem", marginTop: ".7rem" }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ fontSize: ".85rem" }}>
                    <b>{m.from === "studio" ? "Studio" : m.author}:</b> {m.body}
                    <small style={{ display: "block", color: "var(--ad-dim)" }}>{when(m.at)}</small>
                  </div>
                ))}
              </div>
              {t.status !== "Closed" ? (
                <div className="ad__row" style={{ marginTop: ".7rem", alignItems: "flex-start" }}>
                  <Form action={replyToTicketAsStudio} resetOnDone>
                    <Hidden name="id" value={t.id} />
                    <Area name="body" label="Reply" rows={2} />
                    <Submit tone="primary">Send reply</Submit>
                  </Form>
                  <Form action={closeTicket}>
                    <Hidden name="id" value={t.id} />
                    <Submit tone="plain">Close</Submit>
                  </Form>
                </div>
              ) : null}
            </details>
          );
        })}
      </div>
    </Panel>
  );
}
