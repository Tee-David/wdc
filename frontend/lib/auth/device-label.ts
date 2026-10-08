/**
 * "Chrome on Windows" from a user agent: enough to recognise a device, no
 * more. Pure (no server-only), so the new-device rule below can be tested
 * without a database; lib/auth/devices.ts re-exports it.
 */
export function deviceLabel(ua: string | null | undefined) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/**
 * Whether a sign-in is from a device this person has not used lately.
 *
 * THE RULE, AND ITS CEILING. It compares the new session's device label with
 * the labels of the person's other live sessions. No other live session means
 * this is their first (or their old ones expired), and a notice would be noise
 * on the very first sign-in after an invitation, so nothing is sent. A match
 * means a device they already use. Only "there are other sessions and none is
 * this device" counts as new.
 *
 * ponytail: a device whose session expired (a week) and signs in again while
 * another is live is told as new, and a person with no live session is never
 * told. A table of known devices (a migration) would fix both; add it if the
 * notice proves too noisy or too quiet.
 */
export function isNewDevice(current: string | null | undefined, others: (string | null | undefined)[]) {
  if (!others.length) return false;
  const label = deviceLabel(current);
  return !others.some((o) => deviceLabel(o) === label);
}
