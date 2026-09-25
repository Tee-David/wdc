"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { actorName, allow } from "@/lib/admin/guard";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { applyBulk, BULK_ACTIONS, getEntry, isEntryId, type BulkAction } from "./entries";
import { addEvents } from "./events";
import { chosenColumns, columnCookie, formByKey } from "./registry";
import { NOTIFICATIONS } from "./settings";
import { getFormSettings } from "./settings-db";
import { sendFormEmail } from "./notify";
import { dataFromEntry, formEmail, originalKey, tokensFor } from "./emails";
import { findLogged, recordResend } from "@/lib/message-log";

/**
 * What the studio does to form entries.
 *
 * EVERY ACTION CHECKS WHO IS ASKING, not the page that drew the button:
 * forms work is staff's too, and deleting for good is the owner's alone.
 */

const DONE: Record<BulkAction, (n: number) => string> = {
  read: (n) => `${n} marked read.`,
  unread: (n) => `${n} marked unread.`,
  star: (n) => `${n} starred.`,
  unstar: (n) => `${n} unstarred.`,
  spam: (n) => `${n} moved to Spam.`,
  restore: (n) => `${n} put back.`,
  trash: (n) => `${n} moved to Trash. They can be put back from the Trash tab.`,
  delete: (n) => `${n} deleted for good.`,
};

const LINE: Record<Exclude<BulkAction, "delete">, string> = {
  read: "Marked read", unread: "Marked unread", star: "Starred", unstar: "Unstarred",
  spam: "Moved to Spam", restore: "Put back in the inbox", trash: "Moved to Trash",
};

export async function bulkEntries(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const form = formByKey(String(fd.get("form") ?? ""));
  const action = String(fd.get("action") ?? "") as BulkAction;
  if (!form || !form.inbox) return FAIL({}, "That form has no entries to change.");
  if (!BULK_ACTIONS.includes(action)) return FAIL({}, "Pick what to do with them.");
  const refused = await allow(action === "delete" ? "destructive" : "forms");
  if (refused) return refused;
  const ids = fd.getAll("id").map(String).filter(isEntryId);
  if (!ids.length) return FAIL({}, "Tick at least one entry first.");

  const changed = await applyBulk(form, action, ids);
  if (action !== "delete" && changed) await addEvents(form.key, ids, "state", LINE[action], await actorName());
  /* "layout", so the entry pages under this form refresh as well as the list. */
  revalidatePath(`/admin/forms/${form.key}`, "layout");
  revalidatePath("/admin/forms");
  if (!changed) return action === "delete"
    ? FAIL({}, "Only entries in Trash can be deleted for good. Move them to Trash first.")
    : OK("Nothing needed changing.");
  return OK(DONE[action](changed));
}

export async function addEntryNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("forms");
  if (refused) return refused;
  const form = formByKey(String(fd.get("form") ?? ""));
  const id = String(fd.get("id") ?? "");
  const body = String(fd.get("note") ?? "").trim().slice(0, 2000);
  if (!form) return FAIL({}, "That form is not there.");
  if (!body) return FAIL({ note: "Write the note first." });
  if (!(await getEntry(form, id))) return FAIL({}, "That entry is no longer there.");
  await addEvents(form.key, [id], "note", body, await actorName());
  revalidatePath(`/admin/forms/${form.key}/entries/${id}`);
  return OK("Note added.");
}

const YEAR = 60 * 60 * 24 * 365;

