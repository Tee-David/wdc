import type { NextRequest } from "next/server";

/**
 * A sliding-window limiter, and an honest account of what it is worth.
 *
 * WHAT IT STOPS. Someone pointing a script at an endpoint and leaving it
 * running. That is the realistic threat to a marketing site's forms, and this
 * stops it cheaply.
 *
 * WHAT IT DOES NOT STOP, and this is not a detail. The counts live in the
 * memory of ONE serverless instance. Vercel spreads requests across instances
 * that start and stop constantly, so a determined attacker spreading requests
 * gets a fresh allowance on every cold start, and the count is never shared.
 * A real limit needs shared state -- the Cockroach instance this project
 * already runs, or an edge KV. Until then this is a speed bump, deliberately
 * chosen because a speed bump today beats a perfect limiter someday.
 *
 * WHAT WAS WRONG WITH THE OLD ONE. The contact form kept the same Map and
 * never removed anything from it, so an instance that stayed alive
 * accumulated one array per distinct IP for its whole life. `sweep` below is
 * the fix: entries with nothing recent in them are dropped, and the sweep is
 * amortised across calls rather than run on a timer that would keep a
 * serverless instance awake.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

/* Only sweep every so often; walking the whole map on every request would cost
   more than the leak it prevents. */
const SWEEP_EVERY = 500;
let sinceSweep = 0;

function sweep(windowMs: number) {
  const cutoff = Date.now() - windowMs;
  for (const [key, times] of buckets) {
    if (!times.some((t) => t > cutoff)) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Records an attempt and says whether it is over the line.
 *
 * `key` should carry the route as well as the caller, so a client filling in
 * the onboarding form does not spend the allowance that protects submissions.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (++sinceSweep >= SWEEP_EVERY) { sinceSweep = 0; sweep(windowMs); }

  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  buckets.set(key, recent);

  if (recent.length <= limit) return { ok: true };

  /* When the oldest attempt in the window falls out, they get another go. */
  const oldest = recent[0];
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
}

/**
 * The caller's address, as far as we can tell.
 *
 * `x-forwarded-for` is client-controlled in general, but on Vercel the platform
 * overwrites it, so the first entry is the real peer. "unknown" is a single
 * shared bucket on purpose: if the header is missing, everyone missing it
 * shares one allowance rather than each getting their own.
 */
export function callerKey(request: NextRequest, scope: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}
