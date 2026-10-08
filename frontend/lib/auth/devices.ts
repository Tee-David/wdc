import "server-only";

import { db } from "@/lib/db/pool";

/** "Chrome on Windows" from a user agent: enough to recognise a device, no more. */
export function deviceLabel(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export type Device = { id: string; label: string; at: string; current: boolean };

/** The devices a person is signed in on, newest first (at most five exist; see MAX_DEVICES in lib/auth.ts). */
export async function listDevices(userId: string, currentId: string | undefined): Promise<Device[]> {
  try {
    const r = await db.query<{ id: string; createdAt: Date; userAgent: string | null }>(
      'SELECT "id", "createdAt", "userAgent" FROM "session" WHERE "userId" = $1 AND "expiresAt" > now() ORDER BY "createdAt" DESC LIMIT 10', [userId],
    );
    return r.rows.map((s) => ({ id: s.id, label: deviceLabel(s.userAgent), at: new Date(s.createdAt).toISOString(), current: s.id === currentId }));
  } catch {
    return [];
  }
}
