import "server-only";
import { UsersError } from "./errors";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/pool";
import { supportCookiePresent } from "./support";
import { rateLimit } from "@/lib/rate-limit";

/** Real authentication only; capture fixtures cannot authorize account writes. */
export async function usersOwner(action: string, fresh = false) {
  if (await supportCookiePresent()) throw new UsersError("Exit the read-only support view first.");
  const h = await headers();
  const origin = h.get("origin"); const host = h.get("x-forwarded-host") || h.get("host");
  if (action !== "read") {
    if (!origin || !host || new URL(origin).host !== host) throw new UsersError("Reload this page, then try again.");
  }
  const session = await auth.api.getSession({ headers: h });
  if (!session || (session.user as { role?: string }).role !== "owner") throw new UsersError("Owner access is required. Sign in again.");
  const active = await db.query(`SELECT 1 FROM "user" WHERE "id"=$1 AND "role"='owner' AND "deactivatedAt" IS NULL`, [session.user.id]);
  if (!active.rowCount) throw new UsersError("Your owner access has ended. Sign in again.");
  const age = Date.now() - new Date(session.session.createdAt).getTime();
  if (fresh && (!Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000)) throw new UsersError("For this access change, sign in again and retry within 15 minutes.");
  // Per-instance abuse control, not an account-wide quota.
  if (action !== "read" && !rateLimit(`users:${action}:${session.user.id}`, action === "recovery" ? 5 : 30, 15 * 60 * 1000).ok) throw new UsersError("Wait a few minutes before trying this action again.");
  return session;
}
