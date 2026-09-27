"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { actorName, allow, owner } from "./guard";
import { FAIL, OK, str, type ActionState } from "./validate";
import { audit, getSetting } from "./store";
import { syncStore } from "./persist";
import { settingDef } from "@/lib/settings/registry";
import { NETWORKS, socialKey } from "@/lib/social";
import { removeSetting, writeSetting } from "@/lib/settings/store";
import { DEFAULT_LOG_RETENTION, getAppSetting, LOG_RETENTION_DAYS, LOG_RETENTION_KEY, setAppSetting } from "@/lib/app-settings";
import { FAILURE_ALERT_KEY, type FailureAlert } from "@/lib/mail-alert";
import { FORMS } from "@/lib/forms/registry";
import { NOTIFICATIONS } from "@/lib/forms/settings";
import { getFormSettings, saveFormSettings } from "@/lib/forms/settings-db";
import { dropNotice, holdNotice, NOTICE_HOURS, pendingNotice } from "@/lib/notice-address";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";
import { noticeAddressEmail } from "@/lib/email-templates";
import { secretKey, sendLogged } from "@/lib/outbox";

/**
 * THE SETTINGS SECTIONS' SAVES (components/admin/settings/kit.tsx). Each
 * section is one form with a save bar, so each has one action: every value is
 * checked before anything is written (a bad field saves nothing), then only
 * what changed is written, and the reply says whether anything did.
 */

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i;
const SAVED = "Settings saved.";
const SAME = "Nothing had changed.";

/** Registry keys: parsed, then written only when changed; back to what shipped removes the row. */
async function writeKeys(values: Record<string, string>, by: string): Promise<{ errors: Record<string, string>; changed: number; pages: Set<string> }> {
  const errors: Record<string, string> = {};
  const parsed: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    const def = settingDef(key);
    if (!def?.parse) { errors[key] = "That is not a setting."; continue; }
    const p = def.parse(raw);
    if (p.ok) parsed[key] = p.value; else errors[key] = p.error;
  }
  const pages = new Set<string>(["/admin/settings"]);
  if (Object.keys(errors).length) return { errors, changed: 0, pages };
  let changed = 0;
  for (const [key, value] of Object.entries(parsed)) {
    const def = settingDef(key)!;
    const shipped = def.shipped();
    if ((getSetting(key) ?? shipped) === value) continue;
    if (value === shipped) await removeSetting(key, by); else await writeSetting(key, value, by);
    def.revalidate.forEach((p) => pages.add(p));
    changed += 1;
  }
  return { errors, changed, pages };
}

function finish(changed: number, pages: Iterable<string>) {
  revalidatePath("/admin");
  for (const p of pages) revalidatePath(p);
  return OK(changed ? SAVED : SAME);
}

/** Studio and invoices: VAT, terms, and the reminder schedule. */
export async function saveStudioSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await owner();
  if (refused) return refused;
  const on = str(fd, "remindersOn") === "1";
  const days = fd.getAll("finance.reminders").map(String);
  if (on && !days.length) return FAIL({ "finance.reminders": "Pick at least one day, or switch reminders off." }, "Nothing was saved.");
  try {
    const r = await writeKeys({
      "finance.vatRate": str(fd, "finance.vatRate"),
      "finance.dueInDays": str(fd, "finance.dueInDays"),
      "finance.vatOn": str(fd, "finance.vatOn"),
      "finance.reminders": on ? days.join(",") : "off",
      "finance.tin": str(fd, "finance.tin"),
      "finance.footerNote": str(fd, "finance.footerNote"),
    }, await actorName());
    if (Object.keys(r.errors).length) return FAIL(r.errors, "Nothing was saved. Fix the marked fields.");
    return finish(r.changed, r.pages);
  } catch {
    return FAIL({}, "That could not be saved just now.");
  }
}

/** Notifications: what the studio is emailed about, including each form's notice and failure alerts. */
export async function saveNotificationSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await owner();
  if (refused) return refused;
  const failOn = str(fd, "failAlert") === "1";
  const failTo = str(fd, "failTo").toLowerCase();
  if (failOn && (!EMAIL.test(failTo) || failTo.length > 254)) {
    return FAIL({ failTo: "Enter an email like name@example.com." }, "Nothing was saved. Fix the marked fields.");
  }
  const by = await actorName();
  try {
    const r = await writeKeys({ "notify.tickets": str(fd, "notify.tickets"), "notify.payments": str(fd, "notify.payments") }, by);
    if (Object.keys(r.errors).length) return FAIL(r.errors, "Nothing was saved.");
    let changed = r.changed;

    const was = await getAppSetting<FailureAlert>(FAILURE_ALERT_KEY, null);
    if ((was?.to ?? "") !== (failOn ? failTo : "")) {
      await setAppSetting(FAILURE_ALERT_KEY, failOn ? { to: failTo } : null, by);
      audit({ actor: by, kind: "setting", subjectId: FAILURE_ALERT_KEY, subject: "Failure alerts", action: failOn ? `set failure alerts to go to ${failTo}` : "switched failure alerts off" });
      changed += 1;
    }

    for (const form of FORMS) {
      if (!NOTIFICATIONS[form.source].some((n) => n.key === "studio-notice")) continue;
      const field = fd.get(`form.${form.key}`);
      if (field === null) continue;
      const want = String(field) === "1";
      const stored = await getFormSettings(form);
      const current = { ...stored };
      delete current.savedBy;
      delete current.savedAt;
      const notice = current.notifications["studio-notice"];
      if (!notice || notice.enabled === want) continue;
      await saveFormSettings(form, { ...current, notifications: { ...current.notifications, "studio-notice": { ...notice, enabled: want } } }, by);
      audit({ actor: by, kind: "setting", subjectId: `form.${form.key}`, subject: form.title, action: want ? "switched the studio notice on" : "switched the studio notice off" });
      r.pages.add(`/admin/forms/${form.key}`);
      changed += 1;
    }
    return finish(changed, [...r.pages, "/admin/settings/notifications"]);
  } catch {
    return FAIL({}, "That could not be saved just now.");
  }
}

