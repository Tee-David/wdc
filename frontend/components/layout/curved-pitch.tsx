"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
/* For `.cn__ruler` and `.cn__text`: the same measuring rules as the note. */
import "@/components/ui/curved-note.css";

/**
 * The footer's pitch on a phone, set on arcs that echo the subscribe box.
 *
 * SEVERAL LINES, EACH ON ITS OWN CONCENTRIC ARC. Text on a path cannot wrap,
 * so the sentence arrives already broken into lines and every line gets an arc
 * of its own around one shared centre. Concentric arcs keep the leading even
 * the whole way across, which is what makes three bent lines read as one
 * paragraph rather than three separate captions.
 *
 * THE BEND IS THE SUBSCRIBE BOX'S. Same ratio of arch to width, same floor and
 * ceiling as `newsletter.tsx`, measured from this element's own width, so the
 * pitch and the box below it bow by the same proportion at every phone width.
 *
 * IT SHRINKS TO FIT AND THEN STRAIGHTENS. Every line is measured at its nominal
 * size and the whole block takes the one scale the longest line needs, so the
 * lines stay the same size as each other. Below the floor the block renders as
 * ordinary wrapped text instead: a curve is not worth an unreadable sentence.
 * The server renders that plain version too, so nothing is hidden before the
 * script runs.
 */

const BEND_RATIO = 0.062;
const BEND_MIN = 10;
const BEND_MAX = 34;
const MIN_SCALE = 0.82;
const LEADING = 1.6;

const round = (n: number) => Math.round(n * 100) / 100;

export default function CurvedPitch({ lines, className }: { lines: string[]; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLSpanElement>(null);
  const rulers = useRef<(SVGTextElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [fontSize, setFontSize] = useState(0);
  const [lengths, setLengths] = useState<number[]>([]);
  const [fontTick, setFontTick] = useState(0);
  const text = lines.join(" ");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.round(el.clientWidth));
      setFontSize(parseFloat(getComputedStyle(el).fontSize) || 0);
    });
    ro.observe(el);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) setFontTick((t) => t + 1); });
    return () => { alive = false; ro.disconnect(); };
  }, []);

  useLayoutEffect(() => {
    try {
      const next = rulers.current.map((r) => (r ? r.getComputedTextLength() : 0));
      setLengths((prev) => (prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.5) ? prev : next));
    } catch {
      /* Nothing laid out to measure; the plain branch covers it. */
    }
  }, [lines, fontSize, fontTick, width]);

  /* The ruler lines, off canvas, measured at the nominal size in both
     branches so the block can discover it fits after a narrow moment. */
  const ruler = (
    <svg className="cn__ruler" aria-hidden="true" focusable="false">
      {lines.map((line, i) => (
        <text key={i} ref={(el) => { rulers.current[i] = el; }} style={{ fontSize: `${fontSize}px` }} xmlSpace="preserve">
          {line}
        </text>
      ))}
    </svg>
  );

  let geometry: null | { paths: string[]; height: number; size: number } = null;
  if (width > 40 && fontSize > 0 && lengths.length === lines.length && lengths.every((l) => l > 0)) {
    const bend = Math.min(BEND_MAX, Math.max(BEND_MIN, width * BEND_RATIO));
    /* The top line's circle: a chord of `width` with `bend` of arch. */
    const R = (width * width / 4 + bend * bend) / (2 * bend);
    const theta = Math.asin(Math.min(1, width / 2 / R));
    const step = fontSize * LEADING;
    const cx = width / 2;
    const cy = fontSize + R;

    const paths: string[] = [];
    let fit = Infinity;
    lines.forEach((_, i) => {
      const r = R - i * step;
      const x1 = cx - r * Math.sin(theta);
      const x2 = cx + r * Math.sin(theta);
      const y = cy - r * Math.cos(theta);
      paths.push(`M ${round(x1)} ${round(y)} A ${round(r)} ${round(r)} 0 0 1 ${round(x2)} ${round(y)}`);
      /* 20px held back at each end, so the widest line does not run into
         the edge of the screen. */
      fit = Math.min(fit, (r * 2 * theta - 40) / lengths[i]);
    });
    const scale = Math.min(1, fit);
    const last = R - (lines.length - 1) * step;
    const height = cy - last * Math.cos(theta) + fontSize * 0.4;
    if (scale >= MIN_SCALE) geometry = { paths, height, size: round(fontSize * scale) };
  }

  /* ONE WRAPPER IN BOTH BRANCHES, so the size observer keeps watching the same
     element when the block switches between plain and curved. */
  return (
    <span ref={box} className={`cp${className ? ` ${className}` : ""}`}>
      {geometry ? (
        <>
      {/* Read from here, not from the drawing: support for text inside
          `<textPath>` is too uneven to leave the one job of this line to. */}
      <span className="sr-only">{text}</span>
      <svg className="cp__svg" width={width} height={Math.ceil(geometry.height)} viewBox={`0 0 ${width} ${round(geometry.height)}`} aria-hidden="true" focusable="false">
        {geometry.paths.map((d, i) => (
          <g key={i}>
            <path id={`cp-${uid}-${i}`} d={d} fill="none" />
            <text style={{ fontSize: `${geometry.size}px` }} fill="currentColor" textAnchor="middle" xmlSpace="preserve">
              <textPath href={`#cp-${uid}-${i}`} startOffset="50%">{lines[i]}</textPath>
            </text>
          </g>
        ))}
      </svg>
        </>
      ) : (
        <span className="cn__text">{text}</span>
      )}
      {ruler}
    </span>
  );
}
