import "server-only";
import { db } from "@/lib/db/pool";
import { getProjects } from "@/lib/admin/store";
import type { Client } from "@/lib/admin/types";

export type Colleague = { kind: "person" | "invite"; id: string; name: string; email: string; review: boolean; billing: boolean; projects: number; expiresAt?: string };

export const getsWords = (c: { review: boolean; billing: boolean }) => [c.review && "Approvals", c.billing && "Invoices and receipts"].filter(Boolean).join(", ") || "Project updates and messages";

/** The client's live projects: what a colleague is given access to. */
export const liveProjectIds = (clientId: string) => getProjects().filter((p) => p.clientId === clientId && !p.archived).map((p) => p.id);

/**
 * WHO ELSE AT THE BUSINESS HAS ACCESS: client accounts with a membership on
 * one of its projects (not the main contact, whose access comes from the
 * record), then invitations still waiting. Null before migration 0056.
 */
export async function colleaguesOf(client: Client): Promise<Colleague[] | null> {
  const ids = getProjects(true).filter((p) => p.clientId === client.id).map((p) => p.id);
  try {
    const [people, invites] = await Promise.all([
      ids.length ? db.query<{ id: string; name: string; email: string; review: boolean; billing: boolean; n: string }>(
        `SELECT u.id, u.name, u.email, bool_or(m.can_review) AS review, bool_or(m.can_billing) AS billing, count(*)::STRING AS n
           FROM workspace_project_members m JOIN "user" u ON u.id = m.user_id
          WHERE m.project_id = ANY($1::STRING[]) AND m.revoked_at IS NULL AND u.role = 'client' AND u."deactivatedAt" IS NULL AND lower(u.email) <> $2
          GROUP BY u.id, u.name, u.email ORDER BY u.name`, [ids, client.email.trim().toLowerCase()]).then((r) => r.rows) : Promise.resolve([]),
      db.query<{ id: string; name: string; email: string; review: boolean; billing: boolean; n: string; expires_at: Date }>(
        `SELECT i.id, i.name, i.email, i.expires_at, bool_or(g.can_review) AS review, bool_or(g.can_billing) AS billing, count(*)::STRING AS n
           FROM invitations i JOIN invitation_project_grants g ON g.invitation_id = i.id
          WHERE i.client_id = $1 AND i.redeemed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
          GROUP BY i.id, i.name, i.email, i.expires_at, i.created_at ORDER BY i.created_at DESC`, [client.id]).then((r) => r.rows),
    ]);
    return [
      ...people.map((p): Colleague => ({ kind: "person", id: p.id, name: p.name, email: p.email, review: p.review, billing: p.billing, projects: Number(p.n) })),
      ...invites.map((p): Colleague => ({ kind: "invite", id: p.id, name: p.name || p.email, email: p.email, review: p.review, billing: p.billing, projects: Number(p.n), expiresAt: new Date(p.expires_at).toISOString() })),
    ];
  } catch { return null; }
}
