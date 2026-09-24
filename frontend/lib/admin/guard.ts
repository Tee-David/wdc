import "server-only";

import { getAdminRequest } from "./session";
import { FAIL, type ActionState } from "./validate";

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
    const { session } = await getAdminRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session?.user && role === "owner") return null;
  } catch {
    /* Fall through to the refusal. */
  }
  return FAIL({}, "Your session has ended or does not have access to this. Sign in again, then retry.");
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
