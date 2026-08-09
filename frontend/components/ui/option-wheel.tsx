"use client";

import { type CSSProperties, type RefObject } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "motion/react";

import "./option-wheel.css";

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const RAD = Math.PI / 180;

/** Geometry derived once per prop set — see `arc()` for what each value means. */
type Arc = {
  radius: number;
  tiltRad: number;
  /** +1 when the wheel reads left-to-right, -1 when mirrored. */
  mirror: 1 | -1;
  /** +1 swings receding options away from the gutter, -1 swings them toward it. */
  swingSign: 1 | -1;
  curve: number;
  /** Farthest a receding option travels sideways, in px. */
  maxSwing: number;
  /** Padding inside the track before the centred option starts. */
  inset: number;
  /** Track height that fits the whole visible span. */
  height: number;
};

/**
 * Options sit on a circle sized so the arc between two neighbours is exactly
 * one row height — `tilt` then controls how tightly the wheel curls without
 * changing how far apart the words read.
 *
 * `swing` decides which way that circle bulges. "out" (the default) throws
 * receding options away from the arrow gutter, so clearance only ever grows as
 * the wheel turns; "in" reproduces the stock react-bits look, where they curl
 * back toward the gutter and `inset` has to reserve room for the full swing.
 */
function arc(
  rowH: number,
  tilt: number,
  curve: number,
  span: number,
  side: "left" | "right",
  swing: "in" | "out",
  gap: number
): Arc {
  const tiltRad = tilt * RAD;
  const radius = rowH / tiltRad;
  const maxSwing = radius * (1 - Math.cos(span * tiltRad)) * curve;
  return {
    radius,
    tiltRad,
    mirror: side === "right" ? -1 : 1,
    swingSign: swing === "out" ? 1 : -1,
    curve,
    maxSwing,
    // Swinging outward needs no reservation — nothing moves toward the gutter.
    inset: Math.round(swing === "out" ? gap : maxSwing + gap),
    height: Math.round(2 * radius * Math.sin(span * tiltRad) + rowH),
  };
}

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h14M12 6l6 6-6 6" />
    </svg>
  );
}

/**
 * One option riding the arc. Its signed distance from the centred option
 * drives everything: position, tilt, fade, blur, scale and colour.
 */
function WheelOption({
  word,
  index,
  center,
  geom,
  rowH,
  span,
  fade,
  minOpacity,
  blurStrength,
  detent,
}: {
  word: string;
  index: number;
  center: MotionValue<number>;
  geom: Arc;
  rowH: number;
  span: number;
  fade: number;
  minOpacity: number;
  blurStrength: number;
  detent: boolean;
}) {
  const offset = useTransform(center, (c) => index - c);
  const dist = useTransform(offset, (o) => Math.abs(o));

  const angle = useTransform(offset, (o) =>
    clamp(o * geom.tiltRad, -Math.PI / 2, Math.PI / 2)
  );
  const y = useTransform(angle, (a) => geom.radius * Math.sin(a));
  // Sideways bulge along the circle. `swingSign` decides whether a receding
  // option pulls away from the arrow gutter or curls back toward it.
  const x = useTransform(
    angle,
    (a) =>
      geom.swingSign *
      geom.mirror *
      geom.radius *
      (1 - Math.cos(a)) *
      geom.curve
  );
  const rotate = useTransform(angle, (a) => (geom.mirror * a) / RAD);

  // Beyond the visible window the row is gone entirely.
  const opacity = useTransform(dist, (d) =>
    d > span + 0.5 ? 0 : clamp(1 - d * fade, minOpacity, 1)
  );
  const filter = useTransform(dist, (d) =>
    blurStrength > 0 ? `blur(${clamp(d * blurStrength, 0, 12).toFixed(2)}px)` : "none"
  );

  // `p` runs 0 -> 1 as the option reaches the centre. It feeds the colour and
  // weight ramp in CSS, and a cubic scale pop that lands right on the detent.
  const p = useTransform(dist, (d) => clamp(1 - Math.min(d, 1), 0, 1));
  const scale = useTransform(dist, (d) => {
    const base = clamp(1 - d * 0.08, 0.72, 1);
    if (!detent) return base;
    const t = clamp(1 - Math.min(d, 1), 0, 1);
    return base + 0.035 * t * t * t;
  });

  return (
    <motion.li
      className="option-wheel__item"
      style={{
        height: rowH,
        marginTop: -rowH / 2, // centre without spending the transform
        x,
        y,
        rotate,
        opacity,
        scale,
        filter,
        "--ow-p": p,
      } as MotionStyle}
    >
      <span className="option-wheel__label font-heading">{word}</span>
    </motion.li>
  );
}

