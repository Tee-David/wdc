"use client";

import { useEffect } from "react";

/**
 * THE SIDEWAYS HINTS ON A TABLE THAT SCROLLS (admin.css, "a table stays a
 * table"): `data-scrolled` once it has moved, for the pinned column's shadow,
 * and `data-more` while there is more to the right, for the fade and the
 * "Swipe for more" line.
 *
 * One passive listener per scroller and one resize observer, each coalesced
 * into a frame; a mutation observer picks up tables that arrive with
 * navigation or filters. Reads scroll geometry only, never writes layout.
 *
 * NOT BEFORE HYDRATION: an attribute React did not render, found on a node it
 * is still hydrating, is a mismatch. The first pass waits for load and an
 * idle moment, the same as the label pass this replaced.
 */
export default function TableScroll() {
  useEffect(() => {
    const root = document.querySelector(".ad__main");
    if (!root) return;
    const seen = new WeakSet<HTMLElement>();
    const queued = new Set<HTMLElement>();
    let frame = 0;

    const measure = () => {
      frame = 0;
      for (const el of queued) {
        const more = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        const moved = el.scrollLeft > 2;
        if (more !== el.hasAttribute("data-more")) el.toggleAttribute("data-more", more);
        if (moved !== el.hasAttribute("data-scrolled")) el.toggleAttribute("data-scrolled", moved);
      }
      queued.clear();
    };
    const schedule = (el: HTMLElement) => { queued.add(el); if (!frame) frame = requestAnimationFrame(measure); };
    const onScroll = (e: Event) => schedule(e.currentTarget as HTMLElement);
    const resize = new ResizeObserver((entries) => { for (const e of entries) schedule(e.target as HTMLElement); });

    const attach = () => {
      for (const el of root.querySelectorAll<HTMLElement>(".ad__scroll")) {
        if (seen.has(el)) continue;
        seen.add(el);
        el.addEventListener("scroll", onScroll, { passive: true });
        resize.observe(el);
        schedule(el);
      }
    };
    const mutations = new MutationObserver(() => attach());

    const idleApi = typeof window.requestIdleCallback === "function";
    let idle = 0;
    const start = () => {
      const run = () => { attach(); mutations.observe(root, { childList: true, subtree: true }); };
      idle = idleApi ? window.requestIdleCallback(run, { timeout: 800 }) : window.setTimeout(run, 200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      window.removeEventListener("load", start);
      if (idleApi) window.cancelIdleCallback(idle); else window.clearTimeout(idle);
      mutations.disconnect();
      resize.disconnect();
      for (const el of root.querySelectorAll<HTMLElement>(".ad__scroll")) el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
