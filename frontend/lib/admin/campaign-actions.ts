"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { actorName, owner, ownerFresh } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { validDesign, type Design } from "@/lib/email-design";
import { kindByKey } from "@/lib/email-registry";
import { getSaved } from "@/lib/email-design-store";
import {
  audienceCount, cleanAudience, copyToUnopened, createCampaign, retryFailed, runBatch, setCampaignState, startCampaign, tagClickers, updateCampaign, type Audience, type Track,
} from "@/lib/campaigns";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refresh = (id?: string) => { revalidatePath("/admin/email"); if (id) revalidatePath(`/admin/email/campaigns/${id}`); };

/** A new campaign starts from the newsletter design (the owner's own if switched on, else the starter). */
export async function newCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const title = text(fd, "title");
  if (title.length < 2) return FAIL({ title: "Give it a title, like October notes." });
  const saved = await getSaved("newsletter");
  const design: Design = structuredClone(saved?.design ?? kindByKey("newsletter")!.starters[0].design);
  design.subject = title; design.heading = title;
  const id = await createCampaign(title, design, await actorName());
  if (!id) return FAIL({}, "It could not be created. Is migration 0046 applied (Settings › System)?");
  redirect(`/admin/email/campaigns/${id}`);
}

export async function saveCampaignDesign(id: string, json: string): Promise<{ ok: boolean; message?: string }> {
  const refused = await owner(); if (refused) return { ok: false, message: refused.message };
  let d: Design;
  try { d = JSON.parse(json.slice(0, 200_000)); } catch { return { ok: false, message: "That could not be read." }; }
  if (!validDesign(d)) return { ok: false, message: "That design could not be saved." };
  const ok = await updateCampaign(id.slice(0, 80), { design: d });
  refresh(id);
  return ok ? { ok: true } : { ok: false, message: "Only a draft can be changed." };
}

export async function saveAudienceAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const id = text(fd, "id");
  const audience: Audience = cleanAudience({ tags: fd.getAll("tags").map(String), types: fd.getAll("types").map(String), excludeTags: fd.getAll("exclude").map(String) });
  const track = (["full", "anonymous", "off"].includes(text(fd, "track")) ? text(fd, "track") : "full") as Track;
  const ok = await updateCampaign(id, { title: text(fd, "title") || undefined, audience, track });
  refresh(id);
  return ok ? OK(`Saved. It reaches ${await audienceCount(audience)} people right now.`) : FAIL({}, "Only a draft can be changed.");
}

export async function countAudience(tags: string[], types: string[], exclude: string[]): Promise<number> {
  if (await owner()) return 0;
  return audienceCount({ tags, types, excludeTags: exclude });
}

/** Send now, or at a set time. The most consequential button in the admin: owner, signed in within 15 minutes, and asked twice in the page. */
export async function sendCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await ownerFresh(); if (refused) return refused;
  const id = text(fd, "id");
  const when = text(fd, "at");
  /* The picker posts YYYY-MM-DDTHH:MM, which the form says is Lagos time (UTC+1, no daylight saving); the server's own zone must not decide. */
  const at = when ? new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) ? `${when}:00+01:00` : when) : null;
  if (at && Number.isNaN(at.getTime())) return FAIL({ at: "That date is not valid." });
  const r = await startCampaign(id, at);
  if (!r.ok) return FAIL({}, r.message);
  if (!at || at.getTime() <= Date.now() + 30_000) after(() => runBatch(40_000, 10).then(() => undefined));
  refresh(id);
  return OK(r.recipients ? (at && at.getTime() > Date.now() + 30_000 ? `Scheduled for ${r.recipients} people.` : `Sending to ${r.recipients} people now.`) : "Nobody matches yet, so nothing was sent.");
}

export async function campaignStateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const to = text(fd, "to") as "paused" | "sending" | "cancelled";
  if (!["paused", "sending", "cancelled"].includes(to)) return FAIL({}, "Unknown action.");
  const ok = await setCampaignState(text(fd, "id"), to);
  refresh(text(fd, "id"));
  return ok ? OK(to === "paused" ? "Paused. Nothing more is sent until you resume." : to === "sending" ? "Resumed." : "Cancelled. Nobody else will get it.") : FAIL({}, "That is not possible in its current state.");
}

export async function retryFailedAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const n = await retryFailed(text(fd, "id"));
  if (n) after(() => runBatch(40_000, 10).then(() => undefined));
  refresh(text(fd, "id"));
  return n ? OK(`Trying ${n} again.`) : OK("Nothing had failed.");
}

export async function copyUnopenedAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const n = await copyToUnopened(text(fd, "id"), await actorName());
  if (!n) return FAIL({}, "Everyone opened it, or nothing was sent.");
  redirect(`/admin/email/campaigns/${n}`);
}

export async function tagClickersAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const n = await tagClickers(text(fd, "id"), text(fd, "tag"));
  return n ? OK(`${n} people tagged.`) : FAIL({ tag: "Name the tag, and note that only people who clicked are tagged." });
}
