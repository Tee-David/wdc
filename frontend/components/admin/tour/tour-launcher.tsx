"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Compass, HelpCircle, RotateCcw } from "lucide-react";
import { useOptionalAdminTour } from "./tour-provider";

const SEEN_KEY = "wdc-admin-tour:launcher-opened";

/* Same `useSyncExternalStore` idiom `tour-provider.tsx` uses for its own
   "are we actually mounted in a browser yet" flag: localStorage does not
   exist during SSR, so the real value is read once, after hydration,
   rather than guessed at during it. `null` means "not read yet"; the
   microtask in `subscribe` is what forces the one re-render that shows the
   real answer once it is. */
let everOpenedFlag: boolean | null = null;
function readEverOpened() {
  if (everOpenedFlag === null) {
    try { everOpenedFlag = localStorage.getItem(SEEN_KEY) === "1"; } catch { everOpenedFlag = false; }
  }
  return everOpenedFlag;
}
function subscribeEverOpened(onChange: () => void) {
  if (everOpenedFlag === null) queueMicrotask(onChange);
  return () => undefined;
}

/**
 * The topbar's persistent entry point into every tour tier: the page tour
 * for wherever you are, the full workflow walkthrough, and a replay of the
 * short welcome orientation -- one button rather than the three separate
 * places `AccountMenu`/`PageTourButton` used to split this across.
 *
 * The idle wiggle is a hint, not decoration for its own sake: this control
 * has no label, only a "?", so something has to say "this does something"
 * to a reader who has never noticed it. It stops the moment that reader
 * opens the menu once -- the hint has done its job -- and never runs at
 * all under `prefers-reduced-motion` or while a tour is already active.
 */
export default function TourLauncher() {
  const [open, setOpen] = useState(false);
  const everOpened = useSyncExternalStore(subscribeEverOpened, readEverOpened, () => false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  const tours = useOptionalAdminTour();

  useEffect(() => {
    function close(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  if (!tours || tours.active) return null;
  const {
    hasPageTour, pageTourCompleted, startPageTour, restartPageTour,
    walkthroughCompleted, startWalkthrough, restartWalkthrough,
    welcomeCompleted, startWelcome, restartWelcome,
  } = tours;

  const toggle = () => {
    setOpen((value) => !value);
    if (!everOpened) {
      everOpenedFlag = true;
      try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* best effort */ }
    }
  };

  return (
    <div className="tourLauncher" ref={ref}>
      <motion.button
        ref={trigger}
        type="button"
        className="tourLauncher__btn"
        aria-label="Tours and help"
        aria-expanded={open}
        onClick={toggle}
        animate={!reduced && !everOpened ? { rotate: [0, -12, 10, -6, 0] } : undefined}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
        whileHover={{ rotate: 0 }}
      >
        <HelpCircle aria-hidden="true" />
      </motion.button>
      {open ? (
        <div className="tourLauncher__menu" role="menu">
          <div className="tourLauncher__label">
            <b>Tours</b>
            <span>Pick a depth. All of them skip any time.</span>
          </div>
          <button
            type="button"
            role="menuitem"
            className="tourLauncher__item"
            disabled={!hasPageTour}
            onClick={() => { setOpen(false); (pageTourCompleted ? restartPageTour : startPageTour)(); }}
          >
            <Compass aria-hidden="true" />
            {hasPageTour ? (pageTourCompleted ? "Replay this page's tour" : "Tour this page") : "No tour for this page"}
          </button>
          <div className="tourLauncher__rule" />
          <button
            type="button"
            role="menuitem"
            className="tourLauncher__item"
            onClick={() => { setOpen(false); (walkthroughCompleted ? restartWalkthrough : startWalkthrough)(); }}
          >
            <Compass aria-hidden="true" /> {walkthroughCompleted ? "Replay the full walkthrough" : "Full platform walkthrough"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="tourLauncher__item"
            onClick={() => { setOpen(false); (welcomeCompleted ? restartWelcome : startWelcome)(); }}
          >
            <RotateCcw aria-hidden="true" /> Replay the welcome tour
          </button>
        </div>
      ) : null}
    </div>
  );
}
