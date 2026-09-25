import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/pool";
import { audit } from "@/lib/admin/store";
import { setAppSetting, getAppSetting } from "@/lib/app-settings";
import { outstandingFailures } from "@/lib/message-log";
import { formEmailOf, resendFormEmail } from "@/lib/forms/resend";
import { headObject, r2Config } from "@/lib/r2";

/**
 * Settings > System > Tools. Each one is audited, safe to run twice, and
 * bounded, and the ones that take longer than a person should wait run
 * behind the response and leave their answer under `tool.<name>`.
 */

export type ToolResult = { at: string; by: string; summary: string; ok: boolean };
export const TOOLS = ["retry-mail", "invitations", "revalidate", "media"] as const;
export type ToolName = (typeof TOOLS)[number];
const KEY = (n: ToolName) => `tool.${n}`;

async function keep(name: ToolName, by: string, summary: string, ok = true) {
  const result: ToolResult = { at: new Date().toISOString(), by, summary, ok };
  await setAppSetting(KEY(name), result, by).catch(() => undefined);
  audit({ actor: by, kind: "setting", subjectId: KEY(name), subject: "Tools", action: summary });
  return result;
}

export async function lastTools(): Promise<Partial<Record<ToolName, ToolResult>>> {
  const out: Partial<Record<ToolName, ToolResult>> = {};
  for (const n of TOOLS) {
    const v = await getAppSetting<ToolResult | null>(KEY(n), null);
    if (v) out[n] = v;
  }
  return out;
}

export const RETRY_DAYS = 7;
const lagosDay = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
export const RETRY_LIMIT = 20;

/**
 * Failed form emails from the last week, sent again, rebuilt from their
 * entries. Each retry carries a key made from the failed row and today's
 * date in Lagos, so a second run the same day finds it already done and a
 * failing address is tried at most once a day. Other failed emails (invoices, receipts) are
 * counted and left, because their bodies are not stored and they are resent
 * from their own record.
 */
export async function retryFailedFormEmails(by: string): Promise<ToolResult> {
  const failed = await outstandingFailures(RETRY_DAYS, 200);
  let sent = 0, refused = 0, done = 0, other = 0;
  for (const row of failed) {
    const target = await formEmailOf(row.dedupeKey);
    if (!target) { other++; continue; }
    if (sent + refused + done >= RETRY_LIMIT) break;
    const r = await resendFormEmail(target.form, target.entryId, target.key, {
      by, dedupeKey: `${row.dedupeKey}:retry:${row.id}:${lagosDay()}`, failedRowId: row.id, summary: "Retried from Settings, System.",
    });
    if (r.ok && r.duplicate) done++;
    else if (r.ok) sent++;
    else refused++;
  }
  const parts = [`${sent} sent`, refused ? `${refused} refused again` : "", done ? `${done} already retried` : "", other ? `${other} other failed emails are resent from their own record` : ""].filter(Boolean);
  return keep("retry-mail", by, `retried failed form emails: ${parts.join(", ")}`, refused === 0);
}

/** Withdrawn or expired invitations, unredeemed, older than 30 days. */
export async function purgeInvitations(by: string): Promise<ToolResult> {
  const r = await db.query(`
    DELETE FROM invitations
    WHERE redeemed_at IS NULL AND (revoked_at IS NOT NULL OR expires_at < now())
      AND created_at < now() - INTERVAL '30 days'
  `);
  return keep("invitations", by, `removed ${r.rowCount ?? 0} expired or withdrawn invitations older than 30 days`);
}

/** Every public page rebuilt on its next visit. */
export async function revalidatePublic(by: string): Promise<ToolResult> {
  revalidatePath("/", "layout");
  return keep("revalidate", by, "refreshed every public page");
}

export const MEDIA_CHECK_LIMIT = 200;

/** Ask the bucket whether each library file is still there. Reports; never deletes. */
export async function reverifyMedia(by: string): Promise<ToolResult> {
  const r2 = r2Config();
  if (!r2.ok) return keep("media", by, `could not check the media library: not set: ${r2.missing.join(", ")}`, false);
  const rows = (await db.query<{ key: string; filename: string }>(
    `SELECT key, filename FROM media_assets WHERE archived_at IS NULL ORDER BY uploaded_at DESC LIMIT $1`, [MEDIA_CHECK_LIMIT],
  )).rows;
  const missing: string[] = [];
  let unanswered = 0;
  for (let i = 0; i < rows.length; i += 5) {
    const batch = await Promise.all(rows.slice(i, i + 5).map(async (row) => ({ row, head: await headObject({ config: r2.config, key: row.key, timeoutMs: 5000 }) })));
    for (const { row, head } of batch) {
      if (head.ok) continue;
      if (head.status === 404) missing.push(row.filename);
      else unanswered++;
    }
  }
  const summary = `checked ${rows.length} media files: ${missing.length ? `${missing.length} missing from the bucket (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""})` : "all present"}${unanswered ? `, ${unanswered} did not answer` : ""}`;
  return keep("media", by, summary, missing.length === 0 && unanswered === 0);
}
