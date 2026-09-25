import { getTicketMessages, getTicketsFor } from "@/lib/admin/store";
import Link from "next/link";
import { Panel, when } from "./bits";

const LABEL: Record<string, string> = { Open: "Waiting on us", Answered: "Answered", Closed: "Closed" };
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
export default function TicketPanel({ clientId }: { clientId: string }) {
  const tickets = getTicketsFor(clientId);
  if (!tickets.length) return null;

  return (
    <Panel title="Support questions" action={<Link href="/admin/clients/support">All support</Link>}>
      <div className="ad__scroll">
        <table className="ad__t">
          <thead><tr><th>Question</th><th>Status</th><th className="num">Messages</th><th>Last activity</th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td><Link href={`/admin/clients/support/${t.id}`}><b>{t.subject}</b></Link></td>
                <td><span className={`ad__pill ${STATUS_CLASS[t.status]}`}>{LABEL[t.status]}</span></td>
                <td className="num">{getTicketMessages(t.id).length}</td>
                <td className="ad__dim ad__num">{when(t.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
