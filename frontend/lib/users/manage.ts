import "server-only";
import { UsersError } from "./errors";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";

export type UserRow = { id: string; name: string; email: string; role: "owner" | "staff" | "client"; active: boolean; lastSignIn: string | null; sessions: number; password: boolean; google: boolean; clientId?: string };
import type { UserFilter } from "./filter";
export { userFilter, type UserFilter } from "./filter";

export type InviteRow = { id: string; name: string; email: string; role: string; status: string; expires: string; delivery: string };
export async function usersPage(f: UserFilter, exportLimit?: number) {
  const args: unknown[] = [f.tab === "clients" ? ["client"] : ["owner", "staff"]];
  const parts = [`u."role" = ANY($1::TEXT[])`];
  if (f.search) { args.push(`%${f.search.replace(/[\\%_]/g, "\\$&")}%`); parts.push(`(u."name" ILIKE $${args.length} OR u."email" ILIKE $${args.length})`); }
  if (f.role) { args.push(f.role); parts.push(`u."role" = $${args.length}`); }
  if (["active", "deactivated"].includes(f.status)) parts.push(`u."deactivatedAt" IS ${f.status === "active" ? "" : "NOT "}NULL`);
  const where = parts.join(" AND ");
  const count = await db.query<{ n: string }>(`SELECT count(*) AS n FROM "user" u WHERE ${where}`, args);
  const total = Number(count.rows[0].n); const page = Math.min(f.page, Math.max(1, Math.ceil(total / f.size)));
  const r = await db.query<UserRow>(`SELECT u."id",u."name",u."email",u."role",(u."deactivatedAt" IS NULL) AS active,u."lastSignInAt" AS "lastSignIn",
    (SELECT count(*)::INT FROM "session" s WHERE s."userId"=u."id" AND s."expiresAt">now()) AS sessions,
    EXISTS(SELECT 1 FROM "account" a WHERE a."userId"=u."id" AND a."providerId"='credential' AND a."password" IS NOT NULL) AS password,
    EXISTS(SELECT 1 FROM "account" a WHERE a."userId"=u."id" AND a."providerId"='google') AS google
    FROM "user" u WHERE ${where} ORDER BY lower(u."name"),u."id" LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, exportLimit ?? f.size, exportLimit ? 0 : (page - 1) * f.size]);
  return { total, page, rows: r.rows.map(x => ({ ...x, lastSignIn: x.lastSignIn ? new Date(x.lastSignIn).toISOString() : null })) };
}

export async function invitationsPage(f: UserFilter, exportLimit?: number) {
  const args: unknown[] = []; const parts: string[] = [];
  const state = `CASE WHEN redeemed_at IS NOT NULL THEN 'redeemed' WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN expires_at<=now() THEN 'expired' ELSE 'pending' END`;
  if (f.search) { args.push(`%${f.search.replace(/[\\%_]/g, "\\$&")}%`); parts.push(`(i.name ILIKE $${args.length} OR i.email ILIKE $${args.length})`); }
  if (f.role) { args.push(f.role); parts.push(`i.role=$${args.length}`); }
  if (["pending", "expired", "redeemed", "revoked"].includes(f.status)) { args.push(f.status); parts.push(`(${state})=$${args.length}`); }
  const where = parts.length ? `WHERE ${parts.join(" AND ")}` : "";
  const count = await db.query<{ n: string }>(`SELECT count(*) AS n FROM invitations i ${where}`, args); const total = Number(count.rows[0].n); const page = Math.min(f.page, Math.max(1, Math.ceil(total / f.size)));
  const r = await db.query<InviteRow>(`SELECT i.id,i.name,i.email,i.role,(${state}) AS status,i.expires_at AS expires,coalesce(d.state,'unrecorded') AS delivery FROM invitations i LEFT JOIN user_invitation_delivery d ON d.invitation_id=i.id ${where} ORDER BY i.created_at DESC,i.id LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, exportLimit ?? f.size, exportLimit ? 0 : (page - 1) * f.size]);
  return { total, page, rows: r.rows.map(x => ({ ...x, expires: new Date(x.expires).toISOString() })) };
}

export type UserChange = "rename" | "deactivate" | "reactivate" | "signout" | "owner" | "staff";
export async function changeUser(actor: string, target: string, change: UserChange, name = "") {
  return transaction(async tx => {
    const owners = await tx.query<{ id: string }>(`SELECT "id" FROM "user" WHERE "role"='owner' AND "deactivatedAt" IS NULL ORDER BY "id" FOR UPDATE`);
    if (!owners.rows.some(x => x.id === actor)) throw new UsersError("Your owner access has ended. Sign in again.");
    if (actor === target) throw new UsersError("Manage your own account under My account. Another owner must change your access.");
    const found = await tx.query<{ id: string; name: string; role: string; off: Date | null }>(`SELECT "id","name","role","deactivatedAt" AS off FROM "user" WHERE "id"=$1 FOR UPDATE`, [target]); const user = found.rows[0];
    if (!user) throw new UsersError("That account no longer exists.");
    if ((change === "owner" || change === "staff") && user.role === "client") throw new UsersError("Client accounts cannot be converted into studio accounts.");
    if (user.role === "owner" && !user.off && ["staff", "deactivate"].includes(change) && owners.rows.length < 2) throw new UsersError("Keep at least one active owner.");
    if ((change === "deactivate" && user.off) || (change === "reactivate" && !user.off) || (change === "rename" && user.name === name) || ((change === "owner" || change === "staff") && user.role === change)) return null;
    if (change === "rename") await tx.query(`UPDATE "user" SET "name"=$2,"updatedAt"=now() WHERE "id"=$1`, [target, name]);
    if (change === "owner" || change === "staff") await tx.query(`UPDATE "user" SET "role"=$2,"updatedAt"=now() WHERE "id"=$1`, [target, change]);
    if (change === "deactivate") await tx.query(`UPDATE "user" SET "deactivatedAt"=now(),"deactivatedBy"=$2,"updatedAt"=now() WHERE "id"=$1`, [target, actor]);
    if (change === "reactivate") await tx.query(`UPDATE "user" SET "deactivatedAt"=NULL,"deactivatedBy"=NULL,"updatedAt"=now() WHERE "id"=$1`, [target]);
    if (["signout", "deactivate", "owner", "staff"].includes(change)) await tx.query(`DELETE FROM "session" WHERE "userId"=$1`, [target]);
    const event = await tx.query<{id:string}>(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,$3) RETURNING id`, [actor, target, `account-${change}`]);
    const notice = await tx.query<{id:string}>(`INSERT INTO user_security_notices(event_id,target_id,kind) VALUES($1,$2,$3) RETURNING id`, [event.rows[0].id,target,change]);
    return notice.rows[0].id;
  });
}
