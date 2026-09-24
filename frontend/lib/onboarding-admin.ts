import "server-only";

import { db } from "@/lib/db/pool";
import type { ServiceSlug } from "@/lib/services";
import type { Submission } from "@/lib/admin/types";

/**
 * Onboarding forms from the live form, for the admin.
 *
 * WHY THIS EXISTS. The public form writes `onboarding_submissions`; the admin's
 * Forms screen read only the in-memory demonstration list, so a real brief
 * that a client finished never appeared anywhere the studio looks. These read
 * the table and hand back the same `Submission` shape the screens already
 * render, so the brief is read back under the questions exactly as the demo
 * rows are.
 *
 * NO CLIENT ID IS STORED. Which client a brief belongs to is worked out from
 * its email and phone against the client list, because the admin's clients
 * are still in memory (section 4.9) and an id written into this table would
 * point at nothing after a restart.
 */

export const isLiveSubmissionId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

type Row = {
  id: string; service: string; status: string; answers: Record<string, string | string[]>;
  created_at: Date; submitted_at: Date | null;
};

const toSubmission = (r: Row): Submission => ({
  id: r.id,
  clientId: null,
  service: r.service as ServiceSlug,
  status: r.status === "submitted" ? "Submitted" : "In progress",
  startedAt: new Date(r.created_at).toISOString(),
  submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
  answers: r.answers && typeof r.answers === "object" ? r.answers : {},
});

export function liveSubmissionsConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

/** Newest first, archived left out, bounded. */
export async function liveSubmissions(limit = 100): Promise<Submission[]> {
  const result = await db.query<Row>(
    `SELECT id, service, status, answers, created_at, submitted_at
     FROM onboarding_submissions
     WHERE status <> 'archived'
     ORDER BY COALESCE(submitted_at, updated_at) DESC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 500)],
  );
  return result.rows.map(toSubmission);
}

export async function liveSubmission(id: string): Promise<Submission | null> {
  if (!isLiveSubmissionId(id)) return null;
  const result = await db.query<Row>(
    `SELECT id, service, status, answers, created_at, submitted_at
     FROM onboarding_submissions WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toSubmission(result.rows[0]) : null;
}

/** The first value of an answer, as text. */
export function answer(s: Submission, key: string) {
  const v = s.answers[key];
  return String((Array.isArray(v) ? v[0] : v) ?? "").trim();
}
