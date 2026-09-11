"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import "./connectivity.css";

/**
 * Registers the service worker, keeps the pages the reader has seen, and tells
 * them the truth about their connection.
 *
 * THE PART THE REFERENCE GETS WRONG. litchconsulting ships the same service
 * worker and the same offline page, and then handles coming back online not at
 * all: no `online` listener, no `navigator.onLine`, no refetch. Its offline
 * screen animates "reconnecting" dots over a button that does nothing but
 * `location.reload()`. So the site tells you it is trying while it is not
 * trying, and the recovery is the reader's job. That is the one thing an
 * offline experience actually has to get right, so it is done properly here.
 *
 * WHAT "PROPERLY" MEANS:
 *
 * 1. `navigator.onLine` IS NOT TRUSTED ON ITS OWN. It reports whether the
 *    device has a network interface, not whether anything is reachable -- a
 *    captive portal, a dead router or an aeroplane's wifi all report `true`.
 *    So going offline is taken from the `offline` event, but coming back is
 *    CONFIRMED with a real request before anything is claimed.
 *
 * 2. THE PROBE IS CHEAP AND UNCACHEABLE. A HEAD for the manifest with
 *    `cache: "no-store"` and a cache-busting parameter: a few hundred bytes,
 *    and it cannot be answered by the service worker or the HTTP cache, which
 *    would make it a test of the cache rather than of the network.
 *
 * 3. IT BACKS OFF. Retrying every second for an hour on a phone in a tunnel
 *    costs battery and achieves nothing. The interval doubles from 2s to 30s
 *    and stays there.
 *
 * 4. ON RECOVERY IT REFRESHES THE DATA, NOT THE WHOLE PAGE. `router.refresh()`
 *    re-fetches the server components and leaves scroll position, form state
 *    and focus where they were. A `location.reload()` throws all of that away,
 *    which for someone halfway through the onboarding form is a worse outcome
 *    than the outage. The page cache is cleared first, so the refresh cannot
 *    be answered with the half-dead copy stored on the way down.
 *
 * 5. IT TELLS THE WORKER WHAT TO KEEP. See the long note at the top of
 *    public/sw.js: a service worker cannot see an App Router navigation,
 *    because a client-side route change is an RSC `fetch` and not a navigation
 *    at all. Left to itself the worker cached nothing, which made the offline
 *    bar's "pages you have already seen still work" untrue of every page on
 *    the site. This component names each page as the reader reaches it.
 *
 * The bar is `role="status"` and polite: it reports a state, it is not an
 * alert demanding action.
 */

const PROBE_MIN = 2000;
const PROBE_MAX = 30000;

/* How long the "back online" state is held before the bar leaves. Long enough
   to be read, short enough not to outstay a message whose whole content is
   that everything is fine again. It is also the duration of the progress
   sweep in connectivity.css, and the two have to agree or the sweep either
   finishes early or gets cut off. */
const BACK_MS = 2600;

async function reachable(signal: AbortSignal) {
  try {
    const res = await fetch(`/manifest.webmanifest?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * A path as a person would say it: "/work/branding/dhiol-world" becomes
 * "Work / Branding / Dhiol World".
 *
 * Shared, in spirit, with the same function in public/offline.html -- which
 * cannot import it, because that file deliberately depends on nothing. The two
 * are kept deliberately short so that duplication stays cheap to read.
 */
function pretty(path: string) {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  if (!parts.length) return "the home page";
  return parts
    .map((p) =>
      p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(" / ");
}

export default function Connectivity() {
  const router = useRouter();
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  /* Held on screen for a beat after recovery, so the reader sees that it came
     back rather than just seeing the warning vanish. */
  const [restored, setRestored] = useState(false);
  const timer = useRef<number | null>(null);
  const controller = useRef<AbortController | null>(null);

  /* ---------------------------------------------------------- the worker */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    /* After load: registration competes with the page's own requests for
       bandwidth, and the precache is worth nothing until there is a page to
       come back to. */
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  /* ------------------------------------------------- keep this page ---- */
  /* THE FIX FOR THE CACHE THAT WAS ALWAYS EMPTY.

     Runs on every route change, including the client-side ones the worker is
     blind to. `serviceWorker.ready` rather than `.controller`, because on the
     very first load the worker has registered but not yet claimed the page, so
     `controller` is null exactly when the first and most important page wants
     saving.

     Deferred to idle: this costs one extra HTML request, and it must not
     compete with the page the reader is actually looking at. It is also
     skipped entirely while offline, where it could only fail. */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (navigator.onLine === false) return;

    /* `location.search` rather than `useSearchParams()`. That hook opts every
       route that renders it out of static generation unless it sits inside a
       Suspense boundary, and this component is mounted in the root layout --
       so using it would deopt the entire site to make a query string that
       almost no page here has. `pathname` is what actually changes. */
    const url = pathname + window.location.search;
    const send = () => {
      navigator.serviceWorker.ready
        .then((reg) => {
          const sw = reg.active ?? navigator.serviceWorker.controller;
          sw?.postMessage({ type: "wdc:cache-page", url });
        })
        .catch(() => {});
    };

    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle
      ? window.requestIdleCallback(send, { timeout: 4000 })
      : window.setTimeout(send, 2500);
    return () => {
      if (hasIdle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [pathname]);

  const recover = useCallback(() => {
    setOffline(false);
    setRestored(true);
    window.setTimeout(() => setRestored(false), BACK_MS);
    /* Drop cached pages before refetching, so the refresh cannot be served the
       copy that was cached while the connection was failing. */
    navigator.serviceWorker?.controller?.postMessage("wdc:clear-pages");
    router.refresh();
  }, [router]);

  /* ------------------------------------------------------- the listeners */
  useEffect(() => {
    let delay = PROBE_MIN;

    const stop = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      controller.current?.abort();
      controller.current = null;
    };

    const probe = async () => {
      controller.current = new AbortController();
      const ok = await reachable(controller.current.signal);
      if (ok) {
        stop();
        recover();
        return;
      }
      delay = Math.min(delay * 2, PROBE_MAX);
      timer.current = window.setTimeout(probe, delay);
    };

    const goOffline = () => {
      setOffline(true);
      stop();
      delay = PROBE_MIN;
      timer.current = window.setTimeout(probe, delay);
    };

    /* The `online` event means the interface is back, not that anything is
       reachable, so it only shortens the wait until the next real probe. */
    const goOnline = () => {
      stop();
      delay = PROBE_MIN;
      timer.current = window.setTimeout(probe, 250);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (navigator.onLine === false) goOffline();

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      stop();
    };
  }, [recover]);

  if (!offline && !restored) return null;

  return (
    <div className={`cx${offline ? " is-off" : " is-back"}`} role="status" aria-live="polite">
      {offline ? (
        <>
          <WifiOff aria-hidden="true" />
          <span>
            <b>You are offline.</b> Pages you have already seen still work. We will pick
            things up the moment you are back.
          </span>
          <span className="cx__dots" aria-hidden="true"><i /><i /><i /></span>
        </>
      ) : (
        <>
          <RefreshCw aria-hidden="true" />
          <span>
            <b>Back online.</b> Bringing {pretty(pathname)} up to date.
          </span>
          {/* Determinate, unlike the dots above: the dots mean "still trying,
              no idea how long", this means "this will be over in 2.6 seconds",
              and a progress bar that does not know either would be the kind of
              lie the rest of this component exists to avoid. */}
          <span className="cx__bar" aria-hidden="true"><i /></span>
        </>
      )}
    </div>
  );
}
