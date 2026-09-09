"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import type { RefObject } from "react";
import "./option-wheel.css";

const DEFAULT_ITEMS = [
  "Ambient",
  "House",
  "Techno",
  "Jazz",
  "Lo-Fi",
  "Synthwave",
  "Trance",
  "Funk",
  "Disco",
  "Hip-Hop",
  "Chillwave",
  "Drum & Bass",
];

interface OptionWheelProps {
  items?: string[];
  /** Section whose scroll progress turns the wheel. */
  targetRef: RefObject<HTMLElement | null>;
  onChange?: (index: number, item: string) => void;
  textColor?: string;
  activeColor?: string;
  side?: "left" | "right";
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  className?: string;
}

type Cfg = {
  count: number;
  items: string[];
  rowH: number;
  curve: number;
  tilt: number;
  blur: number;
  fade: number;
  minOpacity: number;
  side: "left" | "right";
  loop: boolean;
  smoothing: number;
};

const DEFAULT_CFG: Cfg = {
  count: DEFAULT_ITEMS.length,
  items: DEFAULT_ITEMS,
  rowH: 67,
  curve: 1,
  tilt: 6,
  blur: 2,
  fade: 0.25,
  minOpacity: 0.05,
  side: "left",
  loop: false,
  smoothing: 200,
};

/**
 * Scroll-linked OptionWheel (react-bits geometry): options sit on a circle
 * whose radius keeps the arc length between two neighbours equal to one row
 * height, so `tilt` curls the wheel without changing how far apart the words
 * read — that's the natural bend and flow. As the host section scrolls, the
 * wheel eases toward the scroll-derived position with exponential smoothing.
 */
const OptionWheel = ({
  items = DEFAULT_ITEMS,
  targetRef,
  onChange,
  textColor = "#a6a6a6",
  activeColor = "#ffffff",
  side = "left",
  fontSize = 3,
  spacing = 1.4,
  curve = 1,
  tilt = 6,
  blur = 2,
  fade = 0.25,
  minOpacity = 0.05,
  smoothing = 200,
  inset = 80,
  loop = false,
  className = "",
}: OptionWheelProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef(0);
  const targetRefInternal = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const cfgRef = useRef<Cfg>(DEFAULT_CFG);
  const onChangeRef = useRef(onChange);
  const selectedRef = useRef(0);
  const startLoopRef = useRef<(() => void) | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const remPx =
      typeof window !== "undefined"
        ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        : 16;
    cfgRef.current = {
      count: items.length,
      items,
      rowH: Math.max(fontSize * spacing * remPx, 1),
      curve,
      tilt,
      blur,
      fade,
      minOpacity,
      side,
      loop,
      smoothing,
    };
  }, [
    items,
    fontSize,
    spacing,
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
  ]);

  // Single rAF loop that eases the wheel position toward its target with
  // frame-rate independent exponential smoothing, then lays every option out
  // along the curve based on its distance from the current position.
  const runFrameRef = useRef<(now: number) => void>(() => {});
  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const cfg = cfgRef.current;
    const tau = Math.max(cfg.smoothing, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    const target = targetRefInternal.current;
    const cur = posRef.current;
    let next = cur + (target - cur) * k;
    const settled = Math.abs(target - next) < 0.001;
    if (settled) next = target;
    posRef.current = next;

    const els = itemRefs.current;
    const n = cfg.count;
    const mirror = cfg.side === "right" ? -1 : 1;
    // Options sit on a circle whose radius keeps the arc length between two
    // neighbors equal to one row height, so tilt controls how tightly it curls.
    const tiltRad = (cfg.tilt * Math.PI) / 180;
    const R = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0;
    for (let i = 0; i < n; i++) {
      const el = els[i];
      if (!el) continue;
      let d = i - next;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }
      const dist = Math.abs(d);
      let x = 0;
      let y = d * cfg.rowH;
      let rot = 0;
      if (R > 0) {
        const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
        y = R * Math.sin(ang);
        x = -mirror * R * (1 - Math.cos(ang)) * cfg.curve;
        rot = (mirror * ang * 180) / Math.PI;
      }
      el.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(
        2
      )}px - 50%)) rotate(${rot.toFixed(3)}deg)`;
      el.style.opacity = String(
        Math.max(cfg.minOpacity, 1 - dist * cfg.fade)
      );
      el.style.filter =
        cfg.blur > 0 ? `blur(${(dist * cfg.blur).toFixed(2)}px)` : "none";
      el.style.setProperty(
        "--ow-p",
        Math.max(0, 1 - Math.min(dist, 1)).toFixed(4)
      );
    }

    // Notify the active option when it changes (rounded, once per index).
    const idx = ((Math.round(next) % n) + n) % n;
    if (idx !== selectedRef.current) {
      selectedRef.current = idx;
      setSelectedIndex(idx);
      onChangeRef.current?.(idx, cfg.items[idx]);
    }

    rafRef.current = settled ? null : requestAnimationFrame(runFrameRef.current);
  }, []);

  useEffect(() => {
    runFrameRef.current = runFrame;
  }, [runFrame]);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  useEffect(() => {
    startLoopRef.current = startLoop;
  }, [startLoop]);

  // --- Scroll input: turn section scroll progress into a wheel position ---
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const cfg = cfgRef.current;
    const next = p * Math.max(cfg.count - 1, 0);
    if (next !== targetRefInternal.current) {
      targetRefInternal.current = next;
      startLoopRef.current?.();
    }
  });

  useEffect(() => {
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    fontSize,
    spacing,
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
  ]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    []
  );

  return (
    <div
      ref={rootRef}
      role="listbox"
      aria-label="Option wheel"
      className={`option-wheel${side === "right" ? " option-wheel--right" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={
        {
          "--ow-text-color": textColor,
          "--ow-active-color": activeColor,
          "--ow-font-size": `${fontSize}rem`,
          "--ow-inset": `${inset}px`,
        } as React.CSSProperties
      }
    >
      {items.map((label, index) => (
        <div
          key={`${label}-${index}`}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          role="option"
          aria-selected={selectedIndex === index}
          className={`option-wheel__item${
            selectedIndex === index ? " option-wheel__item--selected" : ""
          }`}
        >
          {label}
        </div>
      ))}
    </div>
  );
};

export default OptionWheel;
export { OptionWheel };
