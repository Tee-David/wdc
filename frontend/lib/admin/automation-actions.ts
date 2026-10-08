"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorName, owner } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { createAutomation, deleteAutomation, getAutomation, saveFlow, setAutomationOn, testRun } from "@/lib/automations";
import { checkSteps, normTag, type Step } from "@/lib/automations-flow";

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

type FlowJson = { name?: unknown; kind?: unknown; triggerKind?: unknown; triggerValue?: unknown; steps?: unknown };
const readFlow = (json: string): FlowJson | null => {
  try { const v = JSON.parse(json.slice(0, 300_000)); return v && typeof v === "object" ? v : null; } catch { return null; }
};

/**
 * Save the canvas. "draft" keeps a half-written flow, and is only allowed while the automation is OFF; "publish" demands every step is
 * complete, saves, and switches it on. An automation that is already on is always held to the strict check, because what is saved is what real people get.
 */
export async function saveAutomationFlow(id: string, json: string, mode: "draft" | "publish"): Promise<{ ok: boolean; message?: string; enabled?: boolean }> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message };
  const f = readFlow(json);
  if (!f) return { ok: false, message: "That could not be read." };
  const current = await getAutomation(id.slice(0, 80));
  if (!current) return { ok: false, message: "That automation is gone." };
  const strict = mode === "publish" || current.enabled;
  const name = String(f.name ?? "").trim();
  if (name.length < 2) return { ok: false, message: "Give it a name." };
  const kind = f.kind === "service" ? "service" : "marketing";
  const triggerKind = f.triggerKind === "tag_added" ? "tag_added" : "new_contact";
  const triggerValue = triggerKind === "tag_added" ? normTag(String(f.triggerValue ?? "")) : "";
  if (strict && triggerKind === "tag_added" && !triggerValue) return { ok: false, message: "Choose the tag that starts it." };
  const why = checkSteps(f.steps, strict ? "publish" : "draft");
  if (why) return { ok: false, message: why };
  const ok = await saveFlow(current.id, { name, kind, triggerKind, triggerValue, steps: f.steps as Step[] }, strict ? "publish" : "draft");
  if (!ok) return { ok: false, message: "It could not be saved." };
  const on = mode === "publish" ? await setAutomationOn(current.id, true) : current.enabled;
  refresh(current.id);
  return mode === "publish" && !on ? { ok: false, message: "It was saved but could not be switched on." } : { ok: true, enabled: on };
}

/** A dry run as one contact, on the steps as they are on the canvas right now. Nothing is sent or written. */
export async function testAutomationAction(json: string, contactId: string) {
  const refused = await owner(); if (refused) return { ok: false as const, message: refused.message ?? "Not allowed." };
  const f = readFlow(json);
  const why = f ? checkSteps(f.steps, "draft") : "That could not be read.";
  if (!f || why) return { ok: false as const, message: why ?? "That could not be read." };
  const r = await testRun({ kind: f.kind === "service" ? "service" : "marketing", steps: f.steps as Step[] }, contactId.slice(0, 80));
  return r ? { ok: true as const, ...r } : { ok: false as const, message: "That contact could not be found." };
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
