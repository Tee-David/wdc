"use client";

import "./stroke-draw.css";

/**
 * Numerals drawn as a single stroke, so they can animate the way a pen does.
 *
 * A text "01" cannot do this: a glyph is a filled outline, and the only things
 * CSS can animate on it are colour, size and position. Path animation needs a
 * PATH, so the digits are authored here as open monoline strokes on a 10x16
 * grid — the same proportions and the same geometric, slightly condensed feel
 * as Space Grotesk's figures, which is what the rest of the page sets numbers
 * in.
 *
 * `pathLength="1"` on every path is what makes one set of keyframes work for
 * all ten. It renormalises each path's length to 1 whatever its real length
 * is, so `stroke-dasharray: 1; stroke-dashoffset: 1 -> 0` draws a 4 and an 8
 * in exactly the same time, rather than the 8 lagging because it is twice as
 * long. Without it every digit would need its own dash values.
 *
 * 8 is the one digit that cannot be a single stroke: two closed bowls, so two
 * subpaths in one `d`. They draw together, which reads fine.
 */
const DIGITS: Record<string, string> = {
  "0": "M5 1.1C7.1 1.1 8.5 3.4 8.5 8S7.1 14.9 5 14.9 1.5 12.6 1.5 8 2.9 1.1 5 1.1Z",
  "1": "M2.4 4.3 5.3 1.3V14.9",
  "2": "M1.7 4.4C1.7 2.3 3.2 1.1 5.2 1.1S8.6 2.5 8.6 4.5C8.6 7.7 1.7 10.5 1.7 14.9H8.7",
  "3": "M1.8 3.1C2.6 1.8 3.8 1.1 5.3 1.1 7.2 1.1 8.5 2.4 8.5 4.1 8.5 6 7.1 7.3 5 7.3 7.4 7.3 8.9 8.7 8.9 10.9 8.9 13.4 7.1 14.9 4.9 14.9 3.2 14.9 2 14.3 1.3 13.2",
  "4": "M6.9 14.9V1.2L1.2 11.1H8.9",
  "5": "M8.2 1.2H2.6L2 7.4C2.8 6.6 3.9 6.2 5.1 6.2 7.4 6.2 8.9 7.9 8.9 10.5 8.9 13.2 7.2 14.9 4.8 14.9 3 14.9 1.8 14.2 1.2 13.1",
  "6": "M7.9 1.7C7.1 1.3 6.3 1.1 5.3 1.1 2.9 1.1 1.3 3.5 1.3 8.5 1.3 12.9 2.9 14.9 5.2 14.9 7.3 14.9 8.7 13.3 8.7 11.1 8.7 8.8 7.3 7.3 5.3 7.3 3.4 7.3 2 8.5 1.5 10.1",
  "7": "M1.4 1.2H8.6L4.2 14.9",
  "8": "M5 7.2C3 7.2 1.7 8.5 1.7 10.9 1.7 13.4 3.1 14.9 5 14.9S8.3 13.4 8.3 10.9C8.3 8.5 7 7.2 5 7.2ZM5 7.2C6.7 7.2 7.9 6 7.9 4.2 7.9 2.3 6.7 1.1 5 1.1S2.1 2.3 2.1 4.2C2.1 6 3.3 7.2 5 7.2Z",
  "9": "M2.1 14.3C2.9 14.7 3.7 14.9 4.7 14.9 7.1 14.9 8.7 12.5 8.7 7.5 8.7 3.1 7.1 1.1 4.8 1.1 2.7 1.1 1.3 2.7 1.3 4.9 1.3 7.2 2.7 8.7 4.7 8.7 6.6 8.7 8 7.5 8.5 5.9",
};

const W = 10;      // one digit's grid width
const GAP = 2.4;   // tracking between digits, in the same units

export default function StrokeNumber({
  value,
  className = "",
  /** ms added to every stroke in this numeral, for staggering a list. */
  delay = 0,
}: {
  /** Rendered as-is, so pad it yourself: "01", not 1. */
  value: string;
  className?: string;
  delay?: number;
}) {
  const chars = value.split("");
  const width = chars.length * W + (chars.length - 1) * GAP;

  return (
    <span className={`sn ${className}`} style={{ "--sn-delay": `${delay}ms` } as React.CSSProperties}>
      {/* The real number stays in the DOM for screen readers, search and for
          anyone whose SVG never paints. The drawing is decoration on top. */}
      <span className="sn__t">{value}</span>
      <svg
        className="sn__svg"
        viewBox={`0 0 ${width} 16`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {chars.map((c, i) => {
          const d = DIGITS[c];
          if (!d) return null;
          return (
            <g key={`${c}-${i}`} transform={`translate(${i * (W + GAP)} 0)`}>
              <path className="sn__p" d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
            </g>
          );
        })}
      </svg>
    </span>
  );
}
