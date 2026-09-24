"use client";

import { useEffect, useRef, useState } from "react";
/* The package's CSS only: its keyframes and class names. Its component
   looked icons up in all of lucide; see ./service-icons.ts. */
import "motion-icons-react/style.css";
import { SERVICE_ICONS } from "./service-icons";
import "./stroke-draw.css";

/**
 * The page's one animated-icon component, drawn with motion-icons-react's
 * animation classes. It used to render the package's <MotionIcon>, which is
 * sixty lines and a lookup in `import * as lucide`; that lookup shipped every
 * lucide icon on every page, so the same sixty lines now live below, with
 * the icon taken from the registry in ./service-icons.ts.
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

  /* motion-icons-react's own behaviour, kept exactly: the hover class while
     the pointer is over it, the entrance class until its animation ends. */
  const [hovered, setHovered] = useState(false);
  const [entered, setEntered] = useState(reduce || !entrance);
  const Icon = SERVICE_ICONS[name];
  useEffect(() => {
    if (!entrance || reduce) return;
    const id = window.setTimeout(() => setEntered(true), 1000 + delay);
    return () => window.clearTimeout(id);
  }, [entrance, reduce, delay]);

  if (!Icon) {
    if (process.env.NODE_ENV !== "production") console.warn(`ServiceIcon: "${name}" is not in components/ui/service-icons.ts`);
    return null;
  }
  const hoverClass = !reduce && hovered && hover !== "none" ? HOVER[hover] : "";
  const entranceClass = !reduce && entrance && !entered ? ENTRANCE[entrance] : "";

  return (
    <span
      ref={host}
      className="svc-draw"
      style={{ "--sk-delay": `${delay}ms` } as React.CSSProperties}
    >
      <span
        className={[hoverClass, entranceClass, `svc-ico ${className}`].filter(Boolean).join(" ").trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          animationDuration: "1000ms",
          animationDelay: `${reduce ? 0 : delay}ms`,
          ...(entranceClass ? { opacity: 0 } : null),
          color: "currentColor",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onAnimationEnd={() => {
          if (entranceClass) setEntered(true);
        }}
        role="img"
        aria-label={label || name}
      >
        <Icon size={size} strokeWidth={2} aria-hidden="true" />
      </span>
    </span>
  );
}

const HOVER = { nudge: "motion-nudge", wiggle: "motion-wiggle", pop: "motion-pop", pulse: "motion-pulse", swing: "motion-swing" } as const;
const ENTRANCE = { scaleIn: "motion-scale-in", fadeInUp: "motion-fade-in-up", fadeIn: "motion-fade-in" } as const;
