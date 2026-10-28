import "server-only";

import { db } from "@/lib/db/pool";
import { syncStore } from "@/lib/admin/persist";
import { dueAttempt, refusedOutright } from "@/lib/mail-retry-rule";

/**
 * FAILED MAIL IS TRIED AGAIN WITHOUT ANYBODY PRESSING A BUTTON.
 *
 * The studio's SMTP host scans outgoing mail and sometimes answers
 * "550 message discarded as high-probability spam" for a message it accepts
 * an hour later, unchanged: the verdict leans on the sender's recent volume
 * and reputation, not only on the words. Timeouts and dropped connections are
 * the same kind of failure. The owner used to find these in the log and press
 * Try again until one went. This does that on the five-minute heartbeat
 * (app/api/cron/mail-tick), spaced out, a few times, and then stops so a
 * message the host really will not take is left for a person.
 *
 * Only failures that can pass later are retried. A refused address, a
 * missing configuration or a message that cannot be rebuilt is left alone.
 * Each attempt goes through the same rebuild as Try again, so the dedupe and
 * audit rules are the ones that already hold for a manual retry.
 */
/* Each send waits on the host's slow sign-in; two fit inside one heartbeat. */
const PER_TICK = 2;

type Row = { id: string; dedupe_key: string; error: string | null; created_at: Date; resends: { at: string; sent: boolean }[] | null; earlier: string | number };

export async function retryFailedMail(by = "Automatic retry"): Promise<{ tried: number; sent: number }> {
  await syncStore();
  /* Originals only, from the last two days. A money message's earlier tries
     are retired under ":superseded:", so counting them gives its attempts; a
     form email keeps one row and lists its tries in `resends`. */
  const r = await db.query<Row>(`
    SELECT m.id, m.dedupe_key, m.error, m.created_at, m.resends,
      (SELECT count(*) FROM message_log s WHERE s.dedupe_key LIKE m.dedupe_key || ':superseded:%') AS earlier
    FROM message_log m
    WHERE m.state = 'Failed' AND m.channel = 'Email' AND m.created_at >= now() - INTERVAL '2 days'
      AND m.dedupe_key NOT LIKE '%:superseded:%' AND m.dedupe_key NOT LIKE '%:resend:%' AND m.dedupe_key NOT LIKE '%:retry:%'
      AND NOT (m.resends @> '[{"sent": true}]'::JSONB)
    ORDER BY m.created_at LIMIT 50
  `).catch(() => ({ rows: [] as Row[] }));

  const now = Date.now();
  const due = r.rows.map((row) => ({ row, attempt: dueAttempt({
    error: row.error, createdAt: new Date(row.created_at).getTime(),
    tries: (row.resends ?? []).map((t) => Date.parse(t.at) || 0), earlier: Number(row.earlier),
  }, now) })).filter((d) => d.attempt > 0).slice(0, PER_TICK);

  let sent = 0;
  for (const { row, attempt } of due) {
    try {
      const { restageFromKey } = await import("@/lib/money-mail");
      const staged = await restageFromKey(row.dedupe_key, by);
      if (staged) {
        if (staged.state === "queued") { await staged.run(); sent++; }
        continue;
      }
      const { formEmailOf, resendFormEmail } = await import("@/lib/forms/resend");
      const target = await formEmailOf(row.dedupe_key);
      if (!target) continue;
      const res = await resendFormEmail(target.form, target.entryId, target.key, {
        by, dedupeKey: `${row.dedupe_key}:retry:${row.id}:auto${attempt}`, failedRowId: row.id, summary: `Tried again automatically (attempt ${attempt}).`,
      });
      if (res.ok && !res.duplicate) sent++;
    } catch (error) {
      /* The attempt wrote its own failed row or resend line; the next tick spaces the one after. */
      console.error("[mail-retry]", row.dedupe_key.split(":")[0], error instanceof Error ? error.message.slice(0, 160) : error);
    }
  }
  return { tried: due.length, sent: sent + await retryWorkspaceNotices() };
}

type NoticeRow = { id: string; event_id: string; message_id: string; attempt: string | number; settled_at: Date; error: string | null };

/**
 * Workspace notices (lib/workspace/events.ts) the host refused outright, put
 * back in the queue on the same spacing. They were the one kind left Failed
 * for good. The dispatcher checks access, preferences and staleness again
 * before it sends, exactly as for the first try.
 */
async function retryWorkspaceNotices(): Promise<number> {
  const r = await db.query<NoticeRow>(`
    SELECT i.id, i.event_id, i.message_id, i.attempt, i.settled_at, m.error
    FROM workspace_email_intents i JOIN message_log m ON m.id = i.message_id
    WHERE i.state = 'failed' AND i.mode = 'immediate' AND i.settled_at >= now() - INTERVAL '2 days'
    ORDER BY i.settled_at LIMIT 50
  `).catch(() => ({ rows: [] as NoticeRow[] }));
  const now = Date.now();
  const due = r.rows.filter((row) => refusedOutright(row.error) && dueAttempt({
    error: row.error, createdAt: new Date(row.settled_at).getTime(), tries: [], earlier: Math.max(0, Number(row.attempt) - 1),
  }, now) > 0).slice(0, PER_TICK);
  if (!due.length) return 0;
  const requeued = await db.query<{ event_id: string }>(
    `UPDATE workspace_email_intents SET state = 'pending', available_at = now(), error = NULL WHERE id = ANY($1::UUID[]) AND state = 'failed' RETURNING event_id`,
    [due.map((row) => row.id)],
  );
  await db.query(`UPDATE message_log SET state = 'Queued', settled_at = NULL, error = NULL WHERE id = ANY($1::UUID[]) AND state = 'Failed'`, [due.map((row) => row.message_id)]);
  if (!requeued.rows.length) return 0;
  const { dispatchWorkspaceEvents } = await import("@/lib/workspace/events");
  return (await dispatchWorkspaceEvents({ eventIds: requeued.rows.map((row) => row.event_id) })).accepted;
}
