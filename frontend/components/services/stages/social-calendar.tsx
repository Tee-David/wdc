"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNearViewport } from "./stage-shell";

/**
 * The content calendar, scheduling itself.
 *
 * The brief asked for looping GIFs of someone clicking and typing in a
 * calendar. This is that, built rather than filmed: a GIF of a product we do
 * not ship would have to be staged anyway, and a rendered one is sharp at any
 * size, follows the theme, costs a few kilobytes instead of several megabytes,
 * and holds still for anyone who asked for no motion. Nothing here claims to be
 * a screen recording of a real tool.
 *
 * The loop is a short script rather than a physics simulation: move the
 * pointer, press, drop a post into a day, type its title, move on. It runs on a
 * chain of timeouts and only while the panel is near the viewport, so a page
 * with six stages is not paying for an animation nobody is looking at.
 */

type Slot = { day: number; label: string; kind: "organic" | "paid" | "story"; at: string };

/* The posts the script schedules, in order. Day numbers are positions in the
   rendered month grid, so the pointer target and the chip cannot disagree. */
const SCRIPT: Slot[] = [
  { day: 9,  label: "Behind the build", kind: "organic", at: "9:41" },
  { day: 12, label: "Client story",     kind: "paid",    at: "14:00" },
  { day: 17, label: "Studio reel",      kind: "story",   at: "18:30" },
  { day: 23, label: "Launch teaser",    kind: "organic", at: "11:15" },
];

/* Posts already on the calendar before the script runs, so it never starts from
   an empty month — an empty grid reads as a broken component. */
const SEEDED: Slot[] = [
  { day: 2,  label: "New episode",   kind: "organic", at: "8:00" },
  { day: 5,  label: "Weekend sound", kind: "story",   at: "12:30" },
  { day: 14, label: "Cup of tea",    kind: "paid",    at: "14:00" },
  { day: 20, label: "Sneak peek",    kind: "organic", at: "17:00" },
];

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/* A 35-cell month starting on a Wednesday: the leading blanks are what make it
   read as a real month rather than a 7x5 table of numbers. */
const LEAD = 3;
const IN_MONTH = 30;

export default function SocialCalendar({ run }: { run: boolean }) {
  const { ref, near } = useNearViewport<HTMLDivElement>("120px");
  const live = run && near;

  /* `step` is how far through the script we are; `typed` is how much of the
     current title has been written. Both reset together when the loop wraps. */
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const [pressing, setPressing] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!live) return;
    /* Every state change below is deferred by at least a frame. Setting state
       synchronously in an effect body cascades a second render on mount, which
       for a stage that mounts as it scrolls into view is a jank you can see. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* Reduced motion gets the finished month, not a frozen half-written one. */
      const id = requestAnimationFrame(() => { setStep(SCRIPT.length); setTyped(99); });
      return () => cancelAnimationFrame(id);
    }
    const wait = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };
    const cycle = (i: number) => {
      if (i >= SCRIPT.length) {
        wait(2600, () => { setStep(0); setTyped(0); cycle(0); });
        return;
      }
      setStep(i);
      setTyped(0);
      /* press the button, then the chip lands, then the title types */
      setPressing(true);
      wait(260, () => setPressing(false));
      wait(700, () => {
        const title = SCRIPT[i].label;
        const type = (c: number) => {
          setTyped(c);
          if (c < title.length) wait(38, () => type(c + 1));
          else wait(900, () => cycle(i + 1));
        };
        type(1);
      });
    };
    const kick = requestAnimationFrame(() => cycle(0));
    const t = timers.current;
    return () => {
      cancelAnimationFrame(kick);
      t.forEach(clearTimeout);
      t.length = 0;
    };
  }, [live]);

  const placed = SCRIPT.slice(0, step);
  const current = step < SCRIPT.length ? SCRIPT[step] : null;
  const all = [...SEEDED, ...placed];

  const cells = Array.from({ length: 35 }, (_, i) => {
    const n = i - LEAD + 1;
    return { n, inMonth: n >= 1 && n <= IN_MONTH, key: i };
  });

  return (
    <div className={`cal${live ? " is-live" : ""}`} ref={ref}>
      <div className="cal__bar">
        <span className="cal__month">September</span>
        <span className={`cal__new${pressing ? " is-press" : ""}`} aria-hidden="true">
          <i />Create post
        </span>
      </div>

      <div className="cal__grid" aria-hidden="true">
        {DAYS.map((d) => <span className="cal__dow" key={d}>{d}</span>)}
        {cells.map((c) => {
          const posts = c.inMonth ? all.filter((p) => p.day === c.n) : [];
          const isTarget = !!current && c.n === current.day;
          return (
            <span className={`cal__cell${c.inMonth ? "" : " is-out"}${isTarget ? " is-target" : ""}`} key={c.key}>
              <b className="cal__n">{c.inMonth ? c.n : ""}</b>
              {posts.map((p) => (
                <span className={`cal__chip is-${p.kind}`} key={p.label}>{p.label}</span>
              ))}
              {/* the one being written right now */}
              {isTarget && typed > 0 ? (
                <span className={`cal__chip is-${current.kind} is-new`}>
                  {current.label.slice(0, typed)}
                  <i className="cal__caret" />
                </span>
              ) : null}
            </span>
          );
        })}
      </div>

      {/* The pointer. Parked off the grid until the script starts, and moved by
          a custom property so one transition covers every hop. */}
      {live && current ? (
        <span
          className="cal__cursor"
          aria-hidden="true"
          style={{
            "--cx": `${((LEAD + current.day - 1) % 7) * 14.28 + 7}%`,
            "--cy": `${Math.floor((LEAD + current.day - 1) / 7) * 18 + 26}%`,
          } as CSSProperties}
        >
          <svg viewBox="0 0 16 18"><path d="M1 1l12 9-5.2.8L11 17l-2.6 1-3-6L1 15z" /></svg>
        </span>
      ) : null}

      <p className="sr-only">
        An illustrative content calendar: {all.length} posts scheduled across the month,
        tagged organic, paid or story.
      </p>
    </div>
  );
}
