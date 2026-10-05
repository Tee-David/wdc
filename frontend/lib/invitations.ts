import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";

/**
 * Invitations: the only way an account is made apart from the owner seed.
 * The table and its promises are in db/migrations/0012_invitations.sql.
 *
 * WHAT A REDEMPTION PROVES. The link was sent to the invited address, so
 * opening it shows the same thing a sign-in link does: access to that inbox.
 * That is why the account it creates is marked verified, and why magic-link
 * and Google sign-in (both of which require a verified row) work for it at
 * once. It does NOT let anybody pick a different address -- the email comes
 * from the row, never from the form.
 */

export class ClientInvitationError extends Error {}
export type InviteRole = "client" | "staff" | "owner";

export const INVITE_TTL_DAYS = 7;
import { passwordProblem } from "@/lib/auth/password-policy";
import { BREACHED_MESSAGE, breachProblem } from "@/lib/auth/breached";
export { PASSWORD_MIN as INVITE_PASSWORD_MIN } from "@/lib/auth/password-policy";

export type Invitation = {
  id: string;
  email: string;
  name: string;
  role: InviteRole;
  clientId: string | null;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
};

export type InviteState = "pending" | "redeemed" | "revoked" | "expired";

type Row = {
  id: string; email: string; name: string; role: InviteRole; client_id: string | null; invited_by: string;
  created_at: Date; expires_at: Date; redeemed_at: Date | null; revoked_at: Date | null; revoked_by: string | null;
};

const COLUMNS = "id, email, name, role, client_id, invited_by, created_at, expires_at, redeemed_at, revoked_at, revoked_by";
const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

function toInvitation(r: Row): Invitation {
  return {
    id: r.id, email: r.email, name: r.name, role: r.role, clientId: r.client_id, invitedBy: r.invited_by,
    createdAt: iso(r.created_at)!, expiresAt: iso(r.expires_at)!,
    redeemedAt: iso(r.redeemed_at), revokedAt: iso(r.revoked_at), revokedBy: r.revoked_by,
  };
}

