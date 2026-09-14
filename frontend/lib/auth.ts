import "server-only";

import { after } from "next/server";
import { betterAuth } from "better-auth";
import { googleAdmission } from "@/lib/auth-google";
import { db } from "@/lib/db/pool";
import { sendPasswordResetEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/** One hour, in the token and in the sentence the email says out loud. */
const RESET_TOKEN_TTL_SECONDS = 60 * 60;


/**
 * The role on the row with this email, or null if there is no such row.
 *
 * Read straight from the table rather than through Better Auth's adapter
 * because this is the check that decides whether somebody gets in: it should
 * read the database, in one statement, with nothing in between that could be
 * reconfigured.
 */
async function storedRoleFor(email: string): Promise<string | null> {
  const result = await db.query<{ role: string | null }>(
    'SELECT "role" FROM "user" WHERE lower("email") = $1 LIMIT 1',
    [email.trim().toLowerCase()],
  );
  return result.rows[0]?.role ?? null;
}

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || SITE_URL,
  trustedOrigins: [
    SITE_URL,
    "https://www.wedigcreativity.com.ng",
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3123",
    "http://localhost:3124",
  ],
  emailAndPassword: {
    enabled: true,
    /**
     * ALWAYS. There is no self-service account on this site and there is not
     * going to be one: the login page says so, and accounts are made by the
     * studio. It used to be `process.env.WDC_ALLOW_ADMIN_SEED !== "1"`, which
     * meant one environment variable set in one dashboard, once, would have
     * opened public sign-up on the production domain -- and nothing would have
     * looked wrong. Seeding does not need it either: scripts/seed-admin.mjs
     * writes the row and the credential hash directly.
     */
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SECONDS,
    /**
     * A RESET ENDS EVERY SESSION, including the one that should not exist.
     *
     * Better Auth leaves this off by default, which means the commonest reason
     * anybody resets a password -- "somebody else is in my account" -- does not
     * actually put them out. They keep a valid cookie for up to a week. The
     * cost of turning it on is that the person resetting has to sign in again
     * on their other devices, which is what they expect to happen anyway.
     */
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      /* `user.name` is a full name; the email wants something to say hello
         with, and the first word of it is the honest answer. */
      await sendPasswordResetEmail(
        user.email,
        url,
        user.name?.trim().split(/\s+/)[0] || undefined,
        RESET_TOKEN_TTL_SECONDS / 60,
      );
    },
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      /* No row, no entry. A Google account that matches nobody here cannot
         create itself one -- it is turned away at the callback. */
      disableSignUp: true,
    },
  } : {},
  account: {
    /**
     * HOW A GOOGLE ACCOUNT IS ALLOWED TO MEET AN EXISTING ONE.
     *
     * Both of these are Better Auth's defaults today, and they are written out
     * because they are load-bearing and a default can change under us:
     *
     *   `trustedProviders: []` -- Google is NOT trusted by name, so a link is
     *   only allowed when Google itself says the address is verified.
     *
     *   `requireLocalEmailVerified: true` -- and the row here has to be
     *   verified too, so an unverified address somebody typed into a form can
     *   never be claimed by whoever registers that mailbox next.
     *
     * Together they mean the only way a Google identity reaches an account is
     * by proving the same, verified, address at both ends.
     */
    accountLinking: { enabled: true, trustedProviders: [], requireLocalEmailVerified: true },
  },
  user: {
    additionalFields: {
      /* "client", to match `roleEnum`'s own default in lib/db/schema.ts.
         It said "staff" here and "client" there, which meant a row created
         through better-auth and a row created through the schema disagreed
         about what a new person is allowed to see. The safe default is the
         one with the least access, and it is now the same in both places.
         `input: false` keeps the field off the wire: a role is granted, never
         requested. */
      role: { type: "string", required: false, defaultValue: "client", input: false },
    },
    /**
     * THE GOOGLE DOOR. The rule itself, and the reasoning for it, live in
     * lib/auth-google.ts so they can be tested without standing up this
     * instance; what is worth knowing HERE is when Better Auth asks.
     *
     * It asks before a user is created, before a provider account is linked to
     * an existing user, and again on every subsequent OAuth sign-in. So this
     * is not a one-time check at setup: it is re-asked each time somebody
     * presses "Continue with Google", and revoking somebody's access is
     * therefore a matter of changing their row rather than of hunting for a
     * session to kill.
     */
    validateUserInfo: async ({ user, source }) => {
      /* Password sign-in is deliberately untouched: it is governed by the
         credential itself, and by the row the credential hangs off. */
      if (source.method !== "oauth") return;

      const decision = await googleAdmission(source.oauth?.providerId, user.email, storedRoleFor);
      if (!decision.allowed) {
        return { error: decision.error, errorDescription: decision.errorDescription };
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * NOTHING CREATES AN ADMIN. The `role` field is already `input: false`
         * with a least-access default, so nothing on the wire and nothing in a
         * provider profile can set it -- but this is the seam where a row is
         * actually written, and it costs one line to make the guarantee
         * unconditional rather than a consequence of two other settings being
         * right. An owner is made by scripts/seed-admin.mjs or by an admin who
         * is already one; never by signing in.
         */
        before: async (user) => ({ data: { ...user, role: "client" } }),
      },
    },
  },
  /**
   * RATE LIMITS BELONG TO THE ACTION.
   *
   * The tight numbers are on the three paths that are worth attacking: guessing
   * a password, mining the reset endpoint for valid addresses, and burning
   * through reset tokens. The default stays loose because the same handler
   * serves `/get-session`, which a signed-in page asks for constantly.
   *
   * Counted in ONE INSTANCE'S MEMORY, exactly like lib/rate-limit.ts, and with
   * the same honest caveat: on Vercel the real ceiling is this number times the
   * count of warm instances, and a cold start forgives everything. It is abuse
   * control, not a quota. Moving it to `storage: "database"` needs a
   * `rateLimit` table that db/migrations does not create yet.
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      /* Twenty attempts in five minutes, not ten. THE KEY IS THE IP, and an
         office, a school or a household behind one NAT is a single key: ten was
         reachable by two people mistyping on the same connection on the same
         morning, and the form then told both of them their password was wrong.
         Twenty is still a hard ceiling against a script and leaves room for
         people being people. */
      "/sign-in/email": { window: 300, max: 20 },
      /* Tighter, because each of these puts a message in somebody's inbox. */
      "/request-password-reset": { window: 900, max: 5 },
      "/reset-password": { window: 900, max: 10 },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: {
    cookiePrefix: "wdc",
    /**
     * THE SLOW MAIL SERVER NEVER HOLDS UP A RESPONSE.
     *
     * Truehost's SMTP needs about 23 seconds just to finish TLS and
     * authenticate, measured from two networks. Without this, "email me a reset
     * link" sits on a spinner for that long and then risks the function's own
     * timeout expiring first -- which is exactly the failure the contact form
     * already paid for and fixed by sending its receipt from `after()`.
     *
     * Better Auth hands every deferrable job to this handler, so the reset mail
     * goes out once the response has already gone. The token is written to the
     * database BEFORE the send is queued, so the work behind the response is
     * safe to lose: the link exists, and asking again just sends another.
     *
     * `after()` throws outside a request scope. The promise has already started
     * by then, so it still runs; there is simply nothing to attach it to, and
     * that is not worth failing a sign-in over.
     */
    backgroundTasks: {
      handler: (promise) => {
        /* Settled first, so the job is reported once and can never surface as
           an unhandled rejection if there is no request to attach it to. */
        const settled = promise.catch((error) => {
          console.error("Auth background task failed", error instanceof Error ? error.message : "unknown error");
        });
        try {
          after(settled);
        } catch {
          /* No request scope. It is already running; there is simply nothing
             holding the response open to wait on it. */
        }
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
