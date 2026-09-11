import Script from "next/script";

/**
 * Jotform owns the launcher and conversation UI completely.
 *
 * Do not wrap, resize, reposition, observe, or replace its FAB: the embed's
 * configuration is the source of truth and places its native launcher at the
 * bottom right. `afterInteractive` keeps the third-party script out of the
 * server-rendering path while ensuring the launcher appears without requiring
 * a click on a separate WDC control first.
 */
const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";

export default function JotformAgent() {
  return <Script id="jotform-agent" src={SRC} strategy="afterInteractive" />;
}
