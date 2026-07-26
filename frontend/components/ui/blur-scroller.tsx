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

const ITEM_H = 68;
const VISIBLE = 5; // odd → one true centre slot
const MIDDLE = Math.floor(VISIBLE / 2);

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
 * A single word row. Blur / fade / scale are all derived from the row's live
 * distance to the scroll-driven centre, so items melt toward the edges while
 * the centred one stays razor-sharp.
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
  const dist = useTransform(center, (c) => Math.abs(index - c));
  const opacity = useTransform(dist, (d) => clamp(1 - d * 0.34, 0.05, 1));
  const scale = useTransform(dist, (d) => clamp(1 - d * 0.06, 0.8, 1));
  const filter = useTransform(dist, (d) =>
    blur ? `blur(${clamp(d * 2.6, 0, 10)}px)` : "none"
  );

  return (
    <motion.li
      style={{ height: ITEM_H, opacity, scale, filter }}
      className="flex origin-left items-center"
    >
      <span
        className={`font-heading leading-none tracking-tight transition-colors duration-300 ${
          active ? "font-bold text-white" : "font-semibold text-white/45"
        }`}
        style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.7rem)" }}
      >
        {word}
      </span>
    </motion.li>
  );
}

/**
 * Vertical "focus flow" word wheel. The active word is chosen by how far the
 * host section has scrolled through the viewport — as you scroll, the list
 * glides, the centred word snaps bold and the orange arrow nudges in.
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
  const smooth = useSpring(raw, { stiffness: 70, damping: 20 });
  const center = reduce ? raw : smooth;

  const listY = useTransform(center, (c) => (MIDDLE - c) * ITEM_H);

  const [active, setActive] = useState(0);
  useMotionValueEvent(center, "change", (c) =>
    setActive(clamp(Math.round(c), 0, N - 1))
  );

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: ITEM_H * VISIBLE,
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
        maskImage:
          "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
      }}
    >
      {/* Arrow pinned to the centre slot; re-keying on `active` nudges it in. */}
      <div
        className="pointer-events-none absolute left-0 z-10 flex items-center"
        style={{ top: ITEM_H * MIDDLE, height: ITEM_H }}
      >
        <motion.span
          key={active}
          initial={{ x: -10, opacity: 0.3 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="text-secondary"
        >
          <ArrowGlyph className="h-7 w-7" />
        </motion.span>
      </div>

      <motion.ul
        role="list"
        style={{ y: listY }}
        className="m-0 list-none p-0 pl-12"
      >
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
      </motion.ul>
    </div>
  );
}

export default BlurScroller;
