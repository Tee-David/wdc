import "server-only";

import { supportCookiePresent } from "@/lib/users/support";
import { getAdminRequest } from "./session";
import { can, isAdminRole, type AdminRole, type Area } from "./permissions";
import { FAIL, type ActionState } from "./validate";

const REFUSED = "Your session has ended or does not have access to this. Sign in again, then retry.";

/**
 * The check every admin write makes before it reads anything.
 *
 * NOT IN A "use server" FILE, because every export of one is a POST endpoint
 * and a guard must not be callable on its own. The layout already redirects
 * anybody who is not the owner, but a layout guards pages and a server action
 * is not a page. Fails closed: no session, no role, another role, or an error
 * reading the session are all the same refusal.
 */
export async function owner(): Promise<ActionState | null> {
  try {
    if (await supportCookiePresent()) return FAIL({}, "Exit the read-only support view before making changes.");
    const { session } = await getAdminRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session?.user && role === "owner") return null;
  } catch {
    /* Fall through to the refusal. */
  }
  return { ...FAIL({}, REFUSED), signIn: true };
}

/** The name to write against a change: the signed-in person, never a form field. */
export async function actorName(): Promise<string> {
  try {
    const { session } = await getAdminRequest();
    return session?.user?.name?.trim() || session?.user?.email || "Studio";
  } catch {
    return "Studio";
  }
}

/** The signed-in admin's role, or null for anybody who is not one. Fails closed. */
export async function adminRole(): Promise<AdminRole | null> {
  try {
    if (await supportCookiePresent()) return null;
    const { session } = await getAdminRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    return session?.user && isAdminRole(role) ? role : null;
  } catch {
    return null;
  }
}

/**
 * The check for a write in `area`: the owner always, staff where
 * lib/admin/permissions.ts says so, nobody else. Same refusal as `owner()`,
 * so a refused request learns nothing about which rule stopped it.
 */
export async function allow(area: Area): Promise<ActionState | null> {
  return can(await adminRole(), area) ? null : { ...FAIL({}, REFUSED), signIn: true };
}
