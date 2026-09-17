import type { TourCompletion } from "./types";

/**
 * Where a tour's "have I seen this" lives, for now.
 *
 * LOCAL STORAGE IS THE CACHE THE CHECKLIST ALLOWS, NOT THE SOURCE OF TRUTH
 * IT RULES OUT. Section 5.3 is explicit: "local storage may cache UI state
 * but is not the cross-device source of truth" -- the same admin signed in
 * on a phone and a laptop should not be offered the full walkthrough twice,
 * and that needs a row in CockroachDB keyed to the account, which does not
 * exist yet. What is here is the honest interim: real behaviour (skip once,
 * stay skipped; finish once, stay finished) on the one device that did it,
 * written so the eventual swap is additive -- a server read that seeds this
 * cache -- rather than a rewrite. Said plainly rather than left unsaid.
 */

const PREFIX = "wdc-admin-tour:";

function key(tourId: string, version: number) {
  return `${PREFIX}${tourId}@${version}`;
}

export function readCompletion(tourId: string, version: number): TourCompletion | null {
  try {
    const raw = localStorage.getItem(key(tourId, version));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.status === "completed" || parsed?.status === "skipped") return parsed as TourCompletion;
    return null;
  } catch {
    /* Private browsing, a full quota, or a blocked store: a tour offered
       again is a minor annoyance, not a failure worth surfacing. */
    return null;
  }
}

export function writeCompletion(tourId: string, version: number, status: TourCompletion["status"]) {
  try {
    const value: TourCompletion = { status, at: new Date().toISOString() };
    localStorage.setItem(key(tourId, version), JSON.stringify(value));
  } catch {
    // Nothing to fall back to on this device; the tour just offers itself again.
  }
}

/** "Restart tour" clears the one record rather than every key this prefix
 *  owns, so restarting the dashboard's page tour cannot also forget that
 *  the full walkthrough was already finished. */
export function clearCompletion(tourId: string, version: number) {
  try {
    localStorage.removeItem(key(tourId, version));
  } catch {
    // Nothing stored, nothing to clear.
  }
}
