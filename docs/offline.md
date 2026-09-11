# Testing offline mode

You asked twice how to actually see this, so here it is written down rather
than said once in a message.

The short version: **turning off your WiFi and clicking a link is not enough,
and that is not a bug.** The reason is worth knowing, because it is the thing
that made this hard to build.

---

## Why switching off WiFi does not seem to do anything

Once the site has loaded, clicking a link in the header does not ask the
browser for a page. Next's router asks for a slice of data over `fetch` and
paints the new screen itself. A service worker can only answer a request the
browser makes, and a `fetch` for route data does not look like a page request,
so for a long time the worker never got a chance to answer at all: the click
just failed quietly and nothing happened.

That is fixed. `components/offline/connectivity.tsx` watches the connection
itself and sends you to the offline screen when a navigation cannot complete.
But it does mean the way you test it matters.

## Before anything: the worker only runs on a real build

`npm run dev` does not register the service worker. In development there is no
offline mode to see. Test against a production build:

```bash
cd frontend
npm run build
npm run start          # http://localhost:3000
```

Or just use the live site.

## The one-minute test on your phone

1. Open the site and visit three or four pages. Home, Work, Services, About.
   Every page you open is saved automatically as you go.
2. Turn on **Aeroplane mode**. Not "forget this network" and not just WiFi if
   you have mobile data on, because the phone will quietly switch over and
   still be connected.
3. Tap a page you have already visited. It opens, from the copy on the phone.
4. Tap a page you have **not** visited. The offline screen appears.
5. Turn Aeroplane mode off and watch the screen without touching it. It turns
   green, names the page you were trying to reach, runs a short bar, and takes
   you there.

## The same test on a desktop browser

Chrome's DevTools has two switches and only one of them does what you want.

- **Network tab → throttling dropdown → Offline** is the one to use. It cuts
  the tab's requests, service worker included.
- **Application tab → Service Workers → "Offline" checkbox** also exists and
  behaves differently between versions. Use the Network tab one.

Then:

1. `npm run start`, open `http://localhost:3000`, visit a few pages.
2. DevTools → Application → Service Workers. It should say **activated and is
   running**. If it does not, hard reload once.
3. DevTools → Application → Cache Storage. You will see `wdc-assets-v2` and
   `wdc-pages-v2`. The pages you have visited are listed under the second one.
4. Network tab → Offline.
5. Navigate to a page you have not opened. The offline screen appears.
6. Set throttling back to **No throttling** and watch it recover on its own.

## What the numbers on that screen are

They are the count of pages of this site that are saved on the device you are
holding, read out of `wdc-pages-v2`. They count up to it when the screen
opens, which is why it looks like they are animating for no reason on a slow
device: they are being measured, not decorated.

The links underneath are those same pages, so every one of them works. If
nothing has been saved yet the screen says so and shows no links at all,
rather than offering five that all lead straight back to it.

When the connection returns the same numerals run back down to zero while the
bar fills, and the page leaves as they land.

## If the offline screen does not appear

- **You are testing on `npm run dev`.** There is no worker. See above.
- **The worker is from an older build.** DevTools → Application → Service
  Workers → Unregister, then reload twice. The first reload installs the new
  one, the second one puts it in charge.
- **You are on `localhost` in Safari.** Safari will not register a worker over
  plain HTTP except on `localhost`, and is stricter than Chrome about it. Test
  on the deployed site instead.
- **The page you asked for was already saved.** It will open. That is the
  feature working, not the test failing. Ask for something you have not opened.

## Clearing what is saved, to start over

DevTools → Application → Storage → **Clear site data**. Or from the console on
the site:

```js
navigator.serviceWorker.controller.postMessage("wdc:clear-pages");
```

That empties the page cache and leaves the worker in place, which is the state
a first-time visitor is in.

## What is in the repo

| File | What it does |
| --- | --- |
| `frontend/public/sw.js` | The worker. Precaches the offline screen, saves each page you open, keeps the last 40. |
| `frontend/public/offline.html` | The offline screen itself. Plain HTML with no framework, no router and no hydration, so it renders from its own bytes when nothing else can. |
| `frontend/components/offline/connectivity.tsx` | Watches the connection, tells the worker to save the current page, and sends you to the offline screen when a client-side navigation cannot complete. |