export function inviteState(i: Pick<Invitation, "redeemedAt" | "revokedAt" | "expiresAt">, now = Date.now()): InviteState {
  if (i.redeemedAt) return "redeemed";
  if (i.revokedAt) return "revoked";
  return Date.parse(i.expiresAt) <= now ? "expired" : "pending";
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function invitationsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/**
 * Makes an invitation and returns the raw token, which exists nowhere else
 * once this returns: it goes into the email and is gone.
 *
 * A NEW INVITATION REPLACES AN OUTSTANDING ONE for the same address and role,
 * in the same transaction. "Send it again" must not leave two live links in
 * somebody's inbox, one of them possibly forwarded.
 */
export async function createInvitation(input: {
  email: string; name: string; role: InviteRole; actorId: string; clientId?: string | null; by: string; ttlDays?: number; sourceId?: string;
}): Promise<{ invitation: Invitation; token: string }> {
  const email = normaliseEmail(input.email);
  const token = randomBytes(32).toString("base64url");
  const days = input.ttlDays ?? INVITE_TTL_DAYS;
  return transaction(async (c) => {
    const actor = await c.query<{role:string}>(`SELECT "role" FROM "user" WHERE "id"=$1 AND "deactivatedAt" IS NULL FOR UPDATE`,[input.actorId]);
    if (!actor.rows[0] || (input.role === "client" ? !["owner","staff"].includes(actor.rows[0].role) : actor.rows[0].role !== "owner")) throw new Error("Your account can no longer send this invitation.");
    if (input.role === "client") {
      const linked = await c.query<{data:{email?:string;archived?:boolean;mergedInto?:string}|null}>(`SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE`, [input.clientId ?? ""]);
      const client = linked.rows[0]?.data;
      if (!client || client.archived || client.mergedInto || normaliseEmail(client.email ?? "") !== email) throw new ClientInvitationError("Restore the client record and confirm its current email before inviting them.");
    }
    await c.query(`INSERT INTO user_invitation_targets(email) VALUES($1) ON CONFLICT(email) DO UPDATE SET email=excluded.email`, [email]);
    await c.query(`SELECT email FROM user_invitation_targets WHERE email=$1 FOR UPDATE`, [email]);
    const account = await c.query(`SELECT 1 FROM "user" WHERE lower("email")=$1`, [email]);
    if (account.rowCount) throw new Error("An account already exists for this email. Manage the account instead.");
    if (input.sourceId) {
      const original = await c.query(`SELECT id FROM invitations WHERE id=$1 AND email=$2 AND redeemed_at IS NULL AND revoked_at IS NULL FOR UPDATE`, [input.sourceId, email]);
      if (!original.rowCount) throw new Error("That invitation has been accepted or cancelled. Refresh the list.");
    }
    await c.query(
      `UPDATE invitations SET revoked_at = now(), revoked_by = $2
        WHERE email = $1 AND redeemed_at IS NULL AND revoked_at IS NULL`,
      [email, `${input.by} (replaced)`],
    );
    const r = await c.query<Row>(
      `INSERT INTO invitations (token_hash, email, name, role, client_id, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::INTERVAL)
       RETURNING ${COLUMNS}`,
      [hashToken(token), email, input.name.trim().slice(0, 120), input.role, input.clientId ?? null, input.by, String(days)],
    );
    await c.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'invitation-created')`, [input.actorId,r.rows[0].id]);
    await c.query(`INSERT INTO user_invitation_delivery(invitation_id,state) VALUES($1,'queued')`, [r.rows[0].id]);
    return { invitation: toInvitation(r.rows[0]), token };
  });
}

/** The invitation a link names, whatever state it is in, or null. */
export async function invitationForToken(token: string): Promise<Invitation | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const r = await db.query<Row>(`SELECT ${COLUMNS} FROM invitations WHERE token_hash = $1`, [hashToken(token)]);
  return r.rows[0] ? toInvitation(r.rows[0]) : null;
}

export async function invitationsFor(filter: { clientId?: string; role?: InviteRole; limit?: number }): Promise<Invitation[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.clientId) { args.push(filter.clientId); where.push(`client_id = $${args.length}`); }
  if (filter.role) { args.push(filter.role); where.push(`role = $${args.length}`); }
  args.push(filter.limit ?? 50);
  const r = await db.query<Row>(
    `SELECT ${COLUMNS} FROM invitations ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC LIMIT $${args.length}`,
    args,
  );
  return r.rows.map(toInvitation);
}

export async function revokeInvitation(id: string, by: string, actorId: string) {
  return transaction(async c => {
    const actor = await c.query(`SELECT "id" FROM "user" WHERE "id"=$1 AND "role"='owner' AND "deactivatedAt" IS NULL FOR UPDATE`, [actorId]);
    if (!actor.rowCount) throw new Error("Owner access has ended.");
    const r = await c.query("UPDATE invitations SET revoked_at=now(),revoked_by=$2 WHERE id=$1 AND redeemed_at IS NULL AND revoked_at IS NULL RETURNING id", [id,by]);
    if (r.rowCount) await c.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'invitation-cancelled')`, [actorId,id]);
    return (r.rowCount ?? 0)>0;
  });
}

/**
 * Withdraw every unspent invitation of a client whose address is no longer
 * `keep`: the account an invitation makes is for the address it was sent to,
 * and the portal finds a client by the signed-in address, so an invitation to
 * an address the client no longer has would make an account that opens to
 * nothing. Returns how many were withdrawn.
 */
export async function revokeStaleInvitations(clientId: string, keep: string, by: string) {
  const r = await db.query(
    `UPDATE invitations SET revoked_at = now(), revoked_by = $3
      WHERE client_id = $1 AND lower(email) <> lower($2) AND redeemed_at IS NULL AND revoked_at IS NULL`,
    [clientId, keep, by],
  );
  return r.rowCount ?? 0;
}

