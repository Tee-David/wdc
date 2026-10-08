"use server";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { FAIL, OK, type ActionState } from "@/lib/admin/validate";
import { audit } from "@/lib/admin/store";
import { db } from "@/lib/db/pool";
import { passwordProblem } from "@/lib/auth/password-policy";
import { breachProblem } from "@/lib/auth/breached";
import { passwordCodeEmail } from "@/lib/email-templates";
import { sendLogged } from "@/lib/outbox";
import { supportCookiePresent } from "@/lib/users/support";
import { rateLimit } from "@/lib/rate-limit";

/**
 * A NEW PASSWORD, CONFIRMED BY A CODE RATHER THAN THE OLD PASSWORD (the
 * owner's call: people forget the old one, and asking for it only sent them
 * to "Forgot password"). Step one checks the new password and emails a
 * six-digit code to the account's own address; step two takes the code and
 * the same new password, sets it, and signs out every other session.
 *
 * What stands in for the old password is the inbox: the code is hashed at
 * rest, works once, for ten minutes, and five wrong tries spend it. The send
 * happens behind the response (the mail server takes ~23 s to authenticate),
 * with its row and dedupe key written first. Works for any signed-in role,
 * so the admin's My account and the client portal share it.
 */

const TTL_MINUTES = 10;
const MAX_TRIES = 5;
const ident = (userId: string) => `password-change:${userId}`;
const digest = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("hex");

async function me() {
  if (await supportCookiePresent()) return null;
  const h = await headers();
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: h }).catch(() => null);
  return session?.user ? { auth, session } : null;
}

const NO_SESSION = "Sign in again, then retry.";

async function checkPair(fd: FormData) {
  const next = String(fd.get("next") ?? "");
  const again = String(fd.get("again") ?? "");
  const errors: Record<string, string> = {};
  const weak = passwordProblem(next);
  if (weak) errors.next = weak;
  else if (next !== again) errors.again = "The two passwords are not the same.";
  else {
    /* Checked on both steps: the second posts the password again, and is
       what actually stores it. */
    const leaked = await breachProblem(next);
    if (leaked) errors.next = leaked;
  }
  return { next, errors };
}

export async function requestPasswordCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const who = await me();
  if (!who) return FAIL({}, NO_SESSION);
  const { errors } = await checkPair(fd);
  if (Object.keys(errors).length) return FAIL(errors);
  const user = who.session.user;
  /* Abuse control per person, in one instance's memory (lib/rate-limit.ts):
     it stops an inbox being flooded, it is not a quota. */
  const limited = rateLimit(`password-code:${user.id}`, 5, 15 * 60_000);
  if (!limited.ok) return FAIL({}, `Too many codes asked for. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minutes.`);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const id = randomUUID();
  try {
    await db.query('DELETE FROM "verification" WHERE "identifier" = $1', [ident(user.id)]);
    await db.query(
      `INSERT INTO "verification" ("id", "identifier", "value", "expiresAt") VALUES ($1, $2, $3, now() + ($4 || ' minutes')::INTERVAL)`,
      [id, ident(user.id), JSON.stringify({ h: digest(user.id, code), tries: 0 }), String(TTL_MINUTES)],
    );
  } catch {
    return FAIL({}, "A code could not be made just now. Try again in a minute.");
  }
  const first = user.name?.trim().split(/\s+/)[0] || undefined;
  after(async () => {
    try {
      await sendLogged(
        { to: user.email, ...passwordCodeEmail({ name: first, code, expiresInMinutes: TTL_MINUTES }) },
        { summary: "A code to confirm a new password.", dedupeKey: `password-code:${id}`, by: user.name || "Account" },
      );
    } catch { /* The row records the failure; the person can ask for another. */ }
  });
  return OK(`We sent a 6-digit code to ${user.email}.`);
}

export async function confirmPasswordChange(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const who = await me();
  if (!who) return FAIL({}, NO_SESSION);
  const { next, errors } = await checkPair(fd);
  if (Object.keys(errors).length) return FAIL(errors, "Go back and fix the new password.");
  const code = String(fd.get("code") ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return FAIL({ code: "Enter the 6 digits from the email." });
  const user = who.session.user;

  const row = await db.query<{ id: string; value: string }>(
    'SELECT "id", "value" FROM "verification" WHERE "identifier" = $1 AND "expiresAt" > now() ORDER BY "createdAt" DESC LIMIT 1',
    [ident(user.id)],
  ).then((r) => r.rows[0]).catch(() => null);
  if (!row) return FAIL({ code: "That code has expired. Send a new one." });
  let stored: { h: string; tries: number };
  try { stored = JSON.parse(row.value); } catch { return FAIL({ code: "That code has expired. Send a new one." }); }
  const given = Buffer.from(digest(user.id, code));
  const want = Buffer.from(String(stored.h));
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    const tries = (stored.tries ?? 0) + 1;
    if (tries >= MAX_TRIES) {
      await db.query('DELETE FROM "verification" WHERE "id" = $1', [row.id]).catch(() => undefined);
      return FAIL({ code: "Too many wrong codes. Send a new one." });
    }
    await db.query('UPDATE "verification" SET "value" = $1, "updatedAt" = now() WHERE "id" = $2', [JSON.stringify({ ...stored, tries }), row.id]).catch(() => undefined);
    return FAIL({ code: `That code is not right. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? "try" : "tries"} left.` });
  }

  try {
    await db.query('DELETE FROM "verification" WHERE "id" = $1', [row.id]);
    const ctx = await who.auth.$context;
    const hash = await ctx.password.hash(next);
    const updated = await db.query(
      `UPDATE "account" SET "password" = $1, "updatedAt" = now() WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hash, user.id],
    );
    /* No password yet (they signed in by link or Google): this sets the first one. */
    if (!updated.rowCount) {
      await db.query(
        `INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password") VALUES ($1, $2, 'credential', $2, $3)`,
        [randomUUID(), user.id, hash],
      );
    }
    /* A new password ends every other session, so a stolen one stops working. */
    await db.query('DELETE FROM "session" WHERE "userId" = $1 AND "token" <> $2', [user.id, who.session.session.token]);
  } catch {
    return FAIL({}, "The password could not be changed just now. Nothing was changed.");
  }
  audit({ actor: user.name || user.email, kind: "setting", subjectId: user.id, subject: user.name || user.email, action: "changed their password (confirmed by an emailed code) and signed out their other sessions" });
  /* Told to the person afterwards, behind the response, and always: a security
     notice. The code's row id keys it, so one change mails once. */
  const changed = { email: user.email, name: user.name?.trim().split(/\s+/)[0], how: "changed" as const, eventKey: row.id };
  after(() => import("@/lib/lifecycle-mail").then((m) => m.sendPasswordChangedNotice(changed)).catch(() => {}));
  revalidatePath("/admin/settings/account");
  revalidatePath("/portal/settings");
  return OK("Password changed. Every other device has been signed out.");
}
