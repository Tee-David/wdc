"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The contract every service stage inherits.
 *
 * Six interactive stages on one page is how a marketing site ends up with a
 * three-second interaction delay, so nothing here mounts until it is near the
 * viewport, and every stage declares three states rather than bolting them on:
 *
 *   full     desktop, motion allowed  — the whole idea
 *   compact  narrow screens           — fewer moving parts, same point
 *   still    prefers-reduced-motion   — the end state, no animation
 *
 * `useStageMotion` returns which of those a stage should render, so the
 * decision is made in one place instead of six.
 */

/**
 * IS THIS STAGE ACTUALLY ON SCREEN RIGHT NOW?
 *
 * `useNearViewport` below LATCHES: it exists to mount a stage once and then
 * get out of the way. That is right for mounting and wrong for running. Six
 * stages mount as you scroll down /services and then every one of them keeps
 * its timers going for the rest of the visit, off screen, forever -- on top of
 * seven marquees doing the same. Measured on that page at 4x CPU throttling
 * against an identical scroll of the homepage: 1,356 style recalculations and
 * 293 layouts versus 1,608 and 129, and a CPU profile that was 81.6%
 * `(program)` -- style, layout and paint, not script. The stages were paying
 * rendering cost for demos nobody could see.
 *
 * This context carries the live/not-live signal down to the stages that run
 * timers, so they can stand down when they scroll away and pick up when they
 * come back. Default `true`: a stage rendered outside a LazyStage (a test, a
 * story, a future page) must animate, not sit frozen.
 */
const StageLiveContext = createContext(true);

/** True while this stage is on screen. Pause timers when it is false. */
export function useStageLive() {
  return useContext(StageLiveContext);
}

/** True once the element is within `margin` of the viewport. Latches on. */
export function useNearViewport<T extends HTMLElement>(margin = "300px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer (or a very old browser) must never mean "no content" — but
    // set it on the next frame rather than synchronously, so the effect does
    // not cascade a second render on mount.
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return { ref, near };
}

export type StageMode = "full" | "compact" | "still";

/**
 * Resolves the render mode. Starts as "still" so the server HTML and the first
 * client paint agree — the animated modes are opted into after hydration,
 * which also means a JS failure leaves the readable end state on screen.
 */
export function useStageMotion(compactUnder = 768): StageMode {
  const [mode, setMode] = useState<StageMode>("still");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia(`(max-width: ${compactUnder - 1}px)`);
    const resolve = () =>
      setMode(reduce.matches ? "still" : narrow.matches ? "compact" : "full");
    resolve();
    reduce.addEventListener("change", resolve);
    narrow.addEventListener("change", resolve);
    return () => {
      reduce.removeEventListener("change", resolve);
      narrow.removeEventListener("change", resolve);
    };
  }, [compactUnder]);

  return mode;
}

/**
 * The frame. Identical for all six stages — same radius, border, fill and
 * proportions — so wildly different insides still read as siblings.
 */
export function Stage({
  caption,
  children,
  controls,
  tall = false,
}: {
  /* Optional. A caption that only restates what the frame already shows --
     "illustrative screens", "real campaign artwork" -- is a line of grey text
     buying nothing, and it costs the stage a row of height. Stages keep one
     only where it says something the picture cannot. */
  caption?: string;
  children: ReactNode;
  /** Filters or switches for this stage. Rendered above the frame in the same
      place every time, so the eye learns where the controls live once. */
  controls?: ReactNode;
  tall?: boolean;
}) {
  return (
    <figure className={`sv-stage${tall ? " sv-stage--tall" : ""}`}>
      {controls ? <div className="sv-stage__controls">{controls}</div> : null}
      {/* The caption lives INSIDE the frame, on its own row along the bottom.

          Under the frame it was a subtitle: a line of grey text that pushed
          the stage up, added a row of height to every section, and read as
          something the layout had left over. Several of these carry a
          disclosure that has to stay — "illustrative, not a client's data" is
          the sentence that keeps the panel honest — so the answer is to move
          it onto the artwork it is about, not to delete it.

          It is a ROW, not an overlay. Floated over the artwork on a scrim it
          landed on whatever the stage had put at its own bottom edge — the
          web stage's chips, the terminal's last two lines, the handset's
          platform label — and a gradient over live content is not spacing, it
          is a smudge. So the frame is a column: `__area` takes the height,
          the caption takes what it needs, and nothing can overlap anything. */}
      <div className="sv-stage__frame">
        <div className="sv-stage__area">{children}</div>
        {caption ? <figcaption className="sv-stage__cap">{caption}</figcaption> : null}
      </div>
    </figure>
  );
}

