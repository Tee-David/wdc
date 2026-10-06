import "server-only";
import { db } from "@/lib/db/pool";
import { checkoutAttempt, selectedPaystackMode } from "./paystack-mode";

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
 * `PAYSTACK_MODE` is the default. Settings stores an owner override; financial
 * requests resolve it through selectedPaystackMode without outage fallback.
 * Keys stay mode-scoped. An existing checkout retains its originating mode.
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

export function paystackConfig(mode: PaystackMode = paystackMode()):
  | { ok: true; config: PaystackConfig }
  | { ok: false; missing: string[] } {
  const prefix = mode === "live" ? "PAYSTACK_LIVE" : "PAYSTACK_TEST";

  const secretKey = process.env[`${prefix}_SECRET_KEY`];
  const publicKey = process.env[`${prefix}_PUBLIC_KEY`];

  const missing = [
    [`${prefix}_SECRET_KEY`, secretKey],
    [`${prefix}_PUBLIC_KEY`, publicKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k as string);
  if (secretKey && !secretKey.startsWith(`sk_${mode}_`)) missing.push(`${prefix}_SECRET_KEY has the wrong mode prefix`);
  if (publicKey && !publicKey.startsWith(`pk_${mode}_`)) missing.push(`${prefix}_PUBLIC_KEY has the wrong mode prefix`);

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

/* ==========================================================================
   TALKING TO PAYSTACK.

   Three calls and one check, and every one of them exists because the browser
   cannot be trusted with any of it.

   HOSTED CHECKOUT, NOT THE INLINE POPUP. Paystack offers both; this uses the
   redirect. The popup needs the public key in the page and a script from
   Paystack's domain on a page that is otherwise ours, which means a third
   party's JavaScript running on the document that shows somebody what they
   owe. The redirect hands the card details to Paystack on Paystack's own
   origin, keeps our page free of their script, and degrades to a plain link
   if JavaScript is off. The cost is losing the client's context for the
   length of the payment, which for an invoice paid once is the cheaper side
   of the trade.

   NOTHING HERE DECIDES THAT MONEY ARRIVED. `initialize` starts a checkout and
   `verify` asks Paystack what happened; the only thing that writes a payment
   is `applyPayment`, and it is called from the verify result or the webhook,
   never from a query string.
   ========================================================================== */

const API = "https://api.paystack.co";

/* Kobo in, kobo out: see lib/money-units.ts. */
export { wholeKobo } from "./money-units";
import { wholeKobo } from "./money-units";

export type PaystackError = { ok: false; error: string };

async function call<T>(
  path: string,
  init: RequestInit & { secretKey: string },
): Promise<{ ok: true; data: T } | PaystackError> {
  const { secretKey, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...rest,
      headers: {
        ...rest.headers,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      /* A payment call is never cached, and never prerendered into a page. */
      cache: "no-store",
      /* Paystack is not on our side of the response: a checkout that hangs
         must fail, not hold a request open until the platform kills it. */
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "TimeoutError"
      ? "Paystack did not answer in time."
      : "Could not reach Paystack." };
  }

  let body: { status?: boolean; message?: string; data?: T };
  try { body = await res.json(); } catch { return { ok: false, error: "Paystack sent something we could not read." }; }

  /* THE MESSAGE IS PAYSTACK'S, NOT OURS, and it is worth passing through: the
     difference between "Invalid key" and "Amount below minimum" is the whole
     of the fix. It never carries the key -- only what we sent. */
  if (!res.ok || body.status !== true || !body.data) {
    return { ok: false, error: body.message?.slice(0, 300) || `Paystack refused the request (${res.status}).` };
  }
  return { ok: true, data: body.data };
}

export type InitializedTransaction = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/**
 * Start a hosted checkout and get back the URL to send the payer to.
 *
 * THE REFERENCE IS OURS, NOT PAYSTACK'S. Letting Paystack mint it means the
 * only record of the attempt lives on their side until they tell us about it,
 * and a redirect that never comes back leaves nothing to reconcile against.
 * Ours is generated before the call, so an attempt exists in our own event log
 * from the moment it is made.
 */
export async function initializeTransaction(input: {
  email: string;
  /** Kobo, exactly as the books keep it. */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}) {
  let mode: PaystackMode;
  try { mode = await selectedPaystackMode(); } catch { return {ok:false as const,error:"Payment configuration could not be loaded. Please retry."}; }
  const cfg = paystackConfig(mode);
  if (!cfg.ok) return { ok: false as const, error: `Paystack is not configured: ${cfg.missing.join(", ")} not set.` };

  const invoiceId = input.metadata?.invoiceId;
  if (!invoiceId) return {ok:false as const,error:"The invoice could not be identified."};
  try {
    await db.query("INSERT INTO paystack_checkout_attempts(reference,invoice_id,amount,currency,mode) VALUES($1,$2,$3,'NGN',$4)", [input.reference,invoiceId,wholeKobo(input.amount),mode]);
  } catch { return {ok:false as const,error:"Checkout could not be recorded. Check the database and payment migration."}; }

  const result = await call<InitializedTransaction>("/transaction/initialize", {
    method: "POST",
    secretKey: cfg.config.secretKey,
    body: JSON.stringify({
      email: input.email,
      amount: wholeKobo(input.amount),
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
      metadata: {
        ...input.metadata,
        /* Stamped so a webhook arriving months later can say which
           environment raised the charge, without us inferring it. */
        mode: cfg.config.mode,
      },
    }),
  });
  return {...result,mode};
}

export type VerifiedTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  channel: string | null;
  gateway_response: string | null;
  customer: { email: string | null } | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Ask Paystack what actually happened to a reference.
 *
 * THE ONLY ANSWER THAT COUNTS. A browser coming back from checkout carries a
 * reference in a query string and nothing else -- no proof, no amount, nothing
 * that could not be typed by hand. This is the server asking the source.
 */
export async function verifyTransaction(reference: string) {
  let attempt: Awaited<ReturnType<typeof checkoutAttempt>>;
  try { attempt = await checkoutAttempt(reference); } catch { return {ok:false as const,error:"Checkout identity could not be loaded.",mode:"test" as PaystackMode}; }
  const modes: PaystackMode[] = attempt ? [attempt.mode] : ["live","test"];
  const successes = (await Promise.all(modes.map(async mode => {
    const cfg = paystackConfig(mode); if (!cfg.ok) return null;
    const result = await call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, {method:"GET",secretKey:cfg.config.secretKey});
    return result.ok ? {data:result.data,mode} : null;
  }))).filter((result):result is {data:VerifiedTransaction;mode:PaystackMode} => result !== null);
  if (successes.length !== 1) return {ok:false as const,error:"Payment identity could not be confirmed unambiguously.",mode:attempt?.mode ?? "test"};
  const result = successes[0];
  if (result.data.reference !== reference || (attempt && (result.data.amount !== Number(attempt.amount) || result.data.currency !== attempt.currency || result.data.metadata?.invoiceId !== attempt.invoice_id))) return {ok:false as const,error:"Payment did not match the recorded checkout.",mode:result.mode};
  return {ok:true as const,...result};
}

/**
 * Is this webhook body really from Paystack?
 *
 * FAILS CLOSED, and it has to: the handler behind it writes money. A missing
 * header, an unconfigured key or a body that has been re-serialised on the way
 * in all return false. The comparison is timing-safe, which matters more than
 * it looks -- a byte-at-a-time comparison leaks the expected digest to anybody
 * willing to send a few million requests.
 *
 * MODE SAFETY COMES FREE HERE. The signature is an HMAC keyed on the secret of
 * ONE Paystack account, so an event raised in test cannot validate against a
 * live key or the other way round. There is no separate check to forget.
 */
export async function paystackSignatureValid(rawBody: string, header: string | null, mode:PaystackMode = paystackMode()) {
  if (!header) return false;
  const cfg = paystackConfig(mode);
  if (!cfg.ok) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(cfg.config.secretKey),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  const expected = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");

  const given = header.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function paystackSignatureMode(rawBody:string, header:string|null):Promise<PaystackMode|null> {
  const matches:PaystackMode[] = [];
  for (const mode of ["live","test"] as const) if (await paystackSignatureValid(rawBody,header,mode)) matches.push(mode);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * A reference we mint, readable enough to find in Paystack's dashboard.
 *
 * The invoice number is in it on purpose: reconciling a bank statement against
 * a list of opaque references is somebody's whole afternoon. The random tail is
 * what makes a second attempt on the same invoice a different transaction --
 * a payer who abandons a checkout and comes back must not collide with their
 * own earlier attempt.
 */
export function paymentReference(invoiceNumber: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const tail = Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
  return `${invoiceNumber.replace(/[^A-Za-z0-9]/g, "")}-${tail}`.toUpperCase();
}
