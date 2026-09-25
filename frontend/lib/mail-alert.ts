import "server-only";

import { after } from "next/server";
import { db } from "@/lib/db/pool";
import { mailIsConfigured } from "@/lib/email";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { composeEmailHtml, emailP, emailPanel } from "@/lib/email-templates";
import { SITE_URL } from "@/lib/site";

/**
 * "Tell this address when an email fails."
 *
 * There is no automatic retry, so a failed message has failed for the last
 * time unless a person resends it. The alert makes sure a person knows.
 *
 * AT MOST ONE AN HOUR, as a list. A mail server that starts refusing
 * everything would otherwise send one alert per failure. The hour is claimed
 * with the outbox's own dedupe key (`failure-alert:<hour>`), so two instances
 * failing at once still send one. Failures in an hour that already had its
 * alert are picked up by the next failure's alert, or by the daily tidy.
 *
 * THROUGH THE SAME MAIL SERVER, which is the limit to say out loud: it
 * reports an address that was refused, not an outage of the server itself.
 * The admin bell and the dashboard say that one. An alert that fails is
 * never alerted about, or it would be a loop.
 */

export const FAILURE_ALERT_KEY = "email.failureAlert";
const LAST_KEY = "email.failureAlertThrough";
export const ALERT_PREFIX = "failure-alert:";
const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);

export type FailureAlert = { to: string } | null;

const lagosHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 13);

/** Send the alert if one is due. Never throws. */
export async function alertFailures(): Promise<"sent" | "none" | "off" | "duplicate" | "failed"> {
  if (!configured() || !mailIsConfigured()) return "off";
  try {
    const cfg = await getAppSetting<FailureAlert>(FAILURE_ALERT_KEY, null);
    if (!cfg?.to) return "off";
    const through = await getAppSetting<string | null>(LAST_KEY, null);
    const since = through ? new Date(through) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = (await db.query<{ to_addr: string; subject: string; error: string | null; created_at: Date }>(`
      SELECT to_addr, subject, error, created_at FROM message_log
      WHERE state = 'Failed' AND created_at > $1 AND dedupe_key NOT LIKE $2
      ORDER BY created_at ASC LIMIT 25
    `, [since, `${ALERT_PREFIX}%`])).rows;
    if (!rows.length) return "none";
    const { sendLogged } = await import("@/lib/outbox");
    const n = rows.length;
    const lines = rows.map((r) => `${r.subject} to ${r.to_addr}: ${r.error ?? "refused"}`);
    const link = new URL("/admin/settings/email?state=Failed", SITE_URL).toString();
    const result = await sendLogged({
      to: cfg.to,
      subject: `${n} ${n === 1 ? "email" : "emails"} from the site did not go`,
      text: `${lines.join("\n")}\n\nEach one is in the message log, where it can be resent: ${link}`,
      html: composeEmailHtml({
        title: "Emails that did not go", preheader: `${n} ${n === 1 ? "email" : "emails"} from the site did not go.`,
        heading: "Emails that did not go",
        blocks: [emailPanel(rows.slice(0, 10).map((r) => [r.to_addr, `${r.subject}: ${r.error ?? "refused"}`] as [string, string])),
          emailP(`Each one is in the message log, where it can be resent: <a href="${link}">open the log</a>.`)],
      }),
    }, { summary: `An alert about ${n} failed ${n === 1 ? "email" : "emails"}.`, dedupeKey: `${ALERT_PREFIX}${lagosHour()}`, by: "Failure alert" });
    if (result === "duplicate") return "duplicate";
    await setAppSetting(LAST_KEY, new Date(rows[rows.length - 1].created_at).toISOString(), "Failure alert");
    return "sent";
  } catch (error) {
    console.error("[mail-alert] could not send:", error instanceof Error ? error.message : error);
    return "failed";
  }
}

/** Called by the outbox when a send fails. Behind the response, never in the way of it. */
export function scheduleFailureAlert(dedupeKey: string) {
  if (dedupeKey.startsWith(ALERT_PREFIX)) return;
  const run = () => alertFailures().then(() => undefined);
  try { after(run); } catch { void run(); }
}
