"use server";
import { revalidatePath } from "next/cache";
import * as store from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { actorName, owner } from "@/lib/admin/guard";
import { FAIL, OK, isoDate, kobo, looksEmail, required, str, type ActionState } from "@/lib/admin/validate";

/**
 * PAYOUTS ARE ADMIN'S. Staff never see amounts, so every action here is
 * owner() only, and the Money page that lists them is not on a staff menu.
 */
function refresh(projectId?: string) {
  revalidatePath("/admin/money");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

export async function createPayout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const errors: Record<string, string> = {};
  const who = required(errors, "who", str(fd, "who").slice(0, 120), "Who it is for");
  const work = required(errors, "work", str(fd, "work").slice(0, 200), "What the work was");
  const amount = kobo(fd, "amount");
  if (!amount || amount <= 0) errors.amount = "How much is owed?";
  const email = str(fd, "email").slice(0, 200);
  if (email && !looksEmail(email)) errors.email = "That is not an email address.";
  const due = isoDate(fd, "due")?.slice(0, 10);
  if (!due) errors.due = "Pick the day it should be paid.";
  const projectId = str(fd, "projectId");
  if (projectId && !store.getProject(projectId)) errors.projectId = "That project is no longer there.";
  if (Object.keys(errors).length) return FAIL(errors);
  store.addPayout({ who, email: email || undefined, work, amount: amount!, due: due!, projectId: projectId || undefined, note: str(fd, "note").slice(0, 500) || undefined }, await actorName());
  refresh(projectId || undefined);
  return OK("Saved. The payout is ready for approval.");
}

export async function changePayout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  const ids = str(fd, "ids").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 100);
  const to = str(fd, "to");
  if (!ids.length || !["Approved", "Paid", "Cancelled"].includes(to)) return FAIL({}, "Nothing to change.");
  const note = str(fd, "note").slice(0, 300);
  if (to === "Cancelled" && !note) return FAIL({ note: "Say why, so the next person knows." });
  const paidOn = to === "Paid" ? isoDate(fd, "paidOn")?.slice(0, 10) : undefined;
  if (to === "Paid" && !paidOn) return FAIL({ paidOn: "Pick the day it left the account." });
  const by = await actorName();
  let moved = 0;
  for (const id of ids) {
    const r = store.movePayout(id, to as "Approved" | "Paid" | "Cancelled", by, { paidOn, reference: str(fd, "reference").slice(0, 120), note });
    if (typeof r === "object") { moved++; refresh(r.projectId); }
  }
  if (!moved) return FAIL({}, "That payout has already moved on. Reload to see where it is.");
  const n = moved === 1 ? "payout" : `${moved} payouts`;
  return OK(to === "Approved" ? `Updated. ${moved === 1 ? "The payout is" : `${moved} payouts are`} approved.`
    : to === "Paid" ? `Updated. The ${n} ${moved === 1 ? "is" : "are"} marked paid and the expense is recorded.`
    : `Updated. The ${n} ${moved === 1 ? "is" : "are"} cancelled.`);
}
