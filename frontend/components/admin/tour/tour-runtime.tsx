"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useJoyride, EVENTS, STATUS, type Step } from "react-joyride";
import type { Tour } from "@/lib/tours/types";
import { emit } from "@/lib/tours/events";
import TourTooltip from "./tooltip";

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
  tour: Tour;
  role: string;
  /** True when this run was launched via "Restart tour"/"Replay" rather
   *  than a first start, so the emitted event is `replayed` and not
   *  `started` -- see `lib/tours/events.ts`. */
  isReplay: boolean;
  onFinish: () => void;
  onSkip: () => void;
};

export default function TourRuntime({ tour, role, isReplay, onFinish, onSkip }: TourRuntimeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const started = useRef(false);

  const steps = useMemo<Step[]>(() => {
    const visible = tour.steps.filter((s) => !s.roles || s.roles.includes(role as never));
    /* Every optional key is spread in only when actually present. Joyride
       merges a step over its own defaults with a plain object spread, so a
       key explicitly set to `undefined` here -- `placement: s.placement`
       when `s.placement` is `undefined` -- WINS over that default rather
       than falling back to it, which is what was crashing floating-ui's own
       fallback-placement logic on every step but the first. */
    return visible.map((s) => ({
      target: s.target,
      title: s.title,
      content: s.content,
      ...(s.placement ? { placement: s.placement } : {}),
      ...(s.href ? { before: async () => { await ensureOnPage(s.href!, s.target, (href) => router.push(href)); } } : {}),
    }));
  }, [tour, role, router]);

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

  useEffect(() => on(EVENTS.STEP_AFTER, (data) => {
    const visible = tour.steps.filter((s) => !s.roles || s.roles.includes(role as never));
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
      onFinish();
    } else if (data.status === STATUS.SKIPPED) {
      emit({ name: "skipped", tourId: tour.id, tourVersion: tour.version, role, page: window.location.pathname });
      onSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFinish/onSkip are stable setters from the provider
  }), [on, tour]);

  return TourElement;
}
