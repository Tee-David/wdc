"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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

/* ---------------------------------------------- the plan page: systems, costs, reports */

const back = (clientId: string) => { revalidatePath(`/admin/clients/${clientId}`); revalidatePath(`/admin/clients/${clientId}/plan`); revalidatePath("/admin"); };

export async function saveSystemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const name = str(fd, "name").slice(0, 80), renews = (isoDate(fd, "renews") ?? "").slice(0, 10) || null;
  if (!name) return FAIL({ name: "Name what the plan looks after, for example VPS." });
  const r = db.saveRetainerSystem(str(fd, "id"), { id: str(fd, "sysId") || undefined, name, notes: str(fd, "notes").slice(0, 400), access: str(fd, "access").slice(0, 80), renews }, await actorName());
  if (!r) return FAIL({}, "Refresh the page: this plan has changed.");
  await saveStore(); back(r.clientId);
  return OK(str(fd, "sysId") ? `Updated. ${name} is saved.` : `Saved. ${name} is on the plan.`);
}

export async function removeSystemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const r = db.removeRetainerSystem(str(fd, "id"), str(fd, "sysId"), await actorName());
  if (!r) return FAIL({}, "It was already taken off.");
  await saveStore(); back(r.clientId);
  return OK("Updated. It is off the plan.");
}

export async function addCostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const what = str(fd, "what").slice(0, 80), amount = kobo(fd, "amount"), date = (isoDate(fd, "date") ?? "").slice(0, 10);
  const errors: Record<string, string> = {};
  if (!what) errors.what = "What it was, for example VPS for October.";
  if (!amount) errors.amount = "What it cost, in naira.";
  if (!date) errors.date = "The day it was paid.";
  if (Object.keys(errors).length) return FAIL(errors);
  const r = db.addRetainerCost(str(fd, "id"), { what, amount: amount!, date }, await actorName());
  if (!r) return FAIL({}, "Refresh the page: this plan has changed.");
  await saveStore(); back(r.clientId);
  return OK(`Saved. ${what} goes on the next invoice.`);
}

export async function removeCostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const r = db.removeRetainerCost(str(fd, "id"), str(fd, "costId"), await actorName());
  if (!r) return FAIL({}, "A cost already on an invoice stays; void the draft first.");
  await saveStore(); back(r.clientId);
  return OK("Updated. The cost is off the plan.");
}

/** For the deck's "Bill them now": a direct call rather than a form. */
export async function billCostsNow(id: string): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const inv = db.billRetainerCosts(String(id ?? ""), today(), await actorName());
  if (!inv) return FAIL({}, "Nothing is waiting to be billed.");
  await saveStore(); back(inv.clientId); revalidatePath("/admin/money");
  return OK(`Saved. ${inv.number} is drafted on Today for you to send.`);
}

export async function saveReportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const month = str(fd, "month"), body = str(fd, "body").slice(0, 4000);
  if (!/^\d{4}-\d{2}$/.test(month)) return FAIL({ month: "Pick the month it covers." });
  if (body.length < 20) return FAIL({ body: "Say what was done this month, in a few lines." });
  const r = db.saveRetainerReport(str(fd, "id"), month, body, await actorName());
  if (!r) return FAIL({}, "Refresh the page: this plan has changed.");
  await saveStore(); back(r.clientId);
  return OK("Saved. Share it when it reads right.");
}

/**
 * SHARE A REPORT: it appears on the client's Billing page and they get a
 * notice, by email only if they keep "progress" emails on (their setting).
 */
export async function shareReport(id: string, reportId: string): Promise<ActionState> {
  await syncStore();
  const refused = await allow("money"); if (refused) return refused;
  const done = db.markRetainerReportShared(String(id ?? ""), String(reportId ?? ""), await actorName());
  if (!done) return FAIL({}, "Refresh the page: this report has changed.");
  const { r, rep } = done;
  await saveStore();
  try {
    const { emitWorkspaceEvent, newWorkspaceEventId, dispatchWorkspaceEvents } = await import("@/lib/workspace/events");
    const { clientRecipients } = await import("@/lib/workspace/access");
    const people = (await clientRecipients(r.clientId, "client")).map((p) => ({ userId: p.userId, href: "/portal/billing#plan" }));
    const month = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${rep.month}-15T12:00:00Z`));
    const eventId = newWorkspaceEventId();
    await emitWorkspaceEvent({ id: eventId, projectId: r.projectId ?? `client:${r.clientId}`, clientId: r.clientId, kind: "retainer.report", category: "progress",
      actorId: "retainer", actorName: await actorName(), title: `Your ${month} report`, summary: rep.body.slice(0, 400), href: "/portal/billing#plan", visibility: "client", recipients: people });
    after(() => dispatchWorkspaceEvents({ eventIds: [eventId] }));
  } catch { /* the notice tables are not migrated: the report still shows on their Billing page */ }
  back(r.clientId);
  return OK("Updated. The report is on their Billing page.");
}
