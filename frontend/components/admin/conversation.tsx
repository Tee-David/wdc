import type { TicketMessage } from "@/lib/admin/types";
import { initialsOf } from "./focus";
import "./conversation.css";

const stamp = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));

/**
 * A SUPPORT CONVERSATION, the same on both sides: the viewer's own messages
 * on the right in the navy fill, the other side's on the left on the panel,
 * each with who and when. Read-only; the reply form sits under it.
 */
export function Conversation({ messages, me }: { messages: TicketMessage[]; me: "client" | "studio" }) {
  return (
    <ol className="adConv" aria-label="Conversation">
      {messages.map((m) => {
        const mine = m.from === me;
        return (
          <li key={m.id} className={`adConv__msg${mine ? " is-mine" : ""}`}>
            <span className={`adConv__av ad__av--${m.from === "studio" ? "brand" : "live"}`} aria-hidden="true">
              {initialsOf({ name: m.author }, m.from)}
            </span>
            <div className="adConv__bubble">
              <p className="adConv__who"><b>{mine ? "You" : m.author}</b> <time dateTime={m.at}>{stamp(m.at)}</time></p>
              <p className="adConv__body">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
