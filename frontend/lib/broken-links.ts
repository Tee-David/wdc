/**
 * The on-page half of the single-page broken-link check at /tools/broken-links:
 * reading `<a href>` out of one page's HTML.
 *
 * REGEX AND NOT A PARSER, for the same reason as `lib/seo-audit.ts`: a
 * handful of tags out of one document, and a dependency whose job is to be
 * lenient about hostile markup is not worth adding for it.
 *
 * PURE, so `scripts/check-broken-links.mjs` runs it without a browser or a
 * network. Actually fetching each link and following redirects is the
 * dangerous half -- a URL a stranger's page points at is exactly as
 * untrusted as one they typed themselves -- so that lives in
 * `lib/fetch-page.ts`, the one audited SSRF-guarded path, alongside the page
 * fetch this reads.
 */

export type PageLink = {
  href: string;
  text: string;
  /** A different host to the page that linked to it. Mail, phone and
   *  in-page anchors never reach here at all -- there is nothing to check. */
  external: boolean;
};

const SKIP_SCHEMES = /^(mailto|tel|sms|javascript|data|blob|ftp):/i;

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
}

function decode(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function tidy(value: string) {
  return decode(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Every distinct, checkable link on the page, in document order, capped at
 * `limit` so a page with a thousand links cannot turn a free tool into a
 * crawl -- the same reasoning as the redirect cap in `lib/fetch-page.ts`.
 *
 * A `#section` link, a `mailto:`, and a bare `#` are not broken links; they
 * are not links this tool can answer anything about, so they never enter the
 * list rather than being reported as skipped one by one.
 */
export function extractLinks(html: string, baseUrl: string, limit = 40): PageLink[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const tags = [...html.matchAll(/<a\b[^>]*href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)[^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set<string>();
  const links: PageLink[] = [];

  for (const match of tags) {
    if (links.length >= limit) break;

    const raw = attr(match[0], "href");
    if (!raw || raw.startsWith("#") || SKIP_SCHEMES.test(raw)) continue;

    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;

    resolved.hash = "";
    const key = resolved.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    const text = tidy(match[1]) || raw;
    links.push({
      href: key,
      text: text.length > 80 ? `${text.slice(0, 79)}…` : text,
      external: resolved.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, ""),
    });
  }

  return links;
}

export type LinkVerdict = "ok" | "broken" | "unverified";

/** A status code from `lib/fetch-page.ts` becomes one of three words a
 *  reader can act on, not a number they have to already know the meaning
 *  of. `checkLink` already walks redirects itself, so a successful check
 *  never hands back a 3xx here -- only the 2xx it landed on. */
export function verdictFor(status: number | null): LinkVerdict {
  if (status === null) return "unverified";
  return status >= 200 && status < 300 ? "ok" : "broken";
}
