import { getMessages } from "@/lib/admin/store";
import { Empty, Panel, when } from "@/components/admin/bits";
import { ResendMessage } from "./reconcile-forms";
import type { MessageState } from "@/lib/admin/types";

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

export default function CommsLog({
  clientId, aboutIds, title = "What we have sent", limit = 20,
}: {
  clientId?: string;
  aboutIds?: readonly string[];
  title?: string;
  limit?: number;
}) {
  const messages = getMessages({ clientId, aboutIds, limit });

  return (
    <Panel title={title}>
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
                  <td style={{ overflowWrap: "anywhere" }}>{m.to}</td>
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
                    {m.state === "Failed" ? <ResendMessage id={m.id} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nothing sent yet">
          Every email the studio sends about this is recorded here with whether
          it arrived. Calls and WhatsApp messages can be written down here too;
          the site cannot read them, so a row for one means somebody typed it.
        </Empty>
      )}
    </Panel>
  );
}
