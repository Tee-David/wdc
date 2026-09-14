import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetch ONE page from a URL a stranger typed, without becoming a proxy into
 * our own network.
 *
 * `app/api/embeddable/route.ts` states the doctrine and solves the easy
 * version of it: that route only accepts URLs already in the work catalogue,
 * so no input can reach an address we did not ship. This is the hard version.
 * The tools that need it -- the link preview checker and the on-page SEO
 * snapshot -- exist precisely to look at a URL we have never seen, so the URL
 * is genuinely arbitrary and every defence has to be explicit.
 *
 * WHAT AN SSRF HOLE LOOKS LIKE HERE. Serverless functions sit inside a network
 * with things on it: a metadata endpoint at 169.254.169.254 that hands out
 * credentials, internal load balancers on 10.x, a database on a private
 * address. "Fetch this URL for me" is the request that reaches all of them,
 * and `http://localhost:5432` is a URL like any other.
 *
 * THE ORDER MATTERS MORE THAN THE LIST. Checking the hostname against a
 * blocklist is not a defence: `127.0.0.1.nip.io` is a public name that
 * resolves to loopback, and so is any attacker-controlled A record. So the
 * host is RESOLVED first and the resulting ADDRESS is judged, before any
 * connection is made -- and again after every redirect, because a redirect is
 * a fresh URL with a fresh host that has been through none of this.
 *
 * WHAT IS STILL NOT PERFECT, stated rather than hidden: between our resolve
 * and the runtime's own resolve inside `fetch`, a DNS answer could change
 * (a "DNS rebinding" race). Closing that needs a fetch pinned to an address we
 * chose, which `undici` can do with a custom dispatcher but the platform fetch
 * cannot. The window is small and the payoff for an attacker is a single GET
 * with no credentials attached, so this is an accepted risk rather than an
 * unnoticed one.
 */

export type FetchedPage = {
  /** The URL actually fetched, after any redirects. */
  url: string;
  status: number;
  contentType: string | null;
  html: string;
  /** True when the body hit the cap and was cut short. */
  truncated: boolean;
};

export type FetchFailure = { error: string };

const TIMEOUT_MS = 6000;
const MAX_BYTES = 2 * 1024 * 1024;   // 2MB
const MAX_HOPS = 2;

/* Truthful, and pointed at a page that explains who we are. A tool that reads
   somebody's site should say so: a fake browser string here would be us
   pretending to be a visitor while automating. */
const USER_AGENT =
  "WDCBot/1.0 (+https://wedigcreativity.com.ng/tools; free site checker; one page per request)";

/** Everything that must never be connected to. */
function isForbiddenAddress(ip: string): boolean {
  const v = isIP(ip);

  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 0) return true;                            // this network
    if (a === 10) return true;                           // private
    if (a === 127) return true;                          // loopback
    if (a === 169 && b === 254) return true;             // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;    // private
    if (a === 192 && b === 168) return true;             // private
    if (a === 192 && b === 0) return true;               // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true;   // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true;                           // multicast and reserved
    return false;
  }

  if (v === 6) {
    const s = ip.toLowerCase().split("%")[0];
    if (s === "::" || s === "::1") return true;          // unspecified, loopback
    if (s.startsWith("fe8") || s.startsWith("fe9")
      || s.startsWith("fea") || s.startsWith("feb")) return true;  // link-local
    if (s.startsWith("fc") || s.startsWith("fd")) return true;      // unique local
    if (s.startsWith("ff")) return true;                            // multicast
    /* IPv4 mapped and embedded forms, which would otherwise smuggle a private
       v4 address through the v6 branch untouched. */
    const tail = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
    if (tail) return isForbiddenAddress(tail[1]);
    if (s.startsWith("64:ff9b")) return true;            // NAT64
    return false;
  }

  return true;  // not an address we can judge, so not one we will connect to
}

/**
 * Parse, check the scheme, resolve the host, and judge every address it has.
 *
 * ALL of them, not the first: a name with one public and one private A record
 * would otherwise pass here and connect to the private one.
 */
async function assertSafe(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That does not look like a web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https addresses can be checked.");
  }
  /* Credentials in a URL are only ever there to confuse something. */
  if (url.username || url.password) {
    throw new Error("That address cannot contain a username or password.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (isForbiddenAddress(host)) throw new Error("That address is not reachable from here.");
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new Error("That domain does not resolve.");
  }
  if (addresses.length === 0) throw new Error("That domain does not resolve.");
  if (addresses.some((a) => isForbiddenAddress(a.address))) {
    throw new Error("That address is not reachable from here.");
  }
  return url;
}

/** Read the body with a hard ceiling, so a hostile server cannot stream forever. */
async function readCapped(response: Response): Promise<{ html: string; truncated: boolean }> {
  const body = response.body;
  if (!body) return { html: "", truncated: false };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        chunks.push(value.subarray(0, value.byteLength - (total - MAX_BYTES)));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    /* Cancel rather than leave the socket draining in the background once we
       have what we asked for. */
    await reader.cancel().catch(() => {});
  }

  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let at = 0;
  for (const c of chunks) { merged.set(c, at); at += c.byteLength; }
  return { html: new TextDecoder("utf-8", { fatal: false }).decode(merged), truncated };
}

/**
 * One page. One fetch. Never a crawl.
 *
 * Redirects are followed by hand (`redirect: "manual"`) so that each hop goes
 * back through `assertSafe`. `redirect: "follow"` would let a public URL bounce
 * to 169.254.169.254 with nothing looking at the second address.
 */
export async function fetchPage(raw: string): Promise<FetchedPage | FetchFailure> {
  try {
    let url = await assertSafe(raw);

    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const response = await fetch(url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en",
        },
        cache: "no-store",
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { error: "That page redirected to nowhere." };
        if (hop === MAX_HOPS) return { error: "That page redirects too many times." };
        /* Resolved against the CURRENT url so a relative Location works, then
           put through every check again from scratch. */
        url = await assertSafe(new URL(location, url).toString());
        continue;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
        return { error: "That address is not a web page." };
      }

      const { html, truncated } = await readCapped(response);
      return { url: url.toString(), status: response.status, contentType, html, truncated };
    }

    return { error: "That page redirects too many times." };
  } catch (problem) {
    if (problem instanceof Error && problem.name === "TimeoutError") {
      return { error: "That page took too long to answer." };
    }
    return { error: problem instanceof Error ? problem.message : "That page could not be read." };
  }
}
