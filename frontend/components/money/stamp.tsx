import "./stamp.css";

/**
 * A rubber stamp for a money document.
 *
 * WHY IT IS DRAWN AND NOT AN IMAGE. There are nine of these and they differ
 * only in two words and a colour. Nine PNGs would be nine files to keep in
 * step, would not take the document's own ink, would blur on a retina screen
 * and would each cost a request; nine SVGs exported from a drawing tool would
 * be the same problem with better edges. One component draws all nine from the
 * same geometry, so a change to the ring is a change in one place, and the
 * whole thing is about 2KB of markup inside HTML that was being sent anyway.
 *
 * IT IS DECORATIVE, AND aria-hidden FOR A REASON. The status is already stated
 * in words at the top of every document that carries a stamp -- "Settled",
 * "Past its due date", "Received with thanks". A screen reader announcing it
 * again from the corner would be telling somebody the same fact twice in two
 * different wordings, which is worse than not saying it. The stamp is how a
 * SIGHTED reader gets that fact at a glance; the pill is how everybody gets
 * it.
 *
 * THE DISTRESS IS DETERMINISTIC. A real stamp is uneven, and the specks are
 * most of what makes this read as ink rather than as clip art. They come from
 * a hash of the speck's index rather than from `Math.random`, for the same
 * reason the confetti does: a random value in a render is impure, differs
 * between the server's markup and the client's, and would make this stamp
 * change shape every time the page was rebuilt.
 */

/* ------------------------------------------------------------- the statuses */

/**
 * WHAT EACH STAMP SAYS, AND WHY THE ARCS DIFFER.
 *
 * The reference for this was a "PAID / THANK YOU" stamp, and the temptation is
 * to keep "THANK YOU" on all nine. It cannot stay: thanking somebody on a
 * failed charge or a voided invoice reads as sarcasm. So the two arcs carry
 * the thing that is actually true of that state, and on the states that need
 * one they carry the next action rather than a pleasantry.
 */
import {STAMP_STATES,noise,circlePath,scallop,type StampStatus} from '@/lib/money/stamp-geometry';
export {STAMP_STATES,type StampStatus} from '@/lib/money/stamp-geometry';

