"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * PUTS EVERY NAVIGATION BACK AT THE TOP OF THE PAGE.
 *
 * Two separate faults produced the same complaint -- "clicking a link takes me
 * to the bottom of the page" -- and neither is fixed by the other.
 *
 * ONE: LENIS OUTLIVES THE ROUTE. `SmoothScroll` mounts once, high in the tree,
 * and its Lenis instance is never told that the page underneath it changed.
 * Lenis owns the scroll position: it keeps its own `targetScroll` and drives
 * `window.scrollTo` towards it on every frame. The App Router does scroll to
 * top on navigation, but Lenis still holds the offset from the PREVIOUS page
 * and animates the document straight back to it on the next frame. Navigate
 * from the footer of one page and you arrive at the footer of the next.
 *
 * TWO: A LINK TO THE PAGE YOU ARE ALREADY ON DOES NOTHING. The header logo is
 * `<Link href="/">`, and on `/` that is a no-op -- no navigation, so no scroll,
 * so you stay wherever you were. Clicking the logo from the FAQ left you at the
 * FAQ, which reads as "the logo took me to the bottom of the homepage".
 *
 * The capture-phase listener handles the second case for every same-page link
 * at once rather than one `onClick` at a time, and deliberately steps aside for
 * anchors (`#section`), cross-origin links, new-tab intents and modified
 * clicks, none of which want to be sent to the top.
 */

function toTop(immediate: boolean) {
  /* Lenis first, and only if it is running -- it is desktop-only. Resetting
     its internal target is the part that sticks; window.scrollTo alone gets
     animated away again on the next frame. */
  window.__lenis?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo({ top: 0, left: 0, behavior: immediate ? "instant" : "smooth" });
}

export default function ScrollReset() {
  const path = usePathname();
  const first = useRef(true);

  /* On route change. Skipped for the very first render: the initial load
     belongs to the browser's own restoration and to any deep link in the URL. */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.location.hash) return;
    toTop(true);
  }, [path]);

  /* On a click that the router will not act on. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      /* An in-page anchor has its own destination; Lenis animates to it. */
      if (url.hash) return;
      /* A real route change is the effect above's job. */
      if (url.pathname !== window.location.pathname) return;

      toTop(false);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
