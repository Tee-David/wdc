import "server-only";

import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";
import { keepContentVersion, contentVersion, revisionTables } from "@/lib/revisions";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal";
import { parseLegalOverride, type LegalOverride } from "@/lib/legal-validate";

/**
 * THE POLICIES AS THE SITE SHOWS THEM: what shipped in lib/legal.ts, with any
 * edit from Settings > Policies laid over it. One row per policy in
 * `site_content` (key `legal.<slug>`), kept with the last ten versions through
 * the same revisions as the FAQ. A missing row, a row that fails the checks, or
 * an unreachable database all fall back to what shipped, so a policy can never
 * go missing from the site because the database blinked.
 */
const configured = () => Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
const key = (slug: string) => `legal.${slug}`;

const stamp = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

export type LegalState = { doc: LegalDoc; edited: { by: string; at: string } | null };

export async function getLegalStates(): Promise<LegalState[]> {
  const rows = new Map<string, { value: unknown; saved_by: string; saved_at: Date }>();
  if (configured()) {
    try {
      const r = await db.query<{ key: string; value: unknown; saved_by: string; saved_at: Date }>("SELECT key, value, saved_by, saved_at FROM site_content WHERE key LIKE 'legal.%'");
      for (const x of r.rows) rows.set(x.key, x);
    } catch { /* fall back to what shipped */ }
  }
  return LEGAL_DOCS.map((shipped) => {
    const row = rows.get(key(shipped.slug));
    const parsed = row ? parseLegalOverride(row.value) : null;
    if (!row || !parsed || !parsed.ok) return { doc: shipped, edited: null };
    const at = new Date(row.saved_at);
    const { blurb, intro, tabs, sections } = parsed.value;
    return { doc: { ...shipped, blurb, intro, tabs, sections, updated: stamp(at) }, edited: { by: row.saved_by, at: at.toISOString() } };
  });
}

export async function getLegalDocs(): Promise<LegalDoc[]> {
  return (await getLegalStates()).map((s) => s.doc);
}

export async function getLegalDoc(slug: string): Promise<LegalDoc | undefined> {
  return (await getLegalDocs()).find((d) => d.slug === slug);
}

export async function saveLegalDoc(slug: string, value: LegalOverride, by: string) {
  const keep = await revisionTables();
  await transaction(async (c) => {
    if (keep) await keepContentVersion(c, key(slug));
    await c.query(
      `INSERT INTO site_content (key, value, saved_by) VALUES ($1, $2::JSONB, $3)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, saved_by = excluded.saved_by, saved_at = now()`,
      [key(slug), JSON.stringify(value), by],
    );
  });
}

export async function resetLegalDoc(slug: string) {
  const keep = await revisionTables();
  await transaction(async (c) => {
    if (keep) await keepContentVersion(c, key(slug));
    await c.query("DELETE FROM site_content WHERE key = $1", [key(slug)]);
  });
}

export async function restoreLegalDoc(slug: string, versionId: string, by: string): Promise<boolean> {
  const v = await contentVersion(versionId, key(slug));
  if (!v) return false;
  if (v.value === null) { await resetLegalDoc(slug); return true; }
  const parsed = parseLegalOverride(v.value);
  if (!parsed.ok) return false;
  await saveLegalDoc(slug, parsed.value, by);
  return true;
}
