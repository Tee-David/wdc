import type { Invoice, Message } from "./types";

/**
 * THE REMINDER SCHEDULE OF ONE INVOICE, as the daily job (lib/jobs/reminders.ts)
 * will treat it, with what the message log says actually happened.
 *
 * Nothing here is invented. The slots come from the Settings distances
 * (`finance.reminders`: days from the due date, negative before it). A slot
 * is "sent" only when a message with that day's dedupe key exists in the log,
 * and the log is the only thing that can say so. Anything else is "scheduled"
 * (still ahead), "not sent" (the day passed with nothing in the log) or "not
 * needed" (nothing is owed any more, or the invoice was struck).
 *
 * Pure, so it can be tested without a server: dates are YYYY-MM-DD strings.
 */

export type ReminderState = "sent" | "queued" | "failed" | "skipped" | "scheduled" | "not-sent" | "not-needed";

export type ReminderRow = {
  key: string;
  label: string;
  /** YYYY-MM-DD the slot falls on (slots), or the day it went (extras). */
  date: string;
  state: ReminderState;
  /** One short, true sentence. */
  detail: string;
};

const DAY = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);
const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export function offsetLabel(n: number) {
  if (n === 0) return "On the due date";
  const abs = Math.abs(n);
  return `${abs} day${abs === 1 ? "" : "s"} ${n < 0 ? "before" : "after"} the due date`;
}

export function reminderPlan(d: {
  invoice: Pick<Invoice, "id" | "due" | "voided">;
  /** What is still owed, from invoiceTotals. */
  due: number;
  /** The Settings distances; empty when reminders are switched off. */
  days: readonly number[];
  /** Every message logged against this invoice. */
  messages: readonly Pick<Message, "at" | "state" | "dedupeKey" | "by" | "summary" | "error">[];
  /** Today's date, YYYY-MM-DD. */
  today: string;
  /** False when the client has switched reminders off. */
  clientAllows?: boolean;
}): { off: boolean; rows: ReminderRow[]; extras: ReminderRow[] } {
  const { invoice, messages, today } = d;
  const prefix = `reminder:${invoice.id}:`;
  const mine = messages.filter((m) => m.dedupeKey.startsWith(prefix));
  const used = new Set<string>();
  const slots = [...new Set(d.days)].sort((a, b) => a - b);

  const rows: ReminderRow[] = slots.map((n): ReminderRow => {
    const date = addDays(day(invoice.due), n);
    /* The job's key carries the UTC day of the run; Lagos is an hour ahead, so
       a run just before midnight UTC belongs to the next day's slot. */
    const hit = mine.find((m) => m.dedupeKey === `${prefix}${date}`)
      ?? mine.find((m) => m.by === "Reminder schedule" && m.dedupeKey === `${prefix}${addDays(date, -1)}`);
    const base = { key: `slot${n}`, label: offsetLabel(n), date };
    if (hit) {
      used.add(hit.dedupeKey);
      if (hit.state === "Sent") return { ...base, state: "sent", detail: `Sent ${day(hit.at)}.` };
      if (hit.state === "Failed") return { ...base, state: "failed", detail: hit.error ? `Did not send: ${hit.error}` : "Did not send." };
      if (hit.state === "Skipped") return { ...base, state: "skipped", detail: hit.summary || "Skipped." };
      return { ...base, state: "queued", detail: "Waiting to go." };
    }
    if (invoice.voided) return { ...base, state: "not-needed", detail: "The invoice was struck, so nothing is sent." };
    if (d.due <= 0) return { ...base, state: "not-needed", detail: "Nothing is owed, so nothing is sent." };
    if (date >= today) {
      return d.clientAllows === false
        ? { ...base, state: "skipped", detail: "The client has reminders switched off, so it will be skipped." }
        : { ...base, state: "scheduled", detail: date === today ? "Goes out with today's run." : "Goes out with that day's run." };
    }
    return { ...base, state: "not-sent", detail: "That day passed and nothing was sent." };
  });

  /* Reminders sent by hand, or on a day the schedule no longer names, are
     still facts about this invoice. */
  const extras: ReminderRow[] = mine
    .filter((m) => !used.has(m.dedupeKey))
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((m, i): ReminderRow => ({
      key: `extra${i}`,
      label: m.by === "Reminder schedule" ? "Scheduled reminder" : `Sent by ${m.by}`,
      date: day(m.at),
      state: m.state === "Sent" ? "sent" : m.state === "Failed" ? "failed" : m.state === "Skipped" ? "skipped" : "queued",
      detail: m.state === "Sent" ? `Sent ${day(m.at)}.` : m.state === "Failed" ? (m.error ? `Did not send: ${m.error}` : "Did not send.") : m.summary || "Waiting to go.",
    }));

  return { off: slots.length === 0, rows, extras };
}
