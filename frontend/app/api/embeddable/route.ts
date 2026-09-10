import { NextResponse } from "next/server";
import { PROJECTS } from "@/lib/projects";

/**
 * Can this site be put in an iframe?
 *
 * WHY THIS HAS TO BE ON THE SERVER. The browser cannot answer it. A frame that
 * Chrome refuses on `X-Frame-Options` or CSP `frame-ancestors` renders an error
 * page that is ALSO cross-origin, so every client-side signal a refused frame
 * gives is identical to the one a working frame gives: `load` fires, reading
 * `contentWindow.location` throws, `contentDocument` is null. The modal's old
 * heuristic called that "embedded" and painted the browser's own grey
 * "refused to connect" over a perfectly good screenshot. Measured with a
 * stubbed `X-Frame-Options: DENY`, it reported LIVE.
 *
 * From here the headers are simply readable. One HEAD request, the two headers
 * that decide it, and a cached yes or no.
 *
 * SSRF. A route that fetches a URL supplied by the caller is the textbook
 * version of that hole, so this one does not accept URLs — it accepts a URL
 * that must already be in PROJECTS, compared by origin, and refuses everything
 * else. There is no input here that can reach an address we did not ship.
 */

/** Origins we will look at, from the work catalogue. Nothing else. */
const ALLOWED = new Set(
  PROJECTS.map((p) => {
    try { return new URL(p.url).origin; } catch { return ""; }
  }).filter(Boolean),
);

/** `frame-ancestors 'none'` and `'self'` both mean "not from our domain". */
function cspRefuses(csp: string | null): boolean {
  if (!csp) return false;
  const m = /frame-ancestors([^;]*)/i.exec(csp);
  if (!m) return false;
  const v = m[1].trim().toLowerCase();
  if (!v) return false;
  if (v.includes("'none'")) return true;
  // Only `self` listed, and we are not it.
  return v === "'self'";
}

function xfoRefuses(xfo: string | null): boolean {
  if (!xfo) return false;
  const v = xfo.trim().toLowerCase();
  return v === "deny" || v === "sameorigin";
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return NextResponse.json({ ok: false, reason: "no-url" }, { status: 400 });

  let origin: string;
  try { origin = new URL(url).origin; }
  catch { return NextResponse.json({ ok: false, reason: "bad-url" }, { status: 400 }); }

  if (!ALLOWED.has(origin)) {
    return NextResponse.json({ ok: false, reason: "not-ours" }, { status: 403 });
  }

  try {
    /* HEAD, not GET: the headers are the whole answer and there is no reason to
       pull a megabyte of HTML to read two of them. A 6s ceiling because this
       runs in parallel with the frame — if it has not answered by then the
       frame's own result is the better signal anyway. */
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "WeDigCreativity-embed-check" },
    });

    /* A non-OK response is not an answer about framing policy. A 404, a 500,
       or a 403 from a proxy between us and the site all arrive with no
       `X-Frame-Options` header, and reading that absence as "nothing refuses
       us, therefore embeddable" is how a blocked request becomes a green
       light. Caught in testing: the sandbox's egress proxy answered 403 and
       this route replied `embeddable: true`. Unknown is the honest answer —
       the client then falls back to what the frame itself does. */
    if (!res.ok) {
      return NextResponse.json({ embeddable: null, reason: "http", status: res.status });
    }

    const refuses =
      xfoRefuses(res.headers.get("x-frame-options")) ||
      cspRefuses(res.headers.get("content-security-policy"));

    return NextResponse.json(
      { embeddable: !refuses, status: res.status },
      /* A site's framing policy does not change hour to hour, and this is the
         thing standing between a click and a preview. An hour on the edge with
         a day of stale-while-revalidate means the second visitor never waits
         for it at all. */
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    /* Unreachable, or timed out. "unknown" rather than "no": the modal falls
       back to its own heuristic instead of us declaring a site unframeable
       because our own network had a bad moment. */
    return NextResponse.json({ embeddable: null, reason: "unreachable" });
  }
}
