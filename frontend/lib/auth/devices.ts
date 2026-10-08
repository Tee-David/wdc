import "server-only";

import { db } from "@/lib/db/pool";
import { deviceLabel } from "./device-label";

export { deviceLabel } from "./device-label";

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
