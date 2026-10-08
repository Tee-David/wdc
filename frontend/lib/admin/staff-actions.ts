"use server";

import { adminRole } from "./guard";
import { can } from "./permissions";
import { db } from "@/lib/db/pool";

/** Names of the active owner and staff accounts, for "Who is answerable". Anyone who can run projects may ask; nothing else leaves. */
export async function staffNames(): Promise<string[]> {
  if (!can(await adminRole(), "projects")) return [];
  try {
    const r = await db.query<{ name: string }>(`SELECT "name" FROM "user" WHERE "role" IN ('owner','staff') AND "deactivatedAt" IS NULL ORDER BY lower("name") LIMIT 200`);
    return r.rows.map((x) => x.name).filter(Boolean);
  } catch { return []; }
}
