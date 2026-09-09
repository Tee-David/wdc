"use client";

import { useEffect, useState } from "react";
import { MotionIcon } from "motion-icons-react";
import "motion-icons-react/style.css";

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

  return (
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
  );
}
