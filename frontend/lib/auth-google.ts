/**
 * WHO GOOGLE IS ALLOWED TO LET IN, AND WHAT HAPPENS WHEN WE CANNOT TELL.
 *
 * This is the whole of the Google admission rule, kept apart from lib/auth.ts
 * so it can be run directly. The reason is the same one written at the top of
 * lib/email-templates.ts: lib/auth.ts is `server-only` and builds a live
 * Better Auth instance the moment it is imported, so a spec cannot reach into
 * it without also opening a database pool and reading the environment. The
 * decision that actually keeps strangers out would then be the one part of
 * this flow with no test, which is exactly backwards.
 *
 * NO `server-only` HERE ON PURPOSE, and nothing secret in it: this module
 * holds a list of two role names and the order the checks happen in. The
 * lookup that touches the database is passed in, so the caller owns the
 * credential and this file owns the rule. tests/google-admission.spec.ts
 * exercises every branch below, including the one that is hardest to reach by
 * hand and matters most -- a database that will not answer.
 */

/**
 * Google sign-in exists for the people who run the studio, and for nobody
 * else.
 *
 * `disableSignUp` on the provider already stops a stranger's Google account
 * creating a row, but on its own that only means the identity has to match an
 * existing one -- and the day a client has an account, a client's Google
 * account would work too. This set is what makes it owner-and-staff only.
 *
 * Clients sign in with a password. If that ever changes, this set changes with
 * it, in one place, deliberately.
 */
export const GOOGLE_ALLOWED_ROLES: ReadonlySet<string> = new Set(["owner", "staff"]);

/** Allowed says nothing; a refusal carries the code the login form maps. */
export type GoogleAdmission =
  | { allowed: true }
  | { allowed: false; error: string; errorDescription: string };

const ALLOWED: GoogleAdmission = { allowed: true };

const refuse = (error: string, errorDescription: string): GoogleAdmission =>
  ({ allowed: false, error, errorDescription });

/**
 * ONE SENTENCE FOR "no account" AND FOR "an account, but not one of ours".
 *
 * Two would turn this button into a way of finding out who works here, for the
 * same reason the login form gives one answer for a wrong password and for an
 * address that has never existed.
 */
const NOT_APPROVED = "This Google account is not connected to a We Dig Creativity account.";

/**
 * Decides whether a Google identity may have a session, and FAILS CLOSED.
 *
 * Four ways to be refused, in this order, and the last is the one worth
 * writing a test for:
 *
 *   the provider is not Google           -> refused
 *   Google sent us no email address      -> refused
 *   no row, or a row we do not admit     -> refused
 *   the lookup itself threw              -> REFUSED
 *
 * A database we cannot reach is not a reason to admit somebody. It is the
 * reason we cannot tell whether we should. The lookup is only called once the
 * provider and the address have passed, so a refusal on either of those costs
 * no query.
 *
 * `lookupRole` returns the role on the row with that address, or null when
 * there is no such row. It is expected to throw when the database cannot be
 * reached, and that throw is caught here rather than by the caller so the
 * fail-closed answer lives beside the rule it belongs to.
 */
export async function googleAdmission(
  providerId: string | null | undefined,
  rawEmail: unknown,
  lookupRole: (email: string) => Promise<string | null>,
): Promise<GoogleAdmission> {
  if (providerId !== "google") {
    return refuse("provider_not_allowed", "That sign-in method is not available.");
  }

  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email) {
    return refuse("email_required", "Google did not share an email address.");
  }

  let role: string | null;
  try {
    role = await lookupRole(email);
  } catch {
    return refuse(
      "verification_unavailable",
      "We could not verify this account. Please sign in with your password.",
    );
  }

  if (!role || !GOOGLE_ALLOWED_ROLES.has(role)) {
    return refuse("not_approved", NOT_APPROVED);
  }

  return ALLOWED;
}
