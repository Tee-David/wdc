import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";

export type Department = {
  id: string;
  name: string;
  members: { id: string; name: string; active: boolean }[];
};

/** Every department with its people. `null` when migration 0040 has not been applied. */
export async function listDepartments(): Promise<Department[] | null> {
  try {
    const d = await db.query<{ id: string; name: string }>(`SELECT id, name FROM departments ORDER BY lower(name)`);
    const m = await db.query<{ department_id: string; id: string; name: string; active: boolean }>(
      `SELECT m.department_id, u."id", u."name", (u."deactivatedAt" IS NULL) AS active
       FROM department_members m JOIN "user" u ON u."id" = m.user_id ORDER BY lower(u."name")`);
    return d.rows.map((x) => ({ ...x, members: m.rows.filter((r) => r.department_id === x.id).map(({ id, name, active }) => ({ id, name, active })) }));
  } catch { return null; }
}

/** The people who can be put in a department: active owners and staff. */
export async function staffChoices(): Promise<{ id: string; name: string }[]> {
  const r = await db.query<{ id: string; name: string }>(`SELECT "id","name" FROM "user" WHERE "role" IN ('owner','staff') AND "deactivatedAt" IS NULL ORDER BY lower("name") LIMIT 200`);
  return r.rows;
}

export async function createDepartment(name: string): Promise<"ok" | "taken"> {
  try { await db.query(`INSERT INTO departments (id, name) VALUES ($1, $2)`, [randomUUID(), name]); return "ok"; }
  catch { return "taken"; }
}

export async function renameDepartment(id: string, name: string): Promise<"ok" | "taken"> {
  try { await db.query(`UPDATE departments SET name = $2 WHERE id = $1`, [id, name]); return "ok"; }
  catch { return "taken"; }
}

/** Replaces the member list with exactly these people (only active staff or owners are accepted). */
export async function setMembers(id: string, userIds: string[]): Promise<void> {
  await transaction(async (tx) => {
    await tx.query(`DELETE FROM department_members WHERE department_id = $1`, [id]);
    if (userIds.length) {
      await tx.query(
        `INSERT INTO department_members (department_id, user_id)
         SELECT $1, "id" FROM "user" WHERE "id" = ANY($2::TEXT[]) AND "role" IN ('owner','staff') AND "deactivatedAt" IS NULL`,
        [id, userIds]);
    }
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await db.query(`DELETE FROM departments WHERE id = $1`, [id]);
}

/** Department names for a set of ids, for labels on a client. */
export async function departmentNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  try {
    const r = await db.query<{ id: string; name: string }>(`SELECT id, name FROM departments WHERE id = ANY($1::TEXT[])`, [ids]);
    return Object.fromEntries(r.rows.map((x) => [x.id, x.name]));
  } catch { return {}; }
}
