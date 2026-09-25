import "server-only";

import { financeSettings, getInvoices } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals } from "@/lib/admin/types";
import { saveStore, syncStore } from "@/lib/admin/persist";
import { sendInvoiceReminderEmail } from "@/lib/money-mail";

export type ReminderCounts = { sent: number; skipped: number; failed: number };

const DAY = 86_400_000;
/** Today's date in Lagos, as the due dates are written. */
const lagosDay = (d: Date) => new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * THE REMINDER SCHEDULE (Settings, Studio and invoices), run by the daily job.
 *
 * An unpaid invoice whose due date is one of the chosen distances from today
 * gets the same reminder the "Send reminder" button sends. SAFE TO RUN TWICE:
 * the message key carries the day (lib/money-mail.ts), so a second run the
 * same day sends nothing, and a client who switched reminders off is written
 * down as skipped rather than emailed.
 */
export async function sendScheduledReminders(now = new Date()): Promise<ReminderCounts> {
  const counts: ReminderCounts = { sent: 0, skipped: 0, failed: 0 };
  await syncStore();
  const days = financeSettings().reminders.map(Number);
  if (!days.length) return counts;
  const today = Date.parse(`${lagosDay(now)}T00:00:00Z`);
  for (const invoice of getInvoices()) {
    if (invoice.voided || !invoice.due) continue;
    const status = invoiceStatus(invoice);
    if (status !== "Sent" && status !== "Part paid" && status !== "Overdue") continue;
    if (invoiceTotals(invoice).due <= 0) continue;
    const late = Math.round((today - Date.parse(`${invoice.due.slice(0, 10)}T00:00:00Z`)) / DAY);
    if (!days.includes(late)) continue;
    const r = await sendInvoiceReminderEmail({ invoice, today: now, by: "Reminder schedule" });
    if (r.sent) counts.sent += 1;
    else if (r.reason === "send failed" || r.reason === "mail not configured") counts.failed += 1;
    else counts.skipped += 1;
  }
  await saveStore();
  return counts;
}
