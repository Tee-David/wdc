"use server";

import { revalidatePath } from "next/cache";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { addEvent, importContacts, setMarketing, syncContacts, tagContacts } from "@/lib/contacts";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = () => revalidatePath("/admin/email");

export async function syncContactsAction(): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const r = await syncContacts(); done();
  return r.ok ? OK("Contacts brought up to date.") : FAIL({}, "That did not work. Is migration 0045 applied (Settings › System)?");
}

/** Tag (or untag) the contacts ticked on the list. */
export async function tagAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const ids = fd.getAll("ids").map(String);
  const tag = text(fd, "tag");
  if (!ids.length) return FAIL({}, "Tick the people first.");
  if (!tag) return FAIL({ tag: "Name the tag." });
  const n = await tagContacts(ids, tag, text(fd, "mode") === "remove");
  done();
  return OK(`${text(fd, "mode") === "remove" ? "Removed from" : "Added to"} ${n} ${n === 1 ? "person" : "people"}.`);
}

export async function noteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const id = text(fd, "id"), note = text(fd, "note");
  if (!note) return FAIL({ note: "Write the note." });
  await addEvent(id, "note", "Note", note, await actorName());
  revalidatePath(`/admin/email/contacts/${id}`);
  return OK("Saved.");
}

export async function marketingAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const on = text(fd, "on") === "1";
  await setMarketing(text(fd, "id"), on, await actorName());
  revalidatePath(`/admin/email/contacts/${text(fd, "id")}`); done();
  return OK(on ? "Marked as having asked to hear from us." : "Marketing switched off for them.");
}

export async function importAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const file = fd.get("file");
  const csv = file instanceof File && file.size ? (await file.text()).slice(0, 2_000_000) : text(fd, "paste");
  if (!csv) return FAIL({ paste: "Paste addresses or choose a file." });
  const asked = text(fd, "asked") === "1";
  const r = await importContacts(csv, { tag: text(fd, "tag") || "imported", asked });
  done();
  return OK(`${r.added} added or updated, ${r.skipped} skipped because they unsubscribed or bounced, ${r.invalid} not valid addresses.${asked ? "" : " They will not get campaigns until you mark them as having asked."}`);
}
