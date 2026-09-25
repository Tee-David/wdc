"use server";

import { revalidatePath } from "next/cache";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { mailIsConfigured, missingMailVariables } from "@/lib/email";
import { sendLogged } from "@/lib/outbox";
import { composeEmailHtml, emailP } from "@/lib/email-templates";
import { LOG_RETENTION_DAYS, LOG_RETENTION_KEY, setAppSetting } from "@/lib/app-settings";
import { runDaily } from "@/lib/jobs/daily";
import { FAILURE_ALERT_KEY } from "@/lib/mail-alert";

const PAGE = "/admin/settings/email";
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

/**
 * A test email through the real mail path, timed.
 *
 * FluentSMTP's test screen, with the one number it leaves out: how long the
 * server took. This mail server spends about 23 seconds authenticating, and
 * "slow" and "broken" look the same until there is a figure.
 */
export async function sendTestEmail(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const to = String(fd.get("to") ?? "").trim().toLowerCase();
  if (!EMAIL.test(to) || to.length > 254) return FAIL({ to: "An email address to send it to." });
  if (!mailIsConfigured()) return FAIL({}, `SMTP is not configured on this deployment. Not set: ${missingMailVariables().join(", ")}.`);
  const by = await actorName();
  const started = Date.now();
  try {
    await sendLogged({
      to,
      subject: "Test email from the WDC admin",
      text: `This is a test from Settings, Email, sent by ${by}. If it arrived, the site can send mail.`,
      html: composeEmailHtml({
        title: "Test email", preheader: "The site can send mail.", heading: "It works",
        blocks: [emailP(`This is a test from Settings, Email, sent by ${by}. If it arrived, the site can send mail.`)],
      }),
    }, { summary: "A test from Settings, Email.", dedupeKey: `smtp-test:${crypto.randomUUID()}`, by });
  } catch (error) {
    revalidatePath(PAGE);
    return FAIL({}, `The mail server refused it after ${((Date.now() - started) / 1000).toFixed(1)} s: ${error instanceof Error ? error.message : "no reason given"}`);
  }
  revalidatePath(PAGE);
  return OK(`Delivered to ${to} in ${((Date.now() - started) / 1000).toFixed(1)} s. Check the inbox, and the spam folder.`);
}

export async function saveLogRetention(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const days = Number(fd.get("days"));
  if (!(LOG_RETENTION_DAYS as readonly number[]).includes(days)) return FAIL({ days: "Pick one of the periods." });
  const by = await actorName();
  try { await setAppSetting(LOG_RETENTION_KEY, days, by); } catch { return FAIL({}, "That could not be saved just now."); }
  audit({ actor: by, kind: "content", subjectId: LOG_RETENTION_KEY, subject: "Message log", action: `set the message log to keep ${days} days` });
  revalidatePath(PAGE);
  return OK(`The log keeps ${days} days from the next daily tidy.`);
}

/** The daily tidy, by hand. Safe to run more than once. */
export async function runDailyNow(): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const r = await runDaily(await actorName());
  revalidatePath(PAGE);
  const trashed = Object.values(r.trashed).reduce((a, b) => a + b, 0);
  if (r.errors.length) return FAIL({}, `Part of the tidy did not run: ${r.errors.join("; ")}`);
  return OK(`Done. Removed ${r.logRows} old log rows, ${trashed} entries and ${r.posts} blog drafts past their Trash period.`);
}

/** Where to say that an email failed; empty switches it off. */
export async function saveFailureAlert(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const to = String(fd.get("to") ?? "").trim().toLowerCase();
  if (to && (!EMAIL.test(to) || to.length > 254)) return FAIL({ to: "An email address, or leave it empty to switch alerts off." });
  const by = await actorName();
  try { await setAppSetting(FAILURE_ALERT_KEY, to ? { to } : null, by); } catch { return FAIL({}, "That could not be saved just now."); }
  audit({ actor: by, kind: "setting", subjectId: FAILURE_ALERT_KEY, subject: "Failure alerts", action: to ? `set failure alerts to go to ${to}` : "switched failure alerts off" });
  revalidatePath(PAGE);
  return OK(to ? `Failed emails will be listed to ${to}, at most once an hour.` : "Failure alerts are off.");
}
