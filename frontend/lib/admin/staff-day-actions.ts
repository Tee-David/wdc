"use server";

import { toggleTask } from "@/lib/admin/actions";

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
