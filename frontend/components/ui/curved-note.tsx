"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildGeometry, bentLinePath } from "./curved-input";
import "./curved-note.css";

/**
 * A line of helper text bent along the SAME arc as the curved input above it.
 *
 * WHY IT SHARES THE BAR'S GEOMETRY RATHER THAN COPYING ITS SHAPE. A second
 * curve tuned by eye to look about right is a curve that stops matching the
 * moment the bend does, and the bend here is derived from the measured width,
 * so it changes on every resize. This calls `buildGeometry` with the arguments
 * the bar itself passes and reads points off the result. The two are the same
 * circle by construction rather than by eye.
 *
 * THE OFFSET IS CONSTANT, WHICH IS WHAT MAKES IT READ AS PARALLEL. `v` in that
 * geometry is distance from the bar's centreline, so `height / 2 + gap` is a
 * fixed distance below the bar's bottom edge the whole way along. That is a
 * CONCENTRIC arc, not a scaled copy, so it is very slightly shorter than the
 * bar. An arc drawn inside another one is; the small inset is correct rather
 * than a flaw to cancel out.
 *
 * NOTHING ABOUT THE COORDINATES IS RE-DERIVED, the vertical padding included.
 * The SVG takes an OFFSET viewBox cropped to the band the text occupies, so
 * every number in the path is the bar's own number and any constant vertical
 * shift between the two SVGs cancels itself out.
 *
 * IT SHRINKS TO FIT AND THEN GIVES UP HONESTLY. Text on a path cannot wrap, so
 * a sentence wider than the arc is clipped silently. The rendered length is
 * measured and the size steps down to fit; below the floor it stops pretending
 * and renders as ordinary text that wraps, which is what a narrow column wants
 * anyway. A curve is not worth losing a word over.
 *
 * WHAT DOES NOT BELONG IN HERE: anything whose length changes at runtime. An
 * error message is exactly that, and the footer keeps those as plain text.
 */

/* The type steps down this far and no further. Below it the line is too small
   to read comfortably, and a wrapped paragraph beats a beautifully curved
   sentence nobody can make out. */
const MIN_SCALE = 0.82;

