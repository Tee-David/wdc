import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS, EMAIL: what is configured, the log, and the daily tidy.
 *
 * Run where no mail server is configured, which is the honest test of the
 * connection panel: every missing variable says Missing, the password is
 * never printed, and a test send says why it cannot go.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.skip(Boolean(process.env.SMTP_HOST), "Mail is configured here.");

function pool() {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const configured = process.env.COCKROACHDB_CERT || "";
  const local = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const ca = configured.startsWith("-----BEGIN CERTIFICATE-----")
    ? configured.replace(/\\n/g, "\n")
    : local && fs.existsSync(local) ? fs.readFileSync(local, "utf8") : undefined;
  return new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2, connectionTimeoutMillis: 40_000 });
}

const db = pool();
const MARK = randomUUID().slice(0, 8);

test.afterAll(async () => {
  await db.query("DELETE FROM message_log WHERE subject LIKE $1", [`%${MARK}%`]);
  await db.query("DELETE FROM contact_enquiries WHERE last_name = $1", [`Old${MARK}`]);
  await db.query("DELETE FROM app_settings WHERE key = 'email.logRetentionDays'");
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the mail server panel says what is missing and never shows a password", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/email", { waitUntil: "load" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Mail server" }) });
  await expect(panel.locator(".ad__panelH .ad__pill")).toHaveText("Missing");
  await expect(panel.locator("div", { has: page.locator("dt", { hasText: "Password" }) })).toContainText("Missing");
  if (process.env.SMTP_PASSWORD) await expect(page.locator("body")).not.toContainText(process.env.SMTP_PASSWORD);

  await page.getByLabel(/^Send a test to/).fill("owner@wedigcreativity.com.ng");
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(page.locator(".ad__msg.is-bad")).toContainText("SMTP is not configured", { timeout: 20_000 });
});

test("the log searches by to: and subject:, and filters by state", async ({ page, baseURL }) => {
  await db.query(`
    INSERT INTO message_log (channel, to_addr, subject, summary, state, error, sent_by, dedupe_key) VALUES
      ('Email', $1, $2, 'A receipt.', 'Failed', 'Connection refused', 'Website', $3),
      ('Email', 'someone@example.com', $4, 'A notice.', 'Sent', NULL, 'Website', $5)
  `, [`alpha-${MARK}@example.com`, `Receipt ${MARK}`, `test-a:${MARK}`, `Notice ${MARK}`, `test-b:${MARK}`]);
  await asOwner(page, baseURL);

  await page.goto(`/admin/settings/email?q=${encodeURIComponent(`subject:${MARK}`)}`, { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: MARK })).toHaveCount(2);

  await page.goto(`/admin/settings/email?q=${encodeURIComponent(`to:alpha-${MARK}`)}`, { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: MARK })).toHaveCount(1);
  await expect(page.locator("tbody tr", { hasText: MARK })).toContainText("Connection refused");

  await page.goto(`/admin/settings/email?state=Sent&q=${MARK}`, { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: MARK })).toHaveCount(1);
  await expect(page.locator("tbody tr", { hasText: MARK })).toContainText(`Notice ${MARK}`);
});

test("retention is saved, and the tidy removes what is past it, including old Trash", async ({ page, baseURL }) => {
  await db.query(`
    INSERT INTO message_log (channel, to_addr, subject, summary, state, sent_by, dedupe_key, created_at)
    VALUES ('Email', 'old@example.com', $1, 'Old.', 'Sent', 'Website', $2, now() - INTERVAL '400 days')
  `, [`Ancient ${MARK}`, `test-old:${MARK}`]);
  await db.query(`
    INSERT INTO contact_enquiries (first_name, last_name, email, topic, message, box, box_at)
    VALUES ('Old', $1, 'old@example.com', 'Other', 'An enquiry thrown out a long time ago.', 'trash', now() - INTERVAL '120 days')
  `, [`Old${MARK}`]);

  await asOwner(page, baseURL);
  await page.goto("/admin/settings/email", { waitUntil: "load" });
  await page.getByLabel(/^Keep the message log for/).selectOption("90");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".ad__msg.is-ok").first()).toContainText("keeps 90 days", { timeout: 20_000 });
  expect((await db.query("SELECT value FROM app_settings WHERE key = 'email.logRetentionDays'")).rows[0].value).toBe(90);

  await page.getByRole("button", { name: "Run the daily tidy now" }).click();
  await expect(page.locator(".ad__msg.is-ok").last()).toContainText("Done.", { timeout: 30_000 });
  expect((await db.query("SELECT 1 FROM message_log WHERE dedupe_key = $1", [`test-old:${MARK}`])).rowCount).toBe(0);
  expect((await db.query("SELECT 1 FROM contact_enquiries WHERE last_name = $1", [`Old${MARK}`])).rowCount).toBe(0);
  /* A recent row is kept. */
  expect((await db.query("SELECT 1 FROM message_log WHERE dedupe_key = $1", [`test-a:${MARK}`])).rowCount).toBe(1);
});

test("the scheduled tidy refuses anybody without the secret", async ({ request }) => {
  const res = await request.get("/api/cron/daily");
  expect([401, 503]).toContain(res.status());
  const wrong = await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } });
  expect([401, 503]).toContain(wrong.status());
});

test("staff are shown the door, not the log", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/settings/email", { waitUntil: "load" });
  await expect(page.getByText("Email settings are for the owner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Message log" })).toHaveCount(0);
});
