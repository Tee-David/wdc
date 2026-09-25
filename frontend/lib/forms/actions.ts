"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { actorName, allow } from "@/lib/admin/guard";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { applyBulk, BULK_ACTIONS, getEntry, isEntryId, type BulkAction } from "./entries";
import { addEvents } from "./events";
import { chosenColumns, columnCookie, formByKey } from "./registry";

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
