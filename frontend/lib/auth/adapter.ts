"use client";

import { authClient } from "@/lib/auth-client";
import { authEmail } from "./validation";

/**
 * ONE SEAM BETWEEN THE LOGIN PAGE AND WHATEVER SIGNS PEOPLE IN.
 *
 * The page talks only to this interface, so the demo adapter can stand in for
 * Better Auth without a component knowing, and a different backend later is a
 * new file here rather than a rewrite of the form.
 */
export type FailReason = "invalid" | "rate_limited" | "network" | "expired" | "cancelled";
export type Fail = { ok: false; reason: FailReason };
export type SignedIn = { ok: true; redirectTo: string; name?: string | null };

export interface AuthAdapter {
  /** Passkeys are only offered when this is true AND the browser has WebAuthn. */
  readonly passkeys: boolean;
  readonly google: boolean;
  /** `remember` keeps the session past closing the browser; unticked, it ends with it. */
  signInWithPassword(email: string, password: string, remember: boolean): Promise<SignedIn | Fail>;
  sendMagicLink(email: string): Promise<{ ok: true; requestId: string } | Fail>;
  verifyCode(email: string, code: string, requestId: string): Promise<SignedIn | Fail>;
  /** Has the link been opened somewhere this browser can see? */
  checkMagicStatus(requestId: string): Promise<SignedIn | { ok: false; reason: "pending" } | Fail>;
  passkeySignIn(): Promise<SignedIn | Fail>;
  signInWithGoogle(): Promise<Fail | void>;
  requestPasswordReset(email: string): Promise<{ ok: true } | Fail>;
}

type BetterAuthError = { status?: number; code?: string } | null | undefined;

const failFor = (error: BetterAuthError, otherwise: FailReason): Fail => {
  if (error?.status === 429) return { ok: false, reason: "rate_limited" };
  return { ok: false, reason: otherwise };
};

/**
 * Better Auth, as configured in lib/auth.ts.
 *
 * `redirectTo` is /signed-in, which reads the role on the server and decides
 * where this person belongs. The browser never picks its own destination.
 * `requested` (a ?redirect= the middleware carried here) rides along and is
 * checked there by `safeDestination()`.
 */
export function realAdapter({ requested, google }: { requested: string; google: boolean }): AuthAdapter {
  const carry = requested ? `redirect=${encodeURIComponent(requested)}` : "";
  const redirectTo = `/signed-in${carry ? `?${carry}` : ""}`;
  /* A sign-in that leaves the page (the emailed link, Google) comes back to
     /login?done=1, which plays the closing moment and then moves on to
     /signed-in. Without it the person would jump straight from Google to a
     dashboard, and the tab that asked for the link would never hear about it. */
  const done = `/login?done=1${carry ? `&${carry}` : ""}`;

  return {
    passkeys: false,
    google,

    async signInWithPassword(email, password, remember) {
      try {
        /* NO `callbackURL`: with one, Better Auth's client navigates by itself
           and races the success animation's own navigation. */
        const result = await authClient.signIn.email({ email: authEmail(email), password, rememberMe: remember });
        /* ONE answer for a wrong password and for an address with no account,
           and a 429 is never reported as a wrong password: somebody who was
           rate-limited would otherwise "fix" a password that was never broken. */
        if (result.error) return failFor(result.error, "invalid");
        return { ok: true, redirectTo, name: result.data?.user?.name ?? null };
      } catch {
        return { ok: false, reason: "network" };
      }
    },

    async sendMagicLink(email) {
      try {
        const result = await authClient.signIn.magicLink({ email: authEmail(email), callbackURL: done, errorCallbackURL: "/login" });
        if (result.error) return failFor(result.error, "network");
        /* The server keeps no request id; the tab listens for the session
           itself. This one only tells two sends apart. */
        return { ok: true, requestId: Math.random().toString(36).slice(2) };
      } catch {
        return { ok: false, reason: "network" };
      }
    },

    async verifyCode(email, code) {
      try {
        const result = await authClient.signIn.emailOtp({ email: authEmail(email), otp: code });
        if (result.error) {
          if (result.error.status === 429) return { ok: false, reason: "rate_limited" };
          if (result.error.code === "OTP_EXPIRED" || result.error.code === "TOO_MANY_ATTEMPTS") return { ok: false, reason: "expired" };
          return { ok: false, reason: "invalid" };
        }
        return { ok: true, redirectTo, name: result.data?.user?.name ?? null };
      } catch {
        return { ok: false, reason: "network" };
      }
    },

    async checkMagicStatus() {
      try {
        /* Same browser, another tab: the cookie that tab received is ours
           too, so a session here means the link was opened. A different
           device cannot be seen from here at all, which is what the code in
           the same email is for. */
        const result = await authClient.getSession();
        if (result.data?.user) return { ok: true, redirectTo, name: result.data.user.name ?? null };
        return { ok: false, reason: "pending" };
      } catch {
        return { ok: false, reason: "pending" };
      }
    },

    async passkeySignIn() {
      return { ok: false, reason: "cancelled" };
    },

    async signInWithGoogle() {
      try {
        const result = await authClient.signIn.social({ provider: "google", callbackURL: done, errorCallbackURL: "/login" });
        if (result?.error) return failFor(result.error, "network");
      } catch {
        return { ok: false, reason: "network" };
      }
    },

    async requestPasswordReset(email) {
      try {
        const result = await authClient.requestPasswordReset({ email: authEmail(email), redirectTo: "/reset-password" });
        /* The endpoint answers the same way whether or not the address has an
           account; the only error worth telling apart is the rate limit. */
        if (result.error) return failFor(result.error, "network");
        return { ok: true };
      } catch {
        return { ok: false, reason: "network" };
      }
    },
  };
}
