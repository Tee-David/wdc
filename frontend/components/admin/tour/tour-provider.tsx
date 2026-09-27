"use client";

import { toTop } from "@/components/ui/scroll-reset";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode,
} from "react";
import { ADMIN_PAGE_TOURS, ADMIN_WALKTHROUGH, ADMIN_WELCOME, adminPageTourFor } from "@/lib/tours/admin";
import { CLIENT_WALKTHROUGH, CLIENT_WELCOME, clientPageTourFor } from "@/lib/tours/client";
import type { TourDef } from "@/lib/tours/types";
import { clearCompletion, readCompletion, syncFromAccount, writeCompletion } from "@/lib/tours/storage";
import Confetti from "@/components/onboarding/confetti";
import "./tour.css";

/**
 * The seam between "an admin page renders a tour button" and "react-joyride
 * actually runs". Mounted once, at the top of the admin shell, so it
 * survives every client-side navigation a walkthrough makes rather than
 * remounting (and losing its place) each time the route changes.
 *
 * LAZY-LOADED, NOT IMPORTED. `TourRuntime` -- the only file that touches
 * `react-joyride` -- is behind `next/dynamic({ ssr: false })` and is not
 * requested until the first time a tour actually starts. A visitor who
 * never opens a tour, which on a returning admin's tenth login is most
 * days, never downloads it.
 */

const TourRuntime = dynamic(() => import("./tour-runtime"), { ssr: false });

type AdminTourContext = {
  /** Whether *some* tour is currently running -- used to hide launcher UI
   *  while one is already on screen rather than stacking a second. */
  active: boolean;
  /** The short, nav-only orientation. Auto-offered once; replayable any
   *  time from the launcher. */
  startWelcome: () => void;
  /** The deep, cross-page tour of the actual daily workflow. */
  startWalkthrough: () => void;
  /** The tour for wherever the caller already is. No-ops if this route has
   *  none. */
  startPageTour: () => void;
  hasPageTour: boolean;
  welcomeCompleted: boolean;
  walkthroughCompleted: boolean;
  pageTourCompleted: boolean;
  /** Clears the record for the given tour so it runs fresh, then starts it. */
  restartWelcome: () => void;
  restartWalkthrough: () => void;
  restartPageTour: () => void;
  /** "Not now" on the sidebar's offer: recorded against the account as a
   *  skipped walkthrough, so the card stays gone on every device, and the
   *  launcher still replays it. */
  dismissWalkthrough: () => void;
};

const Ctx = createContext<AdminTourContext | null>(null);

/** For a control that can render outside a provider -- the portal shell's
 *  launcher, on the "not linked yet" screen that has nothing to tour. */
export function useOptionalAdminTour() {
  return useContext(Ctx);
}

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

/* ONE PROVIDER, TWO AUDIENCES. The portal runs the same runtime, tooltip and
   persistence as the admin, over its own registry; only these four things
   differ. Chosen by name rather than passed in, because the layouts that
   mount this are server components and cannot hand a function across. */
const REGISTRIES = {
  admin: {
    welcome: ADMIN_WELCOME, walkthrough: ADMIN_WALKTHROUGH, pageTourFor: adminPageTourFor,
    all: [ADMIN_WELCOME, ADMIN_WALKTHROUGH, ...Object.values(ADMIN_PAGE_TOURS)],
    home: "/admin", offeredKey: "wdc-admin-tour:offered-welcome",
  },
  client: {
    welcome: CLIENT_WELCOME, walkthrough: CLIENT_WALKTHROUGH, pageTourFor: clientPageTourFor,
    all: [CLIENT_WELCOME, CLIENT_WALKTHROUGH],
    home: "/portal", offeredKey: "wdc-client-tour:offered-welcome",
  },
} as const;

export type TourAudience = keyof typeof REGISTRIES;

