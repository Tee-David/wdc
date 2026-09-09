"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The contract every service stage inherits.
 *
 * Six interactive stages on one page is how a marketing site ends up with a
 * three-second interaction delay, so nothing here mounts until it is near the
 * viewport, and every stage declares three states rather than bolting them on:
 *
 *   full     desktop, motion allowed  — the whole idea
 *   compact  narrow screens           — fewer moving parts, same point
 *   still    prefers-reduced-motion   — the end state, no animation
 *
 * `useStageMotion` returns which of those a stage should render, so the
 * decision is made in one place instead of six.
 */

/** True once the element is within `margin` of the viewport. Latches on. */
export function useNearViewport<T extends HTMLElement>(margin = "300px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer (or a very old browser) must never mean "no content" — but
    // set it on the next frame rather than synchronously, so the effect does
    // not cascade a second render on mount.
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return { ref, near };
}

export type StageMode = "full" | "compact" | "still";

/**
 * Resolves the render mode. Starts as "still" so the server HTML and the first
 * client paint agree — the animated modes are opted into after hydration,
 * which also means a JS failure leaves the readable end state on screen.
 */
export function useStageMotion(compactUnder = 768): StageMode {
  const [mode, setMode] = useState<StageMode>("still");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia(`(max-width: ${compactUnder - 1}px)`);
    const resolve = () =>
      setMode(reduce.matches ? "still" : narrow.matches ? "compact" : "full");
    resolve();
    reduce.addEventListener("change", resolve);
    narrow.addEventListener("change", resolve);
    return () => {
      reduce.removeEventListener("change", resolve);
      narrow.removeEventListener("change", resolve);
    };
  }, [compactUnder]);

  return mode;
}

/**
 * The frame. Identical for all six stages — same radius, border, fill and
 * proportions — so wildly different insides still read as siblings.
 */
export function Stage({
  caption,
  children,
  tall = false,
}: {
  caption: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <figure className={`sv-stage${tall ? " sv-stage--tall" : ""}`}>
      <div className="sv-stage__frame">{children}</div>
      <figcaption className="sv-stage__cap">{caption}</figcaption>
    </figure>
  );
}

/**
 * Wraps a stage so its work starts only once it is close to being seen. The
 * placeholder holds the same height, so nothing below it jumps when the real
 * stage arrives.
 */
export function LazyStage({ children }: { children: ReactNode }) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="sv-lazy">
      {near ? children : <div className="sv-stage sv-stage--skeleton" aria-hidden="true" />}
    </div>
  );
}