type Props = {
  text: string;
  /** The bar's measured width in px: the same number the bar was given. */
  width: number;
  /** The bar's sagitta in px: the same number the bar was given. */
  bend: number;
  /** The bar's height in px: the same number the bar was given. */
  height: number;
  /** The bar's border width, so the two `buildGeometry` calls are identical. */
  borderWidth?: number;
  fontSize?: number;
  /** Distance from the bar's bottom edge to the text's baseline, in px.
      Real, because the note is welded to the bar's coordinate space. */
  gap?: number;
  color?: string;
  className?: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

export default function CurvedNote({
  text,
  width,
  bend,
  height,
  borderWidth = 1.5,
  fontSize = 13,
  gap = 24,
  color,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const pathId = `cn-${uid}`;
  const rulerRef = useRef<SVGTextElement | null>(null);
  const [textLen, setTextLen] = useState(0);
  const [fontTick, setFontTick] = useState(0);

  /* Re-measured once webfonts land, for the reason the bar does the same: a
     sentence measured in the fallback face is measured wrong, and wrong here
     means either a clipped word or a needlessly shrunken line. */
  useEffect(() => {
    let alive = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (alive) setFontTick((t) => t + 1); });
    }
    return () => { alive = false; };
  }, []);

  useLayoutEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    try {
      const len = el.getComputedTextLength();
      setTextLen((prev) => (Math.abs(prev - len) > 0.5 ? len : prev));
    } catch {
      /* Nothing laid out to measure. The plain branch below covers it. */
    }
  }, [text, fontSize, fontTick]);

  const arc = useMemo(() => {
    if (width <= 2) return null;
    /* IDENTICAL to the bar's own call. `pad` is the expression from
       curved-input.tsx. It only shifts everything down by a constant, which
       the cropped viewBox takes off again, but keeping the call identical
       means there is one formula rather than two that have to agree. */
    const pad = Math.ceil(borderWidth / 2) + 6;
    const g = buildGeometry(width, bend, height, pad);
    /* A straight bar wants a straight caption, and a straight caption is
       better as real text: it wraps, it can be selected, and it costs nothing
       to draw. */
    if (g.straight || !g.R) return null;

    const v = height / 2 + gap;
    const d = bentLinePath(g, 0, width, v);

    /* The band the text occupies, in the bar's own coordinates. The arc is
       highest in the middle and lowest at its ends, so the crop runs from the
       apex less the ascent to the ends plus the descent. */
    const apexY = g.point(width / 2, v)[1];
    const endY = g.point(0, v)[1];
    const top = apexY - fontSize * 0.95;
    const bottom = endY + fontSize * 0.36;

    /* How much arc the sentence has to fit in. `uPerLen` converts arc length
       into the flat u coordinate, so dividing by it converts back, and the
       radius ratio accounts for this arc sitting inside the centreline one.
       8px is held back at each end so the first and last letters are not
       flush with the bar's corners. */
    const usable = ((width - 16) / g.uPerLen) * ((g.R - v) / g.R);

    /* THE TWO SVGS ARE SEPARATE BOXES, AND THAT IS WHERE THE GAP GOT LOST.
       Both draw at scale 1 into the same coordinate system, but stacked by
       normal flow the note's box begins wherever the bar's box ends, and the
       bar's box carries the arc's own dip plus its padding underneath it. The
       measured result was a 45px gap from a `gap` of 15: the number was not
       controlling anything.

       Pulling the note up by the difference welds the two coordinate spaces
       back together, so `gap` becomes the true distance from the bar's bottom
       edge to the text's baseline and the note sits exactly where the geometry
       says it should. */
    return { d, top, height: bottom - top, usable, lift: top - g.svgH };
  }, [width, bend, height, borderWidth, fontSize, gap]);

  /* Measured at the NOMINAL size, so this ratio is the scale that would fit.
     Measuring the visible text would measure whatever size it has already been
     shrunk to, and the ratio would chase itself smaller every render. */
  const scale = arc && textLen > arc.usable ? arc.usable / textLen : 1;
  const curved = arc !== null && (textLen === 0 || scale >= MIN_SCALE);
  const size = round(fontSize * Math.min(1, scale));

  /* ONE RULER, RENDERED IN BOTH BRANCHES, so the measurement survives a switch
     between them. Without it the plain branch would have nothing to measure,
     could never discover that the sentence now fits, and would never curve
     again after one narrow moment. */
  const ruler = (
    <svg className="cn__ruler" aria-hidden="true" focusable="false">
      <text ref={rulerRef} style={{ fontSize: `${fontSize}px` }} xmlSpace="preserve">
        {text}
      </text>
    </svg>
  );

  /* PLAIN TEXT, AND NOT AS A FAILURE. This is the branch a narrow footer
     column takes, where the sentence needs two lines, and two lines on
     concentric arcs would be a stunt rather than a design. */
  if (!curved) {
    return (
      <span className={`cn__plain${className ? ` ${className}` : ""}`} style={{ color }}>
        {/* The sentence in its own node rather than loose in the wrapper, so
            the wrapper's text content is the sentence and nothing else. Loose,
            it shared a parent with the ruler, and anything reading the parent
            whole read the sentence twice. */}
        <span className="cn__text">{text}</span>
        {ruler}
      </span>
    );
  }

  return (
    <span className={`cn__wrap${className ? ` ${className}` : ""}`}>
      {/* THE SENTENCE IS ANNOUNCED FROM HERE, NOT FROM THE SVG. Screen reader
          support for text inside `<textPath>` is uneven enough that the one
          thing this line has to do, being read, would be left to chance. The
          drawing is marked decorative and the words are carried by a plain
          node beside it, which is also what a text-selection tool copies. */}
      <span className="sr-only">{text}</span>
      <svg
        className="cn__svg"
        style={{ marginTop: `${round(arc.lift)}px` }}
        width={width}
        height={Math.ceil(arc.height)}
        viewBox={`0 ${round(arc.top)} ${width} ${round(arc.height)}`}
        aria-hidden="true"
        focusable="false"
      >
        <path id={pathId} d={arc.d} fill="none" />
        <text style={{ fontSize: `${size}px` }} fill={color} textAnchor="middle" xmlSpace="preserve">
          <textPath href={`#${pathId}`} startOffset="50%">{text}</textPath>
        </text>
      </svg>
      {ruler}
    </span>
  );
}
