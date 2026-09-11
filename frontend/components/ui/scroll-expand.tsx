"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Expands its child from inset to full width as the element crosses the
 * viewport — the "it opens up as you scroll into it" move.
 *
 * Progress is measured against the element's own travel through the viewport
 * rather than against document scroll, so it behaves identically wherever the
 * component is placed and at any page length. The transform is written straight
 * to the node inside a rAF, never through React state: a scroll handler that
 * calls setState re-renders the subtree on every frame, which is how this
 * effect ends up costing more than everything else on the page combined.
 *
 * Reduced motion, or no observer, renders the expanded end state — the point of
 * the component is where it ARRIVES, so the resting state is "arrived".
 */
export default function ScrollExpand({
  children,
  /** scale at the start of the run; 1 is the end state. */
  from = 0.92,
  /** how much of the viewport crossing is spent expanding (0-1). */
  span = 0.55,
  className = "",
}: {
  children: ReactNode;
  from?: number;
  span?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    let raf = 0;
    let inView = false;
    /* Cached, not read per frame. `rect.top` is only `docTop - scrollY`, and
       `docTop` cannot move without a resize -- so reading the rect on every
       scroll frame forces a synchronous layout flush for a number that is
       arithmetic on `window.scrollY`. On a page carrying several of these plus
       the pinned rows, those flushes compound into the stutter you feel while
       dragging. */
    let docTop = 0;
    const measure = () => { docTop = el.getBoundingClientRect().top + window.scrollY; };

    const apply = () => {
      const top = docTop - window.scrollY;
      const vh = window.innerHeight || 1;
      // 0 when the element's top is a screen below the fold, 1 once it has
      // travelled `span` of the way up
      const travelled = (vh - top) / (vh * span);
      const p = Math.min(1, Math.max(0, travelled));
      const scale = from + (1 - from) * p;
      el.style.setProperty("--se-scale", String(scale));
      el.style.setProperty("--se-p", String(p));
    };

    const onScroll = () => {
      if (!inView) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        if (inView) apply();
      },
      { rootMargin: "20% 0px 20% 0px" },
    );
    io.observe(el);
    // one frame later, for the same reason: the resting state already reads
    // correctly, so nothing is lost by not flipping this synchronously
    const liveId = requestAnimationFrame(() => setLive(true));
    measure();
    apply();

    /* A resize is the only thing that can move the element in the document, so
       it is the only time the cached offset has to be taken again. */
    const onResize = () => { measure(); onScroll(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(liveId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [from, span]);

  return (
    <div ref={host} className={`se${live ? " is-live" : ""} ${className}`}>
      {children}
    </div>
  );
}
