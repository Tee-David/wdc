"use client";

import { useEffect } from "react";

/**
 * Decides which decorative animations are allowed to run, and when.
 *
 * THE MEASUREMENT. Profiled on /services at 4x CPU throttling, SITTING STILL
 * rather than scrolling: an average frame of 96ms, about ten frames a second,
 * with 38 `sk-draw` animations looping at once across 535 SVG paths.
 * `stroke-dashoffset` is not a compositor property, so every frame of it
 * repaints its SVG on the main thread. Scrolling then had to contend with that
 * for the same thread, which is what the "catch" actually was: the scroll was
 * never the problem, the thread it needed was busy.
 *
 * TWO JOBS, AND THEY PULL IN OPPOSITE DIRECTIONS.
 *
 * 1. `is-in`, added ONCE and never removed. The stroke animations are reveals:
 *    they draw when their element first arrives and then rest on the finished
 *    glyph, ticking never again. They are held back until arrival so a numeral
 *    draws under the reader's eye rather than having happened while the
 *    section was still three screens away. An element this never reaches keeps
 *    its resting state, which is the finished glyph, so the failure mode is a
 *    readable number rather than a blank space.
 *
 * 2. `is-off`, toggled, for the things that genuinely do loop — the marquee,
 *    the bobbing step icons. Those pause off screen and resume on return.
 *
 * WHY `is-off` IS A PAUSE AND NOT A PLAY. Running has to stay the default for
 * the loopers: stages mount lazily on approach, so anything appearing after a
 * scan would never be observed, and if paused were the default those late
 * arrivals would sit frozen and look broken. The gate can only ever take work
 * away.
 *
 * WHY NOT A MutationObserver. The obvious way to catch lazily mounted stages
 * is to watch the DOM, but the AI terminal appends a text node on nearly every
 * frame while it types, so a subtree observer would fire continuously and cost
 * more than it saves. A handful of scheduled rescans covers the lazy mounts
 * for a fraction of the work.
 */

/** Draw once on arrival, then rest. */
const ONCE = ".sn, .svc-draw";
/* Genuine loops. `.sv-step` is here because its icon runs an infinite bob with
   `will-change: transform`: 36 of those means 36 permanent compositor layers
   held for elements that are usually off screen.

   `.nf__num` is the 404's numeral, and it is the one `.sn` on the site that
   repeats -- three paths on a page with nothing else moving, which is a very
   different bill from the 535 that forced the site-wide draw off `infinite`.
   It appears in BOTH lists on purpose: `ONCE` matches it as a `.sn` and starts
   it on arrival, and this list is what lets it be paused again once it scrolls
   away. See the note in components/not-found/lost-sketch.css. */
const LOOP = ".sv-step, .gm, .nf__num";

export default function DrawGate() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Arrival: fire once, then stop watching that element. Unobserving is not
       tidiness, it is the point — an observer still tracking every numeral on
       a long page is itself work on the scroll path. */
    const arrive = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          arrive.unobserve(e.target);
        }
      },
      /* A small margin so the draw starts just before the element is properly
         in view, and reads as already under way when it arrives. */
      { rootMargin: "80px 0px", threshold: 0.01 },
    );

    const loop = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("is-off", !e.isIntersecting);
      },
      { rootMargin: "150px 0px" },
    );

    const scan = () => {
      document.querySelectorAll(ONCE).forEach((el) => {
        if (!el.classList.contains("is-in")) arrive.observe(el);
      });
      document.querySelectorAll(LOOP).forEach((el) => loop.observe(el));
    };

    scan();
    /* Stages mount on approach; these cover the ones that were not in the DOM
       on the first pass. Re-observing an element already being observed is a
       no-op, so repeating the scan is cheap. */
    const timers = [600, 1600, 3200].map((ms) => window.setTimeout(scan, ms));

    /* AND THEN KEEP LOOKING, because three fixed timers do not describe when
       these elements actually appear. The stages on /services mount as you
       approach them, which on a 11,000px page is minutes after the last timer
       has fired -- and an icon that mounts after the final scan is never
       observed, never gets `is-in`, and so never draws at all. Measured on
       /services before this: 7 of 64 icons laid out and permanently blank.

       Approach means scrolling, so scroll is the signal, throttled to at most
       one rescan every 400ms and run off a rAF so it never lands mid-frame.
       The scan is a querySelectorAll over ~100 elements and a no-op observe
       on almost all of them; this is the cheap half of the MutationObserver
       the note above rejected, without the subtree churn from the terminal. */
    let queued = false;
    let last = 0;
    let frame = 0;
    let timer = 0;
    const rescan = () => {
      queued = false;
      last = performance.now();
      scan();
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      const wait = Math.max(0, 400 - (performance.now() - last));
      timer = window.setTimeout(() => {
        frame = requestAnimationFrame(rescan);
      }, wait);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      arrive.disconnect();
      loop.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