export default function AdminTourProvider({
  children, role, audience = "admin",
}: { children: ReactNode; role: string; audience?: TourAudience }) {
  const { welcome: WELCOME, walkthrough: WALKTHROUGH, pageTourFor, home: HOME, offeredKey: FIRST_SIGN_IN_KEY, all: ALL } = REGISTRIES[audience];
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const [runningTour, setRunningTour] = useState<TourDef | null>(null);
  /* Whether the run in progress was launched via "Restart"/"Replay", so
     `TourRuntime` can emit `replayed` rather than `started` -- the two
     privacy-safe events section 5.3 asks for kept genuinely distinct. */
  const [isReplay, setIsReplay] = useState(false);
  /* The SAME celebration the onboarding form's "sent" screen uses --
     `components/onboarding/confetti.tsx`, reused rather than answered with
     a second implementation, at the user's own request for consistency.
     Bumped, not just flipped true, because `Confetti` hides itself for
     good once its own internal timer runs out; a second finish in the same
     session needs a fresh mount (a new `key`) to animate again, not a
     state change on an instance that has already decided it is done. */
  const [confettiKey, setConfettiKey] = useState(0);

  const pageTour = pageTourFor(pathname);

  /* THE ACCOUNT'S RECORD FIRST. Read once per mount, before the welcome is
     offered, so a tour skipped on another device is not offered here. The
     count is bumped to re-read the cache it filled; `synced` is true whether
     the read worked or not, because a missing session must not hold the
     offer back forever. */
  const [synced, setSynced] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    let live = true;
    syncFromAccount(ALL).then((changed) => {
      if (!live) return;
      if (changed) setSyncCount((n) => n + 1);
      setSynced(true);
    });
    return () => { live = false; };
  }, [mounted, ALL]);

  const stop = useCallback(() => setRunningTour(null), []);

  const startWelcome = useCallback(() => { setIsReplay(false); setRunningTour(WELCOME); }, [WELCOME]);
  const startWalkthrough = useCallback(() => { setIsReplay(false); setRunningTour(WALKTHROUGH); }, [WALKTHROUGH]);
  const startPageTour = useCallback(() => {
    if (pageTour) { setIsReplay(false); setRunningTour(pageTour); }
  }, [pageTour]);

  const restart = useCallback((tour: TourDef) => {
    clearCompletion(tour.id, tour.version);
    setIsReplay(true);
    setRunningTour(tour);
  }, []);

  /* OFFERED ONCE, NEVER FORCED. "First eligible sign-in" is read as "this
     browser has never been offered the welcome tour before", checked once
     mounted so it never runs during SSR and never blocks the dashboard's
     own first paint -- a short delay lets the real numbers render first,
     then the tour offers itself rather than assuming consent. Dismissing
     it (skip, or navigating away) still writes a completion-shaped record
     via `onSkip`, so it is never offered again uninvited. The WELCOME tour
     is what is offered, not the full walkthrough -- a first-time sign-in
     gets the map, not a twenty-step lecture; the walkthrough stays one
     click away in the launcher for whoever wants it. */
  useEffect(() => {
    if (!mounted || !synced || pathname !== HOME) return;
    let already = false;
    try { already = localStorage.getItem(FIRST_SIGN_IN_KEY) === "1"; } catch { /* offer it */ }
    if (already) return;
    const completed = readCompletion(WELCOME.id, WELCOME.version);
    if (completed) return;

    const id = window.setTimeout(() => {
      try { localStorage.setItem(FIRST_SIGN_IN_KEY, "1"); } catch { /* best effort */ }
      setRunningTour(WELCOME);
    }, 1_500);
    return () => window.clearTimeout(id);
  }, [mounted, synced, pathname, HOME, FIRST_SIGN_IN_KEY, WELCOME]);

  const value = useMemo<AdminTourContext>(() => ({
    active: runningTour !== null,
    startWelcome,
    startWalkthrough,
    startPageTour,
    hasPageTour: pageTour !== null,
    /* `false` until `mounted`, always -- localStorage does not exist during
       SSR, and a server render that says "Tour this page" followed by a
       client render that already knows better ("Replay...") is exactly the
       hydration mismatch fixed once already in `components/admin/form.tsx`.
       The genuine answer appears one tick after hydration rather than
       being guessed at during it. */
    welcomeCompleted: mounted && readCompletion(WELCOME.id, WELCOME.version) !== null,
    walkthroughCompleted: mounted && syncCount >= 0 && readCompletion(WALKTHROUGH.id, WALKTHROUGH.version) !== null,
    pageTourCompleted: mounted && pageTour ? readCompletion(pageTour.id, pageTour.version) !== null : false,
    restartWelcome: () => restart(WELCOME),
    restartWalkthrough: () => restart(WALKTHROUGH),
    restartPageTour: () => { if (pageTour) restart(pageTour); },
    dismissWalkthrough: () => {
      writeCompletion(WALKTHROUGH.id, WALKTHROUGH.version, "skipped");
      setSyncCount((n) => n + 1);
    },
  /* `syncCount` is how the memo hears that a record changed underneath it:
     an account sync, or the card dismissed. */
  }), [runningTour, startWelcome, startWalkthrough, startPageTour, pageTour, restart, mounted, WELCOME, WALKTHROUGH, syncCount]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && runningTour ? (
        <TourRuntime
          tour={runningTour}
          role={role}
          isReplay={isReplay}
          onFinish={() => {
            writeCompletion(runningTour.id, runningTour.version, "completed");
            setConfettiKey((k) => k + 1);
            stop();
            /* WHERE A FINISHED TOUR LEAVES YOU. A page tour ends back at the
               top of that same page: it was about this page, and sending the
               reader to the dashboard lost them (the owner's call). The full
               walkthrough and the welcome end on the dashboard, wherever their
               last stop was: that is home. A skipped tour leaves the reader
               where they chose to stop. */
            /* The live location, not `pathname`: the runtime keeps the
               first `onFinish` it was handed, so the closure's pathname is
               the page the tour STARTED on. */
            const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (runningTour.kind === "page" || window.location.pathname === HOME) toTop(still);
            else router.push(HOME);
          }}
          onSkip={() => { writeCompletion(runningTour.id, runningTour.version, "skipped"); stop(); }}
        />
      ) : null}
      {confettiKey > 0 ? <Confetti key={confettiKey} /> : null}
    </Ctx.Provider>
  );
}
