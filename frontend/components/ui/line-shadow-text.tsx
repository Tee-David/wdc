"use client";

import { motion, type MotionProps } from "motion/react";
import type { CSSProperties, ElementType, HTMLAttributes } from "react";

interface LineShadowTextProps
  extends Omit<HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  shadowColor?: string;
  as?: ElementType;
  children: string;
}

/**
 * Magic UI's LineShadowText: the word is duplicated via `content: attr(data-text)`
 * on an ::after layer filled with a repeating diagonal gradient, clipped to the
 * glyphs and offset slightly — producing a hatched shadow that slides forever.
 */
export function LineShadowText({
  children,
  shadowColor = "black",
  className = "",
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent
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
    </MotionComponent>
  );
}

export default LineShadowText;
