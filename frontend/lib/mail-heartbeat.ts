import "server-only";

import { db } from "@/lib/db/pool";

/**
 * The mail work the five-minute heartbeat does behind its response
 * (app/api/cron/mail-tick), in one place so a second trigger can share it.
 * Every step claims its rows before sending, so two runs at once never send
 * the same message twice.
 */
export async function runMailWork() {
  try { const {dispatchFlutterwaveReceipts,reconcileFlutterwaveCheckout}=await import('@/lib/flutterwave');await reconcileFlutterwaveCheckout();await dispatchFlutterwaveReceipts(); } catch { console.error('[flutterwave] Pending receipt delivery will retry.'); }
  try { const {dispatchWorkspaceEvents}=await import('@/lib/workspace/events');await dispatchWorkspaceEvents(); }
  catch { console.error('[workspace-mail] Dispatch interrupted. Pending or unconfirmed attempts remain in the durable notification log.'); }
  /* Messages Admin scheduled for now or earlier (migration 0062). */
  try { const {sendDueMessages}=await import('@/lib/messages/marks');await sendDueMessages(); }
  catch { console.error('[messages] Scheduled sends interrupted. Unsent rows stay for the next tick.'); }
  /* Mail the host refused for now (a spam verdict, a timeout), tried again on a spaced schedule. */
  try { const {retryFailedMail}=await import('@/lib/mail-retry');await retryFailedMail(); }
  catch { console.error('[mail-retry] Interrupted. Failed messages stay in the log for the next tick.'); }
}

const NUDGE_MINUTES = 3;

/**
 * THE HEARTBEAT DOES NOT BEAT EVERY FIVE MINUTES. GitHub throttles scheduled
 * workflows: from 27 to 28 October 2026 "every five minutes" ran nine times,
 * about six hours apart, and every notice and retry waiting on it waited that
 * long. So the dashboards nudge it too: an admin or portal page, behind its
 * response, does the same work at most once every few minutes across all
 * instances (the lease is a row, not memory). A real timer still matters for
 * the hours nobody is signed in.
 */
export async function nudgeMail() {
  try {
    const lease = await db.query(`
      INSERT INTO app_settings (key, value, saved_by, saved_at) VALUES ('mail.nudge', 'null'::JSONB, 'Mail heartbeat', now())
      ON CONFLICT (key) DO UPDATE SET saved_at = now() WHERE app_settings.saved_at < now() - ($1::INT * INTERVAL '1 minute')
      RETURNING key
    `, [NUDGE_MINUTES]);
    if (!lease.rowCount) return;
  } catch { return; }
  await runMailWork();
}
