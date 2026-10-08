/* ============================================================================
   WDC service worker.

   Hand-written rather than generated. The whole job is ~150 lines, and a
   build-time PWA plugin would add a dependency, a config surface and a layer
   of indirection over caching decisions that are worth reading in full.

   TWO CACHES, because the two kinds of thing in them have different lifetimes
   and different reasons to be dropped:

     wdc-assets-*  CSS, JS, fonts and images under a content-hashed URL, plus
                   the offline fallback. Cache-first: a changed file is a
                   different URL, so a cached copy can never be stale.

     wdc-pages-*   The HTML of pages the reader has actually been to.
                   Network-first, and emptied wholesale on reconnect -- which
                   is why it is a cache of its own rather than a filter over a
                   shared one.

   EVERYTHING ELSE IS LEFT ALONE, deliberately:
     - non-GET requests, so a form post or a server action is never intercepted
       and never silently swallowed
     - cross-origin requests (R2, Cal.com, Paystack), which are not ours to
       cache and whose failures the app should see
     - same-origin /api/*, which is live data; a cached API response is worse
       than no response because it lies about being current

   ---------------------------------------------------------------------------
   TWO THINGS THE FIRST VERSION OF THIS FILE GOT WRONG, both found by cutting
   the network for real rather than by reading the code.

   1. IT CACHED ALMOST NOTHING. Pages were only stored when a request came
      through with `mode === "navigate"`, and in an App Router site that
      happens exactly once: on the first load. Every page change after that is
      the router fetching an RSC payload over `fetch`, which is not a
      navigation and never reached the branch. Worse, that one navigation
      arrives BEFORE this worker has claimed the page, so it was not
      intercepted either. Measured: after loading the homepage and waiting for
      the worker to take control, the cache held its three precached files and
      nothing else. The offline bar's promise that "pages you have already seen
      still work" was not true of a single page.

      The page now tells the worker what to keep, over `wdc:cache-page`, after
      every client-side navigation. See components/offline/connectivity.tsx.

   2. `Vary` WOULD HAVE MADE THE LOOKUP MISS ANYWAY. Next sends
      `Vary: rsc, next-router-state-tree, next-router-prefetch,
      next-router-segment-prefetch, Accept-Encoding` on every HTML response,
      and `caches.match()` honours `Vary` by default -- so a page stored from
      one request would not be found by a navigation carrying different values
      for those headers. Every lookup here passes `ignoreVary: true`, and every
      page is stored under a plain URL string rather than a Request, so the key
      is the address and nothing else.
   ========================================================================== */

/* Bump this to retire every cache from the previous version. `activate`
   deletes anything that is not one of the current pair. */
const VERSION = "v3";
const ASSETS = `wdc-assets-${VERSION}`;
const PAGES = `wdc-pages-${VERSION}`;

const OFFLINE_URL = "/offline.html";

/* Precached at install so the fallback is available on the very first loss of
   signal, including one that happens before the reader has been anywhere. */
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/fonts/space-grotesk-700.woff2"];

/* Pages are small (tens of KB of HTML) but a long session on a big site is
   still no reason to grow without limit. Oldest out first; `keys()` returns
   insertion order, so "oldest" needs no bookkeeping of its own. */
const PAGE_LIMIT = 40;

/** The cache key for a page: the address, and nothing else. */
function pageKey(url) {
  const u = new URL(url, self.location.origin);
  return u.origin + u.pathname + u.search;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSETS)
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
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== ASSETS && k !== PAGES).map((k) => caches.delete(k))),
      )
      /* Take over open tabs immediately rather than waiting for every one of
         them to close, which on a site people leave open could be days. */
      .then(() => self.clients.claim()),
  );
});

/** Store a page's HTML, then drop the oldest if the cache has outgrown its cap. */
async function keepPage(url, response) {
  const cache = await caches.open(PAGES);
  await cache.put(pageKey(url), response);
  const keys = await cache.keys();
  if (keys.length > PAGE_LIMIT) {
    await Promise.all(keys.slice(0, keys.length - PAGE_LIMIT).map((k) => cache.delete(k)));
  }
}

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
            event.waitUntil(keepPage(req.url, copy).catch(() => {}));
          }
          return res;
        })
        .catch(async () => {
          const pages = await caches.open(PAGES);
          const hit = await pages.match(pageKey(req.url), { ignoreVary: true });
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
             bytes whatever the address bar says. The worker answers IN PLACE
             rather than redirecting, so the address bar still holds the page
             the reader asked for -- which is how that page knows where to send
             them once the connection returns. */
          const assets = await caches.open(ASSETS);
          return (
            (await assets.match(OFFLINE_URL, { ignoreVary: true })) ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  if (/\.(?:css|js|mjs|woff2?|png|jpe?g|svg|ico|webp|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then((cache) =>
        cache.match(req, { ignoreVary: true }).then(
          (cached) =>
            cached ||
            fetch(req)
              .then((res) => {
                if (res.ok) {
                  const copy = res.clone();
                  event.waitUntil(cache.put(req, copy).catch(() => {}));
                }
                return res;
              })
              /* An image that cannot be fetched and was never cached should
                 fail as an image, not as an exception in the worker. */
              .catch(() => Response.error()),
        ),
      ),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;

  /* Asked for after a reconnect, so the copy the page is about to re-request
     is not the one that was stored while the connection was dying. Dropping
     the whole cache is the point of pages having one of their own. */
  if (data === "wdc:clear-pages") {
    event.waitUntil(caches.delete(PAGES));
    return;
  }

  /* KEEP THIS PAGE. Sent by the app after every client-side navigation,
     because the worker cannot see those itself -- see the long note at the
     top. The fetch carries no RSC headers, so what comes back is the document
     a cold navigation would get, which is exactly what has to be served when
     one is attempted with no network. */
  if (data && data.type === "wdc:cache-page" && typeof data.url === "string") {
    event.waitUntil(
      fetch(data.url, { credentials: "same-origin" })
        .then((res) => (res.ok ? keepPage(data.url, res) : null))
        .catch(() => {}),
    );
  }
});
