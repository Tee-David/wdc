import "server-only";

import { audit } from "@/lib/admin/store";
import { DEFAULT_LOG_RETENTION, getAppSetting, LOG_RETENTION_KEY } from "@/lib/app-settings";
import { purgeLogged } from "@/lib/message-log";
import { FORMS } from "@/lib/forms/registry";
import { purgeTrash } from "@/lib/forms/entries";
import { getFormSettings } from "@/lib/forms/settings-db";
import { POST_TRASH_DAYS, purgeTrashedPosts } from "@/lib/blog-db";
import { alertFailures } from "@/lib/mail-alert";
import { runRetention, type RetentionCounts } from "@/lib/privacy/retention";

export type DailyResult = { logRows: number; trashed: Record<string, number>; posts: number; retention: RetentionCounts | null; errors: string[] };

/**
 * The once-a-day tidy: the message log past its retention, each form's
 * Trash past the days its settings keep it, and blog drafts in the Trash
 * past 30 days.
 *
 * SAFE TO RUN TWICE. Both are "delete what is older than N days", so a second
 * run the same day finds nothing to do. Each part runs on its own, so one
 * failure does not stop the others, and the run writes one audit line with
 * its counts whatever happened.
 */
export async function runDaily(by: string): Promise<DailyResult> {
  const result: DailyResult = { logRows: 0, trashed: {}, posts: 0, retention: null, errors: [] };
  try {
    result.logRows = await purgeLogged(await getAppSetting(LOG_RETENTION_KEY, DEFAULT_LOG_RETENTION));
  } catch (error) {
    result.errors.push(`message log: ${error instanceof Error ? error.message : "failed"}`);
  }
  for (const form of FORMS.filter((f) => f.inbox)) {
    try {
      const n = await purgeTrash(form, (await getFormSettings(form)).trashDays);
      if (n) result.trashed[form.key] = n;
    } catch (error) {
      result.errors.push(`${form.key}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  try {
    result.posts = await purgeTrashedPosts(POST_TRASH_DAYS);
  } catch (error) {
    result.errors.push(`blog: ${error instanceof Error ? error.message : "failed"}`);
  }
  /* Each kind of personal data past the time Settings, Privacy keeps it. */
  try {
    const r = await runRetention();
    result.retention = r.counts;
    result.errors.push(...r.errors.map((e) => `retention ${e}`));
  } catch (error) {
    result.errors.push(`retention: ${error instanceof Error ? error.message : "failed"}`);
  }
  /* Failures that fell in an hour that had already had its alert. */
  await alertFailures();
  const trashed = Object.values(result.trashed).reduce((a, b) => a + b, 0);
  audit({
    actor: by, kind: "content", subjectId: "daily", subject: "Daily tidy",
    action: `removed ${result.logRows} old message log rows, ${trashed} entries and ${result.posts} blog drafts past their Trash period`
      + (result.retention ? `; retention: ${result.retention.drafts} unfinished briefs deleted, ${result.retention.enquiries} enquiries anonymised, ${result.retention.invitations} invitations deleted, ${result.retention.deactivated} deactivated accounts anonymised, ${result.retention.housekeeping} expired sessions and tokens removed` : ""),
    note: result.errors.length ? result.errors.join("; ").slice(0, 300) : undefined,
  });
  return result;
}
