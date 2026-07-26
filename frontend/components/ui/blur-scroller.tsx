"use client";

import { useState, type RefObject } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const RAD = Math.PI / 180;

// The wheel is a real circle seen edge-on: every word sits at an angle on a
// RADIUS-sized arc, so it swings out to the right and tilts as it recedes.
const RADIUS = 280;
const STEP = 16; // degrees between consecutive words
const ROW_H = 64;
// Five words visible at a time — the active one plus two either side.
const SPAN = 2;
const TRACK_H = Math.round(2 * RADIUS * Math.sin(SPAN * STEP * RAD) + ROW_H);

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
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
 * One word riding the arc. Its angle from the centred word drives everything:
 * position along the circle, tilt, blur, fade and scale.
 */
function ScrollWord({
  word,
  index,
  center,
  active,
  blur,
}: {
  word: string;
  index: number;
  center: MotionValue<number>;
  active: boolean;
  blur: boolean;
}) {
  const offset = useTransform(center, (c) => index - c);
  const dist = useTransform(offset, (o) => Math.abs(o));

  // Circle: y sweeps down the arc, x bulges right as the word rotates away.
  const y = useTransform(offset, (o) => RADIUS * Math.sin(o * STEP * RAD));
  const x = useTransform(
    offset,
    (o) => RADIUS * (1 - Math.cos(o * STEP * RAD))
  );
  const rotate = useTransform(offset, (o) => o * STEP);

  // Beyond the 5-word window the row is fully gone.
  const opacity = useTransform(dist, (d) =>
    d > SPAN + 0.5 ? 0 : clamp(1 - d * 0.42, 0, 1)
  );
  const scale = useTransform(dist, (d) => clamp(1 - d * 0.08, 0.72, 1));
  const filter = useTransform(dist, (d) =>
    blur ? `blur(${clamp(d * 3.5, 0, 12)}px)` : "none"
  );

  return (
    <motion.li
      style={{
        position: "absolute",
        left: 0,
        top: "50%",
        height: ROW_H,
        marginTop: -ROW_H / 2, // centre without touching the transform
        transformOrigin: "0% 50%",
        x,
        y,
        rotate,
        opacity,
        scale,
        filter,
      }}
      className="flex items-center whitespace-nowrap"
    >
      <span
        className={`font-heading leading-none tracking-tight transition-colors duration-200 ${
          active ? "font-bold text-white" : "font-semibold text-white/40"
        }`}
        style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.6rem)" }}
      >
        {word}
      </span>
    </motion.li>
  );
}

/**
 * Vertical "focus flow" word wheel. The active word is chosen by how far the
 * host section has scrolled through the viewport — as you scroll, the wheel
 * turns, the centred word snaps bold and the orange arrow nudges in.
 */
export function BlurScroller({
  words,
  targetRef,
}: {
  words: string[];
  targetRef: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const N = words.length;

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  // Hold on the first/last word at the extremes; cycle across the middle band.
  const raw = useTransform(scrollYProgress, [0.18, 0.82], [0, N - 1], {
    clamp: true,
  });
  const smooth = useSpring(raw, { stiffness: 120, damping: 22, mass: 0.4 });
  const center = reduce ? raw : smooth;

  const [active, setActive] = useState(0);
  useMotionValueEvent(center, "change", (c) =>
    setActive(clamp(Math.round(c), 0, N - 1))
  );

  return (
    <div
      className="relative"
      style={{
        height: TRACK_H,
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
        maskImage:
          "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
      }}
    >
      {/* Arrow pinned to the active word; re-keying on `active` nudges it in. */}
      <div className="pointer-events-none absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center">
        <motion.span
          key={active}
          initial={{ x: -10, opacity: 0.3 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 24 }}
          className="text-secondary"
        >
          <ArrowGlyph className="h-7 w-7" />
        </motion.span>
      </div>

      <ul role="list" className="relative m-0 h-full list-none p-0 pl-12">
        {words.map((w, i) => (
          <ScrollWord
            key={w + i}
            word={w}
            index={i}
            center={center}
            active={i === active}
            blur={!reduce}
          />
        ))}
      </ul>
    </div>
  );
}

export default BlurScroller;
