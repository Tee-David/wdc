"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bends a line of text along an arc and lifts it into place on entry.
 *
 * Each character is offset by its distance from the centre of the line, so the
 * baseline curves and the outer characters tilt — the further out, the more
 * warp. Whitespace is rendered as a non-breaking space inside its own span, so
 * the arc keeps its spacing instead of collapsing.
 *
 * The whole string stays readable to assistive tech and to search: the visible
 * characters are aria-hidden and the untouched text sits alongside them in a
 * visually-hidden span. Splitting a heading into per-character elements without
 * that makes it read one letter at a time.
 */
export default function WarpText({
  text,
  /** peak vertical bend in px at the ends of the line. */
  curve = 16,
  /** peak rotation in degrees at the ends. */
  tilt = 7,
  as: Tag = "span",
  className = "",
}: {
  text: string;
  curve?: number;
  tilt?: number;
  as?: "span" | "h2" | "h3" | "p";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const chars = Array.from(text);
  const mid = (chars.length - 1) / 2 || 1;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`wt${shown ? " is-in" : ""} ${className}`}
    >
      <span className="wt__sr">{text}</span>
      <span className="wt__row" aria-hidden="true">
        {chars.map((c, i) => {
          // -1 at the left end, 0 in the middle, 1 at the right end
          const t = (i - mid) / mid;
          return (
            <span
              className="wt__c"
              key={`${c}-${i}`}
              style={{
                // squared so the bend concentrates at the ends rather than
                // sloping evenly, which reads as a tilt rather than an arc
                "--wt-y": `${t * t * curve}px`,
                "--wt-r": `${t * tilt}deg`,
                "--wt-d": `${i * 18}ms`,
              } as React.CSSProperties}
            >
              {c === " " ? " " : c}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
