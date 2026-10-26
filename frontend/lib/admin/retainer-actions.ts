"use server";

import { revalidatePath } from "next/cache";
import * as db from "./store";
import { actorName, allow } from "./guard";
import { syncStore, saveStore } from "./persist";
import { FAIL, OK, type ActionState, int, isoDate, kobo, str } from "./validate";
import { RETAINER_BILLING, type RetainerBilling } from "./retainer-rules";

/** "Lagos today", the day the daily run drafts against. */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

/**
 * SET UP OR CHANGE A CLIENT'S MONTHLY PLAN. Money only. A part already due
 * (a plan starting today, or backdated) is drafted at once rather than at the
 * next daily run, so Today shows it now. Drafts are never sent from here.
 */
export async function saveRetainerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const clientId = str(fd, "clientId"), client = db.getClient(clientId);
  const live = client ? db.getRetainerFor(clientId) : undefined;
  const errors: Record<string, string> = {};
  if (!client || client.archived) return FAIL({}, "Refresh the page: this client is not on the books.");
  const title = str(fd, "title").slice(0, 80) || "Monthly plan";
  const start = (isoDate(fd, "start") ?? "").slice(0, 10);
  const months = int(fd, "months");
  const monthly = kobo(fd, "monthly");
  const billing = RETAINER_BILLING.find((b) => b === str(fd, "billing")) as RetainerBilling | undefined;
  const projectId = str(fd, "projectId");
  if (!start) errors.start = "Pick the day the plan starts.";
  if (!months || months < 1 || months > 36) errors.months = "From 1 to 36 months.";
  if (!monthly) errors.monthly = "The monthly figure, before VAT.";
  if (!billing) errors.billing = "Pick how they pay.";
  if (projectId && db.getProject(projectId)?.clientId !== clientId) errors.projectId = "Pick one of this client's projects.";
  /* What a month includes, as the card shows it: "12 posts" over "a month". Up to four. */
  const includes = [0, 1, 2, 3].map((i) => ({ t: str(fd, `incT${i}`).slice(0, 40), s: str(fd, `incS${i}`).slice(0, 40) })).filter((x) => x.t);
  if (live?.drafted.length && monthly && months && monthly * months < live.drafted.reduce((n, d) => n + d.amount, 0)) errors.monthly = "The term would cost less than is already drafted. Void a draft first.";
  if (Object.keys(errors).length) return FAIL(errors);
  db.saveRetainer({ clientId, projectId: projectId || null, title, start, months: months!, monthly: monthly!, includes, billing: billing! }, await actorName());
  const made = db.draftDueRetainers(today(), await actorName());
  await saveStore();
  revalidatePath("/admin"); revalidatePath(`/admin/clients/${clientId}`); revalidatePath("/admin/money");
  const tail = made.length ? ` ${made.length === 1 ? "A draft invoice is" : `${made.length} draft invoices are`} on Today for you to send.` : "";
  return OK(live ? `Updated. ${title} is billed ${billing!.toLowerCase()} from the next invoice.${tail}` : `Saved. ${title} is set up.${tail}`);
}

/** End the plan: parts not yet drafted never are. Drafts already made stay for Admin to send or void. */
export async function endRetainerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const r = db.endRetainer(str(fd, "id"), await actorName());
  if (!r) return FAIL({}, "This plan has already ended.");
  await saveStore();
  revalidatePath("/admin"); revalidatePath(`/admin/clients/${r.clientId}`);
  return OK(`Updated. ${r.title} has ended.`);
}