export type Redeemed =
  | { ok: true; email: string; userId: string; role: InviteRole }
  | { ok: false; reason: "invalid" | "redeemed" | "revoked" | "expired" | "exists" | "weak-password" | "breached-password" | "unchecked-password" };

/**
 * Spends an invitation: creates the verified account, and a password if one
 * was chosen, then marks the invitation used -- all or nothing.
 *
 * THE ROW IS LOCKED (`FOR UPDATE`) before it is read, so two presses of the
 * same link, or the same link in two tabs, cannot both find it unspent: the
 * second waits for the first and then sees `redeemed_at`.
 *
 * AN ADDRESS THAT ALREADY HAS AN ACCOUNT IS NOT TAKEN OVER. The invitation
 * does not become a way to set a password on somebody's existing account;
 * that person signs in the way they already do.
 */
export async function redeemInvitation(token: string, input: { name: string; password?: string | null }): Promise<Redeemed> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, reason: "invalid" };
  const password = input.password ?? null;
  if (password !== null && passwordProblem(password)) return { ok: false, reason: "weak-password" };
  if (password !== null) {
    const leaked = await breachProblem(password);
    if (leaked) return { ok: false, reason: leaked === BREACHED_MESSAGE ? "breached-password" : "unchecked-password" };
  }
  /* Hashed before the transaction: scrypt is deliberately slow and a lock
     should not be held across it. */
  const hashed = password !== null ? await hashPassword(password) : null;

  return transaction(async (c) => {
    const found = await c.query<Row>(`SELECT ${COLUMNS} FROM invitations WHERE token_hash = $1 FOR UPDATE`, [hashToken(token)]);
    const row = found.rows[0];
    if (!row) return { ok: false, reason: "invalid" } as const;
    const state = inviteState(toInvitation(row));
    if (state !== "pending") return { ok: false, reason: state } as const;

    if (row.role === "client") {
      const linked = await c.query<{data:{email?:string;archived?:boolean;mergedInto?:string}|null}>(`SELECT data FROM admin_records WHERE collection='CLIENTS' AND id=$1 FOR UPDATE`, [row.client_id ?? ""]);
      const client = linked.rows[0]?.data;
      if (!client || client.archived || client.mergedInto || normaliseEmail(client.email ?? "") !== row.email) {
        await c.query(`UPDATE invitations SET revoked_at=now(),revoked_by='Client linkage changed' WHERE id=$1`, [row.id]);
        return {ok:false,reason:"revoked"} as const;
      }
    }
    const existing = await c.query('SELECT 1 FROM "user" WHERE lower("email") = $1', [row.email]);
    if (existing.rowCount) return { ok: false, reason: "exists" } as const;

    const userId = randomUUID();
    const name = input.name.trim().slice(0, 120) || row.name || row.email.split("@")[0];
    await c.query(
      'INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1, $2, $3, true, $4)',
      [userId, name, row.email, row.role],
    );
    if (hashed) {
      await c.query(
        'INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password") VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), userId, "credential", userId, hashed],
      );
    }
    await c.query("UPDATE invitations SET redeemed_at = now(), redeemed_user_id = $2 WHERE id = $1", [row.id, userId]);
    return { ok: true, email: row.email, userId, role: row.role } as const;
  });
}

/** Whether an address already has an account, and as what. */
export async function accountFor(email: string): Promise<{ role: string; createdAt: string } | null> {
  const r = await db.query<{ role: string; createdAt: Date }>(
    'SELECT "role", "createdAt" FROM "user" WHERE lower("email") = $1 LIMIT 1',
    [normaliseEmail(email)],
  );
  const row = r.rows[0];
  return row ? { role: row.role, createdAt: new Date(row.createdAt).toISOString() } : null;
}
