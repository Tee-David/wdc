"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createSupportView } from "./support";
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
