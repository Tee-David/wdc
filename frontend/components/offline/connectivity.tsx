"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import "./connectivity.css";

/**
 * Registers the service worker, and tells the reader the truth about their
 * connection.
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
 * The bar is `role="status"` and polite: it reports a state, it is not an
 * alert demanding action.
 */

const PROBE_MIN = 2000;
const PROBE_MAX = 30000;

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

export default function Connectivity() {
  const router = useRouter();
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

  const recover = useCallback(() => {
    setOffline(false);
    setRestored(true);
    window.setTimeout(() => setRestored(false), 2600);
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
          <span><b>Back online.</b> Bringing the page up to date.</span>
        </>
      )}
    </div>
  );
}
