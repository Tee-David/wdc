import "server-only";

import { db } from "@/lib/db/pool";
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

export async function saveSiteFaqs(faqs: Faq[], by: string) {
  await db.query(
    `INSERT INTO site_content (key, value, saved_by) VALUES ('faq', $1::JSONB, $2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, saved_by = excluded.saved_by, saved_at = now()`,
    [JSON.stringify(faqs), by],
  );
}

export async function resetSiteFaqs() {
  await db.query("DELETE FROM site_content WHERE key = 'faq'");
}
