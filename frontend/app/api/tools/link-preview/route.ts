import { NextResponse, type NextRequest } from "next/server";
import { fetchPage, probeImage, type FetchPageFailure } from "@/lib/fetch-page";
import {
  REVIEWED, cardsFor, findingsFor, readTags, type Card, type Finding, type ImageFacts,
} from "@/lib/link-preview";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * The link preview checker behind /tools/link-preview.
 *
 * NODE RUNTIME, EXPLICITLY, for the same reason the email check is: the SSRF
 * guards in `lib/fetch-page.ts` resolve names with `node:dns`, which the edge
 * runtime does not have. Losing them is not an option, so the runtime is
 * named rather than inferred.
 *
 * TWO REQUESTS AT MOST, AND THE SECOND IS OPTIONAL. The page, then the
 * og:image if the page names one. The image probe is best effort: an image we
 * cannot read is reported as unread rather than as wrong, because a CDN that
 * refuses our user agent is a fact about the CDN and not about their tags.
 *
 * WHAT THIS ENDPOINT WILL NOT DO. It does not crawl, does not follow a link in
 * the body, does not render JavaScript. A site whose tags are injected by a
 * client-side framework will read as empty here -- which is exactly what
 * Facebook's and WhatsApp's own scrapers will see, so it is the true answer
 * rather than a limitation to apologise for.
 */
export const runtime = "nodejs";
export const maxDuration = 20;

const LIMIT = 10;
const WINDOW_MS = 60_000;

/* Tags do not change minute to minute, and somebody pressing the button twice
   should not cost two fetches of a stranger's site. Per-instance, like the
   other caches in this project, and honest about that. */
const CACHE_MS = 5 * 60_000;

type Answer = {
  url: string;
  finalUrl: string;
  redirected: boolean;
  reviewed: string;
  tags: ReturnType<typeof readTags>;
  image: ImageFacts | null;
  cards: Card[];
  findings: Finding[];
};

const cache = new Map<string, { at: number; answer: Answer }>();

/**
 * A failure, in the reader's terms.
 *
 * NAMED ONE BY ONE rather than collapsed into "something went wrong", because
 * three of these are things the reader can fix in a minute and one of them --
 * `blocked-host` -- is us refusing on purpose and should say so plainly rather
 * than looking like a bug.
 */
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
      return "The page took too long to answer. A scraper gives it about the same patience we just did.";
    case "too-large":
      return "That page is enormous — too big for us to read, and slow for anyone you send it to.";
    case "not-html":
      return "That address is a file rather than a page, so there is nothing to unfurl.";
    case "http-error":
      return status === 404
        ? "That page returned a 404, so a shared link would show nothing at all."
        : `The site answered with an error (${status ?? "no status"}). A scraper would get the same.`;
    default:
      return "We could not reach that page just now.";
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(callerKey(request, "tools-link-preview"), LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Please wait a moment before checking another link." },
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
  if (!raw) {
    return NextResponse.json({ error: "Paste a link to check." }, { status: 400 });
  }

  /* MOST PEOPLE PASTE A BARE DOMAIN. `readUrl` refuses anything without a
     scheme, correctly, so the friendlier thing is to assume the one every
     site should be on rather than to teach a stranger about schemes. */
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json(hit.answer, { headers: { "cache-control": "no-store" } });
  }

  const page = await fetchPage(url);
  if (!page.ok) {
    return NextResponse.json({ error: explain(page.reason, page.status) }, { status: 422 });
  }

  const tags = readTags(page.html, page.url);

  let image: ImageFacts | null = null;
  if (tags.image) {
    const probe = await probeImage(tags.image);
    image = probe.ok
      ? {
          url: tags.image,
          bytes: probe.bytes,
          width: probe.width,
          height: probe.height,
          contentType: probe.contentType,
        }
      : /* Reported as unread, never as absent: the tag is there, and telling
           somebody their image is missing when their CDN simply refused us
           would send them looking for a fault that is not theirs. */
        { url: tags.image, bytes: null, width: null, height: null, contentType: null };
  }

  const answer: Answer = {
    url,
    finalUrl: page.url,
    redirected: page.redirects.length > 0,
    reviewed: REVIEWED,
    tags,
    image,
    cards: cardsFor(tags, image, page.url),
    findings: findingsFor(tags, image),
  };

  cache.set(url, { at: Date.now(), answer });
  return NextResponse.json(answer, { headers: { "cache-control": "no-store" } });
}
