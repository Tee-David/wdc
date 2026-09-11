"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./jotform-agent.css";

/**
 * The Jotform AI agent, as a floating button.
 *
 * IT IS NOT LOADED WITH THE PAGE. Jotform's embed script pulls in its own
 * runtime, its own styles and an iframe, and it does all of that on whatever
 * page it is dropped into. The homepage was just taken from a Lighthouse
 * mobile score of 69 to 81, most of it by removing JavaScript that ran before
 * anyone needed it; adding a third-party bundle to every first paint would
 * hand that back and then some.
 *
 * So the script is fetched on the first of three signals, whichever comes
 * first:
 *   - the reader taps the button, which loads it and opens it,
 *   - the pointer moves near the button, so it is ready by the time they
 *     arrive,
 *   - the browser goes idle after first paint, well clear of the metrics.
 *
 * Until then this is one button and no network.
 *
 * WHY OUR OWN BUTTON RATHER THAN JOTFORM'S. Theirs arrives with the script, so
 * a deferred script means no button until something triggers it -- which is a
 * chicken and egg. Ours is always there, in the brand's own colours, and it
 * hands over the moment the real widget is ready.
 *
 * WHERE IT SITS. Bottom right, and deliberately raised above the bottom edge:
 * the connectivity bar sits at z-index 120 across the bottom of the viewport,
 * the pinned-row scroll cue sits at the foot of its section, and on a phone the
 * browser's own chrome takes the last few millimetres. The button sits at
 * z-index 110 -- under the connectivity bar, which is more urgent, and under
 * the preloader at 200 -- and shifts up while the bar is showing so the two
 * never overlap.
 */

const SRC =
  "https://cdn.jotfor.ms/agent/embedjs/01a0907b3dd870008f3afa7ebca3bb7b4c1b/embed.js";

/* Anything shorter than this is the launcher; anything taller is the open
   conversation. Their avatar plus its greeting bubble comes in around 120px
   tall and the chat window is several hundred, so the gap is wide and the
   threshold does not need to be clever. */
const LAUNCHER_MAX_H = 260;

/**
 * Bring Jotform's own launcher into line with the rest of the page.
 *
 * WHY BY MEASUREMENT RATHER THAN BY SELECTOR. Their widget is injected by a
 * script we do not control, into markup whose class names and ids are theirs
 * to change on any deploy, and it renders inside an iframe so nothing about
 * its contents is reachable from here. A stylesheet written against
 * `.jfBubble` or `#JotformAgent-...` is a stylesheet that silently stops
 * applying the week they rename something, and the failure is invisible --
 * the avatar just drifts back to the edge of the screen.
 *
 * So this identifies their elements structurally: everything the script adds
 * to `<body>` after it runs, which it cannot rename. It then classifies by
 * SIZE rather than by state, because "is the chat open" is their private
 * business but "is this box 120px tall or 600px tall" is simply true.
 *
 * That distinction is the whole point. The two adjustments -- pull it clear of
 * the right edge, make it smaller -- are right for a launcher and wrong for an
 * open conversation, which should be exactly as large as they built it. So the
 * attribute flips to "open" and the CSS stands down.
 */
function watchAgentUi(before: Set<Element>) {
  const seen = new Set<Element>();

  const sizes = new ResizeObserver((entries) => {
    for (const e of entries) {
      const h = e.contentRect.height;
      /* A zero box is hidden or mid-transition, not a state. Leaving the last
         answer in place stops the launcher flickering between the two
         treatments while it opens. */
      if (h <= 0) continue;
      (e.target as HTMLElement).dataset.wdcAgent =
        h <= LAUNCHER_MAX_H ? "mini" : "open";
    }
  });

  const take = (el: Element) => {
    if (seen.has(el) || before.has(el)) return;
    if (el === document.currentScript) return;
    /* Scripts, styles and link tags have no box to move. */
    if (!(el instanceof HTMLElement)) return;
    if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)) return;
    seen.add(el);
    el.dataset.wdcAgent = "mini";
    sizes.observe(el);
  };

  Array.from(document.body.children).forEach(take);

  /* Their widget does not necessarily arrive with the script -- it fetches its
     own configuration first -- so the body is watched for a while afterwards.
     `childList` only, not `subtree`: a subtree observer on <body> fires on
     every keystroke the reader types into the chat. */
  const added = new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((n) => take(n as Element));
  });
  added.observe(document.body, { childList: true });

  return () => {
    added.disconnect();
    sizes.disconnect();
  };
}

export default function JotformAgent() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const asked = useRef(false);
  const stopWatching = useRef<(() => void) | null>(null);

  /* One loader, however it is triggered. The guard is a ref rather than state
     so a second trigger arriving in the same tick cannot start a second
     fetch -- state would not have updated yet. */
  const load = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    setLoading(true);
    /* Taken BEFORE the script exists, so everything it adds is new by
       definition and nothing already on the page is mistaken for theirs. */
    const before = new Set(document.body.children);

    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => {
      setLoaded(true);
      setLoading(false);
      stopWatching.current = watchAgentUi(before);
    };
    /* ON FAILURE, PUT THE BUTTON BACK. A third-party CDN can be unreachable
       for a moment, blocked by an extension, or down; hiding the button on the
       first error would mean a reader who arrives thirty seconds later finds no
       assistant at all, for a failure that has since cleared. Clearing the
       guard lets the next click try again. A repeated failure costs them a
       click, and the site still has a contact page, a form and an email
       address. */
    s.onerror = () => {
      asked.current = false;
      setLoading(false);
      s.remove();
    };
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    /* The idle fallback. `requestIdleCallback` runs after the browser has
       finished the work that matters; the timeout is the floor for Safari,
       which still does not implement it. */
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(load, { timeout: 6000 })
      : window.setTimeout(load, 5000);

    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      stopWatching.current?.();
      stopWatching.current = null;
    };
  }, [load]);

  /* Once Jotform's own launcher is on the page, ours would be a second button
     doing the same job. */
  if (loaded) return null;

  return (
    <button
      type="button"
      className="jf"
      /* Hovering is intent. Loading here means the real widget is usually
         ready before the click lands. */
      onPointerEnter={load}
      onFocus={load}
      onClick={load}
      aria-label="Ask our AI assistant"
      aria-busy={loading}
    >
      <span className="jf__ic" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </span>
      <span className="jf__t">{loading ? "One moment" : "Ask us anything"}</span>
    </button>
  );
}
