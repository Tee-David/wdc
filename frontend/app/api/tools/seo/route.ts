import { NextResponse, type NextRequest } from "next/server";
import { fetchPage, type FetchPageFailure } from "@/lib/fetch-page";
import { findings, headline, read, type Facts, type Finding } from "@/lib/seo-audit";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

/**
 * The instant half of /tools/seo: one fetch, read, answered.
 *
 * NOTHING METERED HAPPENS HERE. This endpoint is Class A and always available;
 * the Lighthouse run lives behind `./report`, where an address has been given
 * and the work can go behind the response. Keeping them apart is what lets the
 * page show a complete answer in about a second and ask for an email
 * afterwards rather than before.
 *
 * NODE RUNTIME, EXPLICITLY: the SSRF guards resolve names with `node:dns`.
 */
export const runtime = "nodejs";
export const maxDuration = 20;

const LIMIT = 10;
const WINDOW_MS = 60_000;
const CACHE_MS = 5 * 60_000;

type Answer = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  facts: Facts;
  findings: Finding[];
  headline: string;
  /** Our own homepage, measured the same way, or null when we could not read
   *  it. A comparison is only worth showing when both halves are real. */
  ours: { url: string; bytes: number } | null;
};

const cache = new Map<string, { at: number; answer: Answer }>();

/**
 * OUR OWN NUMBER, FETCHED RATHER THAN REMEMBERED.
 *
 * The data-cost panel compares their page with ours, and a hard-coded figure
 * for ours would be a claim that goes stale the first time we ship a change --
 * the sort of number that is quietly wrong for a year. So it is measured with
 * the same fetcher, on the same terms, and held for six hours per instance:
 * our homepage does not change between lunch and dinner, and the comparison
 * must never cost a visitor's request a second round trip to us.
 *
 * IT IS LIKE FOR LIKE OR IT IS NOTHING. Both figures are the HTML document
 * alone, because that is all one fetch can honestly measure. Everything that
 * shows either number says so.
 */
let ours: { at: number; value: { url: string; bytes: number } | null } | null = null;
const OURS_MS = 6 * 60 * 60 * 1000;

async function ourWeight() {
  if (ours && Date.now() - ours.at < OURS_MS) return ours.value;
  const page = await fetchPage(SITE_URL);
  const value = page.ok ? { url: SITE_URL, bytes: page.bytes } : null;
  ours = { at: Date.now(), value };
  return value;
}

function explain(reason: FetchPageFailure, status?: number) {
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
      return "The page took longer than six seconds to answer, which is itself the finding: Google gives it about the same patience.";
    case "too-large":
      return "That page's HTML alone is over 2MB, which is the finding. Nothing we could say about its tags matters beside that.";
    case "not-html":
      return "That address is a file rather than a page, so there is nothing to read.";
    case "http-error":
      return status === 404
        ? "That page returned a 404. Check the address; a page Google cannot fetch cannot rank."
        : `The site answered with an error (${status ?? "no status"}). Googlebot would get the same.`;
    default:
      return "We could not reach that page just now.";
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-seo"), LIMIT, WINDOW_MS);
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

  /* A bare domain is what people paste, and refusing it to teach them about
     schemes helps nobody. */
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json(hit.answer, { headers: { "cache-control": "no-store" } });
  }

  const page = await fetchPage(url);
  if (!page.ok) {
    return NextResponse.json({ error: explain(page.reason, page.status) }, { status: 422 });
  }

  const facts = read(page.html, page.url, page.bytes);
  const list = findings(facts);

  const answer: Answer = {
    url,
    finalUrl: page.url,
    redirected: page.redirects.length > 0,
    facts,
    findings: list,
    headline: headline(list),
    ours: await ourWeight(),
  };

  cache.set(url, { at: Date.now(), answer });
  return NextResponse.json(answer, { headers: { "cache-control": "no-store" } });
}
