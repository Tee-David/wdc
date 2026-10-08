"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createStaffSupportView, createSupportView } from "./support";
import { SUPPORT_STAFF_MIGRATION } from "./support-policy";
import { FAIL, type ActionState } from "@/lib/admin/validate";
import { rateLimit } from "@/lib/rate-limit";

export async function startClientSupport(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  try {
    if (!origin || new URL(origin).host !== requestHeaders.get("host")) return FAIL({}, "This request is not allowed.");
  } catch { return FAIL({}, "This request is not allowed."); }
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null);
  if (!session || session.user.role !== "owner") return FAIL({}, "Sign in as the owner before starting a support view.");
  // Per-instance abuse control, not a distributed quota.
  if (!rateLimit(`support-start:${session.user.id}`, 5, 15 * 60_000).ok) return FAIL({}, "Too many support views. Wait a few minutes and retry.");
  const targetId = String(fd.get("targetId") ?? "");
  const clientId = String(fd.get("clientId") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!targetId || targetId.length > 128 || !clientId || clientId.length > 128) return FAIL({}, "Choose an active linked client account.");
  if (!reason || reason.length > 500) return FAIL({ reason: "Add a support reason of up to 500 characters." });
  try { await createSupportView(session, targetId, clientId, reason); } catch (error) {
    if (error instanceof Error && error.message === "Sign in again before starting a support view.") return { ...FAIL({}, "Sign in again, then retry."), signIn: true };
    return FAIL({}, "That support view is not available. Check the account is active and linked, and migration 0034 is applied.");
  }
  redirect("/portal");
}

/**
 * The owner's read-only view of the admin as an ACTIVE STAFF member. Same
 * gates as the client view, in the same order: same-origin, a real owner
 * session, a per-owner rate limit, a required reason, a sign-in under 15
 * minutes old (checked again inside the transaction), one view at a time.
 * The target must be active staff: never an owner, never yourself, never a
 * deactivated account, and the server re-reads all of that under a row lock.
 */
export async function startStaffSupport(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  try {
    if (!origin || new URL(origin).host !== requestHeaders.get("host")) return FAIL({}, "This request is not allowed.");
  } catch { return FAIL({}, "This request is not allowed."); }
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null);
  if (!session || session.user.role !== "owner") return FAIL({}, "Sign in as the owner before starting a support view.");
  // Per-instance abuse control, not a distributed quota.
  if (!rateLimit(`support-start:${session.user.id}`, 5, 15 * 60_000).ok) return FAIL({}, "Too many support views. Wait a few minutes and retry.");
  const targetId = String(fd.get("targetId") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  if (!targetId || targetId.length > 128 || targetId === session.user.id) return FAIL({}, "Choose an active staff member other than yourself.");
  if (!reason || reason.length > 500) return FAIL({ reason: "Add a support reason of up to 500 characters." });
  try { await createStaffSupportView(session, targetId, reason); } catch (error) {
    if (error instanceof Error && error.message === "Sign in again before starting a support view.") return { ...FAIL({}, "Sign in again, then retry."), signIn: true };
    if (error instanceof Error && error.message === SUPPORT_STAFF_MIGRATION) return FAIL({}, SUPPORT_STAFF_MIGRATION);
    if (error instanceof Error && error.message === "Exit the current support view first.") return FAIL({}, "Exit the current support view first.");
    return FAIL({}, "That support view is not available. Check the person is active staff.");
  }
  redirect("/admin");
}
