import Script from "next/script";

/**
 * Jotform owns the launcher and the conversation UI completely.
 *
 * Do not wrap, resize, reposition, observe, or replace its FAB: the embed's
 * configuration is the source of truth and places its native launcher itself.
 * `afterInteractive` keeps the third-party script out of the server-rendering
 * path while ensuring the launcher appears without requiring a click on a
 * separate WDC control first.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A DELIBERATE, INFORMED CHOICE BY THE OWNER. DO NOT "OPTIMISE" IT
 * BACK WITHOUT ASKING THEM FIRST.
 *
 * Two cheaper versions of this component have already been built and removed:
 * a facade that loaded this same script on click, and a wrapper that framed
 * `jotform.com/agent/<id>` directly and never loaded the runtime at all. Both
 * were faster. Both were rejected, because neither is the vendor widget 1:1 --
 * framing the agent means WE own the launcher and the panel shell, and it
 * loses Jotform's auto-open, their greeting-bubble animation, and the
 * picture-in-picture handoff their loader wires up for voice calls.
 *
 * What that costs, measured with real requests rather than estimated:
 *
 *  - `embed.js` itself is 3,263 bytes, but it is served `no-cache` with
 *    `cf-cache-status: BYPASS`, and it took 10.7s to arrive on a real
 *    connection. Its only job is to append the runtime below and call
 *    `AgentInitializer.init()`.
 *  - that runtime, `www.jotform.com/s/umd/<hash>/for-embedded-agent.js`, is
 *    6,295,207 bytes and is served UNCOMPRESSED. Requested twice, once with
 *    `Accept-Encoding: gzip, br` and once with `--compressed`: both came back
 *    with no `content-encoding` header at all. There is no query parameter or
 *    account setting that turns compression on.
 *  - Lighthouse against this embed attributed 10,096ms of blocking time to
 *    `jotform.com`, against 0ms for `jotfor.ms` (the agent's own iframe). All
 *    of the cost is this parent-side bundle; none of it is the conversation.
 *  - the `embed.js` RESPONSE sets `guest=guest_...; domain=.jotform.com;
 *    SameSite=None` before any JS runs, which is the third-party cookie in the
 *    Best Practices audit. It is unavoidable while this file is requested.
 *
 * The one improvement available without changing any of this: the avatar is a
 * 1254x1254 PNG drawn at 56x56, served from an expiring signed URL with no
 * cache-control. Re-uploading a small image in Jotform's AI Agent Builder
 * (Designer -> Avatar) fixes the size, though not the cacheability.
 */
const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";

export default function JotformAgent() {
  return <Script id="jotform-agent" src={SRC} strategy="afterInteractive" />;
}
