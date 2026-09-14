import { NextResponse, type NextRequest } from "next/server";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { checkDomain, normaliseDomain, type DomainResult } from "@/lib/rdap";

/**
 * Domain availability for the onboarding form.
 *
 * THIS ENDPOINT IS A PROXY TO THIRD-PARTY REGISTRIES, which is exactly the
 * shape that gets abused, so the limits are on the number of NAMES and not
 * just the number of requests: three names per call, and a window that assumes
 * a client is choosing a domain, not enumerating one.
 *
 * Nothing here is authenticated, because the form it serves is not. That is
 * why the ceilings are low and why the answer is cached.
 */

/* SIX, NOT THREE, AND ONE ENDPOINT RATHER THAN TWO. The onboarding form asks
   about three names the client has thought of; the public checker at
   /tools/domain asks about ONE name across six endings. Same question, same
   registries, same limiter, so it would be two routes to keep in step for no
   reason. The form still sends three. */
const MAX_NAMES = 6;
const LIMIT = 12;            // calls per window per caller
const WINDOW_MS = 60_000;

/* A short shared cache in front of the registries. Two clients checking the
   same obvious name inside a minute should cost one lookup, and a client who
   presses the button twice should cost none. Per-instance, like the limiter,
   and honest about that for the same reason. */
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; result: DomainResult }>();

function cached(name: string): DomainResult | null {
  const hit = cache.get(name);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) { cache.delete(name); return null; }
  return hit.result;
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "domain"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before checking more names." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const raw = (body as { domains?: unknown })?.domains;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "Send one to three domain names." }, { status: 400 });
  }

  /* VALIDATED AND DEDUPLICATED ON THE SERVER, not trusted from the browser.
     The names go into a URL path against a third-party host, so anything that
     is not a hostname is rejected here rather than normalised into something
     that might be. */
  const names: string[] = [];
  for (const entry of raw.slice(0, MAX_NAMES)) {
    if (typeof entry !== "string") continue;
    const name = normaliseDomain(entry);
    if (name && !names.includes(name)) names.push(name);
  }
  if (names.length === 0) {
    return NextResponse.json({ error: "None of those look like domain names." }, { status: 400 });
  }

  const results = await Promise.all(
    names.map(async (name) => {
      const hit = cached(name);
      if (hit) return hit;
      const result = await checkDomain(name);
      /* `unknown` is cached too, and deliberately: when a registry is down it
         stays down for more than a minute, and hammering it on every keypress
         helps nobody. */
      cache.set(name, { at: Date.now(), result });
      return result;
    }),
  );

  return NextResponse.json(
    {
      results,
      /* SAID ON THE WIRE AS WELL AS IN THE UI. Availability is a snapshot of
         the registry at the moment of asking, and a name is only yours once it
         is registered. */
      notice: "Availability is informational until a name is actually registered.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
