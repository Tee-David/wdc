"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useJoyride, EVENTS, STATUS, type Step } from "react-joyride";
import type { TourDef, TourStepMeta } from "@/lib/tours/types";
import { withStepMeta } from "@/lib/tours/meta";
import { fireConfetti } from "@/lib/tours/confetti";
import { emit } from "@/lib/tours/events";
import TourTooltip from "./tooltip";
import TourBlur from "./tour-blur";

/**
 * The one component that actually imports `react-joyride`, dynamically
 * loaded by `tour-provider.tsx` so the library never enters the initial
 * admin bundle -- see the note there for why.
 *
 * CROSS-PAGE STEPS USE A `before` HOOK, NOT MANUAL `stepIndex` JUGGLING. A
 * step whose `href` differs from the current route navigates there and
 * polls for its target before Joyride is allowed to show it; Joyride's own
 * `before` contract already blocks the tour and shows a loader while that
 * promise is pending. A target that still is not there when the wait ends
 * is not this component's problem to solve twice: uncontrolled Joyride
 * already advances past a step whose target never mounts (see
 * `error:target_not_found` in its own source), which is the graceful
 * handling section 5.2 asks for, built in rather than reimplemented here.
 */

const MAX_WAIT_MS = 3_000;
const POLL_MS = 60;

async function ensureOnPage(href: string, target: string, navigate: (href: string) => void) {
  if (window.location.pathname !== href) navigate(href);
  if (target === "body") return;

  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (document.querySelector(target)) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  // Resolves regardless; Joyride's own target-not-found handling takes it
  // from here rather than this hook hanging the tour indefinitely.
}

export type TourRuntimeProps = {
  tour: TourDef;
  role: string;
  /** True when this run was launched via "Restart"/"Replay" rather than a
   *  first start, so the emitted event is `replayed` and not `started` --
   *  see `lib/tours/events.ts`. */
  isReplay: boolean;
  onFinish: () => void;
  onSkip: () => void;
};

