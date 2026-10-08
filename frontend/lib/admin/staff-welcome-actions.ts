"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/pool";
import { FAIL, type ActionState } from "./validate";

/** Ends a new staff member's welcome, finished or skipped, then opens the dashboard. Only their own row, only while it is pending. */
export async function finishStaffWelcome(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "staff") return FAIL({}, "Sign in again to continue.");
  const state = String(fd.get("how")) === "skip" ? "skipped" : "completed";
  let first = false;
  try {
    /* Only the press that moves it out of pending tells the owner. */
    first = Boolean((await db.query(`UPDATE client_profile_preferences SET setup_state = $2, finished_at = now(), updated_at = now() WHERE user_id = $1 AND setup_state = 'pending'`, [session.user.id, state])).rowCount);
  } catch { return FAIL({}, "That could not be saved just now. Try again in a minute."); }
  if (first) {
    const who = { userId: session.user.id, name: session.user.name?.trim() || session.user.email, email: session.user.email, skipped: state === "skipped" };
    after(() => import("@/lib/staff-mail").then((m) => m.sendStaffOnboarded(who)));
  }
  redirect("/admin");
}
