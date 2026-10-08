"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { createAutomation, deleteAutomation, saveSteps, setAutomationOn, validSteps } from "@/lib/automations";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refresh = (id?: string) => { revalidatePath("/admin/email"); if (id) revalidatePath(`/admin/email/automations/${id}`); };

export async function newAutomationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const name = text(fd, "name");
  if (name.length < 2) return FAIL({ name: "Give it a name, like Welcome series." });
  const kind = text(fd, "trigger");
  const tag = text(fd, "tag");
  if (kind === "tag_added" && !tag) return FAIL({ tag: "Which tag starts it?" });
  const id = await createAutomation(name, text(fd, "kind"), kind, kind === "tag_added" ? tag : "", await actorName());
  if (!id) return FAIL({}, "It could not be created. Is migration 0047 applied (Settings › System)?");
  redirect(`/admin/email/automations/${id}`);
}

export async function saveAutomationSteps(id: string, json: string): Promise<{ ok: boolean; message?: string }> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message };
  let steps: unknown;
  try { steps = JSON.parse(json.slice(0, 300_000)); } catch { return { ok: false, message: "That could not be read." }; }
  if (!validSteps(steps)) return { ok: false, message: "A step is incomplete. Webhook addresses must be https and public." };
  const ok = await saveSteps(id.slice(0, 80), steps);
  refresh(id);
  return ok ? { ok: true } : { ok: false, message: "It could not be saved." };
}

export async function toggleAutomation(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const id = text(fd, "id"), on = text(fd, "on") === "1";
  const ok = await setAutomationOn(id.slice(0, 80), on);
  refresh(id);
  return ok ? OK(on ? "Updated. It is on and will pick up people from now on." : "Updated. It is off. People already in it wait.") : FAIL({}, "It could not be changed.");
}

export async function removeAutomation(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  await deleteAutomation(text(fd, "id").slice(0, 80));
  refresh();
  redirect("/admin/email?tab=automations");
}
