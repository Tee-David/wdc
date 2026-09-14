"use client";

import { useSyncExternalStore } from "react";

/**
 * FALSE UNTIL THIS COMPONENT'S JAVASCRIPT IS RUNNING.
 *
 * THE BUG IT EXISTS FOR, found by tests/auth-flow.spec.ts and worth writing
 * down because it is invisible on a fast machine. The login form's submit
 * handler is React's, so before hydration there is no handler at all -- and a
 * `<form>` with no `method` submits as a GET to its own URL. Pressing Enter in
 * that window sent the browser to
 *
 *   /login?email=...&password=not-the-password-at-all
 *
 * with the password in the query string, where it lands in the browser's
 * history, in the `Referer` of the next request, and in every access log
 * between here and the server. The spec reproduced it by filling and
 * submitting faster than the page could hydrate, which is exactly what a real
 * person on a slow connection does.
 *
 * Two things fix it together, and both are needed. The forms carry
 * `method="post"`, so a submission that escapes anyway puts nothing in a URL;
 * and the submit button stays disabled until this returns true, so it does not
 * escape. `.au__submit:disabled` is `opacity: .8`, so the gap between paint and
 * hydration does not read as a broken control.
 *
 * `useSyncExternalStore` rather than the obvious `useState` plus an effect:
 * that version sets state during the effect, which React (and the lint rule
 * that enforces it) treats as a cascading render. This asks the same question
 * in the way React is built to answer it -- the server snapshot is false, the
 * client snapshot is true, and there is no subscription because the answer
 * never changes again.
 */
const neverChanges = () => () => {};
const onTheClient = () => true;
const onTheServer = () => false;

export function useHydrated() {
  return useSyncExternalStore(neverChanges, onTheClient, onTheServer);
}
