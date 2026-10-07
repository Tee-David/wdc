import "server-only";

import { db } from "@/lib/db/pool";
import { issueToken, tokenHash, type OnboardingAnswers } from "@/lib/onboarding-server";
import type { ServiceSlug } from "@/lib/services";
import { SITE_URL } from "@/lib/site";

/**
 * A PRE-FILLED ONBOARDING LINK (plan 6.6).
 *
 * The default stays the blank /onboarding link, where the client picks the
 * service and fills everything in. This is the optional one the studio can
 * send after a call: a server side draft that already holds what was typed
 * here, behind the same one time resume token every draft uses. NO PERSONAL
 * DATA IS IN THE URL, only the token. The client opens it, sees their answers
 * filled in, confirms and edits, and a pre-filled answer is an ordinary answer.
 * A missing, used or expired token opens nothing (the resume route fails
 * closed), and the link lives 14 days, longer than a self started draft
 * because it is sent by a person and may sit in an inbox over a weekend.
 */
export const PREFILL_TTL_DAYS = 14;

export async function createPrefilledDraft(service: ServiceSlug, answers: OnboardingAnswers, email: string | null): Promise<{ url: string; expiresAt: Date }> {
  const token = issueToken();
  const expiresAt = new Date(Date.now() + PREFILL_TTL_DAYS * 24 * 60 * 60 * 1000);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO onboarding_submissions (service, current_step, answers, email) VALUES ($1, 0, $2::JSONB, $3) RETURNING id`,
      [service, JSON.stringify(answers), email],
    );
    await client.query(
      `INSERT INTO onboarding_resume_tokens (submission_id, token_hash, email, expires_at) VALUES ($1, $2, $3, $4)`,
      [inserted.rows[0].id, tokenHash(token), email, expiresAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { url: `${SITE_URL}/onboarding?resume=${encodeURIComponent(token)}`, expiresAt };
}
