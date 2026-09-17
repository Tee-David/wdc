"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode,
} from "react";
import { ADMIN_FULL_TOUR, adminPageTourFor } from "@/lib/tours/admin";
import type { Tour } from "@/lib/tours/types";
import { clearCompletion, readCompletion, writeCompletion } from "@/lib/tours/storage";
import "./tour.css";

/**
 * The seam between "an admin page renders a tour button" and "react-joyride
 * actually runs". Mounted once, at the top of the admin shell, so it
 * survives every client-side navigation a full walkthrough makes rather
 * than remounting (and losing its place) each time the route changes.
 *
 * LAZY-LOADED, NOT IMPORTED. `TourRuntime` -- the only file that touches
 * `react-joyride` -- is behind `next/dynamic({ ssr: false })` and is not
 * requested until the first time a tour actually starts. A visitor who
 * never opens a tour, which on a returning admin's tenth login is most
 * days, never downloads it.
 */

const TourRuntime = dynamic(() => import("./tour-runtime"), { ssr: false });

type AdminTourContext = {
  /** Whether *some* tour is currently running -- used to hide the launcher
   *  UI while one is already on screen rather than stacking a second. */
  active: boolean;
  startFullTour: () => void;
  /** The page tour for wherever the caller already is. No-ops if this route
   *  has none. */
  startPageTour: () => void;
  hasPageTour: boolean;
  fullTourCompleted: boolean;
  pageTourCompleted: boolean;
  /** Clears the record for the given tour so it runs fresh, then starts it. */
  restartFullTour: () => void;
  restartPageTour: () => void;
};

const Ctx = createContext<AdminTourContext | null>(null);

export function useAdminTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminTour must be used inside AdminTourProvider");
  return ctx;
}

/** True the moment we are actually running in a browser with `window`
 *  available -- react-joyride's own DOM measurement needs it, and this is
 *  also what keeps the tour out of the very first paint. Same
 *  `useSyncExternalStore` idiom `components/admin/shell.tsx` already uses
 *  for the same purpose, rather than a `useEffect` that calls `setState`
 *  synchronously in its body. */
let mountedFlag = false;
function subscribeToMount(onChange: () => void) {
  if (!mountedFlag) {
    mountedFlag = true;
    queueMicrotask(onChange);
  }
  return () => undefined;
}
function useMounted() {
  return useSyncExternalStore(subscribeToMount, () => mountedFlag, () => false);
}

const FIRST_SIGN_IN_KEY = "wdc-admin-tour:offered-full";

export default function AdminTourProvider({ children, role }: { children: ReactNode; role: string }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const [runningTour, setRunningTour] = useState<Tour | null>(null);
  /* Whether the run in progress was launched via "Restart tour"/"Replay",
     so `TourRuntime` can emit `replayed` rather than `started` -- the two
     privacy-safe events section 5.3 asks for kept genuinely distinct. */
  const [isReplay, setIsReplay] = useState(false);

  const pageTour = adminPageTourFor(pathname);

  const stop = useCallback(() => setRunningTour(null), []);

  const startFullTour = useCallback(() => { setIsReplay(false); setRunningTour(ADMIN_FULL_TOUR); }, []);
  const startPageTour = useCallback(() => {
    if (pageTour) { setIsReplay(false); setRunningTour(pageTour); }
  }, [pageTour]);

  const restart = useCallback((tour: Tour) => {
    clearCompletion(tour.id, tour.version);
    setIsReplay(true);
    setRunningTour(tour);
  }, []);

  /* OFFERED ONCE, NEVER FORCED. "First eligible sign-in" is read as "this
     browser has never been offered the full tour before", checked once
     mounted so it never runs during SSR and never blocks the dashboard's
     own first paint -- a short delay lets the real numbers render first,
     then the tour offers itself rather than assuming consent. Dismissing
     it (skip, or navigating away) still writes a completion-shaped record
     via `onSkip`, so it is never offered again uninvited. */
  useEffect(() => {
    if (!mounted || pathname !== "/admin") return;
    let already = false;
    try { already = localStorage.getItem(FIRST_SIGN_IN_KEY) === "1"; } catch { /* offer it */ }
    if (already) return;
    const completed = readCompletion(ADMIN_FULL_TOUR.id, ADMIN_FULL_TOUR.version);
    if (completed) return;

    const id = window.setTimeout(() => {
      try { localStorage.setItem(FIRST_SIGN_IN_KEY, "1"); } catch { /* best effort */ }
      setRunningTour(ADMIN_FULL_TOUR);
    }, 1_500);
    return () => window.clearTimeout(id);
  }, [mounted, pathname]);

  const value = useMemo<AdminTourContext>(() => ({
    active: runningTour !== null,
    startFullTour,
    startPageTour,
    hasPageTour: pageTour !== null,
    /* `false` until `mounted`, always -- localStorage does not exist during
       SSR, and a server render that says "Tour this page" followed by a
       client render that already knows better ("Replay...") is exactly the
       hydration mismatch fixed once already in `components/admin/form.tsx`.
       The genuine answer appears one tick after hydration rather than
       being guessed at during it. */
    fullTourCompleted: mounted && readCompletion(ADMIN_FULL_TOUR.id, ADMIN_FULL_TOUR.version) !== null,
    pageTourCompleted: mounted && pageTour ? readCompletion(pageTour.id, pageTour.version) !== null : false,
    restartFullTour: () => restart(ADMIN_FULL_TOUR),
    restartPageTour: () => { if (pageTour) restart(pageTour); },
  }), [runningTour, startFullTour, startPageTour, pageTour, restart, mounted]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && runningTour ? (
        <TourRuntime
          tour={runningTour}
          role={role}
          isReplay={isReplay}
          onFinish={() => { writeCompletion(runningTour.id, runningTour.version, "completed"); stop(); }}
          onSkip={() => { writeCompletion(runningTour.id, runningTour.version, "skipped"); stop(); }}
        />
      ) : null}
    </Ctx.Provider>
  );
}
