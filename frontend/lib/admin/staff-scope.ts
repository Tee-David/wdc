import "server-only";
import { db } from "@/lib/db/pool";
import { getClients, getProjects } from "@/lib/admin/store";
import { getAdminRequest } from "@/lib/admin/session";
import type { AdminRole } from "@/lib/admin/permissions";

export type StaffScope = { projects: ReadonlySet<string>; clients: ReadonlySet<string> };

/**
 * WHAT A STAFF MEMBER WORKS ON, from the records the studio already keeps:
 * the projects they lead or were added to, the clients in their departments,
 * the projects of those clients, and the clients of those projects. The owner
 * has no scope (null): every record is theirs.
 *
 * Read on the server for every page that lists or opens a client or a project,
 * so a hidden row is also a refused address. A missing table (a migration not
 * yet applied) narrows to what is left rather than widening to everything.
 */
export async function staffScope(role: AdminRole | null): Promise<StaffScope | null> {
  if (role === "owner") return null;
  let me = "";
  try { me = (await getAdminRequest()).session?.user?.id ?? ""; } catch { /* no session: an empty scope */ }
  if (role !== "staff" || !me) return { projects: new Set(), clients: new Set() };

  const [members, depts] = await Promise.all([
    db.query<{ project_id: string }>("SELECT project_id FROM workspace_project_members WHERE user_id=$1 AND revoked_at IS NULL", [me]).then((r) => r.rows.map((x) => x.project_id), () => [] as string[]),
    db.query<{ department_id: string }>("SELECT department_id FROM department_members WHERE user_id=$1", [me]).then((r) => r.rows.map((x) => x.department_id), () => [] as string[]),
  ]);
  const memberOf = new Set(members);
  const myDepts = new Set(depts);
  const projects = getProjects(true);
  const clients = new Set(getClients({ includeArchived: true }).filter((c) => (c.departments ?? []).some((d) => myDepts.has(d))).map((c) => c.id));
  const mine = new Set<string>();
  for (const p of projects) {
    if (p.ownerIds?.includes(me) || memberOf.has(p.id) || clients.has(p.clientId)) mine.add(p.id);
  }
  for (const p of projects) if (mine.has(p.id)) clients.add(p.clientId);
  return { projects: mine, clients };
}

/** True when the scope allows this record; the owner's null scope allows everything. */
export const inScope = (scope: StaffScope | null, kind: "projects" | "clients", id: string) => !scope || scope[kind].has(id);
