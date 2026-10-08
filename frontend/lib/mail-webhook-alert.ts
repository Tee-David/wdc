import "server-only";
import { getSetting } from "@/lib/admin/store";

/**
 * A failure alert to a Slack or Discord incoming webhook, at most one a minute
 * per instance. Only those two hosts are accepted, so a saved address cannot
 * point the server at anything else (SSRF). Never throws.
 */
export const WEBHOOK_KEY = "mail.alertWebhook";
export const validWebhook = (url: string) => /^https:\/\/(hooks\.slack\.com\/services\/|discord\.com\/api\/webhooks\/|discordapp\.com\/api\/webhooks\/)[A-Za-z0-9/_\-]+$/.test(url);

const g = globalThis as unknown as { __wdcMailAlertAt?: number };

export async function alertMailFailure(text: string): Promise<void> {
  try {
    const url = getSetting(WEBHOOK_KEY)?.trim();
    if (!url || !validWebhook(url)) return;
    if (Date.now() - (g.__wdcMailAlertAt ?? 0) < 60_000) return;
    g.__wdcMailAlertAt = Date.now();
    await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ text: text.slice(0, 500), content: text.slice(0, 500) }),
    });
  } catch { /* an alert that cannot be sent is not worth failing anything */ }
}
