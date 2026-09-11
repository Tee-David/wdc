"use client";

import { useEffect } from "react";

/**
 * Pauses the stroke-draw animations that are off screen.
 *
 * THE MEASUREMENT. Profiled on /services at 1440px: 422 running animations,
 * 377 of them `sk-draw`, and 268 of those outside the viewport. `sk-draw`
 * animates `stroke-dashoffset`, which is not a compositor property: every
 * frame repaints the SVG it belongs to. So the page was continuously
 * repainting hundreds of paths nobody could see, which is most of why
 * scrolling the services page felt like wading.
 *
 * WHY A CLASS THAT PAUSES RATHER THAN ONE THAT PLAYS. The default has to stay
 * "running". Stages mount lazily as you approach them, so anything that
 * appears after this component has scanned would never be observed, and if
 * paused were the default those late arrivals would sit frozen and look
 * broken. Defaulting to running means an unobserved element behaves exactly
 * as it did before; the gate can only ever take work away.
 *
 * WHY NOT A MutationObserver. The obvious way to catch lazily mounted stages
 * is to watch the DOM, but the AI terminal appends a text node on nearly every
 * frame while it types, so a subtree observer would fire continuously and cost
 * more than it saves. A handful of scheduled rescans covers the lazy mounts
 * for a fraction of the work.
 */
/* `.sv-step` joins the stroke elements because its icon runs an infinite
   bob with `will-change: transform`: 36 of those means 36 permanent
   compositor layers held for elements that are usually off screen. */
const SELECTOR = ".sn, .svc-draw, .sv-step, .gm";

export default function DrawGate() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("is-off", !e.isIntersecting);
      },
      /* A generous margin so a numeral is already drawing by the time it is
         actually looked at, rather than starting its animation under the
         reader's eye. */
      { rootMargin: "150px 0px" },
    );

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    };

    scan();
    /* Stages mount on approach; these cover the ones that were not in the DOM
       on the first pass. Re-observing an element already being observed is a
       no-op, so repeating the scan is cheap. */
    const timers = [600, 1600, 3200].map((ms) => window.setTimeout(scan, ms));

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
