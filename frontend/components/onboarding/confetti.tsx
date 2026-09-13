"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import "./confetti.css";

/**
 * A one-off celebration for the moment the brief is sent.
 *
 * NO LIBRARY. `canvas-confetti` is the obvious reach and it is about 7KB
 * gzipped plus a canvas, a `requestAnimationFrame` loop and a physics step per
 * particle per frame -- for four seconds of decoration on a screen somebody
 * sees once. The house rule is not to add a package for a small UI effect, and
 * this is the small UI effect that rule was written about. Seventy spans on
 * CSS keyframes cost no JavaScript at all after the first paint: the
 * compositor runs them on its own thread and the main thread stays free, which
 * matters because the thank-you screen renders in the same frame.
 *
 * TRANSFORM AND OPACITY, NOTHING ELSE. Every property animated here is one the
 * compositor can handle without asking layout or paint anything. A piece falls,
 * turns and fades in a single `transform`/`opacity` keyframe; nothing animates
 * `top`, `width` or a colour.
 *
 * IT ENDS. The layer removes itself once the last piece has landed, so no
 * animation is left running behind the page and seventy nodes are not sitting
 * in the DOM for the rest of the visit. A backgrounded tab throttles the
 * keyframes on its own; the timer below is what guarantees they stop even if
 * it does not.
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
   fall -- plus a beat. After this there is nothing left to see. */
const LIFE_MS = 6000;

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

export default function Confetti() {
  const calm = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), LIFE_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (calm || gone) return null;

  return (
    /* `aria-hidden` and out of the pointer's way. It is decoration: it must not
       be announced, must not take a tap meant for the button underneath, and
       must not be reachable by a keyboard. */
    <div className="ob-conf" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => {
        const left = noise(i, 1) * 100;
        /* Spread over a second, so the pieces arrive in waves rather than as
           one curtain dropped all at once. */
        const delay = noise(i, 2) * 1.1;
        const fall = 2.6 + noise(i, 3) * 1.7;
        /* Sideways drift, either way, so nothing falls in a straight line. */
        const drift = (noise(i, 4) - 0.5) * 26;
        const spin = 360 + noise(i, 5) * 900;
        const size = 6 + noise(i, 6) * 7;
        const colour = COLOURS[Math.floor(noise(i, 7) * COLOURS.length)];
        /* One piece in three is a circle. Mixed shapes are most of what makes
           a burst read as paper rather than as pixels. */
        const round = noise(i, 8) > 0.66;

        return (
          <i
            key={i}
            className={round ? "is-round" : undefined}
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * (round ? 1 : 1.6)}px`,
              background: colour,
              animationDelay: `${delay}s`,
              animationDuration: `${fall}s`,
              /* Read by the one keyframe block, so drift and spin differ per
                 piece without a block per piece. */
              ["--dx" as string]: `${drift}vw`,
              ["--spin" as string]: `${spin}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