export default function TourRuntime({ tour, role, isReplay, onFinish, onSkip }: TourRuntimeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const started = useRef(false);
  /* The tooltip that is actually on screen right now, read by the
     interactive-click listener below and by `TourBlur` to know what to
     keep sharp. Driven off `EVENTS.TOOLTIP` rather than the step index
     Joyride was started with, since a `before` hook can change which step
     is really showing. */
  const [activeTarget, setActiveTarget] = useState("body");
  const activeDataRef = useRef<TourStepMeta | null>(null);

  const steps = useMemo<Step[]>(() => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const visible = tour.steps
      .filter((s) => !s.roles || s.roles.includes(role as never))
      .filter((s) => !(s.desktopOnly && !desktop))
      .filter((s) => !(s.mobileOnly && desktop));

    return withStepMeta(visible, tour.kind).map((s) => ({
      target: s.target,
      title: s.title,
      content: s.content,
      data: s.data,
      /* Every optional key is spread in only when actually present.
         Joyride merges a step over its own defaults with a plain object
         spread, so a key explicitly set to `undefined` here --
         `placement: s.placement` when `s.placement` is `undefined` --
         WINS over that default rather than falling back to it, which is
         what was crashing floating-ui's own fallback-placement logic on
         every step but the first. */
      ...(s.placement ? { placement: s.placement } : {}),
      ...(s.href ? { before: async () => { await ensureOnPage(s.href!, s.target, (href) => router.push(href)); } } : {}),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed only when a new tour is actually started
  }, [tour, role]);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const { controls, Tour: TourElement, on } = useJoyride({
    steps,
    continuous: true,
    scrollToFirstStep: !reducedMotion,
    tooltipComponent: TourTooltip,
    floatingOptions: { hideArrow: true },
    /* The card's own footer already shows "N of size" -- see
       `tooltip.tsx` -- so `showProgress` stays off here. Joyride only
       switches a button's accessible name to its `nextWithProgress`
       template ("Next (1 of 13)") when that option is on, and a spoken
       name that repeats what is already read as plain text is noise, not
       help. `locale` keeps every remaining button's accessible name
       matching the visible word on it -- WCAG's "label in name" -- rather
       than Joyride's own defaults ("Last" for the button this tooltip
       labels "Finish"). */
    locale: { next: "Next", back: "Back", last: "Finish", skip: "Skip tour" },
    options: {
      skipBeacon: true,
      showProgress: false,
      overlayColor: "rgba(14, 14, 44, 0.55)",
      beforeTimeout: 6_000,
      zIndex: 95,
      spotlightPadding: 6,
      /* Default already, stated for the reader: a click on the real
         spotlighted control has to reach it, not be eaten by the overlay,
         which is what an interactive step's own click-to-advance
         (below) depends on. */
      blockTargetInteraction: false,
      /* No smooth-scroll for a reader who asked not to see one -- the same
         rule `AGENTS.md` states for the rest of the site, applied here to
         the one animation Joyride runs on its own between steps. */
      scrollDuration: reducedMotion ? 0 : 300,
      /* Handled by hand below instead: `dismissKeyAction`'s type is
         `'close' | 'next' | 'replay' | false`, with no `'skip'` -- `'close'`
         only closes the current step (and, with beacons off, has nothing to
         reopen), which is not what pressing Escape on an overlay is
         supposed to do. */
      dismissKeyAction: false,
      overlayClickAction: false,
      closeButtonAction: "skip",
    },
  });

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") controls.skip();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [controls]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    emit({ name: isReplay ? "replayed" : "started", tourId: tour.id, tourVersion: tour.version, role, page: pathname });
    controls.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once, when this runtime mounts for a chosen tour
  }, []);

  /* THE INTERACTIVE STEP: the reader clicks the real control, not a "Next"
     button, and the tour advances itself. `EVENTS.TOOLTIP` is the moment a
     step's tooltip is actually on screen -- after any `before` hook has
     resolved and the target is confirmed present -- so this is also the
     one reliable place to know which target `TourBlur` should keep sharp. */
  useEffect(() => on(EVENTS.TOOLTIP, (data) => {
    const meta = (data.step.data ?? null) as TourStepMeta | null;
    activeDataRef.current = meta;
    setActiveTarget(typeof data.step.target === "string" ? data.step.target : "body");
  }), [on]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const selector = activeDataRef.current?.interactSelector;
      if (!selector) return;
      const el = event.target instanceof Element ? event.target.closest(selector) : null;
      if (el) controls.next();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [controls]);

  useEffect(() => on(EVENTS.STEP_AFTER, (data) => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const visible = tour.steps
      .filter((s) => !s.roles || s.roles.includes(role as never))
      .filter((s) => !(s.desktopOnly && !desktop))
      .filter((s) => !(s.mobileOnly && desktop));
    const stepDef = visible[data.index];
    if (!stepDef) return;
    emit({
      name: "step_reached", tourId: tour.id, tourVersion: tour.version, role,
      page: window.location.pathname, stepId: stepDef.id, stepIndex: data.index, stepCount: visible.length,
    });
  }), [on, tour, role]);

  useEffect(() => on(EVENTS.TOUR_END, (data) => {
    if (data.status === STATUS.FINISHED) {
      emit({ name: "completed", tourId: tour.id, tourVersion: tour.version, role, page: window.location.pathname });
      if (!reducedMotion) fireConfetti();
      onFinish();
    } else if (data.status === STATUS.SKIPPED) {
      emit({ name: "skipped", tourId: tour.id, tourVersion: tour.version, role, page: window.location.pathname });
      onSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFinish/onSkip are stable setters from the provider
  }), [on, tour, reducedMotion]);

  return (
    <>
      <TourBlur selector={activeTarget} />
      {TourElement}
    </>
  );
}
