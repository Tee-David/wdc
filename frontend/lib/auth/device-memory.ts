import type { Method } from "./machine";

/**
 * WHAT THIS DEVICE REMEMBERS ABOUT WHOEVER LAST SIGNED IN ON IT.
 *
 * A first name to greet with, the language they were greeted in, and how they
 * got in. Never the email, never a token, nothing that opens anything. It is
 * written only after a successful sign-in, so a stranger typing somebody
 * else's address cannot plant a greeting, and "Not Tee?" clears it.
 *
 * Every read and write is wrapped: storage is blocked in some private modes,
 * and the page must work exactly the same without it.
 */
export type DeviceHint = { firstName: string | null; greetingLang: string | null; lastMethod: Method | null; v: 1 };

const KEY = "wdc.auth.hint";

export function readHint(): DeviceHint | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DeviceHint>;
    if (parsed.v !== 1) return null;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName.slice(0, 14) : null,
      greetingLang: typeof parsed.greetingLang === "string" ? parsed.greetingLang : null,
      lastMethod: parsed.lastMethod && ["magic", "password", "passkey", "google"].includes(parsed.lastMethod) ? parsed.lastMethod : null,
      v: 1,
    };
  } catch {
    return null;
  }
}

export function writeHint(hint: Omit<DeviceHint, "v">) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...hint, v: 1 }));
  } catch {
    /* Storage blocked: the next visit simply is not greeted by name. */
  }
  /* No emit: this is for the NEXT visit. Telling this page would re-greet
     it in the middle of its own closing moment. */
}

export function clearHint() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing to clear. */
  }
  emit();
}

/* ---- as an external store, for useSyncExternalStore ---------------------
   The server has no device, so its answer is "nobody"; the client reads
   storage. The parsed value is cached by its raw string so the snapshot is
   the same object until the stored value actually changes. */

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: DeviceHint | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeHint(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hintSnapshot(): DeviceHint | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = readHint();
  }
  return cached;
}

export const serverHint = () => null;
