import "server-only";

/**
 * Which Paystack account the app is talking to, resolved in one place.
 *
 * THE NAMING, AND WHY IT IS THIS. There were two schemes in play: a
 * mode-scoped pair (`PAYSTACK_TEST_*` / `PAYSTACK_LIVE_*`) in the local
 * environment, and a flat pair (`PAYSTACK_SECRET_KEY`,
 * `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) in Doppler. Two schemes for one account is
 * how a live key ends up in a test flow, or worse. Nothing read either of them
 * yet, so this settles it before the payments work is written against
 * whichever half its author happened to have.
 *
 * ONE SWITCH: `PAYSTACK_MODE`. The keys are always both present and always
 * mode-scoped; the mode decides which pair is live. Changing environment means
 * changing one value, not remembering to change four.
 *
 * NO `NEXT_PUBLIC_` PUBLIC KEY. A `NEXT_PUBLIC_` variable is a second source of
 * truth for something this file already knows, and it is the one that would be
 * forgotten when the mode changed -- leaving a page initialising a live
 * checkout against a test secret. The public key is handed to the client by the
 * server that already knows the mode, from `publicKey()` below.
 *
 * FAILS CLOSED, naming what is missing. The same rule `r2Config()` follows:
 * "Paystack is not configured" at three in the morning is a worse message than
 * "PAYSTACK_LIVE_SECRET_KEY is not set".
 */

export type PaystackMode = "test" | "live";

export type PaystackConfig = {
  mode: PaystackMode;
  secretKey: string;
  publicKey: string;
  /** True when real money can move. Worth asserting on before a write. */
  isLive: boolean;
};

export function paystackMode(): PaystackMode {
  /* Test unless something explicitly says otherwise. The failure mode of
     guessing wrong in this direction is a payment that does not happen; the
     other direction charges somebody. */
  return process.env.PAYSTACK_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
}

export function paystackConfig():
  | { ok: true; config: PaystackConfig }
  | { ok: false; missing: string[] } {
  const mode = paystackMode();
  const prefix = mode === "live" ? "PAYSTACK_LIVE" : "PAYSTACK_TEST";

  const secretKey = process.env[`${prefix}_SECRET_KEY`];
  const publicKey = process.env[`${prefix}_PUBLIC_KEY`];

  const missing = [
    [`${prefix}_SECRET_KEY`, secretKey],
    [`${prefix}_PUBLIC_KEY`, publicKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k as string);

  if (missing.length) return { ok: false, missing };

  return {
    ok: true,
    config: {
      mode,
      secretKey: secretKey as string,
      publicKey: publicKey as string,
      isLive: mode === "live",
    },
  };
}

/**
 * The public key for the active mode, safe to hand to a browser.
 *
 * Returns null rather than throwing: a checkout that cannot start should say
 * so on the page, not crash the render of everything around it.
 */
export function paystackPublicKey(): string | null {
  const result = paystackConfig();
  return result.ok ? result.config.publicKey : null;
}
