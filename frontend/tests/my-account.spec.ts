import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import pg from "pg";

/**
 * MY ACCOUNT: a real signed-in member of staff changes only their own account.
 *
 * Signs in through Better Auth's own endpoint rather than the login page, so
 * this spec is about the account page and not about the sign-in form (that
 * is auth-flow.spec.ts). A second sign-in from another context is the "other
 * device" that the password change and "Sign out everywhere else" must end.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");

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
const EMAIL = `wdc-me-${MARK}@wedigcreativity.com.ng`;
const PASSWORD = `first-pass-${MARK}`;
const NEW_PASSWORD = `Second-pass-2-${MARK}`;
const userId = randomUUID();

const sessions = async () => Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM "session" WHERE "userId" = $1`, [userId])).rows[0].n);

async function signIn(request: APIRequestContext, baseURL: string | undefined, password: string) {
  return request.post("/api/auth/sign-in/email", {
    headers: { origin: baseURL ?? "http://localhost:3100", "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    data: { email: EMAIL, password },
  });
}

async function open(page: Page) {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.goto("/admin/settings/account", { waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText("My account");
}

test.beforeAll(async () => {
  await db.query(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1, $2, $3, true, 'staff')`, [userId, `Staff ${MARK}`, EMAIL]);
  await db.query(`INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password") VALUES ($1, $2, 'credential', $2, $3)`, [randomUUID(), userId, await hashPassword(PASSWORD)]);
});

test.afterAll(async () => {
  await db.query(`DELETE FROM "user" WHERE "id" = $1`, [userId]);
  await db.end();
});

test("staff see their own account in Settings, and rename themselves", async ({ page, baseURL }) => {
  expect((await signIn(page.request, baseURL, PASSWORD)).ok()).toBe(true);
  await open(page);
  await expect(page.getByRole("navigation", { name: "Settings sections" }).getByRole("link", { name: /My account/ })).toBeVisible();
  await expect(page.getByText(`Signed in as ${EMAIL}`)).toBeVisible();

  await page.getByLabel(/^Your name/).fill(`Renamed ${MARK}`);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Saved.", { timeout: 20_000 });
  expect((await db.query(`SELECT "name" FROM "user" WHERE "id" = $1`, [userId])).rows[0].name).toBe(`Renamed ${MARK}`);

  /* And it fits a 320px phone: nothing widens the page. */
  await page.setViewportSize({ width: 320, height: 720 });
  await page.reload({ waitUntil: "load" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("sign out everywhere else ends the other device and keeps this one", async ({ page, baseURL, playwright }) => {
  expect((await signIn(page.request, baseURL, PASSWORD)).ok()).toBe(true);
  const other = await playwright.request.newContext({ baseURL });
  expect((await signIn(other, baseURL, PASSWORD)).ok()).toBe(true);
  await other.dispose();
  expect(await sessions()).toBeGreaterThanOrEqual(2);

  page.on("dialog", (d) => d.accept());
  await open(page);
  await expect(page.getByText("This session")).toBeVisible();
  await page.getByRole("button", { name: "Sign out everywhere else" }).click();
  await expect.poll(sessions, { timeout: 20_000 }).toBe(1);
  await page.reload({ waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText("My account");
});

test("a password change needs the current one, and signs out every other session", async ({ page, baseURL, playwright }) => {
  expect((await signIn(page.request, baseURL, PASSWORD)).ok()).toBe(true);
  const other = await playwright.request.newContext({ baseURL });
  expect((await signIn(other, baseURL, PASSWORD)).ok()).toBe(true);
  await other.dispose();
  await open(page);

  await page.getByLabel(/^Current password/).fill("not-my-password-at-all");
  await page.getByLabel(/^New password\b(?! again)/).fill(NEW_PASSWORD);
  await page.getByLabel(/^New password again/).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("That is not your current password")).toBeVisible({ timeout: 20_000 });

  await page.getByLabel(/^Current password/).fill(PASSWORD);
  await page.getByLabel(/^New password\b(?! again)/).fill(NEW_PASSWORD);
  await page.getByLabel(/^New password again/).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Password changed", { timeout: 20_000 });
  await expect.poll(sessions, { timeout: 20_000 }).toBe(1);

  const fresh = await playwright.request.newContext({ baseURL });
  expect((await signIn(fresh, baseURL, PASSWORD)).ok()).toBe(false);
  expect((await signIn(fresh, baseURL, NEW_PASSWORD)).ok()).toBe(true);
  await fresh.dispose();
});

test("Google unlinks only while a password remains", async ({ page, baseURL }) => {
  await db.query(`INSERT INTO "account" ("id", "accountId", "providerId", "userId") VALUES ($1, $2, 'google', $3)`, [randomUUID(), `g-${MARK}`, userId]);
  expect((await signIn(page.request, baseURL, NEW_PASSWORD)).ok()).toBe(true);

  /* No password: the button is not offered. */
  await db.query(`UPDATE "account" SET "password" = NULL WHERE "userId" = $1 AND "providerId" = 'credential'`, [userId]);
  const saved = await hashPassword(NEW_PASSWORD);
  await open(page);
  await expect(page.getByText("Set a password before you can unlink it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlink Google" })).toHaveCount(0);

  await db.query(`UPDATE "account" SET "password" = $2 WHERE "userId" = $1 AND "providerId" = 'credential'`, [userId, saved]);
  page.on("dialog", (d) => d.accept());
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Unlink Google" }).click();
  /* The button goes with the link, and its message with it: the row says so. */
  await expect(page.locator(".adForms__dl > div", { has: page.locator("dt", { hasText: /^Google$/ }) }).locator("dd")).toHaveText("Not linked", { timeout: 20_000 });
  expect((await db.query(`SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = 'google'`, [userId])).rowCount).toBe(0);
});

test("a preview session is told there is no account behind it", async ({ page, baseURL }) => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN.");
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await open(page);
  await expect(page.getByText("This is a preview session")).toBeVisible();
});
