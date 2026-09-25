import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * A brief sent through the live form reaches the admin.
 *
 * It used to be written to the table and shown nowhere: the Forms screen read
 * only the demonstration list. This seeds one real row and follows it from
 * the inbox to a client record, twice, to prove the second press does not
 * make a second client.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL: a live brief is a database row.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

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
const MARK = randomUUID().slice(0, 6);
const COMPANY = `Adaeze Bakes ${MARK}`;
const EMAIL = `wdc-e2e-${MARK}@wedigcreativity.com.ng`;
let id = "";

test.beforeAll(async () => {
  const r = await db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, current_step, answers, email, submitted_at)
     VALUES ('branding', 'submitted', 4, $1::JSONB, $2, now()) RETURNING id`,
    [JSON.stringify({ first_name: "Adaeze", last_name: "Okoro", email: EMAIL, phone: `+23480${Date.now().toString().slice(-8)}`, company: COMPANY,
                      about: "Small-batch cakes for events in Lekki.", industry: "Food & drink" }), EMAIL],
  );
  id = r.rows[0].id;
});

test.afterAll(async () => {
  await db.query("DELETE FROM entry_events WHERE entry_id = $1", [id]);
  await db.query("DELETE FROM onboarding_submissions WHERE id = $1", [id]);
  await db.end();
});

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

const entry = () => `/admin/forms/onboarding-branding/entries/${id}`;

test("the brief is in its form's inbox and reads back under its questions", async ({ page }) => {
  await page.goto("/admin/forms", { waitUntil: "load" });
  /* The list counts it against the branding form. */
  await expect(page.locator('[data-tour="forms-live"] tr', { hasText: "Branding onboarding" })).toContainText("unread of");

  await page.goto("/admin/forms/onboarding-branding", { waitUntil: "load" });
  const row = page.locator("tbody tr", { hasText: COMPANY });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Not a client yet");
  await expect(row).toContainText("New");

  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/forms/onboarding-branding/entries/${id}`));
  await expect(page.locator("h1")).toHaveText(COMPANY);
  await expect(page.locator("dd", { hasText: "Small-batch cakes for events in Lekki." })).toBeVisible();

  /* An old link to the brief still lands on it. */
  await page.goto(`/admin/forms/${id}`, { waitUntil: "load" });
  await expect(page).toHaveURL(new RegExp(`/admin/forms/onboarding-branding/entries/${id}$`));
});

test("making them a client twice lands on the same client", async ({ page }) => {
  await page.goto(entry(), { waitUntil: "load" });
  await page.getByRole("button", { name: "Make them a client" }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/c\d+$/);
  const first = page.url();
  await expect(page.locator("h1")).toContainText(COMPANY);

  /* Back on the brief, it now names its client, offers no second one, and its
     history says what happened. */
  await page.goto(entry(), { waitUntil: "load" });
  await expect(page.getByRole("button", { name: "Make them a client" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: COMPANY })).toHaveAttribute("href", new URL(first).pathname);
  await expect(page.locator(".adForms__timeline")).toContainText(`Made a client: ${COMPANY}`);

  /* And the table says so. */
  await page.goto("/admin/forms/onboarding-branding", { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: COMPANY })).not.toContainText("Not a client yet");

  /* The books are shared by every spec in the run, so the client made here is
     archived again: other specs count the active list. */
  await page.goto(first, { waitUntil: "load" });
  page.once("dialog", (d) => d.accept());
  await expect(async () => {
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("button", { name: "Restore" })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
});

test("a live id that does not exist is a 404", async ({ request }) => {
  const res = await request.get(`/admin/forms/${randomUUID()}`, { headers: { cookie: "wdc.session_token=placeholder" } });
  expect(res.status()).toBe(404);
});
