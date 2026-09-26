import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * THE AUDIT LOG, KEPT AND FILTERED.
 *
 * A change made in the admin lands in `audit_log` (so it survives a deploy),
 * and Settings > Audit log narrows the list by kind, person, dates and words,
 * with the filters in the URL and a count that says how many matched.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

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

test.beforeAll(async () => {
  await db.query(`
    INSERT INTO audit_log (at, actor, kind, subject_id, subject, action, field, from_value, to_value) VALUES
      (now() - INTERVAL '1 hour', $1, 'invoice', 'inv-a', $2, 'issued', NULL, NULL, NULL),
      (now() - INTERVAL '2 hours', $3, 'client', 'cl-a', $4, 'edited', 'Phone', '0801', $5),
      (now() - INTERVAL '45 days', $1, 'client', 'cl-b', $6, 'archived', NULL, NULL, NULL)
  `, [`Ada ${MARK}`, `INV-${MARK}`, `Bola ${MARK}`, `Moore ${MARK}`, `0802-${MARK}`, `Old ${MARK}`]);
});

test.afterAll(async () => {
  await db.query(`DELETE FROM audit_log WHERE actor LIKE $1 OR subject LIKE $1 OR actor = 'WDC Admin' AND subject = 'Message log'`, [`%${MARK}%`]);
  await db.query("DELETE FROM app_settings WHERE key = 'email.logRetentionDays'");
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const rows = (page: Page) => page.locator(".adAudit__row", { hasText: MARK });

test("the default view is the last 30 days, and search finds a before-and-after value", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto(`/admin/settings/audit?q=${MARK}`, { waitUntil: "load" });
  await expect(rows(page)).toHaveCount(2);
  /* The before and after are in the event's detail, one press away. */
  await rows(page).filter({ hasText: `Moore ${MARK}` }).click();
  await expect(page.getByRole("dialog")).toContainText(`0802-${MARK}`);
  await page.keyboard.press("Escape");

  await page.getByLabel("When").selectOption("all");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/range=all/);
  await expect(rows(page)).toHaveCount(3);
});

test("kind and person narrow it, and Clear puts it back", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto(`/admin/settings/audit?range=all&q=${MARK}&kind=client`, { waitUntil: "load" });
  await expect(rows(page)).toHaveCount(2);
  await page.goto(`/admin/settings/audit?range=all&q=${MARK}&kind=client&actor=${encodeURIComponent(`Ada ${MARK}`)}`, { waitUntil: "load" });
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText(`Old ${MARK}`);
  await expect(page.getByLabel("Who")).toHaveValue(`Ada ${MARK}`);

  await page.goto(`/admin/settings/audit?q=nothing-${MARK}-at-all`, { waitUntil: "load" });
  await expect(page.getByText("No changes match")).toBeVisible();
  await page.getByRole("link", { name: "Clear the filters" }).click();
  await expect(page).toHaveURL(/\/admin\/settings\/audit$/);
});

test("a change made in the admin is written to the table, not only to memory", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  const before = new Date();
  await page.goto("/admin/settings/email", { waitUntil: "networkidle" });
  await page.getByLabel(/^Keep the message log for/).selectOption("180");
  await page.getByRole("region", { name: "Unsaved changes" }).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast", { hasText: "Settings saved." })).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await db.query(
    "SELECT 1 FROM audit_log WHERE subject = 'Message log' AND action LIKE '%180 days%' AND at >= $1", [before],
  )).rowCount, { timeout: 15_000 }).toBe(1);

  await page.goto("/admin/settings/audit?range=today&q=180%20days", { waitUntil: "load" });
  const row = page.locator(".adAudit__row", { hasText: "Message log" }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("dialog")).toContainText("180 days");
});

test("staff are refused", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto(`/admin/settings/audit?q=${MARK}`, { waitUntil: "load" });
  await expect(page.getByText("The audit log is for the owner")).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
});