export type OptionWheelProps = {
  words: string[];
  /** Section whose scroll progress turns the wheel. */
  targetRef: RefObject<HTMLElement | null>;
  side?: "left" | "right";
  /**
   * Which way receding options bulge. "out" throws them away from the arrow
   * gutter (clearance only grows); "in" is the stock react-bits curl back
   * toward it, paid for with a wider `inset`.
   */
  swing?: "in" | "out";
  /** CSS length for the option text; drives nothing in the geometry. */
  fontSize?: string;
  /** Vertical pitch between adjacent options, in px. */
  rowHeight?: number;
  /** Degrees of arc between adjacent options. Higher = tighter curl. */
  tilt?: number;
  /** 0 flattens the sideways swing, 1 is the full circle. */
  curve?: number;
  /** Options visible either side of the centred one. */
  span?: number;
  /** Opacity lost per option of distance. */
  fade?: number;
  minOpacity?: number;
  /** Blur px per option of distance. */
  blur?: number;
  /** Width of the reserved arrow column. */
  gutter?: number;
  /** Clearance between the gutter and the nearest an option ever gets to it. */
  gap?: number;
  textColor?: string;
  activeColor?: string;
  arrowClassName?: string;
  className?: string;
};

/**
 * Scroll-linked "focus flow" option wheel. As the host section scrolls through
 * the viewport the wheel turns, the centred option warms to `activeColor`, and
 * the arrow nudges in as each option settles.
 *
 * The arrow sits in its own reserved column outside the track's overflow box,
 * so no amount of curve, lag or font growth can make an option collide with it.
 */
export function OptionWheel({
  words,
  targetRef,
  side = "left",
  swing = "out",
  fontSize = "clamp(1.6rem, 3.2vw, 2.6rem)",
  rowHeight = 64,
  tilt = 16,
  curve = 1,
  span = 2,
  fade = 0.42,
  minOpacity = 0,
  blur = 3.5,
  gutter = 48,
  gap = 16,
  textColor = "rgba(255, 255, 255, 0.4)",
  activeColor = "#ffffff",
  arrowClassName = "text-secondary",
  className = "",
}: OptionWheelProps) {
  const reduce = useReducedMotion();
  const n = words.length;
  const geom = arc(rowHeight, tilt, curve, span, side, swing, gap);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  // Hold on the first/last option at the extremes; cycle across the middle band.
  const raw = useTransform(scrollYProgress, [0.18, 0.82], [0, Math.max(n - 1, 0)], {
    clamp: true,
  });
  // Slightly under-damped so the wheel settles onto each option with a small
  // overshoot — the tactile "click" — instead of gliding linearly past it.
  const smooth = useSpring(raw, { stiffness: 200, damping: 18, mass: 0.4 });
  const center = reduce ? raw : smooth;

  // Distance to the nearest detent, 0 (settled) -> 1 (mid-travel). The arrow
  // reads this continuous value rather than a discrete active index, so it can
  // never fall a frame behind the option it points at.
  const travel = useTransform(center, (c) =>
    clamp(Math.abs(c - Math.round(c)) * 2, 0, 1)
  );
  const arrowX = useTransform(travel, (t) => -8 * t * geom.mirror);
  const arrowOpacity = useTransform(travel, (t) => 1 - 0.55 * t);

  return (
    <div
      className={`option-wheel${side === "right" ? " option-wheel--right" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={
        {
          height: geom.height,
          "--ow-text-color": textColor,
          "--ow-active-color": activeColor,
          "--ow-font-size": fontSize,
          "--ow-inset": `${geom.inset}px`,
          "--ow-gutter": `${gutter}px`,
          "--ow-swing": `${Math.round(geom.maxSwing)}px`,
        } as CSSProperties
      }
    >
      {/* Reserved arrow column — physically outside the track below. */}
      <div className="option-wheel__gutter" aria-hidden="true">
        <motion.span
          className={`option-wheel__arrow ${arrowClassName}`}
          style={{ x: arrowX, opacity: arrowOpacity }}
        >
          <ArrowGlyph className="h-8 w-8 drop-shadow-[0_2px_6px_rgba(255,101,0,0.45)]" />
        </motion.span>
      </div>

      {/* Fade the edge the options swing toward, so the outermost ones
          dissolve at the track boundary instead of clipping mid-word. */}
      <div
        className={`option-wheel__track option-wheel__track--fade-${
          geom.swingSign * geom.mirror > 0 ? "right" : "left"
        }`}
      >
        <ul role="list" className="option-wheel__list">
          {words.map((word, i) => (
            <WheelOption
              key={`${word}-${i}`}
              word={word}
              index={i}
              center={center}
              geom={geom}
              rowH={rowHeight}
              span={span}
              fade={fade}
              minOpacity={minOpacity}
              blurStrength={reduce ? 0 : blur}
              detent={!reduce}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default OptionWheel;
