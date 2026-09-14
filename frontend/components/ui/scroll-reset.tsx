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

/**
 * THE ONE WAY ANYTHING IN THIS APP GOES BACK TO THE TOP.
 *
 * Exported rather than private, because a second copy of this is how the bug
 * at the head of this file gets reintroduced. Anywhere that wants the top --
 * a route change, a step in a long form, a button -- calls this, so there is
 * one place that knows Lenis has to be told and one place to change if that
 * ever stops being true.
 */
export function toTop(immediate: boolean) {
  /* Lenis first, and only if it is running -- it is desktop-only. Resetting
     its internal target is the part that sticks; window.scrollTo alone gets
     animated away again on the next frame. */
  window.__lenis?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo({ top: 0, left: 0, behavior: immediate ? "instant" : "smooth" });
}

/* Same rule as `toTop`, to an arbitrary offset: Lenis has to be told or it
   animates the document back on the next frame. */
function toY(y: number) {
  window.__lenis?.scrollTo(y, { immediate: true, force: true });
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
}

const KEY = "wdc:scroll";

/**
 * Where the reader was, saved ONCE as the page goes away.
 *
 * NOT ON SCROLL. A listener that writes the offset as you move is a
 * scroll-position writer, which this project's conventions forbid on touch
 * devices and which costs a write per frame everywhere else. `pagehide` fires
 * on reload, on navigation and on tab close, and it fires once, which is all
 * this needs.
 */
function remember() {
  try {
    const y = window.scrollY;
    if (y <= 0) { sessionStorage.removeItem(KEY); return; }
    sessionStorage.setItem(KEY, JSON.stringify({ path: window.location.pathname, y }));
  } catch {
    /* Private mode, or storage refused. Losing the position is the acceptable
       failure here; throwing on the way out of a page is not. */
  }
}

/** The saved offset for this exact path, or null. Read once, then cleared. */
function recall(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const saved = JSON.parse(raw) as { path?: string; y?: number };
    if (saved?.path !== window.location.pathname) return null;
    return typeof saved.y === "number" && saved.y > 0 ? saved.y : null;
  } catch {
    return null;
  }
}

/**
 * Was this document RELOADED, rather than navigated to?
 *
 * This is the distinction the old code could not make, and the whole of the
 * bug: it set `scrollRestoration = "manual"` and jumped to the top on every
 * first load, which is right for a navigation and wrong for a refresh. A
 * reader who refreshes expects to be where they were, the way every other site
 * behaves; a reader who clicks a link expects the top.
 *
 * `back_forward` is included because a full-document Back has the same
 * expectation as a refresh. `prerender` and `navigate` do not.
 */
function isReload(): boolean {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return entry?.type === "reload" || entry?.type === "back_forward";
  } catch {
    return false;
  }
}

export default function ScrollReset() {
  const path = usePathname();
  const first = useRef(true);

  /* Take scroll restoration away from the browser, once, before it can act.
     A deep link (`/services#seo`) is left alone -- that URL asks for a
     position and the browser is right to honour it. */
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    /* Still "manual", and still for the reason below: the browser's own
       restore overshoots on pages whose height depends on JavaScript that has
       not run yet. We do the restoring instead, after `load`, when the pinned
       sections have measured themselves and the document is its real height.
       That is the same moment the second pass below exists for. */
    window.history.scrollRestoration = "manual";

    /* The position is saved as the page leaves, whatever takes it away. */
    window.addEventListener("pagehide", remember);

    if (window.location.hash) return () => window.removeEventListener("pagehide", remember);

    /* A REFRESH IS NOT A NAVIGATION, and treating them alike was the bug: the
       reader was thrown to the top of a page they had just refreshed halfway
       down. The saved offset is read (and cleared) either way, so a position
       left behind by one visit cannot reappear on a later link click. */
    const saved = recall();
    const restoreTo = isReload() ? saved : null;

    /* Two passes. The first covers a normal load; the second runs after
       `load`, by which point the pinned sections have measured themselves and
       the document has its real height -- which is when a restored offset
       would otherwise reappear, and equally when a restore of OUR own can
       first be trusted to land on the right pixel.

       THE SECOND PASS MUST NEVER FIGHT THE READER. Between mount and `load`
       the page is already interactive, so someone can scroll, or click an
       in-page link, before `load` fires. Checking the hash is not enough to
       catch that: Lenis handles anchor clicks itself and does not always write
       one, so a correction here would silently undo a jump the reader had just
       asked for. Any sign of intent -- a wheel, a touch, a key, a click --
       stands the second pass down. */
    if (restoreTo === null) toTop(true);

    let intent = false;
    const noteIntent = () => { intent = true; };
    const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    for (const type of intents) window.addEventListener(type, noteIntent, { passive: true, once: true });

    const onLoad = () => {
      if (intent || window.location.hash) return;
      if (restoreTo !== null) {
        /* Never past the end: the page can be shorter than it was, and a
           refresh that lands on blank space below the footer is worse than
           one that lands at the top. */
        const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        toY(Math.min(restoreTo, limit));
        return;
      }
      if (window.scrollY > 4) return;
      toTop(true);
    };
    if (document.readyState === "complete") {
      requestAnimationFrame(onLoad);
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pagehide", remember);
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
