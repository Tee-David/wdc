"use server";

import { revalidatePath } from "next/cache";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { addContact, addEvent, marketingEligible, setMarketing, setType, suppressContacts, syncContacts, tagContacts, TYPES, type ContactType } from "@/lib/contacts";
import { createCampaign, updateCampaign } from "@/lib/campaigns";
import { getSaved } from "@/lib/email-design-store";
import { kindByKey } from "@/lib/email-registry";
import type { Design } from "@/lib/email-design";

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

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
/** The ids a bulk action was given: strings only, no repeats, and no more than the list can hold. */
const idList = (ids: unknown) => (Array.isArray(ids) ? [...new Set(ids.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 80))].slice(0, 5000) : []);

/** Add by hand. If the email or phone already belongs to someone, that record is the answer (`stamp` carries its id). */
export async function addContactAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const name = text(fd, "name"), email = text(fd, "email");
  if (!name) return FAIL({ name: "Add a name." });
  if (!email) return FAIL({ email: "Add an email." });
  const r = await addContact({ name, email, phone: text(fd, "phone") }, await actorName());
  if (!r.ok) return FAIL({ email: r.message });
  done();
  return { ...OK(r.existing ? "They are already a contact, so that record is open." : "Saved."), stamp: r.id };
}

export async function setTypeAction(id: string, type: string): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  if (!TYPES.includes(type as ContactType)) return FAIL({}, "Pick Lead, Client or Subscriber.");
  const ok = await setType(String(id).slice(0, 80), type as ContactType, await actorName());
  if (!ok) return FAIL({}, "That contact is gone.");
  done();
  return OK("Updated.");
}

/** Move the ticked people to "asked to stop". The dialog in front of this says it cannot be undone. */
export async function suppressAction(ids: string[]): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const list = idList(ids);
  if (!list.length) return FAIL({}, "Tick the people first.");
  if (list.length > 1000) return FAIL({}, "That is more than 1,000 people at once. Do it in smaller groups.");
  const n = await suppressContacts(list, await actorName());
  done();
  return n ? OK(`Updated. ${people(n)} moved to asked to stop.`) : OK("They had all asked to stop already.");
}

/** Before "Send email": how many of the ticked people may get a campaign. Reads only. */
export async function mailPlanAction(ids: string[]): Promise<{ ok: boolean; total: number; eligible: number }> {
  if (await owner()) return { ok: false, total: 0, eligible: 0 };
  const list = idList(ids);
  return { ok: true, total: list.length, eligible: (await marketingEligible(list)).length };
}

/**
 * A campaign draft aimed at the ticked people who asked to hear from us, and
 * nobody else. The send itself re-checks every address (lib/campaigns.ts), so
 * this only decides who is on the draft. `stamp` is the draft's id.
 */
export async function mailPickedAction(ids: string[]): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const list = idList(ids);
  if (!list.length) return FAIL({}, "Tick the people first.");
  const eligible = await marketingEligible(list);
  if (!eligible.length) {
    return FAIL({}, list.length === 1
      ? "They have not asked to hear from us, or they asked to stop, so campaigns cannot go to them."
      : `None of these ${list.length} people can get a campaign: they have not asked to hear from us, or they asked to stop.`);
  }
  const title = `Email to ${people(eligible.length)}`;
  const saved = await getSaved("newsletter");
  const design: Design = structuredClone(saved?.design ?? kindByKey("newsletter")!.starters[0].design);
  design.subject = title; design.heading = title;
  const by = await actorName();
  const id = await createCampaign(title, design, by);
  if (!id) return FAIL({}, "The draft could not be made. Is migration 0046 applied (Settings › System)?");
  await updateCampaign(id, { audience: { tags: [], types: [], excludeTags: [], onlyIds: eligible } });
  revalidatePath("/admin/email");
  return { ...OK(`Saved. A draft for ${people(eligible.length)} is ready.`), stamp: id };
}
