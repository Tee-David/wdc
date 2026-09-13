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
 * THREE: THE BROWSER RESTORES THE OLD OFFSET ON A FULL PAGE LOAD. The
 * hamburger menu's links are plain `<a href>`, not `<Link>`, so choosing
 * "Services" there is a document navigation rather than a client one -- and
 * `history.scrollRestoration` defaults to "auto", so the browser puts you back
 * wherever you last were on /services. On a page whose pinned GSAP sections
 * make it several screens tall, "wherever you last were" is the bottom. This
 * is the one the router never had a chance to fix, because there was no route
 * change for it to react to.
 *
 * Restoration is therefore set to "manual". The trade is real and worth
 * stating: the browser will no longer restore your place when you press Back.
 * On a site with pinned, scroll-driven sections it was not restoring it
 * correctly anyway -- the page's height depends on JavaScript that has not run
 * yet at restore time, which is exactly why it overshot to the bottom.
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

  /* Take scroll restoration away from the browser, once, before it can act.
     A deep link (`/services#seo`) is left alone -- that URL asks for a
     position and the browser is right to honour it. */
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    window.history.scrollRestoration = "manual";
    if (window.location.hash) return;
    /* Two passes. The first covers a normal load; the second runs after
       `load`, by which point the pinned sections have measured themselves and
       the document has its real height -- which is when a restored offset
       would otherwise reappear.

       THE SECOND PASS MUST NEVER FIGHT THE READER. Between mount and `load`
       the page is already interactive, so someone can scroll, or click an
       in-page link, before `load` fires. Checking the hash is not enough to
       catch that: Lenis handles anchor clicks itself and does not always write
       one, so a correction here would silently undo a jump the reader had just
       asked for. Any sign of intent -- a wheel, a touch, a key, a click --
       stands the second pass down. */
    toTop(true);
    let intent = false;
    const noteIntent = () => { intent = true; };
    const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    for (const type of intents) window.addEventListener(type, noteIntent, { passive: true, once: true });

    const onLoad = () => {
      if (intent || window.location.hash || window.scrollY > 4) return;
      toTop(true);
    };
    if (document.readyState === "complete") {
      requestAnimationFrame(onLoad);
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
    return () => {
      window.removeEventListener("load", onLoad);
      for (const type of intents) window.removeEventListener(type, noteIntent);
    };
  }, []);

  /* On route change. Skipped for the very first render, which the effect
     above owns. */
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
