import "server-only";

import { db } from "@/lib/db/pool";
import { transaction } from "@/lib/db/transaction";
import { contentVersion, keepContentVersion, revisionTables } from "@/lib/revisions";
import { FAQS, type Faq } from "@/lib/faq";
import { parseFaqs } from "@/lib/faq-validate";

/**
 * Edited public copy, read over what shipped.
 *
 * THE SHIPPED LIST IS THE FALLBACK for a missing row AND for an unreachable
 * database, unlike the blog. A reset means "what shipped", and an FAQ that
 * vanished from the homepage because the database blinked at build time would
 * be a worse page than one a revision stale.
 */
export async function siteFaqs(): Promise<{ faqs: Faq[]; edited: { by: string; at: string } | null }> {
  if (!process.env.DATABASE_URL && !process.env.COCKROACHDB_URL) return { faqs: FAQS, edited: null };
  try {
    const r = await db.query<{ value: unknown; saved_by: string; saved_at: Date }>(
      "SELECT value, saved_by, saved_at FROM site_content WHERE key = 'faq'",
    );
    const row = r.rows[0];
    if (!row) return { faqs: FAQS, edited: null };
    const parsed = parseFaqs(row.value);
    return parsed.ok
      ? { faqs: parsed.faqs, edited: { by: row.saved_by, at: new Date(row.saved_at).toISOString() } }
      : { faqs: FAQS, edited: null };
  } catch {
    return { faqs: FAQS, edited: null };
  }
}

/* THE LIST BEFORE A SAVE OR RESET IS KEPT (lib/revisions.ts, the last 10),
   in the same transaction, so "what was it this morning" has an answer. */
export async function saveSiteFaqs(faqs: Faq[], by: string) {
  const keep = await revisionTables();
  await transaction(async (c) => {
    if (keep) await keepContentVersion(c, "faq");
    await c.query(
      `INSERT INTO site_content (key, value, saved_by) VALUES ('faq', $1::JSONB, $2)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, saved_by = excluded.saved_by, saved_at = now()`,
      [JSON.stringify(faqs), by],
    );
  });
}

export async function resetSiteFaqs() {
  const keep = await revisionTables();
  await transaction(async (c) => {
    if (keep) await keepContentVersion(c, "faq");
    await c.query("DELETE FROM site_content WHERE key = 'faq'");
  });
}

/** Put a kept FAQ list back; a kept "what shipped" is a reset. The list it replaces is kept too. */
export async function restoreSiteFaqs(versionId: string, by: string): Promise<{ count: number } | null> {
  const v = await contentVersion(versionId, "faq");
  if (!v) return null;
  if (v.value === null) { await resetSiteFaqs(); return { count: FAQS.length }; }
  const parsed = parseFaqs(v.value);
  if (!parsed.ok) return null;
  await saveSiteFaqs(parsed.faqs, by);
  return { count: parsed.faqs.length };
}
