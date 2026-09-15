import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { addressIsPublic, readUrl, type UrlFailure } from "./net-guard";
import { imageSizeFromBytes } from "./image-size";

/**
 * Fetches ONE page at a URL a stranger typed into a box.
 *
 * WHY THIS IS ITS OWN MODULE. Two tools want it (the on-page SEO snapshot and
 * the link preview checker) and it is the single most dangerous thing either
 * of them does. `app/api/embeddable` states the doctrine for the easy case: it
 * refuses to accept a URL at all and only looks at origins already in the work
 * catalogue. Here the URL is genuinely arbitrary, which is the hard case, so
 * the rules live in one audited place rather than being written twice.
 *
 * SERVER-SIDE REQUEST FORGERY IS THE WHOLE PROBLEM. Our server sits inside a
 * network the visitor cannot reach. Left alone, "fetch this URL for me" is an
 * invitation to read a cloud metadata endpoint, a database admin page on
 * localhost, or anything else on the private side. So:
 *
 *   - http and https only. No file:, no gopher:, no data:.
 *   - EVERY address the host resolves to is checked before a socket opens,
 *     not just the first. A name with one public A record and one 127.0.0.1
 *     record is a real technique, and checking only `[0]` walks into it.
 *   - Redirects are followed BY HAND, at most twice, and each hop is
 *     re-validated from scratch. `redirect: "follow"` would let a public URL
 *     bounce us to 169.254.169.254 with nothing to say about it.
 *   - Odd ports are refused. Public web servers answer on 80 and 443; the
 *     interesting internal things listen on 6379, 8080, 9200 and friends.
 *   - One page, one fetch. This never crawls, never follows a link in the
 *     body, and never looks at robots for permission it is not asking for.
 *
 * THE HOLE THAT IS LEFT, said plainly rather than papered over. Between our
 * DNS check and `fetch`'s own resolution, an attacker who controls a name
 * server with a one-second TTL can answer twice: public for us, private for
 * the socket. Closing it properly means pinning the connection to the address
 * we validated, which needs a custom undici dispatcher, and undici is not a
 * dependency of this project. The residual risk is a narrow, actively-mounted
 * attack against a tool that returns a page's own title and headings; it is
 * documented here so the next person can weigh it rather than discover it.
 *
 * NOTHING HERE PARSES HTML. It returns text and the caller decides. A fetcher
 * that also interprets is two jobs, and the interpreting half is the one that
 * changes.
 */

/** 6 seconds for everything, redirects included. Not 6 per hop. */
const DEADLINE_MS = 6_000;
/** Two hops. A third is either a loop or a site with a problem of its own. */
const MAX_REDIRECTS = 2;
/** 2MB. The largest honest HTML document is a fraction of this. */
const MAX_BYTES = 2 * 1024 * 1024;

/** Truthful, and it says who to complain to. A fetcher that lies about being
    a browser is one somebody eventually blocks the whole company for. */
const USER_AGENT =
  "WeDigCreativityBot/1.0 (+https://wedigcreativity.com.ng; one page per request, on a visitor's explicit request)";

export type FetchPageFailure =
  | UrlFailure
  | "blocked-host"
  | "too-many-redirects"
  | "timeout"
  | "too-large"
  | "not-html"
  | "http-error"
  | "network";

export type FetchPageResult =
  | {
      ok: true;
      /** Where we ended up, which is not always where we were sent. */
      url: string;
      status: number;
      html: string;
      bytes: number;
      contentType: string;
      /** Every hop taken, so a caller can say "that redirected to X". */
      redirects: string[];
    }
  | { ok: false; reason: FetchPageFailure; status?: number };

/**
 * True only if every address this host resolves to is on the public internet.
 *
 * EVERY, NOT THE FIRST. A name can carry several A records, and a hostile one
 * carries a public address and a private one so that whichever is picked, the
 * check passed. `all: true` is the whole point of this function.
 */
async function hostIsPublic(hostname: string) {
  /* A literal address skips DNS entirely, and must still be checked: nothing
     stops somebody typing http://127.0.0.1/ straight into the box. */
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare)) return addressIsPublic(bare);

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((r) => addressIsPublic(r.address));
  } catch {
    /* A name that will not resolve is not a name we fetch. Failing closed
       here costs a visitor an error message; failing open costs everything. */
    return false;
  }
}

/* --------------------------------------------------------------- the journey */

/**
 * Walks the redirects and hands back the response at the end of them.
 *
 * EXTRACTED SO THERE IS STILL ONE AUDITED PATH. The link preview checker needs
 * a second kind of fetch -- the og:image, to say whether it is the size and
 * weight the platforms want -- and the alternative to this was a second copy
 * of the hop loop in another function. Two copies of an SSRF guard is one copy
 * that gets fixed and one that does not.
 *
 * The caller decides what it will accept and what it does with the body; every
 * rule at the top of this file is applied here regardless.
 */
async function walk(
  input: string,
  accept: string,
  signal: AbortSignal,
): Promise<
  | { ok: true; response: Response; url: URL; redirects: string[] }
  | { ok: false; reason: FetchPageFailure; status?: number }
