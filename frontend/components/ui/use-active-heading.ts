"use client";

import { useEffect, useState } from "react";

/**
 * Which heading the reader is actually on.
 *
 * ONE COPY OF THIS, AND THERE WERE THREE. The legal rail wrote it first, the
 * blog rail copied it, and the case studies were about to copy it again --
 * three identical observers with three identical comments, which is three
 * places to fix the band the day it is wrong. The mechanism is the same
 * everywhere because the job is: a rail that lists what is on the page and
 * never says which part you are reading answers the easier half of the
 * question.
 *
 * WHY AN OBSERVER AND NOT A SCROLL HANDLER. Scroll position alone cannot tell
 * you which heading is current without measuring every section on every frame,
 * which is exactly the per-frame layout read this project's conventions
 * forbid. IntersectionObserver is told once where the headings are and reports
 * back only when one crosses the band, which is both cheaper and correct while
 * the page is still settling.
 *
 * THE BAND IS NARROW AND SET HIGH. `-30% 0px -55% 0px` leaves a strip across
 * the upper middle of the viewport, so the heading that lights up is the one
 * being READ rather than the one that has just appeared at the bottom of the
 * screen.
 *
 * It returns an empty string until something crosses the band, which is the
 * honest answer at the top of a page: no heading has been reached yet, and
 * lighting the first one on load would be a guess.
 */
export function useActiveHeading(ids: readonly string[]) {
  const [active, setActive] = useState("");

  /* The ids joined, so a caller passing a fresh array literal on every render
     -- which every one of them does -- does not tear the observer down and
     build it again each time. */
  const key = ids.join("|");

  useEffect(() => {
    const els = key
      .split("|")
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        /* The topmost heading currently inside the band. Taking the first
           intersecting entry in DOM order rather than the last event keeps the
           highlight stable when two short sections are both in view. */
        const inBand = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (inBand) setActive(inBand.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return active;
}
