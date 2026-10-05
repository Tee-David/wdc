import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";
import { getClient } from "@/lib/admin/store";
import { SUPPORT_COOKIE, SUPPORT_MINUTES } from "./support-policy";

type RealSession = { user: { id: string }; session: { id: string; createdAt: Date | string } };
export type SupportView = { id: string; targetId: string; name: string; email: string; clientId: string; expiresAt: string };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function supportCookiePresent() { return (await cookies()).has(SUPPORT_COOKIE); }

/** Checks actor, original session and target from persisted truth on every request. */
export async function resolveSupportView(session: RealSession | null): Promise<SupportView | null> {
  const token = (await cookies()).get(SUPPORT_COOKIE)?.value;
  if (!token || !session || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const r = await db.query<{ id: string; target_id: string; name: string; email: string; client_id: string; expires_at: Date }>(`
    SELECT v.id, v.target_id, u."name" AS name, u."email" AS email, v.client_id, v.expires_at
    FROM user_support_sessions v
    JOIN "user" a ON a."id" = v.actor_id AND a."role" = 'owner' AND a."deactivatedAt" IS NULL
    JOIN "user" u ON u."id" = v.target_id AND u."role" = 'client' AND u."deactivatedAt" IS NULL
    JOIN "session" s ON s."id" = v.actor_session_id AND s."userId" = a."id" AND s."expiresAt" > now()
    WHERE v.token_hash = $1 AND v.actor_id = $2 AND v.actor_session_id = $3
      AND v.revoked_at IS NULL AND v.expires_at > now()`, [hash(token), session.user.id, session.session.id]);
  const row = r.rows[0];
  if (!row) return null;
  const client = getClient(row.client_id);
  if (!client || client.archived || client.mergedInto || client.email.toLowerCase() !== row.email.toLowerCase()) return null;
  return { id: row.id, targetId: row.target_id, name: row.name, email: row.email, clientId: row.client_id, expiresAt: new Date(row.expires_at).toISOString() };
}

export async function createSupportView(session: RealSession, targetId: string, clientId: string, reason: string) {
  if (await supportCookiePresent()) throw new Error("Exit the current support view first.");
  if (!reason.trim() || reason.length > 500) throw new Error("Add a short support reason.");
  const age = Date.now() - new Date(session.session.createdAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > 15 * 60_000) throw new Error("Sign in again before starting a support view.");
  const client = getClient(clientId);
  if (!client || client.archived || client.mergedInto) throw new Error("An active client record is required.");
  const token = randomBytes(32).toString("base64url");
  await transaction(async (c) => {
    const actor = await c.query(`SELECT u."id" FROM "user" u JOIN "session" s ON s."userId" = u."id"
      WHERE u."id" = $1 AND u."role" = 'owner' AND u."deactivatedAt" IS NULL
      AND s."id" = $2 AND s."expiresAt" > now()
      AND s."createdAt" <= now() AND s."createdAt" >= now() - INTERVAL '15 minutes' FOR UPDATE`, [session.user.id, session.session.id]);
    const target = await c.query<{ email: string }>('SELECT "email" AS email FROM "user" WHERE "id" = $1 AND "role" = $2 AND "deactivatedAt" IS NULL FOR UPDATE', [targetId, "client"]);
    if (!actor.rowCount || !target.rowCount || target.rows[0].email.toLowerCase() !== client.email.toLowerCase()) throw new Error("That support view is not available.");
    await c.query(`UPDATE user_support_sessions SET revoked_at = now() WHERE actor_id = $1 AND actor_session_id = $2 AND revoked_at IS NULL`, [session.user.id, session.session.id]);
    await c.query(`INSERT INTO user_support_sessions(token_hash, actor_id, actor_session_id, target_id, client_id, reason, expires_at)
      VALUES($1,$2,$3,$4,$5,$6,now() + INTERVAL '15 minutes')`, [hash(token), session.user.id, session.session.id, targetId, clientId, reason.trim()]);
    await c.query(`INSERT INTO user_security_events(actor_id,target_id,event,detail) VALUES($1,$2,'support-started',$3)`, [session.user.id, targetId, reason.trim()]);
  });
  (await cookies()).set(SUPPORT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SUPPORT_MINUTES * 60 });
}

export async function endSupportView(session: RealSession | null) {
  const token = (await cookies()).get(SUPPORT_COOKIE)?.value;
  try {
  if (token && session) await transaction(async (c) => {
    const r = await c.query<{ target_id: string }>(`UPDATE user_support_sessions SET revoked_at = now()
      WHERE token_hash = $1 AND actor_id = $2 AND actor_session_id = $3 AND revoked_at IS NULL RETURNING target_id`, [hash(token), session.user.id, session.session.id]);
    if (r.rows[0]) await c.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'support-ended')`, [session.user.id, r.rows[0].target_id]);
  });
  } finally { (await cookies()).delete(SUPPORT_COOKIE); }
}
