"use client";

import "./stroke-draw.css";

/**
 * Numerals drawn as a pen draws them, in Space Grotesk.
 *
 * A text "01" cannot do this: a glyph is a filled outline, and the only things
 * CSS can animate on it are colour, size and position. Path animation needs a
 * PATH — so the digits are here as paths.
 *
 * WHERE THESE CAME FROM. They are not drawn by hand. An earlier version was:
 * ten monoline strokes authored on a 10x16 grid "in the same spirit as" Space
 * Grotesk, which is exactly as close as that sounds — the 1 was a plain stem
 * where Space Grotesk has a wedge flag, the 4 was open where Space Grotesk
 * closes it, and beside real Space Grotesk headings the numerals read as a
 * different typeface, because they were one.
 *
 * These are extracted from the font itself: Space Grotesk's variable font at
 * wght 500, its outlines scaled so the cap height is 16 units, with the font's
 * OWN advance widths below. That last part matters — the digits are not
 * tabular here (1 is 9.94 units against 0 at 14.74), so spacing them on a
 * single fixed pitch would set "01" wrong in a way that is hard to name but
 * easy to see.
 *
 * REGENERATING. If the weight or the font ever changes, these are mechanical
 * output, not artwork — read the woff2 with fontTools, instantiate the wght
 * axis, and draw each glyph through an SVGPathPen with a (S, 0, 0, -S, 0, 16)
 * transform where S = 16 / capHeight.
 *
 * It is the glyph's CONTOUR that gets stroked, so the numeral draws as an
 * outline rather than as a single pen line. That is the honest trade for using
 * the real letterforms: a filled glyph has no skeleton to follow, and a
 * skeleton invented for it is what this replaced.
 *
 * `pathLength="1"` on every path is what makes one set of keyframes work for
 * all ten. It renormalises each path's length to 1 whatever its real length
 * is, so the dash animation draws a 1 and an 8 in the same time rather than
 * the 8 lagging because its outline is three times as long.
 */
