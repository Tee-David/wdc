import type { TourCompletion } from "./types";

/**
 * Where a tour's "have I seen this" lives.
 *
 * THE ACCOUNT IS THE SOURCE OF TRUTH AND LOCAL STORAGE IS ITS CACHE, which is
 * the split section 5.3 asks for. Every write lands here synchronously, so
 * the UI answers at once, and is sent to `/api/tours`, which keeps one row per
 * account per tour version. On mount the provider calls `syncFromAccount`,
 * which copies the account's rows into this cache and sends up anything this
 * browser knew first. Without a session (the capture bypass, or the database
 * down) the server answers 401 or 503 and this simply stays a local cache.
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

/* Set once the account answered a read. Until then there may be no account
   to write to (the capture bypass, an expired session), and a write would
   only be refused. */
let accountKnown = false;

function send(tour: string, status: TourCompletion["status"] | "cleared") {
  if (!accountKnown) return;
  try {
    void fetch("/api/tours", {
      method: "POST", keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tour, status }),
    }).catch(() => { /* The local copy stands. */ });
  } catch {
    /* No fetch here (a test, an old browser): the local copy stands. */
  }
}

export function writeCompletion(tourId: string, version: number, status: TourCompletion["status"]) {
  try {
    const value: TourCompletion = { status, at: new Date().toISOString() };
    localStorage.setItem(key(tourId, version), JSON.stringify(value));
  } catch {
    // Nothing to fall back to on this device; the tour just offers itself again.
  }
  send(`${tourId}@${version}`, status);
}

/**
 * Copy the account's record into this browser, and this browser's into the
 * account. Returns whether anything local changed, so the caller can re-read.
 */
export async function syncFromAccount(tours: readonly { id: string; version: number }[]): Promise<boolean> {
  let records: Record<string, TourCompletion>;
  try {
    const res = await fetch("/api/tours", { cache: "no-store" });
    if (res.status !== 200) return false;
    records = (await res.json()).records ?? {};
    accountKnown = true;
  } catch {
    return false;
  }
  let changed = false;
  for (const t of tours) {
    const tour = `${t.id}@${t.version}`;
    const remote = records[tour];
    const local = readCompletion(t.id, t.version);
    if (remote && (remote.status === "completed" || remote.status === "skipped") && !local) {
      try { localStorage.setItem(key(t.id, t.version), JSON.stringify(remote)); changed = true; } catch { /* cache only */ }
    } else if (local && !remote) {
      send(tour, local.status);
    }
  }
  return changed;
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
  send(`${tourId}@${version}`, "cleared");
}
