"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { INVITE_PASSWORD_MIN, redeemInvitation } from "@/lib/invitations";
import { BREACHED_MESSAGE, UNCHECKED_MESSAGE } from "@/lib/auth/breached";

export type RedeemResult =
  | { ok: true; email: string; role: "client" | "staff" | "owner" }
  | { ok: false; error: string };

const REASONS: Record<string, string> = {
  invalid: "This invitation link is not valid. Ask whoever invited you to send a new one.",
  redeemed: "This invitation has already been used. Log in with the account it created.",
  revoked: "This invitation was withdrawn. Ask whoever invited you to send a new one.",
  expired: "This invitation has expired. Ask whoever invited you to send a new one.",
  exists: "There is already an account for this address. Log in instead.",
  "weak-password": `Use at least ${INVITE_PASSWORD_MIN} characters, with a capital, a small letter, a number and a symbol.`,
  "breached-password": BREACHED_MESSAGE,
  "unchecked-password": UNCHECKED_MESSAGE,
};

/**
 * The one public write on the invitation page.
 *
 * The token is the whole authorisation, so guessing is the attack: 32 random
 * bytes make that hopeless, and this limit makes a script pointless anyway.
 * One instance's memory, like every limit in lib/rate-limit.ts -- abuse
 * control, not a quota.
 *
 * NO EMAIL PARAMETER, on purpose. The address comes back FROM the invitation,
 * so the browser can sign in as the account that was just made and as
 * nothing else.
 */
export async function redeem(input: { token: string; name: string; password: string | null }): Promise<RedeemResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`invite-redeem:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Too many attempts from this connection. Wait a few minutes and try again." };

  const token = String(input?.token ?? "");
  const name = String(input?.name ?? "").slice(0, 120);
  const password = typeof input?.password === "string" ? input.password : null;
  try {
    const out = await redeemInvitation(token, { name, password });
    if (!out.ok) return { ok: false, error: REASONS[out.reason] };
    /* The welcome and the studio's notice go out behind the response (the mail
       server needs about 23 seconds to authenticate). The account exists
       already; a failed send is on the log and costs the person nothing. */
    const who = { userId: out.userId, name: out.name, email: out.email, clientId: out.clientId };
    after(() => import("@/lib/lifecycle-mail").then((m) => (out.role === "client" ? m.sendClientJoined(who) : m.sendStaffJoined(who))).catch(() => {}));
    return { ok: true, email: out.email, role: out.role };
  } catch (e) {
    console.error("[invite] redemption failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "We could not finish that just now. Nothing was created; try again in a moment." };
  }
}
