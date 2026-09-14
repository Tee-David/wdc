/**
 * Domain availability, from the registries themselves.
 *
 * WHY RDAP AND NOT DNS. A name with no DNS records is not a free name: plenty
 * of registered domains are parked with no zone at all, and a NXDOMAIN answer
 * would tell a client a name is theirs to buy when somebody already owns it.
 * That is the one wrong answer this feature must never give. RDAP is the
 * registry's own record, it is free, it needs no account and no key, and it is
 * the successor protocol to WHOIS rather than a scrape of it.
 *
 * WHY NOT A COMMERCIAL API. Nothing here needs one. IANA publishes the
 * bootstrap that maps every TLD to its registry's RDAP base URL, and the
 * registries answer directly.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS MEASURED, 2026-09-14, because the answer changes the design:
 *
 *  - The bootstrap at data.iana.org/rdap/dns.json lists 590 services.
 *  - `.com` and `.net` (rdap.verisign.com) behave exactly to spec: 200 for a
 *    registered name, 404 for a free one. Verified with google.com (200) and a
 *    nonsense name (404).
 *  - **`.ng` IS LISTED AND DOES NOT WORK.** rdap.nic.net.ng is in the
 *    bootstrap, and every request to it returned 502 or timed out entirely,
 *    across repeated attempts, including its own root. For a Nigerian studio
 *    that is the single most important TLD, and we cannot get an authoritative
 *    answer for it.
 *  - `.io` and `.co` have NO RDAP service in the bootstrap at all.
 *
 * So "unknown" is not a rare edge case here, it is the expected answer for a
 * large share of what this studio's clients will ask about. It is a first
 * class result, it is shown honestly, and it never degrades into a guess.
 */

export type DomainStatus = "available" | "taken" | "unknown";

export type DomainResult = {
  domain: string;
  status: DomainStatus;
  /** Shown to the client when the answer is `unknown`, so it is never mute. */
  note?: string;
};

const BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

/* The registry answers in about a second when it is healthy. Anything slower
   is a registry having a bad day, and the client should be told "we could not
   check" rather than made to wait on it. */
const LOOKUP_TIMEOUT_MS = 6000;
const BOOTSTRAP_TIMEOUT_MS = 8000;

type Bootstrap = { services: [string[], string[]][] };

/* Cached for the life of the instance AND revalidated by the fetch cache. The
   file changes when a TLD appears or moves registry, which is rare. */
let bootstrapPromise: Promise<Map<string, string> | null> | null = null;

async function tldMap(): Promise<Map<string, string> | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const response = await fetch(BOOTSTRAP, {
          signal: AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS),
          next: { revalidate: 86_400 },
        });
        if (!response.ok) return null;
        const data = (await response.json()) as Bootstrap;
        const map = new Map<string, string>();
        for (const [tlds, urls] of data.services) {
          const base = urls[0];
          if (!base) continue;
          for (const tld of tlds) map.set(tld.toLowerCase(), base);
        }
        return map;
      } catch {
        /* Null rather than throwing: every lookup then answers "unknown",
           which is the honest result when we cannot reach the directory. */
        return null;
      }
    })();
  }
  return bootstrapPromise;
}

/**
 * The registrable name, lowercased, with anything a person might paste around
 * it removed. Returns null for something that is not a domain at all.
 *
 * Deliberately strict. This value is put into a URL path against a third-party
 * host, so the only characters that survive are the ones a hostname may
 * actually contain.
 */
export function normaliseDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").replace(/^www\./, "");
  value = value.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  value = value.replace(/\.$/, "");
  if (!value || value.length > 253) return null;
  /* Letters, digits and hyphens per label; at least two labels; no leading or
     trailing hyphen; TLD is letters only (so no bare IPs, and no punycode
     guessing -- an IDN typed in unicode is rejected rather than mangled). */
  if (!/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/.test(value)) {
    return null;
  }
  return value;
}

/**
 * The RDAP base URL for a name, trying the longest suffix first.
 *
 * `co.uk` and `com.ng` are registered under the ccTLD, and the bootstrap keys
 * on the TLD, so "shop.com.ng" has to fall back from "com.ng" to "ng".
 */
function baseFor(domain: string, map: Map<string, string>): string | null {
  const labels = domain.split(".");
  for (let i = 1; i < labels.length; i++) {
    const suffix = labels.slice(i).join(".");
    const base = map.get(suffix);
    if (base) return base;
  }
  return null;
}

/**
 * One name, checked against its registry.
 *
 * The status mapping is the whole point and is deliberately narrow:
 *   404 -> available. The registry says it holds no such object.
 *   200 -> taken.     The registry returned a record for it.
 *   anything else, including a timeout or a network error -> unknown.
 *
 * A 429 or a 503 from a registry is NOT evidence of anything about the name,
 * and neither is our own inability to reach it. Every one of those is
 * `unknown`, which is why `.ng` degrades honestly rather than silently.
 */
export async function checkDomain(domain: string): Promise<DomainResult> {
  const name = normaliseDomain(domain);
  if (!name) {
    return { domain: domain.trim().slice(0, 80), status: "unknown", note: "That does not look like a domain name." };
  }

  const map = await tldMap();
  if (!map) return { domain: name, status: "unknown", note: "We could not reach the registry directory just now." };

  const base = baseFor(name, map);
  if (!base) {
    return {
      domain: name,
      status: "unknown",
      note: "This ending does not publish a public availability service, so we will check it by hand.",
    };
  }

  const url = `${base.replace(/\/$/, "")}/domain/${encodeURIComponent(name)}`;
  try {
    const response = await fetch(url, {
      headers: { accept: "application/rdap+json" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status === 404) return { domain: name, status: "available" };
    if (response.ok) return { domain: name, status: "taken" };
    return {
      domain: name,
      status: "unknown",
      note: "The registry did not answer, so we will check this one by hand.",
    };
  } catch {
    return {
      domain: name,
      status: "unknown",
      note: "The registry did not answer, so we will check this one by hand.",
    };
  }
}
