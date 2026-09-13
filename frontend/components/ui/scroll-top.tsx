"use client";

import { useEffect, useRef } from "react";
import "./scroll-top.css";

/**
 * Back to the top, with the ring showing how far down the page you are.
 *
 * THE RING IS THE POINT. A bare arrow says "you can go up", which the reader
 * already knew. A ring that fills as they descend says how far they have come
 * and how much is left, so the same button is also a position indicator and
 * earns its corner. It is the same idea as the three-part bar in the
 * onboarding form: progress you can see beats progress you are told about.
 *
 * NOT ON THE INTRO. The intro is a full-screen animated sequence with no
 * scrolling to undo, and a button offering to take you back to a top you are
 * already at is noise. It keys off `data-intro` on <html>, the same attribute
 * the intro itself sets, rather than a route list that would go stale.
 *
 * EVERY FRAME IS CHEAP. The scroll handler is passive and writes ONE custom
 * property; the ring is an SVG whose dash offset is bound to that property, so
 * the work per frame is a single style write and a composited repaint of a
 * 48px box.
 *
 * AND NOTHING HERE RE-RENDERS AT ALL, which is a correctness rule and not an
 * optimisation. Showing and hiding used to be React state, and that is why the
 * button never reached the top.
 *
 * The sequence: you tap it at the foot of the page, the tap gives the button
 * DOM focus, the smooth scroll starts, and on the way up it crosses the
 * threshold below which the button hides. That flipped the state, React
 * committed the new `class`, `tabindex` and `aria-hidden` onto the element
 * that had focus, and restoring the selection around that commit called
 * `.focus()` on it -- which counts as a scroll request and cancels the glide
 * that is still in flight. Measured on the homepage: from the foot it stopped
 * at 189px, from 800px it stopped at 358px, every single time, always just
 * after passing the threshold. A scripted click, which never focuses anything,
 * landed on 0 every time.
 *
 * So visibility is written straight to the element instead. No commit, no
 * selection to restore, no cancelled scroll.
 */

/* Far enough down that the button never appears during the small bounce at the
   top of a page, close enough that it is there when somebody wants it. */
const SHOW_AT = 420;

export default function ScrollTop() {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* The intro owns the screen while it runs. */
    if (document.documentElement.dataset.intro === "on") return;

    let frame = 0;
    /* THE PAGE HEIGHT IS MEASURED WHEN IT CHANGES, NOT WHEN YOU SCROLL.

       `scrollHeight` and `clientHeight` are layout reads. Asking for them
       forces the browser to make layout current before it can answer, and this
       ran on every scroll frame -- so on any frame where something had dirtied
       layout, scrolling paid for a full synchronous layout before it could
       move. `window.scrollY` does not do that; it is the only thing here that
       needs to be read per frame.

       This is the likeliest reason the catching showed up on Edge for iOS and
       not on Safari: Edge animates its own toolbar far more eagerly while you
       scroll, and every step of that invalidates layout, so the forced
       relayout above fired on frame after frame instead of occasionally. */
    let max = 0;
    const measure = () => {
      const el = document.documentElement;
      max = el.scrollHeight - el.clientHeight;
    };

    /* Written to the element, never to state -- see the note above the
       component for the bug that cost. `visibility: hidden` in the stylesheet
       is what takes it out of the accessibility tree and out of reach of a
       pointer; the tabindex keeps it out of the tab order as well. */
    let visible = false;
    const show = (on: boolean) => {
      const el = ref.current;
      if (!el) return;
      el.classList.toggle("is-on", on);
      el.tabIndex = on ? 0 : -1;
      if (on) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
    };

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const pct = max > 0 ? Math.min(1, y / max) : 0;
      ref.current?.style.setProperty("--st-p", String(pct));
      const next = y > SHOW_AT;
      if (next !== visible) {
        visible = next;
        show(next);
      }
    };
    /* Coalesced to one read a frame: a scroll event can fire far more often
       than the screen refreshes, and every extra read here is main-thread time
       taken from the scroll itself. */
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    /* The document grows and shrinks without a resize event -- images settling,
       a section expanding, a route change. Watching the element is how the
       height stays right without measuring it per frame. */
    const grew = new ResizeObserver(onResize);
    grew.observe(document.documentElement);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      grew.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const up = () => {
    /* Honour the setting rather than assume. Someone who has asked their
       system for less motion did not ask for a two-second glide. */
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* LENIS FIRST WHERE IT IS RUNNING. It owns the scroll position on a
       desktop pointer and keeps its own target; scrolling the window behind
       its back leaves that target stale, and it animates the page back towards
       it. The same reasoning, and the same call, as scroll-reset.tsx. */
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: instant, force: true });
    } else {
      window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
    }

    if (!instant) landAtTheTop();
  };

  /**
   * MAKE SURE IT ACTUALLY ARRIVES.
   *
   * The cause found on this site is fixed above, but a smooth scroll is
   * cancellable by design and there is more than one way to cancel one: an
   * image settling, a section measuring itself, a browser's own scroll
   * anchoring. A button labelled "back to the top" that stops short of the top
   * has failed, and it fails silently.
   *
   * So the glide is watched until it stops moving, and if it has stopped
   * anywhere but the top, it is finished off. It stands down the moment the
   * reader does anything themselves -- a touch, a wheel, a key, a pointer --
   * because a reader who has started scrolling has withdrawn the request, and
   * fighting them is worse than stopping short.
   */
  const landAtTheTop = () => {
    let last = window.scrollY;
    let still = 0;
    let frame = 0;
    const started = performance.now();
    const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      for (const t of intents) window.removeEventListener(t, stop, true);
    };
    for (const t of intents) window.addEventListener(t, stop, { capture: true, passive: true });

    const watch = () => {
      frame = 0;
      const y = window.scrollY;
      /* Six still frames is about a tenth of a second: long enough that a
         glide pausing between frames is not mistaken for a glide that has
         ended, short enough that nobody sees the correction as a second hop. */
      still = Math.abs(y - last) < 1 ? still + 1 : 0;
      last = y;
      if (still >= 6 || performance.now() - started > 3000) {
        stop();
        if (window.scrollY > 0) {
          window.__lenis?.scrollTo(0, { immediate: true, force: true });
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        return;
      }
      frame = requestAnimationFrame(watch);
    };
    frame = requestAnimationFrame(watch);
  };

  return (
    <button
      ref={ref}
      type="button"
      className="st"
      onClick={up}
      aria-label="Back to the top"
      /* The starting state, at the top of a page where the button is not
         offered. Everything after this is written to the element by the scroll
         handler rather than re-rendered. Out of the tab order while it is
         hidden, so a keyboard user does not land on an invisible control. */
      tabIndex={-1}
      aria-hidden="true"
    >
      <svg className="st__ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="st__track" cx="22" cy="22" r="20" />
        {/* `pathLength="1"` renormalises the circumference to 1, so the dash
            maths is just the fraction and does not depend on the radius. */}
        <circle className="st__fill" cx="22" cy="22" r="20" pathLength={1} />
      </svg>
      <svg className="st__arrow" viewBox="0 0 24 24" aria-hidden="true"
           fill="none" stroke="currentColor" strokeWidth="2.4"
           strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
      </svg>
    </button>
  );
}
