import { NextResponse, type NextRequest } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { mailHealth, normaliseMailDomain, type MailHealth } from "@/lib/mail-health";

/**
 * The email deliverability check behind /tools/email.
 *
 * NODE RUNTIME, EXPLICITLY. `node:dns` does not exist on the edge runtime, and
 * this is the whole tool.
 *
 * Cheaper to serve than the domain checker: DNS rather than an HTTP call per
 * registry, and four checks that run concurrently. The ceiling is still low
 * because it is unauthenticated and it resolves names on someone else's
 * behalf.
 */
export const runtime = "nodejs";
export const maxDuration = 15;

const LIMIT = 10;
const WINDOW_MS = 60_000;

/* DNS answers do not change minute to minute, and a visitor who presses the
   button twice should not pay for it twice. Per-instance, like the other
   caches here, and honest about that. */
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; result: MailHealth }>();

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-email"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before checking another domain." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  /* Validated server-side: this value becomes a DNS query, so only something
     shaped like a hostname gets through. An email address is accepted and the
     domain taken out of it, because that is what people paste. */
  const domain = normaliseMailDomain((body as { domain?: unknown })?.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "Enter a domain, like yourbusiness.com." },
      { status: 400 },
    );
  }

  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json(hit.result, { headers: { "cache-control": "no-store" } });
  }

  try {
    const result = await mailHealth(domain);
    cache.set(domain, { at: Date.now(), result });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "We could not read that domain's records just now." },
      { status: 502 },
    );
  }
}
