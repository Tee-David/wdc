"use client";

import { useEffect, useRef, useState } from "react";
import { MotionIcon } from "motion-icons-react";
import "motion-icons-react/style.css";
import "./stroke-draw.css";

/**
 * The page's one animated-icon component, wrapping motion-icons-react.
 *
 * Why a wrapper rather than calling MotionIcon directly at 40-odd call sites:
 *
 *  - Reduced motion. MotionIcon animates whatever it is told to, so honouring
 *    the setting has to happen above it. `entrance` becomes null and
 *    `animation` becomes "none" — gated in JS rather than by killing the
 *    animation in CSS, because the entrance classes start at opacity 0 and an
 *    `animation: none` override would leave the icon permanently invisible.
 *  - One vocabulary. Entrance on arrival, a small reaction on hover, the same
 *    everywhere. Forty icons each picking their own animation is noise.
 *  - `name` is a lucide-react export and lucide exports PascalCase, so a
 *    lowercase name silently renders nothing. Every name used on this page is
 *    checked against the package before it ships.
 *  - The STROKE DRAWING. Lucide icons are open strokes on a 24x24 grid, which
 *    is exactly what a draw-on animation needs, but the shapes ship without a
 *    `pathLength`, so one set of dash keyframes would draw a short line and a
 *    long curve at wildly different speeds. `pathLength` is an attribute and
 *    not a CSS property, so it cannot be set from the stylesheet; the effect
 *    below stamps it onto every shape once the icon has rendered, and hands
 *    each one its index so they draw in sequence instead of all at once.
 */

/** Matches the media query, and keeps matching if the user changes it. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    const id = requestAnimationFrame(sync);
    mq.addEventListener("change", sync);
    return () => { cancelAnimationFrame(id); mq.removeEventListener("change", sync); };
  }, []);
  return reduce;
}

export default function ServiceIcon({
  name,
  size = 19,
  delay = 0,
  hover = "nudge",
  entrance = "scaleIn",
  className = "",
  label,
}: {
  /** A lucide-react export name, PascalCase. */
  name: string;
  size?: number;
  /** ms, for staggering a row. */
  delay?: number;
  hover?: "nudge" | "wiggle" | "pop" | "pulse" | "swing" | "none";
  entrance?: "scaleIn" | "fadeInUp" | "fadeIn" | null;
  className?: string;
  /** Only pass this when the icon carries meaning on its own. */
  label?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const host = useRef<HTMLSpanElement | null>(null);

  /* Runs after the icon renders, and again if the icon changes. Cheap: a
     handful of shapes, two attributes each, once per icon. */
  useEffect(() => {
    const svg = host.current?.querySelector("svg");
    if (!svg) return;
    const shapes = svg.querySelectorAll<SVGElement>(
      "path, line, polyline, polygon, circle, rect, ellipse",
    );
    shapes.forEach((el, i) => {
      el.setAttribute("pathLength", "1");
      el.style.setProperty("--i", String(i));
    });
  }, [name]);

  return (
    <span
      ref={host}
      className="svc-draw"
      style={{ "--sk-delay": `${delay}ms` } as React.CSSProperties}
    >
    <MotionIcon
      name={name}
      size={size}
      entrance={reduce ? null : entrance}
      animation={reduce ? "none" : hover}
      trigger="hover"
      animationDelay={reduce ? 0 : delay}
      className={`svc-ico ${className}`}
      aria-label={label}
    />
    </span>
  );
}
