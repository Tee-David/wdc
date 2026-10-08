import Link from "next/link";
import { financeSettings, getClient } from "@/lib/admin/store";
import { listLogged } from "@/lib/message-log";
import { reminderPlan, type ReminderState } from "@/lib/admin/invoice-reminders";
import { invoiceTotals, notifyAllows, type Invoice } from "@/lib/admin/types";
import { Panel, when } from "@/components/admin/bits";

/**
 * WHEN THE CLIENT IS CHASED ABOUT THIS INVOICE, on the invoice itself.
 *
 * The schedule is the Settings one (Studio and invoices), the state of each
 * line is the message log's, and an entry exists only for a day the schedule
 * names or a reminder that really went. See lib/admin/invoice-reminders.ts.
 */
const TONE: Record<ReminderState, { cls: string; word: string }> = {
  sent: { cls: "ad__pill--good", word: "Sent" },
  queued: { cls: "ad__pill--warn", word: "Queued" },
  failed: { cls: "ad__pill--bad", word: "Failed" },
  skipped: { cls: "ad__pill--flat", word: "Skipped" },
  scheduled: { cls: "ad__pill--brand", word: "Scheduled" },
  "not-sent": { cls: "ad__pill--flat", word: "Not sent" },
  "not-needed": { cls: "ad__pill--flat", word: "Not needed" },
};

/** Today in Lagos, the zone the due dates and the job are written in. */
const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);

export default async function InvoiceReminders({ invoice }: { invoice: Invoice }) {
  const messages = await listLogged({ aboutIds: [invoice.id], limit: 200 });
  const plan = reminderPlan({
    invoice,
    due: invoiceTotals(invoice).due,
    days: financeSettings().reminders.map(Number).filter(Number.isFinite),
    messages: messages.filter((m) => m.dedupeKey.startsWith(`reminder:${invoice.id}:`)),
    today: lagosToday(),
    clientAllows: notifyAllows(getClient(invoice.clientId)?.notify, "reminders"),
  });
  const all = [...plan.rows, ...plan.extras];

  return (
    <Panel title="Reminders" action={
      <Link href="/admin/settings/general" className="ad__dim">Schedule in Settings</Link>
    }>
      {plan.off ? (
        <p className="ad__dim" style={{ margin: 0, padding: ".9rem 1rem" }}>
          <span className="ad__pill ad__pill--flat">Off</span>{" "}
          Payment reminders are switched off in Settings, so none are scheduled for this invoice.
          {plan.extras.length ? " Ones sent earlier are listed below." : ""}
        </p>
      ) : null}
      {all.length ? (
        <div className="ad__scroll">
          <table className="ad__t">
            <thead><tr><th>Reminder</th><th>Date</th><th>State</th><th>Note</th></tr></thead>
            <tbody>
              {all.map((r) => (
                <tr key={r.key}>
                  <td><b>{r.label}</b></td>
                  <td className="ad__dim ad__num">{when(r.date)}</td>
                  <td><span className={`ad__pill ${TONE[r.state].cls}`}>{TONE[r.state].word}</span></td>
                  <td className="ad__dim">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
