"use server";

import { adminRole } from "./guard";
import { can } from "./permissions";
import { db } from "@/lib/db/pool";

/** The active owner and staff accounts, for "Who is answerable". Anyone who can run projects may ask; nothing else leaves. */
export async function staffPeople(): Promise<{ id: string; name: string }[]> {
  if (!can(await adminRole(), "projects")) return [];
  try {
    const r = await db.query<{ id: string; name: string }>(`SELECT "id","name" FROM "user" WHERE "role" IN ('owner','staff') AND "deactivatedAt" IS NULL ORDER BY lower("name") LIMIT 200`);
    return r.rows.filter((x) => x.name);
  } catch { return []; }
}
