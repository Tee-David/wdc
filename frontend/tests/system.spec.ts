import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS, SYSTEM: services asked, the schema against the code, and tools.
 *
 * Run with no mail server, which is the honest test of "Check now": the
 * database answers, the mail check runs behind the page and records why it
 * cannot connect, and retrying a failed email records that it failed again
 * rather than pretending.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.skip(Boolean(process.env.SMTP_HOST), "Mail is configured here, so a retry would send real email.");

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
const EMAIL = `wdc-system-${MARK}@example.com`;
let enquiry = "";

test.afterAll(async () => {
  if (enquiry) {
    await db.query("DELETE FROM message_log WHERE dedupe_key LIKE $1", [`%${enquiry}%`]);
    await db.query("DELETE FROM entry_events WHERE entry_id = $1", [enquiry]);
    await db.query("DELETE FROM contact_enquiries WHERE id = $1", [enquiry]);
  }
  await db.query("DELETE FROM invitations WHERE email = $1", [EMAIL]);
  await db.query("DELETE FROM app_settings WHERE key LIKE 'probe.%' OR key LIKE 'tool.%'");
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const rowOf = (page: Page, name: string) => page.locator("tbody tr", { hasText: name });
const setting = async (key: string) => (await db.query<{ value: Record<string, unknown> }>("SELECT value FROM app_settings WHERE key = $1", [key])).rows[0]?.value;

test("Check now asks the database and waits; the mail server is asked behind the page", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/system", { waitUntil: "load" });
  await rowOf(page, "Database").getByRole("button", { name: "Check now" }).click();
  /* A result is a toast now, like every other action's. */
  await expect(page.locator(".adToast", { hasText: "Answered a query" })).toBeVisible({ timeout: 20_000 });

  await rowOf(page, "Mail server").getByRole("button", { name: "Check now" }).click();
  await expect(page.locator(".adToast", { hasText: "Started" })).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await setting("probe.email"))?.ok, { timeout: 30_000 }).toBe(false);
  expect(String((await setting("probe.email"))?.detail)).toContain("SMTP_HOST");

  await page.reload({ waitUntil: "load" });
  await expect(rowOf(page, "Database").locator(".ad__pill")).toHaveText("Answered");
  await expect(rowOf(page, "Mail server").locator(".ad__pill")).toHaveText("Failed");
  /* The same answer on Integrations. */
  await page.goto("/admin/settings/integrations", { waitUntil: "load" });
  await expect(page.locator(".adIntg__card", { hasText: "Database" }).first().locator(".adIntg__check .ad__pill")).toHaveText("Answered");
});

test("the schema panel and the shell both say when a migration is missing", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/system", { waitUntil: "load" });
  await expect(page.locator(".ad__panel", { hasText: "Database schema" }).locator(".ad__panelH .ad__pill")).toHaveText("Up to date");

  const last = (await db.query<{ name: string }>("SELECT name FROM wdc_schema_migrations ORDER BY name DESC LIMIT 1")).rows[0].name;
  await db.query("DELETE FROM wdc_schema_migrations WHERE name = $1", [last]);
  try {
    await page.reload({ waitUntil: "load" });
    await expect(page.locator(".ad__panel", { hasText: "Database schema" })).toContainText(last);
    await page.goto("/admin", { waitUntil: "load" });
    await expect(page.locator(".ad__banner:not(.ad__noticesSum)", { hasText: "not been applied" })).toBeVisible();
  } finally {
    await db.query("INSERT INTO wdc_schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [last]);
  }
  await page.goto("/admin/settings/system", { waitUntil: "load" });
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page.locator(".ad__banner:not(.ad__noticesSum)", { hasText: "not been applied" })).toHaveCount(0);
});

test("tools: old invitations go, public pages refresh, and a failed email is retried once a day", async ({ page, baseURL }) => {
  await db.query(`INSERT INTO invitations (token_hash, email, role, invited_by, created_at, expires_at)
                  VALUES ($1, $2, 'staff', 'system.spec', now() - INTERVAL '60 days', now() - INTERVAL '53 days')`, [`hash-${MARK}`, EMAIL]);
  enquiry = (await db.query<{ id: string }>(
    `INSERT INTO contact_enquiries (first_name, last_name, email, topic, message) VALUES ('Sade', $1, $2, 'Other', 'A question about a website for a clinic.') RETURNING id`,
    [`System${MARK}`, EMAIL],
  )).rows[0].id;
  await db.query(`INSERT INTO message_log (channel, to_addr, subject, summary, state, error, sent_by, dedupe_key)
                  VALUES ('Email', $1, 'We have your message', 'Receipt.', 'Failed', 'Connection refused', 'Website', $2)`, [EMAIL, `enquiry-receipt:${enquiry}`]);

  await asOwner(page, baseURL);
  await page.goto("/admin/settings/system", { waitUntil: "load" });
  await rowOf(page, "Remove old invitations").getByRole("button", { name: "Run" }).click();
  await expect(rowOf(page, "Remove old invitations").locator(".ad__msg.is-ok")).toContainText("Done", { timeout: 20_000 });
  expect((await db.query("SELECT 1 FROM invitations WHERE email = $1", [EMAIL])).rowCount).toBe(0);

  await rowOf(page, "Refresh public pages").getByRole("button", { name: "Run" }).click();
  await expect(rowOf(page, "Refresh public pages").locator(".ad__msg.is-ok")).toContainText("refreshed every public page", { timeout: 20_000 });

  await rowOf(page, "Retry failed form emails").getByRole("button", { name: "Run" }).click();
  await expect.poll(async () => String((await setting("tool.retry-mail"))?.summary ?? ""), { timeout: 40_000 }).toContain("refused again");
  const retries = async () => (await db.query("SELECT 1 FROM message_log WHERE dedupe_key LIKE $1", [`enquiry-receipt:${enquiry}:retry:%`])).rowCount;
  expect(await retries()).toBe(1);
  await expect.poll(async () => (await db.query("SELECT 1 FROM entry_events WHERE entry_id = $1 AND body LIKE 'Resending%failed'", [enquiry])).rowCount, { timeout: 10_000 }).toBe(1);

  /* The same day again: already tried, nothing new is sent. */
  await page.reload({ waitUntil: "load" });
  await rowOf(page, "Retry failed form emails").getByRole("button", { name: "Run" }).click();
  await expect.poll(async () => String((await setting("tool.retry-mail"))?.summary ?? ""), { timeout: 40_000 }).toContain("already retried");
  expect(await retries()).toBe(1);
});

test("staff are refused", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/settings/system", { waitUntil: "load" });
  await expect(page.getByText("System is for the owner")).toBeVisible();
});
