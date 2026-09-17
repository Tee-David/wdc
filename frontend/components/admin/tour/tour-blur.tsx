"use client";

import { useEffect, useState } from "react";

type Rect = { top: number; left: number; width: number; height: number };

/** Matches `spotlightPadding` in `tour-runtime.tsx` -- the blur has to stop
 *  exactly where Joyride's own cutout does, or one edge shows a visible
 *  seam between sharp and soft. */
const PAD = 6;

function measure(selector: string): Rect | null {
  if (typeof document === "undefined" || selector === "body") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top - PAD),
    left: Math.max(0, r.left - PAD),
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

/**
 * The blurred rest of the screen during a tour: four bands framing the
 * spotlighted target, so there is nowhere else for a reader's eye to focus.
 * Joyride's own overlay dims everything through an SVG cutout it owns --
 * see the long note in `tour.css` on why `backdrop-filter` cannot ride
 * along on that element -- so this sits just under it and does the blur
 * half of the job on its own.
 *
 * Four bands, not one masked element: the simplest technique that leaves a
 * precise rectangular hole in every browser without `mask-image`/
 * `clip-path` math. A `target === "body"` step (an intro/outro slide with
 * nothing to spotlight) blurs edge to edge instead -- there is no control
 * to keep sharp.
 *
 * Recomputed on every step (the `selector` prop changing) and kept fresh
 * for the following ~700ms to track Joyride's own scroll-into-view
 * animation, then on any scroll or resize after that.
 */
export default function TourBlur({ selector }: { selector: string }) {
  const [rect, setRect] = useState<Rect | null>(() => measure(selector));

  useEffect(() => {
    let raf = 0;
    let settleUntil = Date.now() + 700;

    const loop = () => {
      setRect(measure(selector));
      if (Date.now() < settleUntil) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onScrollOrResize = () => {
      settleUntil = Date.now() + 200;
      setRect(measure(selector));
    };
    window.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [selector]);

  if (!rect) return <div className="tourBlur" style={{ top: 0, left: 0, right: 0, bottom: 0 }} />;

  const { top, left, width, height } = rect;
  const bottom = top + height;
  const right = left + width;

  return (
    <>
      <div className="tourBlur" style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className="tourBlur" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className="tourBlur" style={{ top, left: 0, width: left, height }} />
      <div className="tourBlur" style={{ top, left: right, right: 0, height }} />
    </>
  );
}
