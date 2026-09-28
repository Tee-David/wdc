import "server-only";

import { db } from "@/lib/db/pool";

/**
 * The people who can reach the admin, and the changes an owner makes to them.
 *
 * THE GUARDS LIVE IN THE TRANSACTION. "Never remove the last owner" is only
 * true if two owners demoting each other at the same moment cannot both
 * succeed, so every change that could reduce the number of active owners
 * locks the owner rows first (`FOR UPDATE`) and counts them inside the same
 * transaction that makes the change. Deactivating also deletes the person's
 * sessions in that transaction, so their access ends now.
 */

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  createdAt: string;
  lastSignIn: string | null;
  sessions: number;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
};

export async function listTeam(): Promise<TeamMember[]> {
  const r = await db.query<{
    id: string; name: string; email: string; role: "owner" | "staff"; createdAt: Date;
    last: Date | null; sessions: string; deactivatedAt: Date | null; deactivatedBy: string | null;
  }>(`
    SELECT u."id", u."name", u."email", u."role", u."createdAt", u."deactivatedAt", u."deactivatedBy",
      (SELECT max(s."createdAt") FROM "session" s WHERE s."userId" = u."id") AS last,
      (SELECT count(*) FROM "session" s WHERE s."userId" = u."id" AND s."expiresAt" > now()) AS sessions
    FROM "user" u WHERE u."role" IN ('owner', 'staff')
    ORDER BY (u."deactivatedAt" IS NOT NULL), CASE u."role" WHEN 'owner' THEN 0 ELSE 1 END, lower(u."name")
  `);
  return r.rows.map((x) => ({
    id: x.id, name: x.name, email: x.email, role: x.role,
    createdAt: new Date(x.createdAt).toISOString(),
    lastSignIn: x.last ? new Date(x.last).toISOString() : null,
    sessions: Number(x.sessions),
    deactivatedAt: x.deactivatedAt ? new Date(x.deactivatedAt).toISOString() : null,
    deactivatedBy: x.deactivatedBy,
  }));
}

export type TeamChange =
  | { ok: true; member: { id: string; name: string; email: string; previousName?: string } }
  | { ok: false; reason: "missing" | "self" | "last-owner" | "not-team" | "no-change" };

/**
 * One change, in one transaction, with the guards counted inside it.
 * `actorId` is the person making it: nobody changes their own access here.
 */
async function change(
  actorId: string,
  targetId: string,
  apply: (tx: import("pg").PoolClient, target: { id: string; name: string; email: string; role: string; off: Date | null }) => Promise<TeamChange | null>,
  reducesOwners: (target: { role: string; off: Date | null }) => boolean,
): Promise<TeamChange> {
  if (!targetId) return { ok: false, reason: "missing" };
  if (actorId === targetId) return { ok: false, reason: "self" };
  const tx = await db.connect();
  try {
    await tx.query("BEGIN");
    /* Every active owner, locked, so a concurrent change waits for this one. */
    const owners = await tx.query<{ id: string }>(`SELECT "id" FROM "user" WHERE "role" = 'owner' AND "deactivatedAt" IS NULL FOR UPDATE`);
    const t = await tx.query<{ id: string; name: string; email: string; role: string; off: Date | null }>(
      `SELECT "id", "name", "email", "role", "deactivatedAt" AS off FROM "user" WHERE "id" = $1 FOR UPDATE`, [targetId],
    );
    const target = t.rows[0];
    if (!target) { await tx.query("ROLLBACK"); return { ok: false, reason: "missing" }; }
    if (target.role !== "owner" && target.role !== "staff") { await tx.query("ROLLBACK"); return { ok: false, reason: "not-team" }; }
    if (reducesOwners(target) && owners.rows.length <= 1) { await tx.query("ROLLBACK"); return { ok: false, reason: "last-owner" }; }
    const previousName = target.name;
    const refused = await apply(tx, target);
    if (refused) { await tx.query("ROLLBACK"); return refused; }
    await tx.query("COMMIT");
    return { ok: true, member: { id: target.id, name: target.name, email: target.email, ...(target.name !== previousName ? { previousName } : {}) } };
  } catch (error) {
    await tx.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    tx.release();
  }
}

const isActiveOwner = (t: { role: string; off: Date | null }) => t.role === "owner" && !t.off;

export function changeRole(actorId: string, targetId: string, role: "owner" | "staff") {
  return change(actorId, targetId, async (tx, t) => {
    if (t.role === role) return { ok: false, reason: "no-change" };
    await tx.query(`UPDATE "user" SET "role" = $2, "updatedAt" = now() WHERE "id" = $1`, [targetId, role]);
    /* A demotion takes effect now: their open sessions end. */
    if (role === "staff") await tx.query(`DELETE FROM "session" WHERE "userId" = $1`, [targetId]);
    return null;
  }, (t) => role === "staff" && isActiveOwner(t));
}

export function deactivate(actorId: string, targetId: string, by: string) {
  return change(actorId, targetId, async (tx, t) => {
    if (t.off) return { ok: false, reason: "no-change" };
    await tx.query(`UPDATE "user" SET "deactivatedAt" = now(), "deactivatedBy" = $2, "updatedAt" = now() WHERE "id" = $1`, [targetId, by.slice(0, 120)]);
    await tx.query(`DELETE FROM "session" WHERE "userId" = $1`, [targetId]);
    return null;
  }, isActiveOwner);
}

export function reactivate(actorId: string, targetId: string) {
  return change(actorId, targetId, async (tx, t) => {
    if (!t.off) return { ok: false, reason: "no-change" };
    await tx.query(`UPDATE "user" SET "deactivatedAt" = NULL, "deactivatedBy" = NULL, "updatedAt" = now() WHERE "id" = $1`, [targetId]);
    return null;
  }, () => false);
}

/** Every session for one person ends. Their account stays as it is. */
export function signOutEverywhere(actorId: string, targetId: string) {
  return change(actorId, targetId, async (tx) => {
    await tx.query(`DELETE FROM "session" WHERE "userId" = $1`, [targetId]);
    return null;
  }, () => false);
}

/** An owner may correct another team member's display name, never their own. */
export function renameMember(actorId: string, targetId: string, name: string) {
  return change(actorId, targetId, async (tx, target) => {
    if (target.name === name) return { ok: false, reason: "no-change" };
    await tx.query(`UPDATE "user" SET "name" = $2, "updatedAt" = now() WHERE "id" = $1`, [targetId, name]);
    target.name = name;
    return null;
  }, () => false);
}
