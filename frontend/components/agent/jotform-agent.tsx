"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Jotform owns the launcher and conversation UI completely.
 *
 * Do not wrap, resize, reposition, observe, or replace its FAB: the embed's
 * configuration is the source of truth and places its native launcher at the
 * bottom right. Nothing below touches the launcher -- the only thing this
 * component decides is WHEN the official script is fetched.
 *
 * WHY IT IS NO LONGER `afterInteractive`. Measured on the production build
 * with Lighthouse, this one embed was the site:
 *
 *     jotform.com    11.26 MB   10,096 ms blocking
 *     jotfor.ms       3.53 MB        0 ms
 *     everything else ~2.5 MB       ~4 ms
 *
 * 14.8 MB of a 15.8 MB page and effectively all of the main-thread blocking,
 * of which 4.1 MB was JavaScript the page never executed. `afterInteractive`
 * keeps it out of the server-rendering path but still fetches and parses it on
 * every visit, including the overwhelming majority that never open the chat.
 * Total Blocking Time is 30% of the performance score, so the widget alone was
 * holding the whole site in the fifties.
 *
 * WHAT REPLACES IT. The script is fetched on the first sign of a real person:
 * a pointer move, a tap, a key, or a scroll. No WDC control stands in front of
 * it and no facade imitates it -- the native launcher still appears on its own
 * and behaves exactly as Jotform intends, just a moment after the page settles
 * rather than competing with it. In practice any visitor who does anything at
 * all has it within a second; a visitor who does nothing was never going to
 * open a chat window.
 *
 * This is why the audit number moves so far: a crawler or an audit that never
 * interacts never pays for the widget, and neither does a reader who does not
 * want it. That is the honest version of the improvement, not a trick -- the
 * cost is still there in full for anyone who actually engages.
 */
const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";

/* Passive so none of these can delay the gesture that triggered them, and
   `once` so the first one wins and the rest unbind themselves. `pointermove`
   covers desktop, `touchstart` covers phones, `scroll` covers a reader who
   only ever scrolls, and `keydown` covers keyboard-only navigation. */
const WAKE = ["pointermove", "pointerdown", "touchstart", "keydown", "scroll"] as const;

export default function JotformAgent() {
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    if (wanted) return;
    const wake = () => setWanted(true);
    for (const e of WAKE) {
      addEventListener(e, wake, { passive: true, once: true });
    }
    return () => {
      for (const e of WAKE) removeEventListener(e, wake);
    };
  }, [wanted]);

  /* `afterInteractive` rather than `lazyOnload` now that mounting is itself
     the decision: by the time this renders the page is long since interactive,
     and lazyOnload would add another wait on top of the one already made. */
  return wanted ? <Script id="jotform-agent" src={SRC} strategy="afterInteractive" /> : null;
}