const DIGITS: Record<string, string> = {
  "0": "M7.37 16.32Q4.58 16.32 2.92 14.73Q1.25 13.14 1.25 9.95V6.05Q1.25 2.92 2.92 1.3Q4.58 -0.32 7.37 -0.32Q10.17 -0.32 11.82 1.3Q13.48 2.92 13.48 6.05V9.95Q13.48 13.14 11.82 14.73Q10.17 16.32 7.37 16.32ZM7.37 14.18Q9.25 14.18 10.16 13.09Q11.08 12.01 11.08 10.04V5.93Q11.08 3.95 10.1 2.88Q9.13 1.82 7.37 1.82Q5.57 1.82 4.61 2.91Q3.65 3.99 3.65 5.93V10.04Q3.65 12.05 4.58 13.12Q5.51 14.18 7.37 14.18Z",
  "1": "M5.88 16V1.7H5.51L2.89 7.08H0.34L3.88 0H8.28V16Z",
  "2": "M1.09 16V14.2Q1.09 12.52 1.66 11.45Q2.23 10.38 3.3 9.7Q4.36 9.03 5.87 8.57L7.27 8.13Q8.21 7.83 8.88 7.4Q9.55 6.97 9.92 6.32Q10.29 5.68 10.29 4.79V4.7Q10.29 3.37 9.38 2.6Q8.47 1.82 6.97 1.82Q5.44 1.82 4.49 2.65Q3.54 3.47 3.54 5.07V5.45H1.16V5.1Q1.16 3.37 1.92 2.16Q2.68 0.95 4 0.32Q5.32 -0.32 6.97 -0.32Q8.61 -0.32 9.91 0.3Q11.21 0.92 11.95 2.04Q12.68 3.15 12.68 4.65V4.87Q12.68 6.41 12.06 7.45Q11.44 8.49 10.36 9.15Q9.28 9.81 7.87 10.26L6.52 10.67Q5.45 11 4.79 11.38Q4.13 11.76 3.83 12.28Q3.53 12.8 3.53 13.61V13.86H12.55V16Z",
  "3": "M6.94 16.32Q5.18 16.32 3.82 15.68Q2.45 15.04 1.68 13.83Q0.91 12.62 0.91 10.95V10.53H3.3V10.89Q3.3 12.41 4.31 13.29Q5.31 14.18 6.94 14.18Q8.59 14.18 9.51 13.35Q10.42 12.52 10.42 11.26V11.07Q10.42 10.17 9.98 9.62Q9.55 9.07 8.82 8.8Q8.08 8.54 7.18 8.54H4.27V5.79L9.9 2.46V2.14H1.3V0H12.51V3.25L7.13 6.44V6.76H8.12Q9.33 6.76 10.4 7.22Q11.47 7.68 12.14 8.61Q12.81 9.55 12.81 11.01V11.26Q12.81 12.79 12.08 13.93Q11.35 15.07 10.03 15.7Q8.71 16.32 6.94 16.32Z",
  "4": "M8.76 16V12.74H0.66V9.95L6.78 0H11.16V10.6H13.86V12.74H11.16V16ZM2.99 10.6H8.76V1.51H8.4L2.99 10.28Z",
  "5": "M6.91 16.32Q5.1 16.32 3.78 15.65Q2.45 14.99 1.73 13.78Q1.01 12.57 1.01 10.98V10.73H3.44V10.94Q3.44 12.4 4.35 13.29Q5.25 14.18 6.87 14.18Q8.54 14.18 9.46 13.26Q10.37 12.34 10.37 10.8V10.58Q10.37 9.09 9.47 8.21Q8.57 7.32 7.18 7.32Q6.39 7.32 5.88 7.56Q5.37 7.79 5.06 8.14Q4.75 8.48 4.55 8.81H1.51V0H12.23V2.17H3.91V6.88H4.27Q4.51 6.5 4.93 6.15Q5.35 5.79 6.03 5.56Q6.72 5.32 7.69 5.32Q9.1 5.32 10.25 5.93Q11.4 6.55 12.08 7.72Q12.77 8.89 12.77 10.56V10.82Q12.77 12.48 12.07 13.71Q11.36 14.95 10.05 15.63Q8.74 16.32 6.91 16.32Z",
  "6": "M7.11 16.32Q5.37 16.32 4.05 15.65Q2.73 14.98 1.99 13.77Q1.25 12.56 1.25 10.94V5.41Q1.25 3.54 2 2.27Q2.75 0.99 4.09 0.34Q5.43 -0.32 7.21 -0.32Q8.99 -0.32 10.27 0.29Q11.54 0.9 12.23 2Q12.91 3.11 12.91 4.59H10.48Q10.48 3.41 9.7 2.62Q8.91 1.82 7.21 1.82Q5.51 1.82 4.58 2.73Q3.65 3.64 3.65 5.24V7.16H4.02Q4.42 6.6 5.3 6.1Q6.17 5.6 7.79 5.6Q9.22 5.6 10.4 6.22Q11.58 6.83 12.3 7.98Q13.02 9.13 13.02 10.74V11.01Q13.02 12.6 12.27 13.8Q11.52 15 10.18 15.66Q8.85 16.32 7.11 16.32ZM7.14 14.18Q8.72 14.18 9.67 13.31Q10.62 12.45 10.62 10.97V10.79Q10.62 9.8 10.19 9.08Q9.76 8.36 8.97 7.95Q8.19 7.55 7.14 7.55Q6.1 7.55 5.31 7.95Q4.52 8.36 4.09 9.08Q3.65 9.8 3.65 10.79V10.97Q3.65 12.45 4.6 13.31Q5.55 14.18 7.14 14.18Z",
  "7": "M3.23 16V15.42Q3.23 14.57 3.36 13.98Q3.5 13.39 3.93 12.62L9.66 2.45V2.14H0.67V0H12.15V2.84L6.13 13.62Q5.84 14.12 5.73 14.52Q5.62 14.92 5.62 15.51V16Z",
  "8": "M6.99 16.32Q5.14 16.32 3.76 15.77Q2.38 15.21 1.61 14.18Q0.85 13.15 0.85 11.76V11.5Q0.85 10.35 1.29 9.61Q1.73 8.86 2.38 8.44Q3.03 8.03 3.6 7.89V7.53Q3.03 7.35 2.45 6.94Q1.86 6.52 1.48 5.82Q1.11 5.13 1.11 4.13V3.88Q1.11 2.6 1.85 1.66Q2.59 0.72 3.92 0.2Q5.24 -0.32 6.99 -0.32Q8.73 -0.32 10.05 0.2Q11.38 0.72 12.12 1.66Q12.86 2.6 12.86 3.88V4.13Q12.86 5.13 12.49 5.82Q12.11 6.52 11.54 6.94Q10.96 7.35 10.37 7.53V7.89Q10.96 8.03 11.6 8.44Q12.24 8.86 12.68 9.61Q13.12 10.35 13.12 11.5V11.76Q13.12 13.15 12.36 14.18Q11.59 15.21 10.21 15.77Q8.83 16.32 6.99 16.32ZM6.99 14.18Q8.74 14.18 9.73 13.5Q10.72 12.81 10.72 11.6V11.42Q10.72 10.2 9.75 9.52Q8.77 8.84 6.99 8.84Q5.22 8.84 4.23 9.52Q3.25 10.2 3.25 11.42V11.6Q3.25 12.81 4.24 13.5Q5.23 14.18 6.99 14.18ZM6.99 6.7Q8.62 6.7 9.54 6.09Q10.46 5.47 10.46 4.35V4.17Q10.46 3.05 9.53 2.44Q8.59 1.82 6.99 1.82Q5.38 1.82 4.44 2.44Q3.51 3.05 3.51 4.17V4.35Q3.51 5.47 4.43 6.09Q5.35 6.7 6.99 6.7Z",
  "9": "M6.85 16.32Q5.07 16.32 3.8 15.71Q2.52 15.1 1.83 13.99Q1.15 12.88 1.15 11.41H3.58Q3.58 12.59 4.38 13.38Q5.17 14.18 6.85 14.18Q8.57 14.18 9.49 13.26Q10.41 12.35 10.41 10.76V8.84H10.05Q9.64 9.4 8.77 9.9Q7.9 10.4 6.27 10.4Q4.87 10.4 3.67 9.78Q2.48 9.17 1.76 8.02Q1.04 6.86 1.04 5.26V4.99Q1.04 3.37 1.79 2.19Q2.54 1 3.88 0.34Q5.21 -0.32 6.95 -0.32Q8.7 -0.32 10.02 0.35Q11.34 1.02 12.07 2.23Q12.81 3.43 12.81 5.06V10.59Q12.81 12.45 12.06 13.73Q11.32 15.01 9.97 15.66Q8.63 16.32 6.85 16.32ZM6.92 8.45Q7.98 8.45 8.76 8.05Q9.54 7.64 9.98 6.92Q10.41 6.19 10.41 5.21V5.03Q10.41 3.54 9.46 2.68Q8.51 1.82 6.92 1.82Q5.34 1.82 4.39 2.68Q3.44 3.54 3.44 5.03V5.21Q3.44 6.19 3.87 6.92Q4.31 7.64 5.09 8.05Q5.88 8.45 6.92 8.45Z",
};

