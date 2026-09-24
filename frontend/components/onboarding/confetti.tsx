"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "./confetti.css";

/**
 * A one-off celebration for the moment the brief is sent.
 *
 * NO LIBRARY. `canvas-confetti` is the obvious reach and it is about 7KB
 * gzipped plus a canvas, a `requestAnimationFrame` loop and a physics step per
 * particle per frame -- for four seconds of decoration on a screen somebody
 * sees once. The house rule is not to add a package for a small UI effect, and
 * this is the small UI effect that rule was written about. Seventy spans, each
 * handed one Web Animation, cost no JavaScript after the first frame: the
 * compositor runs them on its own thread and the main thread stays free, which
 * matters because the thank-you screen (or, after a tour, the whole dashboard)
 * renders in the same moment.
 *
 * WHY NOT CSS KEYFRAMES, which is what this used to be. One keyframe block
 * read each piece's drift and spin from custom properties, and a keyframe
 * that reads `var()` is one Safari will not hand to the compositor: it ran on
 * the main thread, so the moment the page behind it got busy (the tour
 * routing home, the sent screen rendering and scrolling) every piece froze
 * mid-air until the work was done. The values are now computed per piece and
 * given to `element.animate()` as plain pixels and degrees, which every
 * engine runs off the main thread.
 *
 * TRANSFORM AND OPACITY, NOTHING ELSE. Every property animated here is one the
 * compositor can handle without asking layout or paint anything. A piece falls,
 * turns and fades in a single `transform`/`opacity` keyframe; nothing animates
 * `top`, `width` or a colour.
 *
 * IT ENDS. The layer removes itself once the last piece has actually landed
 * (every animation's `finished`), so no animation is left running behind the
 * page and seventy nodes are not sitting in the DOM for the rest of the visit.
 * The timer below is only the backstop, in case a browser never settles them.
 *
 * AND IT DOES NOT RUN AT ALL FOR SOMEBODY WHO HAS ASKED FOR LESS MOTION.
 * Seventy objects falling across the whole screen is the exact thing that
 * setting means. They still get the tick, the heading and the warmth; they do
 * not get the storm. Refused in the component rather than hidden in CSS,
 * because seventy nodes nobody will ever see are still seventy nodes.
 */

/* Enough to read as "all over the screen" rather than as a handful of dots,
   few enough that a mid-range phone composites them without dropping the frame
   the screen appears on. Thinned further under 560px in the stylesheet. */
const PIECES = 70;
/* The longest a piece can be in flight -- the biggest delay plus the longest
   fall -- plus a beat. Only a backstop: the layer normally goes the moment the
   last piece finishes. */
const LIFE_MS = 6500;

/**
 * A scatter that looks random and is not.
 *
 * `Math.random()` during a render is impure: the compiler flags it, and two
 * renders would disagree about where a piece is. Generating the pieces in an
 * effect instead means setting state from an effect, which is the other rule.
 * Hashing the index gives numbers that are evenly spread, different for every
 * piece and every field, and identical on every render. It is the standard
 * fract(sin(x) * large) trick and it costs one multiply.
 */
const noise = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* The brand's two, plus the lighter partners that keep a burst from reading as
   a corporate colourway. Orange leads: this is a WDC moment. */
const COLOURS = ["#ff6500", "#000065", "#ffb066", "#4a4ad4", "#ff8a2b", "#ffd8b0"];

/* Read the way share.tsx reads `navigator.share`, and for the same reason: a
   value the server cannot know, taken on the client without the
   render-then-correct an effect would cause. This one does have something to
   subscribe to -- somebody can change the setting with the page open. */
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

type Piece = { left: number; delay: number; fall: number; drift: number; spin: number; size: number; colour: string; round: boolean };

const PIECE_LIST: Piece[] = Array.from({ length: PIECES }, (_, i) => {
  const round = noise(i, 8) > 0.66;
  return {
    left: noise(i, 1) * 100,
    /* Spread over a second, so the pieces arrive in waves rather than as one
       curtain dropped all at once. */
    delay: noise(i, 2) * 1100,
    fall: 2600 + noise(i, 3) * 1700,
    /* Sideways drift, either way, as a share of the screen's width, so
       nothing falls in a straight line. */
    drift: (noise(i, 4) - 0.5) * 0.26,
    spin: 360 + noise(i, 5) * 900,
    size: 6 + noise(i, 6) * 7,
    colour: COLOURS[Math.floor(noise(i, 7) * COLOURS.length)],
    /* One piece in three is a circle. Mixed shapes are most of what makes a
       burst read as paper rather than as pixels. */
    round,
  };
});

export default function Confetti() {
  const calm = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
  const [gone, setGone] = useState(false);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current;
    if (calm || !root) return;
    /* Measured once, at the start: plain numbers are what keep this on the
       compositor. A rotation mid-fall changes nothing anybody would see. */
    const width = window.innerWidth;
    const floor = window.innerHeight * 1.18;
    const running: Animation[] = [];
    root.querySelectorAll<HTMLElement>("i").forEach((node, i) => {
      /* Thinned out by the stylesheet on a phone: nothing to draw, nothing to run. */
      if (getComputedStyle(node).display === "none") return;
      const piece = PIECE_LIST[i];
      running.push(
        node.animate(
          [
            { opacity: 0, transform: "translate3d(0, 0, 0) rotate3d(1, 1, .4, 0deg)" },
            { opacity: 1, offset: 0.06 },
            /* Fades on the way out rather than vanishing at the floor, so the
               screen empties instead of blinking clear. */
            { opacity: 1, offset: 0.85 },
            { opacity: 0, transform: `translate3d(${Math.round(piece.drift * width)}px, ${Math.round(floor)}px, 0) rotate3d(1, 1, .4, ${Math.round(piece.spin)}deg)` },
          ],
          /* Linear, because paper falling at terminal velocity does not ease. */
          { duration: piece.fall, delay: piece.delay, easing: "linear", fill: "backwards" },
        ),
      );
    });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setGone(true);
    };
    Promise.all(running.map((a) => a.finished)).then(finish, () => undefined);
    const backstop = window.setTimeout(finish, LIFE_MS);
    return () => {
      done = true;
      window.clearTimeout(backstop);
      for (const a of running) a.cancel();
    };
  }, [calm]);

  if (calm || gone) return null;

  return (
    /* `aria-hidden` and out of the pointer's way. It is decoration: it must not
       be announced, must not take a tap meant for the button underneath, and
       must not be reachable by a keyboard. */
    <div className="ob-conf" aria-hidden="true" ref={layer}>
      {PIECE_LIST.map((piece, i) => (
        <i
          key={i}
          className={piece.round ? "is-round" : undefined}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * (piece.round ? 1 : 1.6)}px`,
            background: piece.colour,
          }}
        />
      ))}
    </div>
  );
}
