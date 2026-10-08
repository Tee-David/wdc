"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminRole } from "./guard";
import { supportCookiePresent } from "@/lib/users/support";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { db } from "@/lib/db/pool";

/**
 * The signed-in person's own account (WordPress's Profile screen): name,
 * password, sign-in methods and sessions. Every change goes through Better
 * Auth's own endpoints with this request's session, so an action can only
 * ever change the account of whoever is asking.
 */

const PAGE = "/admin/settings/account";

async function signedIn() {
  /* This acts on the REAL session, which in a support view is the owner's, not the person being viewed. */
  if (await supportCookiePresent()) return null;
  if (!(await adminRole())) return null;
  const h = await headers();
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: h }).catch(() => null);
  return session?.user ? { auth, h, session } : null;
}

const NO_SESSION = "This needs a real signed-in session. Sign in again, then retry.";

export async function saveMyName(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await signedIn();
  if (!me) return FAIL({}, NO_SESSION);
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (!name) return FAIL({ name: "Your name, as it should appear on what you change." });
  try { await me.auth.api.updateUser({ body: { name }, headers: me.h }); } catch {
    return FAIL({}, "That could not be saved just now.");
  }
  audit({ actor: name, kind: "setting", subjectId: me.session.user.id, subject: name, action: "changed their name", note: me.session.user.name });
  revalidatePath(PAGE);
  revalidatePath("/admin", "layout");
  return OK("Saved. New changes carry this name; old ones keep the name they were made under.");
}

/** Sign out one other device by its session id. Only ever this person's own, and never the one asking. */
export async function signOutMySession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await signedIn();
  if (!me) return FAIL({}, NO_SESSION);
  const id = String(fd.get("session") ?? "");
  if (!id || id === me.session.session.id) return FAIL({}, "Use Sign out to leave this device.");
  try {
    await db.query('DELETE FROM "session" WHERE "id" = $1 AND "userId" = $2', [id, me.session.user.id]);
  } catch {
    return FAIL({}, "That could not be done just now.");
  }
  audit({ actor: me.session.user.name, kind: "setting", subjectId: me.session.user.id, subject: me.session.user.name, action: "signed out one of their devices" });
  revalidatePath(PAGE);
  return OK("That device is signed out.");
}

export async function signOutMyOtherSessions(): Promise<ActionState> {
  const me = await signedIn();
  if (!me) return FAIL({}, NO_SESSION);
  try { await me.auth.api.revokeOtherSessions({ headers: me.h }); } catch {
    return FAIL({}, "That could not be done just now.");
  }
  audit({ actor: me.session.user.name, kind: "setting", subjectId: me.session.user.id, subject: me.session.user.name, action: "signed out their other sessions" });
  revalidatePath(PAGE);
  return OK("Every other session is signed out. This one stays.");
}

/**
 * Unlink Google, only while another way in remains: a password on the
 * account. Emailed links are not counted, because they can be switched off
 * and an account must never be left with no way in at all.
 */
export async function unlinkMyGoogle(): Promise<ActionState> {
  const me = await signedIn();
  if (!me) return FAIL({}, NO_SESSION);
  /* Better Auth's `accountId` here is the account ROW's id, not Google's. */
  const r = await db.query<{ id: string; providerId: string; hasPassword: boolean }>(
    `SELECT "id", "providerId", ("password" IS NOT NULL) AS "hasPassword" FROM "account" WHERE "userId" = $1`, [me.session.user.id],
  );
  const google = r.rows.find((a) => a.providerId === "google");
  if (!google) return OK("Google is not linked to this account.");
  if (!r.rows.some((a) => a.providerId === "credential" && a.hasPassword)) {
    return FAIL({}, "Set a password first. Unlinking Google now would leave this account with no way in.");
  }
  try { await me.auth.api.unlinkAccount({ body: { accountId: google.id }, headers: me.h }); } catch {
    /* Most often the session is older than a day: unlinking wants a fresh sign-in. */
    return FAIL({}, "That could not be done. Sign out, sign back in, and try again.");
  }
  audit({ actor: me.session.user.name, kind: "setting", subjectId: me.session.user.id, subject: me.session.user.name, action: "unlinked Google from their account" });
  revalidatePath(PAGE);
  return OK("Google is unlinked. Sign in with your password or an emailed link.");
}
