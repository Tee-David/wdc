import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/pool";
import { validDesign, type Design } from "./email-design";

/** Strings in a design are bounded here, so a saved design can never be huge. */
function bounded(d: Design): Design {
  const cut = (v: unknown, n = 4000): unknown =>
    typeof v === "string" ? v.slice(0, n) : Array.isArray(v) ? v.slice(0, 30).map((x) => cut(x, n)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cut(x, n)])) : v;
  return cut(d) as Design;
}

export type SavedDesign = { design: Design; enabled: boolean; updatedBy: string; updatedAt: string };

export async function getSaved(kind: string): Promise<SavedDesign | null> {
  try {
    const r = await db.query<{ design: Design; enabled: boolean; updated_by: string; updated_at: Date }>(`SELECT design, enabled, updated_by, updated_at FROM email_designs WHERE kind = $1`, [kind]);
    const row = r.rows[0];
    return row && validDesign(row.design) ? { design: row.design, enabled: row.enabled, updatedBy: row.updated_by, updatedAt: row.updated_at.toISOString() } : null;
  } catch { return null; }
}

/** The design to send with, only when it exists and is switched on. Never throws. */
export async function activeDesign(kind: string): Promise<Design | null> {
  const s = await getSaved(kind);
  return s?.enabled ? s.design : null;
}

export async function saveDesign(kind: string, design: Design, by: string, enabled?: boolean): Promise<boolean> {
  if (!validDesign(design)) return false;
  const clean = bounded(design);
  try {
    await db.query(
      `INSERT INTO email_designs (kind, design, enabled, updated_by) VALUES ($1, $2::JSONB, COALESCE($4, false), $3)
       ON CONFLICT (kind) DO UPDATE SET design = excluded.design, updated_by = excluded.updated_by, updated_at = now(),
         enabled = COALESCE($4, email_designs.enabled)`,
      [kind, JSON.stringify(clean), by, enabled ?? null],
    );
    await db.query(`INSERT INTO email_design_versions (id, kind, design, saved_by) VALUES ($1, $2, $3::JSONB, $4)`, [randomUUID(), kind, JSON.stringify(clean), by]);
    await db.query(`DELETE FROM email_design_versions WHERE kind = $1 AND id NOT IN (SELECT id FROM email_design_versions WHERE kind = $1 ORDER BY saved_at DESC LIMIT 30)`, [kind]);
    return true;
  } catch { return false; }
}

export async function setEnabled(kind: string, enabled: boolean): Promise<boolean> {
  try { const r = await db.query(`UPDATE email_designs SET enabled = $2 WHERE kind = $1`, [kind, enabled]); return (r.rowCount ?? 0) > 0; } catch { return false; }
}

export async function resetDesign(kind: string): Promise<void> {
  await db.query(`DELETE FROM email_designs WHERE kind = $1`, [kind]).catch(() => {});
}

export async function versions(kind: string): Promise<{ id: string; savedBy: string; savedAt: string }[]> {
  try {
    const r = await db.query<{ id: string; saved_by: string; saved_at: Date }>(`SELECT id, saved_by, saved_at FROM email_design_versions WHERE kind = $1 ORDER BY saved_at DESC LIMIT 15`, [kind]);
    return r.rows.map((x) => ({ id: x.id, savedBy: x.saved_by, savedAt: x.saved_at.toISOString() }));
  } catch { return []; }
}

export async function versionDesign(kind: string, id: string): Promise<Design | null> {
  try {
    const r = await db.query<{ design: Design }>(`SELECT design FROM email_design_versions WHERE kind = $1 AND id = $2`, [kind, id]);
    return r.rows[0] && validDesign(r.rows[0].design) ? r.rows[0].design : null;
  } catch { return null; }
}
