import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * FAILURE ALERTS, through a real (local) mail server.
 *
 * Needs the dev server pointed at an SMTP sink that refuses any recipient
 * containing "refuse" and writes what it accepts to WDC_E2E_MAIL_DIR. A test
 * email to a refused address fails; one alert listing it arrives at the
 * alert address; a second failure the same hour does not send a second one.
 *
 *   MAIL_DIR=/var/tmp/wdc-mail node scripts/smtp-sink.mjs
 *   SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_SECURE=false SMTP_USER=sink \
 *     SMTP_PASSWORD=sink SMTP_FROM_EMAIL=site@example.com npx next dev -p 3100
 *   WDC_E2E_MAIL_DIR=/var/tmp/wdc-mail npx playwright test tests/mail-alert.spec.ts
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const MAIL_DIR = process.env.WDC_E2E_MAIL_DIR;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION || !TOKEN, "Needs the database and BONEYARD_CAPTURE_TOKEN.");
test.skip(!MAIL_DIR, "Set WDC_E2E_MAIL_DIR to the SMTP sink's folder, with the dev server sending to the sink.");

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
const ALERTS = `alerts-${MARK}@example.com`;
const REFUSED = `refuse-${MARK}@example.com`;

test.beforeAll(async () => {
  /* The hour is shared by every run, so this run's alert is not a duplicate
     of an earlier one, and the list starts now. */
  await db.query("DELETE FROM message_log WHERE dedupe_key LIKE 'failure-alert:%'");
  await db.query(`INSERT INTO app_settings (key, value, saved_by) VALUES ('email.failureAlertThrough', to_jsonb(now()::TEXT), 'mail-alert.spec')
                  ON CONFLICT (key) DO UPDATE SET value = excluded.value`);
});

test.afterAll(async () => {
  await db.query("DELETE FROM message_log WHERE to_addr = ANY($1::TEXT[]) OR dedupe_key LIKE 'failure-alert:%'", [[ALERTS, REFUSED]]);
  await db.query("DELETE FROM app_settings WHERE key IN ('email.failureAlert', 'email.failureAlertThrough')");
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const alertsIn = () => fs.readdirSync(MAIL_DIR!).map((f) => fs.readFileSync(path.join(MAIL_DIR!, f), "utf8")).filter((m) => m.includes(ALERTS));

async function failOne(page: Page) {
  await page.goto("/admin/settings/email", { waitUntil: "load" });
  await page.getByLabel(/^Send a test to/).fill(REFUSED);
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(page.locator(".ad__msg.is-bad")).toContainText("refused", { timeout: 30_000 });
}

test("a refused address is listed to the alert address, once an hour", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/email", { waitUntil: "load" });
  await page.getByLabel(/^Tell this address when an email fails/).fill(ALERTS);
  await page.getByRole("button", { name: "Save alert address" }).click();
  await expect(page.locator(".ad__msg.is-ok").first()).toContainText(`listed to ${ALERTS}`, { timeout: 20_000 });

  await failOne(page);
  await expect.poll(() => alertsIn().length, { timeout: 30_000 }).toBe(1);
  expect(alertsIn()[0]).toContain(REFUSED);
  expect(alertsIn()[0]).toContain("1 email from the site did not go");

  /* A second failure in the same hour: recorded, not alerted again. */
  await failOne(page);
  await page.waitForTimeout(5_000);
  expect(alertsIn().length).toBe(1);
  expect((await db.query("SELECT 1 FROM message_log WHERE to_addr = $1 AND state = 'Failed'", [REFUSED])).rowCount).toBe(2);
});