/**
 * Wraps a stage so its work starts only once it is close to being seen. The
 * placeholder holds the same height, so nothing below it jumps when the real
 * stage arrives.
 */
export function LazyStage({
  children,
  withControls = false,
}: {
  children: ReactNode;
  /** Does the stage inside render a controls row? The placeholder has to
      reserve it, or the page GROWS as stages mount — which moves every scroll
      target below them mid-animation and lands anchor links hundreds of pixels
      off their section. */
  withControls?: boolean;
}) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const [live, setLive] = useState(false);

  /* THE BOX MAY GROW. IT MAY NOT SHRINK.

     Measured on the live /services/seo at 390px: the skeleton stood 511px tall,
     and in the frame where it handed over, the real stage was 26px -- it has
     not measured itself yet -- before settling at 653px. Two layout shifts,
     0.18 and 0.24, for a page CLS of 0.42 against a 0.1 budget, and the whole
     of it came from that one collapse.

     The skeleton "holds the same height" only where the stylesheet gives the
     showcase a height to hold: those rules live in the desktop two-column
     media query, so on a phone there was nothing underneath it at all.

     Rather than teach this component the height of six different stages at
     every width, it remembers the height it was already occupying and refuses
     to go below it. The floor is dropped again once the stage has settled, so
     a stage that legitimately wants to be shorter later still can be. */
  const floor = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    /* A MONOTONIC FLOOR: the box remembers the tallest it has ever been and
       refuses to go below it.

       The first attempt released the floor after two frames, on the assumption
       that the stage would have laid itself out by then. At 4x CPU throttling
       it had not -- so the floor was dropped while the stage was still 26px
       tall and the release became a THIRD shift. Page CLS went from 0.42 to
       0.79. Guessing at a settle time was the mistake, not the floor.

       There is nothing to guess here: whatever the box has legitimately
       occupied, it may occupy again. Growth still moves the page once, but
       growth mostly happens 200px before the stage is on screen, where it
       costs nothing. The collapse was the expensive half and it cannot
       happen now. */
    const hold = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (h > floor.current) {
        floor.current = h;
        el.style.minHeight = `${Math.round(h)}px`;
      }
    });
    hold.observe(el);
    return () => hold.disconnect();
  }, [ref]);

  return (
    <div ref={ref} className="sv-lazy">
      {near ? <StageLiveContext.Provider value={live}>{children}</StageLiveContext.Provider> : (
        // The caption sits INSIDE the frame now, so it adds no height and
        // reserving a row for it would make this placeholder taller than the
        // stage that replaces it -- the exact jump it exists to prevent.
        <div className="sv-stage sv-stage--skeleton" aria-hidden="true">
          {withControls ? <div className="sv-stage__controls" /> : null}
          <div className="sv-stage__frame"><div className="sv-stage__area" /></div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Micro-interaction kit.

   Shared so the page has one interaction vocabulary rather than six. Each piece
   is inert until it is asked to run, and every one of them has a defined
   resting state, because "the animation never fired" has to still look right.
   --------------------------------------------------------------------------- */

/**
 * Counts to `to` once `active`. Eased, not linear — a linear count reads
 * mechanical, and the deceleration is what makes it feel like it settled.
 * Returns `to` immediately when inactive, so the still state is the end state.
 */
export function useCountUp(to: number, active: boolean, ms = 1600) {
  const [n, setN] = useState(0);

  useEffect(() => {
    // the inactive value is DERIVED on the way out, not written here: setting
    // state synchronously in an effect cascades a second render on every mount
    if (!active) return;
    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ms);
      /* easeOutExpo: most of the distance goes early, then it settles. A
         counter on a cubic curve reads as sliding to a stop; this one reads as
         landing on the figure. */
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setN(to * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, active, ms]);

  // inactive means still: the end state, immediately
  return active ? n : to;
}

/**
 * The one control shared by every stage that filters or switches. A single
 * component keeps the interaction identical across six sections — same hit
 * area, same active treatment, same keyboard behaviour — which is most of what
 * stops "one bespoke thing per service" reading as six different websites.
 */
export function TabRow<T extends { id: string; label: string }>({
  items,
  value,
  onChange,
  label,
  size = "md",
}: {
  items: readonly T[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={`sv-tabs sv-tabs--${size}`} role="tablist" aria-label={label}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`sv-tab${on ? " is-on" : ""}`}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
