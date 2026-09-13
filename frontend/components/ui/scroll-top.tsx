"use client";

import { useEffect, useRef, useState } from "react";
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
 * 48px box. No React state changes while scrolling -- `shown` flips twice in a
 * whole page, at the threshold, and nothing else re-renders.
 */

/* Far enough down that the button never appears during the small bounce at the
   top of a page, close enough that it is there when somebody wants it. */
const SHOW_AT = 420;

export default function ScrollTop() {
  const [shown, setShown] = useState(false);
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

    /* setState per frame is cheap when the value has not changed, but it is
       not free: it schedules a render that React then has to throw away. The
       button crosses the threshold twice in a whole page. */
    let visible = false;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const pct = max > 0 ? Math.min(1, y / max) : 0;
      ref.current?.style.setProperty("--st-p", String(pct));
      const next = y > SHOW_AT;
      if (next !== visible) {
        visible = next;
        setShown(next);
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
    window.scrollTo({
      top: 0,
      /* Honour the setting rather than assume. Someone who has asked their
         system for less motion did not ask for a two-second glide. */
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`st${shown ? " is-on" : ""}`}
      onClick={up}
      aria-label="Back to the top"
      /* Out of the tab order while it is not offered, so a keyboard user does
         not land on an invisible control at the top of a page. */
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
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
