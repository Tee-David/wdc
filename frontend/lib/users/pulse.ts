import "server-only";
import { db } from "@/lib/db/pool";

/**
 * THE USERS FIGURES AND DECK CAUSES, read straight from the accounts, the invitations and the security events.
 * Counts are per tab and per status so each chip says what pressing it shows. A cause appears only while it is true.
 */
export type UsersPulse = {
  team: { all: number; active: number; deactivated: number };
  clients: { all: number; active: number; deactivated: number; never: number };
  invites: { all: number; pending: number; expired: number; redeemed: number; revoked: number };
  expired: { id: string; name: string; email: string; role: string; sent: string; expires: string }[];
  never: { id: string; name: string; email: string; created: string }[];
  support: { actor: string; target: string; role: string; reason: string; at: string }[];
};

export async function usersPulse(): Promise<UsersPulse> {
  const [u, inv, expired, never, support] = await Promise.all([
    db.query<{ role: string; active: boolean; never: boolean; n: number }>(`SELECT "role", ("deactivatedAt" IS NULL) AS active, ("lastSignInAt" IS NULL) AS never, count(*)::INT AS n FROM "user" GROUP BY 1,2,3`),
    db.query<{ status: string; n: number }>(`SELECT (CASE WHEN redeemed_at IS NOT NULL THEN 'redeemed' WHEN revoked_at IS NOT NULL THEN 'revoked' WHEN expires_at<=now() THEN 'expired' ELSE 'pending' END) AS status, count(*)::INT AS n FROM invitations GROUP BY 1`),
    db.query<{ id: string; name: string; email: string; role: string; created_at: Date; expires_at: Date }>(`SELECT id,name,email,role,created_at,expires_at FROM invitations WHERE redeemed_at IS NULL AND revoked_at IS NULL AND expires_at<=now() ORDER BY expires_at DESC LIMIT 5`),
    db.query<{ id: string; name: string; email: string; created: Date }>(`SELECT "id","name","email","createdAt" AS created FROM "user" WHERE "role"='client' AND "deactivatedAt" IS NULL AND "lastSignInAt" IS NULL ORDER BY "createdAt" LIMIT 5`),
    db.query<{ actor: string | null; target: string | null; trole: string | null; detail: string; at: Date }>(`SELECT a."name" AS actor, t."name" AS target, t."role" AS trole, e.detail, e.created_at AS at FROM user_security_events e LEFT JOIN "user" a ON a."id"=e.actor_id LEFT JOIN "user" t ON t."id"=e.target_id WHERE e.event='support-started' AND e.created_at > now() - interval '30 days' ORDER BY e.created_at DESC LIMIT 3`),
  ]);
  const sum = (f: (r: (typeof u.rows)[number]) => boolean) => u.rows.filter(f).reduce((n, r) => n + r.n, 0);
  const isTeam = (r: { role: string }) => r.role !== "client";
  const iv = (s: string) => inv.rows.find((r) => r.status === s)?.n ?? 0;
  return {
    team: { all: sum(isTeam), active: sum((r) => isTeam(r) && r.active), deactivated: sum((r) => isTeam(r) && !r.active) },
    clients: { all: sum((r) => !isTeam(r)), active: sum((r) => !isTeam(r) && r.active), deactivated: sum((r) => !isTeam(r) && !r.active), never: sum((r) => !isTeam(r) && r.active && r.never) },
    invites: { all: inv.rows.reduce((n, r) => n + r.n, 0), pending: iv("pending"), expired: iv("expired"), redeemed: iv("redeemed"), revoked: iv("revoked") },
    expired: expired.rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, sent: r.created_at.toISOString(), expires: r.expires_at.toISOString() })),
    never: never.rows.map((r) => ({ id: r.id, name: r.name, email: r.email, created: new Date(r.created).toISOString() })),
    support: support.rows.map((r) => ({ actor: r.actor ?? "Someone", target: r.target ?? "an account", role: r.trole ?? "", reason: r.detail.replace(/^Staff view: /, ""), at: r.at.toISOString() })),
  };
}
