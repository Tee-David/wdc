/* ============================================================================
   WDC service worker.

   Hand-written rather than generated. The whole job is ~100 lines, and a
   build-time PWA plugin would add a dependency, a config surface and a layer
   of indirection over caching decisions that are worth reading in full.

   TWO STRATEGIES, and the choice of which is per request kind:

     navigations   network-first, falling back to the cached copy of THAT page,
                   and only then to /offline. So a reader who has been to
                   /services and loses signal gets /services back, not a
                   generic apology. The offline page is the third option, not
                   the first.

     static assets cache-first. CSS, JS, fonts and images under /_next/static
                   are content-hashed, so a cached copy can never be stale: a
                   changed file is a different URL.

   EVERYTHING ELSE IS LEFT ALONE, deliberately:
     - non-GET requests, so a form post or a server action is never intercepted
       and never silently swallowed
     - cross-origin requests (R2, Cal.com, Paystack), which are not ours to
       cache and whose failures the app should see
     - same-origin /api/*, which is live data; a cached API response is worse
       than no response because it lies about being current
   ========================================================================== */

/* Bump this to retire every cache from the previous version. `activate`
   deletes anything whose key is not the current one, which is the entire
   cache-busting story. */
const CACHE = "wdc-v1";
const OFFLINE_URL = "/offline.html";

/* Precached at install so the fallback is available on the very first loss of
   signal, including one that happens before the reader has been anywhere. */
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/fonts/space-grotesk-700.woff2"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      /* Individually, not `addAll`: `addAll` is all-or-nothing, so one 404 on
         one icon would abort the whole install and leave the site with no
         worker at all. */
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      /* Take over open tabs immediately rather than waiting for every one of
         them to close, which on a site people leave open could be days. */
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          /* Only cache a real page. Caching a 404 or a 500 means serving it
             back later as though it were the site. */
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => {
            if (hit) return hit;
            /* A PLAIN HTML FILE, not a Next route. This was a route first and
               it did not work: serving a Next page's markup for an address it
               was not built for means Next hydrates it against the route in the
               address bar, finds a tree that does not match, cannot fetch the
               real one with no network, and leaves a blank page. Measured in a
               browser with the network actually cut. The reference
               implementation has the same bug; it only ever tested URLs it had
               already cached.

               public/offline.html has no JavaScript framework, no router and no
               dependency on any chunk being cached, so it renders from its own
               bytes whatever the address bar says. Remembering the wanted URL
               first lets that page send the reader back to what they asked for
               once the connection returns, rather than to the homepage. */
            return caches.match(OFFLINE_URL).then(
              (page) =>
                page ||
                new Response("You are offline.", {
                  status: 503,
                  headers: { "Content-Type": "text/plain; charset=utf-8" },
                }),
            );
          }),
        ),
    );
    return;
  }

  if (/\.(?:css|js|mjs|woff2?|png|jpe?g|svg|ico|webp|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
              }
              return res;
            })
            /* An image that cannot be fetched and was never cached should fail
               as an image, not as an exception in the worker. */
            .catch(() => Response.error()),
      ),
    );
  }
});

/* The page asks for this after a reconnect, to be sure the copy it is about to
   re-request is not the one that was cached while the connection was dying. */
self.addEventListener("message", (event) => {
  if (event.data === "wdc:clear-pages") {
    event.waitUntil(
      caches.open(CACHE).then((c) =>
        c.keys().then((keys) =>
          Promise.all(keys.filter((k) => k.mode === "navigate").map((k) => c.delete(k))),
        ),
      ),
    );
  }
});
