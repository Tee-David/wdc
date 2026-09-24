import type { AuthAdapter } from "./adapter";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * EVERY PATH, WITH NO BACKEND. On when NEXT_PUBLIC_AUTH_DEMO is "true", and
 * the page says "Demo mode" in its corner so nobody mistakes it for the real
 * door. It can sign nobody in: success ends on a placeholder, not a session.
 *
 *   password  anything works, except
 *             "oops"     wrong credentials
 *             "slow"     three seconds, then success (watch the ring creep)
 *             "limit"    rate limited
 *             "offline"  network failure
 *   code      123456 works, anything else is wrong
 *   link      "Simulate opening the link" on the inbox screen
 *   passkey   succeeds after 1.8s, or "Simulate cancel"
 */
export function demoAdapter(): AuthAdapter & { cancelPasskey(): void; openLink(): void } {
  let cancel: (() => void) | null = null;
  let opened = false;
  const signedIn = { ok: true as const, redirectTo: "/login?demo=done", name: null };

  return {
    passkeys: true,
    google: true,

    async signInWithPassword(_email, password) {
      if (password === "slow") {
        await wait(3000);
        return signedIn;
      }
      await wait(650);
      if (password === "oops") return { ok: false, reason: "invalid" };
      if (password === "limit") return { ok: false, reason: "rate_limited" };
      if (password === "offline") return { ok: false, reason: "network" };
      return signedIn;
    },

    async sendMagicLink() {
      await wait(900);
      opened = false;
      return { ok: true, requestId: Math.random().toString(36).slice(2) };
    },

    async verifyCode(_email, code) {
      await wait(700);
      return code === "123456" ? signedIn : { ok: false, reason: "invalid" };
    },

    async checkMagicStatus() {
      return opened ? signedIn : { ok: false, reason: "pending" };
    },

    passkeySignIn() {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          cancel = null;
          resolve(signedIn);
        }, 1800);
        cancel = () => {
          clearTimeout(timer);
          cancel = null;
          resolve({ ok: false, reason: "cancelled" });
        };
      });
    },

    async signInWithGoogle() {
      await wait(800);
      /* No redirect in the demo: the page treats a void return from the demo
         as success and plays the closing moment. */
    },

    async requestPasswordReset() {
      await wait(900);
      return { ok: true };
    },

    cancelPasskey() {
      cancel?.();
    },

    openLink() {
      opened = true;
    },
  };
}
