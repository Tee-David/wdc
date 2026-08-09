"use client";

import { motion, type MotionProps } from "motion/react";
import type { CSSProperties, HTMLAttributes } from "react";

interface LineShadowTextProps
  extends Omit<HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  shadowColor?: string;
  children: string;
}

/**
 * Magic UI's LineShadowText: the word is duplicated via `content: attr(data-text)`
 * on an ::after layer filled with a repeating diagonal gradient, clipped to the
 * glyphs and offset slightly — producing a hatched shadow that slides forever.
 */

// motion.create must run at module scope — calling it during render would
// create a new component each time, resetting its state.
const MotionSpan = motion.create("span");

export function LineShadowText({
  children,
  shadowColor = "black",
  className = "",
  ...props
}: LineShadowTextProps) {
  return (
    <MotionSpan
      style={{ "--shadow-color": shadowColor } as CSSProperties}
      className={[
        "relative z-0 inline-flex",
        "after:absolute after:left-[0.04em] after:top-[0.04em] after:content-[attr(data-text)]",
        "after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]",
        "after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent",
        "after:animate-line-shadow",
        className,
      ].join(" ")}
      data-text={children}
      {...props}
    >
      {children}
    </MotionSpan>
  );
}

export default LineShadowText;