/** The viewer's columns for one form, remembered in a cookie so the server draws them first time. */
export async function saveColumns(formKey: string, keys: string[]): Promise<ActionState> {
  const refused = await allow("forms");
  if (refused) return refused;
  const form = formByKey(formKey);
  if (!form) return FAIL({}, "That form is not there.");
  const clean = chosenColumns(form, keys.join(","));
  (await cookies()).set(columnCookie(form), clean.join(","), { path: "/admin", maxAge: YEAR, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  revalidatePath(`/admin/forms/${form.key}`);
  return OK("Columns saved.");
}

export async function resetColumns(formKey: string): Promise<ActionState> {
  const refused = await allow("forms");
  if (refused) return refused;
  const form = formByKey(formKey);
  if (!form) return FAIL({}, "That form is not there.");
  (await cookies()).delete({ name: columnCookie(form), path: "/admin" });
  revalidatePath(`/admin/forms/${form.key}`);
  return OK("Back to the default columns.");
}

/**
 * Send one of an entry's emails again, rebuilt from the stored entry.
 *
 * To the original recipient with the form's saved copies, or to another
 * address, in which case the copies are left off: a resend to somebody new
 * should not also land on everybody who was copied the first time. Each
 * resend is its own log row, and is added to the original row's trail.
 * The owner's, like every other resend.
 */
export async function resendFormEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const form = formByKey(String(fd.get("form") ?? ""));
  const id = String(fd.get("id") ?? "");
  const key = String(fd.get("notification") ?? "");
  if (!form) return FAIL({}, "That form is not there.");
  const entry = await getEntry(form, id);
  if (!entry) return FAIL({}, "That entry is no longer there.");
  const def = NOTIFICATIONS[form.source].find((n) => n.key === key);
  if (!def) return FAIL({}, "That email is not there.");
  const data = dataFromEntry(form, entry);
  const mail = formEmail(form, key, data);
  if (!mail) return FAIL({}, "There is no address to send that one to.");

  const other = fd.get("target") === "other";
  const to = String(fd.get("to") ?? "").trim().toLowerCase();
  if (other && !/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(to)) return FAIL({ to: "An email address to send it to." });

  const settings = await getFormSettings(form);
  /* A resend is asked for by a person, so it goes even if the email is
     switched off for new entries; copies only to the original recipient. */
  const n = settings.notifications[key];
  const forced = { ...settings, notifications: { ...settings.notifications, [key]: { ...n, enabled: true, ...(other ? { to: [to], cc: [], bcc: [] } : {}) } } };
  const by = await actorName();
  const original = originalKey(form, key, data);
  const started = Date.now();
  const recipient = other ? to : (def.audience === "studio" && n.to.length ? n.to.join(", ") : mail.to);
  try {
    await sendFormEmail(form, forced, key, other ? { ...mail, to } : mail,
      { summary: `Resent "${def.name}" by hand.`, dedupeKey: `${original}:resend:${crypto.randomUUID()}`, by },
      tokensFor(form, data));
  } catch (error) {
    const first = await findLogged(original);
    if (first) await recordResend(first.id, { at: new Date().toISOString(), to: recipient, by, sent: false, ms: Date.now() - started, error: error instanceof Error ? error.message.slice(0, 200) : "refused" });
    await addEvents(form.key, [entry.id], "email", `Resending "${def.name}" to ${recipient} failed`, by);
    revalidatePath(`/admin/forms/${form.key}/entries/${entry.id}`);
    return FAIL({}, `The mail server refused it: ${error instanceof Error ? error.message : "no reason given"}`);
  }
  const ms = Date.now() - started;
  const first = await findLogged(original);
  if (first) await recordResend(first.id, { at: new Date().toISOString(), to: recipient, by, sent: true, ms });
  await addEvents(form.key, [entry.id], "email", `Resent "${def.name}" to ${recipient}`, by);
  revalidatePath(`/admin/forms/${form.key}/entries/${entry.id}`);
  return OK(`Sent to ${recipient} in ${(ms / 1000).toFixed(1)} s.`);
}

/** A CSV of newsletter addresses, added quietly. The owner's. */
export async function importSubscribersAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const file = fd.get("csv");
  if (!(file instanceof File) || !file.size) return FAIL({ csv: "Choose a CSV file." });
  if (file.size > 2 * 1024 * 1024) return FAIL({ csv: "That file is over 2 MB. Split it and import each part." });
  if (fd.get("consent") !== "on") return FAIL({ consent: "Confirm these people asked to hear from the studio." });
  const { importSubscribers } = await import("@/lib/newsletter");
  let r;
  try { r = await importSubscribers(await file.text()); } catch {
    return FAIL({}, "The addresses could not be saved just now. Nothing was half-imported that cannot be imported again.");
  }
  const by = await actorName();
  const { audit } = await import("@/lib/admin/store");
  audit({ actor: by, kind: "content", subjectId: "newsletter", subject: "Newsletter", action: `imported ${r.added} subscribers from a CSV`, note: `${r.skipped} already on the list or unsubscribed, ${r.invalid} not addresses` });
  revalidatePath("/admin/forms/newsletter", "layout");
  revalidatePath("/admin/forms");
  return OK(`${r.added} added. ${r.skipped} were already on the list or had unsubscribed, and were left as they were.${r.invalid ? ` ${r.invalid} did not look like addresses.` : ""}`);
}
