import { isIP } from "node:net";

/**
 * The rules that decide whether a URL a stranger typed is safe to fetch.
 *
 * SEPARATE FROM `fetch-page.ts` FOR ONE REASON: everything here is pure, so it
 * can be run by `npm run check:fetch-page` in plain Node without a bundler.
 * The fetching half imports `server-only`, which does not resolve outside
 * Next, and a security guard that cannot be exercised directly is a security
 * guard nobody exercises. See `lib/fetch-page.ts` for the doctrine these rules
 * serve.
 */


const toLong = (ip: string) =>
  ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);

/** IPv4 ranges that are not the public internet. */
const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],          // this network
  ["10.0.0.0", 8],         // private
  ["100.64.0.0", 10],      // CGNAT
  ["127.0.0.0", 8],        // loopback
  ["169.254.0.0", 16],     // link-local, and the cloud metadata address
  ["172.16.0.0", 12],      // private
  ["192.0.0.0", 24],       // IETF protocol assignments
  ["192.0.2.0", 24],       // documentation
  ["192.88.99.0", 24],     // 6to4 relay anycast
  ["192.168.0.0", 16],     // private
  ["198.18.0.0", 15],      // benchmarking
  ["198.51.100.0", 24],    // documentation
  ["203.0.113.0", 24],     // documentation
  ["224.0.0.0", 4],        // multicast
  ["240.0.0.0", 4],        // reserved, includes 255.255.255.255
];

export function v4IsPublic(ip: string) {
  const value = toLong(ip);
  return !V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (-1 << (32 - bits)) >>> 0;
    return (value & mask) === (toLong(base) & mask);
  });
}

export function v6IsPublic(raw: string) {
  const ip = raw.toLowerCase().split("%")[0];

  /* AN IPv4 ADDRESS WEARING AN IPv6 COAT. `::ffff:127.0.0.1` and its hex
     spelling both reach loopback, and a v6-shaped string that is never handed
     to the v4 checker is how that gets missed. */
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return v4IsPublic(mapped[1]);

  if (ip === "::" || ip === "::1") return false;
  if (/^f[cd]/.test(ip)) return false;          // fc00::/7 unique local
  if (/^fe[89ab]/.test(ip)) return false;       // fe80::/10 link-local
  if (/^ff/.test(ip)) return false;             // ff00::/8 multicast
  if (ip.startsWith("2002:")) return false;     // 6to4, can wrap a private v4
  if (ip.startsWith("64:ff9b:")) return false;  // NAT64
  if (ip.startsWith("::ffff:")) return false;   // mapped, but not dotted: refuse
  return true;
}

export function addressIsPublic(ip: string) {
  const family = isIP(ip);
  if (family === 4) return v4IsPublic(ip);
  if (family === 6) return v6IsPublic(ip);
  return false;
}

/* -------------------------------------------------------------------- input */

export type UrlFailure = "bad-url" | "blocked-scheme" | "blocked-port";

/** http and https on a normal web port, with nothing smuggled in the userinfo. */
export function readUrl(raw: string): URL | UrlFailure {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return "bad-url";

  let url: URL;
  try {
    /* Somebody typing a domain means https, and refusing them over a missing
       scheme is a tool being pedantic at the reader's expense. */
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return "bad-url";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "blocked-scheme";
  /* `http://user:pass@internal/` is a classic way to make a URL read as one
     host to a human and resolve as another. We have no use for credentials. */
  if (url.username || url.password) return "bad-url";
  if (url.port && url.port !== "80" && url.port !== "443") return "blocked-port";
  if (!url.hostname) return "bad-url";
  return url;
}
