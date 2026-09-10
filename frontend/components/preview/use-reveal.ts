"use client";

import { useEffect } from "react";

/**
 * Reveals `.pv-reveal` elements as they enter the viewport.
 *
 * Lives here rather than inside a page body because two pages now need it and
 * the logic has three details that are easy to get wrong on a re-type:
 *
 *  - `pv-motion` is added by JS, not written into the markup. The reveal starts
 *    at opacity 0, so if the class shipped in the HTML a visitor with JS off
 *    would get a blank page. Adding it here means the hidden state only ever
 *    exists when something is able to un-hide it.
 *  - Reduced motion returns BEFORE adding that class, so those visitors never
 *    enter the hidden state at all rather than being animated to visible.
 *  - The timeout is a safety net: if the observer never fires (a stage that
 *    never intersects, a browser quirk), the content still appears.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.querySelector(".pv");
    if (!root) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    root.classList.add("pv-motion");
    const targets = Array.from(root.querySelectorAll(".pv-reveal"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    targets.forEach((t) => io.observe(t));
    const safety = window.setTimeout(
      () => targets.forEach((t) => t.classList.add("is-in")),
      1400,
    );
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);
}
