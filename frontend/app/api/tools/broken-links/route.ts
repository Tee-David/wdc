import { NextResponse, type NextRequest } from "next/server";
import { checkLink, fetchPage, type FetchPageFailure } from "@/lib/fetch-page";
import { extractLinks, verdictFor, type LinkVerdict } from "@/lib/broken-links";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * The single-page broken-link check at /tools/broken-links.
 *
 * ONE PAGE, NOT A CRAWL. `lib/fetch-page.ts` fetches the page a visitor
 * pasted; every link found on it is then checked once, in parallel, bounded
 * by `LINK_LIMIT`. Nothing here follows a link found on a link -- that is a
 * site crawler, a different and much more expensive tool, and not what this
 * page promises.
 *
 * CLASS A: one HTTP fetch per link, no key, no meter, nobody to bill us. The
 * cost that matters here is TIME, not money, which is why the link count and
 * the per-link timeout are both capped rather than one being generous because
 * the other is free.
 *
 * NODE RUNTIME, EXPLICITLY: `lib/fetch-page.ts`'s SSRF guard resolves names
 * with `node:dns`.
 */
export const runtime = "nodejs";
export const maxDuration = 45;

const LIMIT = 6;
const WINDOW_MS = 60_000;
const LINK_LIMIT = 25;
const CONCURRENCY = 8;

export type CheckedLink = {
  href: string;
  text: string;
  external: boolean;
  verdict: LinkVerdict;
  status: number | null;
  redirected: boolean;
  note: string;
};

type Answer = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  total: number;
  truncated: boolean;
  links: CheckedLink[];
};

function explainPage(reason: FetchPageFailure, status?: number) {
  switch (reason) {
    case "bad-url":
      return "That does not look like a web address. Paste the whole thing, including https://.";
    case "blocked-scheme":
    case "blocked-port":
    case "blocked-host":
      return "We only fetch ordinary public web pages, and that address is not one.";
    case "too-many-redirects":
      return "That URL redirects more than twice. Paste the address it ends up at.";
    case "timeout":
      return "The page took longer than six seconds to answer.";
    case "too-large":
      return "That page's HTML alone is over 2MB, which is too large to scan here.";
    case "not-html":
      return "That address is a file rather than a page, so there are no links to read.";
    case "http-error":
      return status === 404
        ? "That page returned a 404. Check the address."
        : `The site answered with an error (${status ?? "no status"}).`;
    default:
      return "We could not reach that page just now.";
  }
}

function explainLink(reason: FetchPageFailure): string {
  switch (reason) {
    case "blocked-host":
      return "Points somewhere we don't fetch (private, local, or non-standard port).";
    case "timeout":
      return "Did not answer within six seconds.";
    case "too-many-redirects":
      return "Redirects more than twice.";
    case "network":
      return "The address did not resolve or refused the connection.";
    default:
      return "Could not be checked.";
  }
}

async function checkOne(link: { href: string; text: string; external: boolean }): Promise<CheckedLink> {
  const result = await checkLink(link.href);
  if (!result.ok) {
    if (result.reason === "http-error" && typeof result.status === "number") {
      return {
        ...link,
        verdict: verdictFor(result.status),
        status: result.status,
        redirected: false,
        note: `Answered with ${result.status}.`,
      };
    }
    return { ...link, verdict: "unverified", status: null, redirected: false, note: explainLink(result.reason) };
  }
  return {
    ...link,
    verdict: verdictFor(result.status),
    status: result.status,
    redirected: result.redirected,
    note: result.redirected ? `Redirects, then answers with ${result.status}.` : `Answers with ${result.status}.`,
  };
}

/** Runs the checks `CONCURRENCY` at a time rather than all 25 at once, which
 *  is friendlier to the site being checked and to our own function's memory. */
async function checkAll(links: { href: string; text: string; external: boolean }[]) {
  const results: CheckedLink[] = new Array(links.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= links.length) return;
      results[i] = await checkOne(links[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, links.length) }, worker));
  return results;
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-broken-links"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before checking another page." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const typed = (body as { url?: unknown })?.url;
  const raw = typeof typed === "string" ? typed.trim().slice(0, 2_000) : "";
  if (!raw) return NextResponse.json({ error: "Paste the page you want checked." }, { status: 400 });

  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  const page = await fetchPage(url);
  if (!page.ok) {
    return NextResponse.json({ error: explainPage(page.reason, page.status) }, { status: 422 });
  }

  const found = extractLinks(page.html, page.url, LINK_LIMIT + 1);
  const truncated = found.length > LINK_LIMIT;
  const toCheck = found.slice(0, LINK_LIMIT);
  const links = await checkAll(toCheck);

  const answer: Answer = {
    url,
    finalUrl: page.url,
    redirected: page.redirects.length > 0,
    total: links.length,
    truncated,
    links,
  };

  return NextResponse.json(answer, { headers: { "cache-control": "no-store" } });
}
