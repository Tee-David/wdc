"use server";

import { revalidatePath } from "next/cache";
import { toggleTask } from "@/lib/admin/actions";
import { acceptWorkspaceHandover } from "@/lib/workspace/team-actions";

/**
 * "Mark done" from My Day's deck. It is the same server action the project page's tick uses (same permission,
 * same history line, same client progress), asked from a card instead of a form. `expectedDone` is false: the
 * deck only offers tasks that are open, so a task someone else already finished is refused rather than reopened.
 */
export async function markTaskDone(id: string): Promise<{ ok: boolean; message?: string }> {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("expectedDone", "false");
  const result = await toggleTask({ ok: false }, fd);
  return { ok: result.ok, message: result.message ?? (result.ok ? "Marked done." : "That task could not be updated.") };
}

/** "Accept handover" from the deck: the project page's own action, so only the named receiver can accept. */
export async function acceptHandoverNow(projectId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  const fd = new FormData();
  fd.set("projectId", projectId);
  fd.set("id", id);
  const result = await acceptWorkspaceHandover({ ok: false }, fd);
  return { ok: result.ok, message: result.message ?? (result.ok ? "Accepted." : "The handover could not be accepted.") };
}

/**
 * "Nudge the client" from the deck: the same reminder the daily run sends on day 2 and 4, sent now. It shares the
 * daily run's id for the day, so a nudge and the run never both email the client on the same day.
 */
export async function nudgeClientNow(projectId: string): Promise<{ ok: boolean; message?: string }> {
  const { nudgeApproval } = await import("@/lib/jobs/approval-reminders");
  const result = await nudgeApproval(String(projectId ?? ""));
  revalidatePath("/admin");
  return result;
}

/** "Complete task" for a named team task: the project page's action, so a blocked task is refused the same way. */
export async function completeTeamTaskNow(projectId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  const { completeWorkspaceTask } = await import("@/lib/workspace/team-actions");
  const fd = new FormData();
  fd.set("projectId", projectId);
  fd.set("id", id);
  const result = await completeWorkspaceTask({ ok: false }, fd);
  return { ok: result.ok, message: result.message ?? (result.ok ? "Done." : "The task could not be completed.") };
}