> {
  const first = readUrl(input);
  if (typeof first === "string") return { ok: false, reason: first };

  const redirects: string[] = [];
  let url = first;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!(await hostIsPublic(url.hostname))) return { ok: false, reason: "blocked-host" };

    let response: Response;
    try {
      response = await fetch(url, {
        /* BY HAND. `follow` would re-resolve and re-connect with none of the
           checks above applied to wherever it landed. */
        redirect: "manual",
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept,
          "accept-language": "en",
        },
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { ok: false, reason: timedOut ? "timeout" : "network" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      /* Read the body so the socket is released rather than left hanging. */
      await response.body?.cancel().catch(() => {});
      if (!location) return { ok: false, reason: "http-error", status: response.status };
      if (hop === MAX_REDIRECTS) return { ok: false, reason: "too-many-redirects" };

      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        return { ok: false, reason: "bad-url" };
      }
      /* THE HOP GOES THROUGH THE SAME DOOR AS THE ORIGINAL. Scheme, port and
         credentials are re-checked; the host is re-resolved at the top of the
         next iteration. */
      const checked = readUrl(next.toString());
      if (typeof checked === "string") return { ok: false, reason: checked };
      redirects.push(next.toString());
      url = checked;
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return { ok: false, reason: "http-error", status: response.status };
    }

    return { ok: true, response, url, redirects };
  }

  return { ok: false, reason: "too-many-redirects" };
}

/**
 * Reads a body up to a cap, enforcing it WHILE READING.
 *
 * Not by trusting Content-Length: a server can declare 1KB and send a
 * gigabyte, and `await response.text()` would happily hold all of it.
 */
async function readCapped(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    await response.body?.cancel().catch(() => {});
    return { ok: false as const, reason: "too-large" as const };
  }

  const reader = response.body?.getReader();
  if (!reader) return { ok: true as const, bytes: new Uint8Array(0) };

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false as const, reason: "too-large" as const };
      }
      chunks.push(value);
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { ok: false as const, reason: timedOut ? ("timeout" as const) : ("network" as const) };
  }

  const buffer = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { buffer.set(chunk, at); at += chunk.byteLength; }
  return { ok: true as const, bytes: buffer };
}

/* ------------------------------------------------------------------- fetch */

export async function fetchPage(input: string): Promise<FetchPageResult> {
  /* ONE DEADLINE FOR THE WHOLE JOURNEY. A per-hop timeout means three hops can
     legitimately take eighteen seconds, which is not a tool anybody waits for
     and is long enough to be worth pointing at us for fun. */
  const signal = AbortSignal.timeout(DEADLINE_MS);
  const walked = await walk(input, "text/html,application/xhtml+xml", signal);
  if (!walked.ok) return walked;

  const { response, url, redirects } = walked;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
    await response.body?.cancel().catch(() => {});
    return { ok: false, reason: "not-html", status: response.status };
  }

  const body = await readCapped(response, MAX_BYTES);
  if (!body.ok) return { ok: false, reason: body.reason, status: response.status };

  return {
    ok: true,
    url: url.toString(),
    status: response.status,
    /* `fatal: false`, so a page with one bad byte still reads rather than
       throwing. We are looking at titles and headings, not verifying an
       encoding. */
    html: new TextDecoder("utf-8", { fatal: false }).decode(body.bytes),
    bytes: body.bytes.byteLength,
    contentType,
    redirects,
  };
}

/* ------------------------------------------------------------------- image */

/**
 * Enough of an og:image to say whether it will render.
 *
 * WHY THE WHOLE FILE AND NOT A HEAD REQUEST. The question is "how many
 * kilobytes is this", because WhatsApp drops anything over 300KB, and a
 * Content-Length is a claim rather than a measurement -- plenty of CDNs omit
 * it on a compressed response. So the bytes are counted as they arrive, and
 * the read stops at a cap: anything past 2MB is already far past every
 * platform's ceiling, and the exact figure stops mattering once the answer is
 * "too big".
 *
 * IT RETURNS FACTS, NOT A VERDICT. `lib/link-preview.ts` decides what they
 * mean, and it is the pure module a check script can run.
 */
export type ImageProbe =
  | { ok: true; bytes: number; width: number | null; height: number | null; contentType: string; truncated: boolean }
  | { ok: false; reason: FetchPageFailure; status?: number };

/** Past this we stop counting and say so, rather than holding a video in
    memory because somebody pointed og:image at one. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function probeImage(input: string): Promise<ImageProbe> {
  const signal = AbortSignal.timeout(DEADLINE_MS);
  const walked = await walk(input, "image/*", signal);
  if (!walked.ok) return walked;

  const { response } = walked;
  const contentType = response.headers.get("content-type") ?? "";

  const body = await readCapped(response, MAX_IMAGE_BYTES);
  if (!body.ok) {
    /* Over the cap is an answer rather than a failure: it is enormous, which
       is the only thing the caller needed to know. */
    if (body.reason === "too-large") {
      return { ok: true, bytes: MAX_IMAGE_BYTES, width: null, height: null, contentType, truncated: true };
    }
    return { ok: false, reason: body.reason, status: response.status };
  }

  return {
    ok: true,
    bytes: body.bytes.byteLength,
    /* The header parser is the one `next/image`'s sizing already leans on. It
       reads PNG, JPEG, GIF and WebP, and returns null rather than guessing at
       anything else -- an SVG social image has no pixel size to read, and
       saying so is more use than inventing one. */
    ...(imageSizeFromBytes(body.bytes) ?? { width: null, height: null }),
    contentType,
    truncated: false,
  };
}
