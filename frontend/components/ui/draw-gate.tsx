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
   held for elements that are usually off screen. */
const LOOP = ".sv-step, .gm";

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

    return () => {
      arrive.disconnect();
      loop.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
