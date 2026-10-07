import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/pool";
import { mailIsConfigured } from "@/lib/email";
import { composeEmailHtml, emailButton, emailP, emailSmall } from "@/lib/email-templates";
import { queueLogged } from "@/lib/message-log";
import { secretKey, sendQueuedLogged } from "@/lib/outbox";
import { issueToken, RESUME_TTL_SECONDS, tokenHash } from "@/lib/onboarding-server";
import { SERVICES } from "@/lib/services";
import { SITE_URL } from "@/lib/site";

/**
 * A GENTLE NUDGE FOR A BRIEF LEFT HALF DONE (plan 6.5, and the UX research:
 * at most two, each one switchable off by the person it goes to).
 *
 * WHEN. The scheduler runs once a day, so the first nudge goes to a draft that
 * has sat idle for a day, and the second four days after the first. Never more
 * than two, and nothing for a draft older than two weeks. The plan wanted one
 * about an hour after a client stops; a daily schedule cannot do that, and an
 * hourly one needs a plan that costs money. Revisit when there is a number that
 * says the day is too slow.
 *
 * EVERYTHING IS WRITTEN DOWN BEFORE IT IS SENT. The outbox row (with its
 * dedupe key, so a retry is a no-op) and the count on the draft are saved
 * first, then the mail goes. A failed send leaves a Failed row for a person to
 * see, and is not retried: a nudge that arrives late and twice is worse than
 * one that does not arrive.
 *
 * SWITCHING OFF LIVES WITH THE DRAFT. Every nudge carries a signed one tap
 * link that sets `nudges_off` on that draft. The link cannot be forged and
 * cannot switch off anybody else's.
 *
 * NEEDS MIGRATION 0039. Until it has been applied the columns do not exist, so
 * this checks for them first and quietly does nothing, rather than failing the
 * daily job every day.
 *
 * ponytail: each send waits on the slow mail server (about 23 seconds to
 * authenticate), so a run is capped at three. The cap is the ceiling, and the
 * way up is to hand the batch to `after()` or a queue when there are more.
 */
const FIRST_AFTER_HOURS = 24;
const SECOND_AFTER_DAYS = 4;
const OLDEST_DAYS = 14;
const MAX_PER_RUN = 3;

export type NudgeCounts = { sent: number; skipped: number; failed: number };

const secret = () => process.env.UNSUBSCRIBE_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || "";
const sign = (id: string, s: string) => createHmac("sha256", s).update(`onboarding-nudges-off:${id}`).digest("base64url").slice(0, 32);

/** The one tap link that stops further nudges for this draft, or null if links cannot be signed. */
export function nudgesOffUrl(draftId: string): string | null {
  const s = secret();
  if (!s) return null;
  const url = new URL("/api/onboarding/nudges-off", SITE_URL);
  url.searchParams.set("d", draftId);
  url.searchParams.set("t", sign(draftId, s));
  return url.toString();
}

/** Whether a link's token belongs to this draft. Fails closed. */
export function nudgesOffTokenValid(draftId: string, token: string): boolean {
  const s = secret();
  if (!s || !draftId || !token) return false;
  const a = Buffer.from(sign(draftId, s));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Stops further nudges for one draft. */
export async function switchNudgesOff(draftId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return false;
  const r = await db.query("UPDATE onboarding_submissions SET nudges_off = true WHERE id = $1", [draftId]);
  return (r.rowCount ?? 0) > 0;
}

async function migrationApplied(): Promise<boolean> {
  const r = await db.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_submissions' AND column_name = 'nudges_off' LIMIT 1",
  );
  return (r.rowCount ?? 0) > 0;
}

type Draft = { id: string; service: string; email: string; answers: Record<string, unknown>; nudges_sent: number };

export async function sendDraftNudges(): Promise<NudgeCounts> {
  const counts: NudgeCounts = { sent: 0, skipped: 0, failed: 0 };
  if (!mailIsConfigured() || !(await migrationApplied())) return counts;

  const due = await db.query<Draft>(`
    SELECT id, service, email, answers, nudges_sent
    FROM onboarding_submissions
    WHERE status = 'in_progress' AND email IS NOT NULL AND nudges_off = false AND nudges_sent < 2
      AND created_at > now() - make_interval(days => $1)
      AND (
        (nudges_sent = 0 AND updated_at < now() - make_interval(hours => $2))
        OR (nudges_sent = 1 AND last_nudged_at < now() - make_interval(days => $3))
      )
    ORDER BY updated_at ASC
    LIMIT $4
  `, [OLDEST_DAYS, FIRST_AFTER_HOURS, SECOND_AFTER_DAYS, MAX_PER_RUN]);

  for (const draft of due.rows) {
    try {
      const token = issueToken();
      const number = draft.nudges_sent + 1;
      /* A fresh resume link, and the earlier unused ones stop working. */
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(`UPDATE onboarding_resume_tokens SET revoked_at = now() WHERE submission_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, [draft.id]);
        await client.query(
          `INSERT INTO onboarding_resume_tokens (submission_id, token_hash, email, expires_at) VALUES ($1, $2, $3, $4)`,
          [draft.id, tokenHash(token), draft.email, new Date(Date.now() + RESUME_TTL_SECONDS * 1000)],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const first = typeof draft.answers.first_name === "string" ? draft.answers.first_name.trim() : "";
      const service = SERVICES.find((s) => s.slug === draft.service)?.short ?? "project";
      const url = `${SITE_URL}/onboarding?resume=${encodeURIComponent(token)}`;
      const off = nudgesOffUrl(draft.id);
      const hello = first ? `Hi ${first},` : "Hello,";
      const subject = `Your ${service} brief is saved and waiting`;
      const mail = {
        to: draft.email, subject, unsubscribe: false as const,
        text: `${hello}\n\nYou started the ${service} brief with us and your answers are saved. Pick up where you stopped: ${url}\n\nThe link works for three days.${off ? `\n\nNot useful? Stop these reminders: ${off}` : ""}`,
        html: composeEmailHtml({
          title: subject, preheader: "Your answers are saved. Pick up where you stopped.", heading: "Pick up where you stopped",
          blocks: [
            emailP(`${hello} you started the ${service} brief with us and your answers are saved. It takes a few minutes to finish.`),
            emailButton("Continue your brief", url),
            emailSmall("The link works for three days."),
            ...(off ? [emailSmall(`Not useful? <a href="${off}">Stop these reminders</a>.`)] : []),
          ],
        }),
      };
      const log = { summary: `Reminder ${number} of 2 for unfinished ${draft.service} brief ${draft.id}.`, dedupeKey: secretKey(`onboarding-nudge-${number}`, draft.id) };
      const queued = await queueLogged({ channel: "Email", to: mail.to, subject: mail.subject, ...log }, true);
      if (!queued.ok) { counts.skipped++; continue; }
      await db.query("UPDATE onboarding_submissions SET nudges_sent = nudges_sent + 1, last_nudged_at = now() WHERE id = $1", [draft.id]);
      await sendQueuedLogged(mail, log, queued.message.id);
      counts.sent++;
    } catch {
      counts.failed++;
    }
  }
  return counts;
}