/** Email: the sender, where replies go, and how long the log is kept. */
export async function saveEmailSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await owner();
  if (refused) return refused;
  const days = Number(str(fd, "logDays"));
  if (!(LOG_RETENTION_DAYS as readonly number[]).includes(days)) return FAIL({ logDays: "Pick one of the listed periods." }, "Nothing was saved.");
  const by = await actorName();
  try {
    /* A NEW reply-to is where studio notices go, so it proves itself first
       (lib/notice-address.ts): held, and mailed a link, rather than written.
       Back to the default is an address already trusted, and applies now. */
    const replyDef = settingDef("mail.replyTo")!;
    const reply = replyDef.parse!(str(fd, "mail.replyTo"));
    if (!reply.ok) return FAIL({ "mail.replyTo": reply.error }, "Nothing was saved. Fix the marked fields.");
    const shippedReply = replyDef.shipped();
    const currentReply = getSetting("mail.replyTo") ?? shippedReply;
    const held = reply.value !== currentReply && reply.value !== "" && reply.value !== shippedReply;
    if (held && refusedEmail(reply.value)) return FAIL({ "mail.replyTo": REFUSED_EMAIL_MESSAGE }, "Nothing was saved. Fix the marked fields.");

    const r = await writeKeys({ "mail.fromName": str(fd, "mail.fromName"), ...(held ? {} : { "mail.replyTo": reply.value }) }, by);
    if (Object.keys(r.errors).length) return FAIL(r.errors, "Nothing was saved. Fix the marked fields.");
    let changed = r.changed;
    if (held) {
      await askToConfirmNotice(reply.value, by);
      changed += 1;
    } else if (reply.value !== currentReply) {
      await dropNotice(by);
    }
    if ((await getAppSetting(LOG_RETENTION_KEY, DEFAULT_LOG_RETENTION)) !== days) {
      await setAppSetting(LOG_RETENTION_KEY, days, by);
      audit({ actor: by, kind: "setting", subjectId: LOG_RETENTION_KEY, subject: "Message log", action: `set the message log to keep ${days} days` });
      changed += 1;
    }
    const done = finish(changed, [...r.pages, "/admin/settings/email"]);
    return held ? OK(`Check ${reply.value}: replies and notices move there once the link we sent is opened. Until then they go where they go now.`) : done;
  } catch {
    return FAIL({}, "That could not be saved just now.");
  }
}

/* Held, and mailed behind the response (the mail server takes about 23
   seconds to authenticate). The row in the message log comes first, so a
   send that fails is visible there and in the failure alert. */
async function askToConfirmNotice(to: string, by: string) {
  const url = await holdNotice(to, by);
  audit({ actor: by, kind: "setting", subjectId: "mail.replyTo", subject: "Replies go to", action: `asked ${to} to confirm it for studio notices and replies` });
  after(async () => {
    try {
      await sendLogged({ to, ...noticeAddressEmail({ url, by, hours: NOTICE_HOURS }) },
        { summary: "Confirm a new address for studio notices.", dedupeKey: secretKey("notice-address", url), by });
    } catch (error) {
      console.error("[settings] the confirmation email did not go:", error instanceof Error ? error.message : error);
    }
  });
}

/** Send the confirmation again, with a new link (the old one stops working). */
export async function resendNoticeConfirmation(): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const p = await pendingNotice();
  if (!p) return FAIL({}, "There is no change waiting. Enter the address again.");
  try { await askToConfirmNotice(p.to, await actorName()); } catch { return FAIL({}, "That could not be sent just now."); }
  revalidatePath("/admin/settings/email");
  return OK(`Sent again to ${p.to}. The earlier link no longer works.`);
}

/** Withdraw the change: the link stops working and nothing moves. */
export async function cancelNoticeChange(): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const by = await actorName();
  const p = await pendingNotice();
  try { await dropNotice(by); } catch { return FAIL({}, "That could not be withdrawn just now."); }
  if (p) audit({ actor: by, kind: "setting", subjectId: "mail.replyTo", subject: "Replies go to", action: `withdrew the change to ${p.to}` });
  revalidatePath("/admin/settings/email");
  return OK("Withdrawn. Replies and notices stay where they are.");
}

/** Business profile: the studio's social profiles, drawn in every email's footer. */
export async function saveBusinessSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await owner();
  if (refused) return refused;
  try {
    const r = await writeKeys(Object.fromEntries(NETWORKS.map((n) => [socialKey(n.network), str(fd, socialKey(n.network))])), await actorName());
    if (Object.keys(r.errors).length) return FAIL(r.errors, "Nothing was saved. Fix the marked fields.");
    return finish(r.changed, [...r.pages, "/admin/settings/business"]);
  } catch {
    return FAIL({}, "That could not be saved just now.");
  }
}

/** Blog and site copy: the service a new post starts under, and the feed's length. Staff may, since the blog is theirs too. */
export async function saveContentSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("content");
  if (refused) return refused;
  try {
    const r = await writeKeys({ "blog.defaultTopic": str(fd, "blog.defaultTopic"), "blog.rssCount": str(fd, "blog.rssCount") }, await actorName());
    if (Object.keys(r.errors).length) return FAIL(r.errors, "Nothing was saved. Fix the marked fields.");
    return finish(r.changed, r.pages);
  } catch {
    return FAIL({}, "That could not be saved just now.");
  }
}
