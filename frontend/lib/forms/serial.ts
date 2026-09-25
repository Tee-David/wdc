import "server-only";

import { db } from "@/lib/db/pool";

/**
 * The next number for one form, written onto the entry in one statement.
 *
 * The counter is bumped and the entry stamped together, so two submissions at
 * the same moment cannot be given the same number. An entry that already has a
 * number keeps it. Never throws: a missing number is shown as a gap, and it is
 * not worth failing somebody's submission over.
 */
export async function assignSerial(table: "onboarding_submissions" | "contact_enquiries", formKey: string, id: string) {
  try {
    await db.query(`
      WITH n AS (
        INSERT INTO form_counters (form_key, last) VALUES ($1, 1)
        ON CONFLICT (form_key) DO UPDATE SET last = form_counters.last + 1
        RETURNING last
      )
      UPDATE ${table} SET serial = n.last FROM n WHERE ${table}.id = $2 AND ${table}.serial IS NULL
    `, [formKey, id]);
  } catch (error) {
    console.error("[forms] could not number", formKey, id, error instanceof Error ? error.message : error);
  }
}
