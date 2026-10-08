import { getClient } from "@/lib/admin/store";
import { listLogged } from "@/lib/message-log";
import { whatsappLink } from "@/lib/admin/whatsapp";
import { MessageActions } from "./log-message";
import { Empty, Panel, when } from "@/components/admin/bits";
import { ResendMessage } from "./reconcile-forms";
import type { MessageState } from "@/lib/admin/types";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";

/**
 * What we have said to somebody, and whether it arrived.
 *
 * THE STATE IS THE POINT. Every other log on these screens records something
 * that definitely happened; this one records intents, and the interesting rows
 * are the ones that did not become sends. A receipt sitting on Failed is a
 * client who thinks they were not thanked, and nothing else on any screen
 * would show it.
 *
 * QUEUED IS NOT A HAPPY STATE EITHER. The row is written before the mail
 * server is called and moved when it answers, so a row still saying Queued
 * long after the fact is a send that disappeared inside the provider. Shown
 * in its own tone rather than blended in with Sent.
 *
 * SKIPPED IS DELIBERATE AND IS SAID OUT LOUD. "We did not send this because
 * they have reminders switched off" is a different fact from "it failed", and
 * a log that collapses them teaches people to distrust the log.
 */

const TONE: Record<MessageState, string> = {
  Sent: "ad__pill--good",
  Queued: "ad__pill--warn",
  Failed: "ad__pill--bad",
  Skipped: "ad__pill--flat",
};

export default async function CommsLog({
  clientId, aboutIds, title = "What we have sent", limit = 20,
}: {
  clientId?: string;
  aboutIds?: readonly string[];
  title?: string;
  limit?: number;
}) {
  /* Staff see what was said to a client about the work, not the invoices,
     receipts and reminders: those carry the figures (lib/admin/permissions.ts). */
  const money = can(await adminRole(), "money");
  const messages = (await listLogged({ clientId, aboutIds, limit }))
    .filter((m) => money || (m.about?.kind !== "invoice" && m.about?.kind !== "payment" && !/estimate|invoice|receipt/i.test(m.subject)));
  /* The hand-over controls belong to a person, so they only appear on a
     client's own log, not on an invoice's. */
  const client = clientId && !aboutIds ? getClient(clientId) : null;
  const actions = client ? (
    <MessageActions
      clientId={client.id}
      clientName={client.name}
      waHref={whatsappLink(client.phone, `Hi ${client.name.split(/\s+/)[0]}, it's We Dig Creativity.`)}
    />
  ) : undefined;

  return (
    <Panel title={title} action={actions}>
      {messages.length ? (
        <div className="ad__scroll">
          <table className="ad__t">
            <thead>
              <tr>
                <th>When</th><th>Channel</th><th>To</th><th>What it said</th>
                <th>State</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="ad__dim ad__num">{when(m.at)}</td>
                  <td>{m.channel}</td>
                  {/* No `overflow-wrap: anywhere` here any more -- see the note in
                      admin.css. It let this column collapse to one character
                      wide, which is the fault it was meant to prevent. */}
                  <td>{m.to}</td>
                  <td>
                    <b>{m.subject}</b>
                    <p className="ad__dim" style={{ margin: ".2rem 0 0", fontSize: ".8rem" }}>{m.summary}</p>
                  </td>
                  <td>
                    <span className={`ad__pill ${TONE[m.state]}`}>{m.state}</span>
                    {m.error ? (
                      <p className="ad__dim" style={{ margin: ".25rem 0 0", fontSize: ".78rem" }}>{m.error}</p>
                    ) : null}
                  </td>
                  <td className="ad__rmC">
                    {/* A failed row that has since been sent on (Try again, or a
                        retry) keeps its Failed state as the record, and says so
                        instead of offering the same retry again. */}
                    {m.state === "Failed" && m.resends.some((r) => r.sent)
                      ? <span className="ad__dim" style={{ fontSize: ".78rem" }}>Sent again</span>
                      : m.state === "Failed" ? <ResendMessage id={m.id} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nothing sent yet">
          Every email the studio sends about this is recorded here with whether
          it arrived. Calls and WhatsApp messages can be written down with
          &ldquo;Log a call or message&rdquo;; the site cannot read them, so a row for
          one means somebody typed it.
        </Empty>
      )}
    </Panel>
  );
}