/** The font's own advance widths, in the same units as the paths. */
const ADVANCE: Record<string, number> = {
  "0": 14.743,
  "1": 9.943,
  "2": 13.669,
  "3": 13.851,
  "4": 14.4,
  "5": 13.691,
  "6": 14.057,
  "7": 12.777,
  "8": 13.966,
  "9": 14.057,
};

/* Space Grotesk's round digits overshoot the cap height a little at the top
   and sit a little under the baseline, which is what stops an O looking
   smaller than an H. The viewBox has to allow for it or the stroke is clipped
   flat across the top of every 0, 6, 8 and 9. */
const OVER = 0.55;

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
  /* Laid out on real advances rather than an index times a fixed pitch, so the
     pair is spaced the way the font spaces it. A scan rather than a cursor
     mutated inside map(): the running total is derived from the characters
     before each one, which is the same answer without a variable that changes
     while the component renders. */
  const placed = chars.map((c, i) => ({
    c,
    i,
    at: chars.slice(0, i).reduce((sum, prev) => sum + (ADVANCE[prev] ?? 0), 0),
  }));
  const width = chars.reduce((sum, c) => sum + (ADVANCE[c] ?? 0), 0);

  return (
    <span className={`sn ${className}`} style={{ "--sn-delay": `${delay}ms` } as React.CSSProperties}>
      {/* The real number stays in the DOM for screen readers, search and for
          anyone whose SVG never paints. The drawing is decoration on top. */}
      <span className="sn__t">{value}</span>
      <svg
        className="sn__svg"
        viewBox={`0 ${-OVER} ${width} ${16 + OVER * 2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {placed.map(({ c, i, at }) => {
          const d = DIGITS[c];
          if (!d) return null;
          return (
            <g key={`${c}-${i}`} transform={`translate(${at} 0)`}>
              <path className="sn__p" d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
            </g>
          );
        })}
      </svg>
    </span>
  );
}
