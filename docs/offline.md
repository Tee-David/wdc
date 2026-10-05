# Offline behaviour and verification

The hand-written service worker is `frontend/public/sw.js`; connectivity coordination lives in `frontend/components/offline/`. Read their route exclusions and cache rules as the source of truth.

Static assets and eligible public pages have separate caches. Public-page navigation is network-first. The app asks the worker to retain eligible pages after client navigation, because App Router route-data fetches are not ordinary document requests. Reconnection drops the page cache so content can be refreshed.

API calls, non-GET requests and cross-origin provider traffic are left to the network. Sensitive routes must remain excluded. Offline navigation is not a promise that forms, payments or authenticated actions can complete without a connection.

## Test a production build

1. Build and start the frontend. Open it online and wait for the service worker to control the page.
2. Visit eligible public pages, then use browser developer tools to inspect the active worker and cache entries.
3. Set the browser offline and navigate to a visited page; check the connectivity message and actual content.
4. Navigate to an uncached page and verify a useful offline fallback.
5. Confirm sensitive pages and API results are not stored, and writes do not appear successful offline.
6. Reconnect, confirm cache refresh and check that navigation returns to current content.

Development server behaviour and an initial uncontrolled page load are not equivalent to a controlled production worker. When changing the caching policy, test the update lifecycle and existing clients as well as a fresh browser.