export default function Stamp({
  status,
  /** Makes the SVG's internal ids unique when two stamps share a page. */
  seed,
  className = "",
}: {
  status: StampStatus;
  seed?: string;
  className?: string;
}) {
  const s = STAMP_STATES[status];
  const uid = `st-${status}-${(seed ?? "").replace(/[^a-zA-Z0-9]/g, "") || "0"}`;

  /* THE RADII ARE A STACK OF BANDS AND A GAP, worked out rather than picked.
     Reading inward from the rim: the scallop occupies 108 down to 97, the
     heavy ring 92 down to 85, and the arched words sit in the space between 85
     and the thin inner ring at 58. Capital letters set at 17 on a baseline of
     71 reach 85, which is the underside of the heavy ring exactly -- the first
     attempt put the baseline at 87 and the ascenders drove straight through
     it. */
  const C = 120;              // centre of a 240-unit square
  const R_OUT = 108;          // scalloped rim, outer edge
  const R_RING = 92;          // the heavy ring, outer edge
  const R_INNER = 58;         // the thin inner ring
  const R_TEXT = 71;          // baseline of the arched words

  /* The specks. Seventy is enough to read as worn ink and few enough that the
     path data stays small; sizes and positions are hashed from the index. */
  const specks = Array.from({ length: 70 }, (_, i) => {
    const a = noise(i, 1) * Math.PI * 2;
    const rad = 18 + noise(i, 2) * (R_OUT - 20);
    return {
      x: C + Math.cos(a) * rad,
      y: C + Math.sin(a) * rad,
      r: 0.8 + noise(i, 3) * 3.4,
    };
  });

  return (
    <svg
      className={`stamp stamp--${s.tone} ${className}`.trim()}
      viewBox="0 0 240 240"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* THE TWO ARCS, AND THE RULE THAT DECIDES THEIR DIRECTION.

            A glyph on a textPath stands at ninety degrees to the path, on its
            left. So for upright letters the path has to run left-to-right
            across the TOP of the circle and right-to-left across the BOTTOM.
            Get the second one wrong and the words do not simply sit at the
            bottom upside down -- the arc goes the long way round and both
            lines pile up at the top, mirrored, which is what happened here
            first time.

            Both run LEFT TO RIGHT, from 9 o'clock to 3 o'clock; only the
            sweep differs, and that is the whole trick. Sweep 1 takes the short
            way over the top, sweep 0 takes it under the bottom, and because
            the direction of travel is +x in both cases the glyphs stand up in
            both. Running the bottom arc backwards -- which is the intuitive
            thing to try, and the second thing that went wrong here -- puts the
            letters on their heads. */}
        <path
          id={`${uid}-top`}
          d={`M${C - R_TEXT},${C} A${R_TEXT},${R_TEXT} 0 0 1 ${C + R_TEXT},${C}`}
          fill="none"
        />
        <path
          id={`${uid}-bottom`}
          d={`M${C - R_TEXT},${C} A${R_TEXT},${R_TEXT} 0 0 0 ${C + R_TEXT},${C}`}
          fill="none"
        />
        {/* THE WEAR. Everything below is painted through this mask: white
            keeps the ink, black rubs it away. The specks are black, so each
            one lifts a little ink off wherever it lands -- rim, ring or
            letter -- which is how a worn stamp actually fails. Masking the
            whole mark at once is also one composite rather than one per
            element. */}
        <mask id={`${uid}-wear`}>
          <rect x="0" y="0" width="240" height="240" fill="#fff" />
          {specks.map((p, i) => (
            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(1)} fill="#000" />
          ))}
          {/* Two larger bites out of the rim, so the wear is not uniformly
              fine. A stamp pressed off-square loses a patch, not a dusting. */}
          <circle cx={C - 76} cy={C - 60} r="15" fill="#000" opacity=".4" />
          <circle cx={C + 70} cy={C + 56} r="12" fill="#000" opacity=".32" />
        </mask>
      </defs>

      <g mask={`url(#${uid}-wear)`} fill="currentColor">
        {/* EVERY BAND IS A FILL WITH A HOLE, not a stroke. A stroke thins
            evenly when the wear mask crosses it and reads as a faded line; a
            filled band loses bites out of its edge, which is what worn ink
            actually does. */}
        <path fillRule="evenodd" d={scallop(C, C, R_OUT, 28) + circlePath(C, C, R_OUT - 11)} />
        <path fillRule="evenodd" d={circlePath(C, C, R_RING) + circlePath(C, C, R_RING - 8)} />
        <path fillRule="evenodd" d={circlePath(C, C, R_INNER) + circlePath(C, C, R_INNER - 2.5)} />

        <text className="stamp__arc">
          <textPath href={`#${uid}-top`} startOffset="50%" textAnchor="middle">
            {`· ${s.top} ·`}
          </textPath>
        </text>
        <text className="stamp__arc">
          <textPath href={`#${uid}-bottom`} startOffset="50%" textAnchor="middle">
            {`· ${s.bottom} ·`}
          </textPath>
        </text>

        {/* The word. `textLength` with `spacingAndGlyphs` is what makes PAID
            and NOT COLLECTED both fill the same width without nine hand-tuned
            font sizes -- the glyphs stretch to the space rather than the type
            size changing per status. */}
        <text
          className="stamp__word"
          x={C}
          y={C + 12}
          textAnchor="middle"
          textLength={s.word.length > 7 ? 104 : 92}
          lengthAdjust="spacingAndGlyphs"
        >
          {s.word}
        </text>
      </g>
    </svg>
  );
}
