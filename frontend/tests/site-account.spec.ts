import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import pg from "pg";

/**
 * SIGNED IN AND BACK ON THE SITE (components/layout/signed-in.tsx): the phone
 * menu swaps "Log in" for "Dashboard" and shows who is signed in with a way
 * out; signed out, it is the plain "Log in" it always was.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
test.skip(!CONNECTION, "Needs a database: a session is a row.");
test.use({ viewport: { width: 390, height: 844 } });

const EMAIL = `wdc-site-${randomUUID().slice(0, 8)}@example.test`;
const PASSWORD = `Site-${randomUUID()}`;
let db: pg.Pool;
let userId = "";

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
  userId = randomUUID();
  await db.query('INSERT INTO "user" ("id","name","email","emailVerified") VALUES ($1,$2,$3,true)', [userId, "Ada Obi", EMAIL]);
  await db.query('INSERT INTO "account" ("id","accountId","providerId","userId","password") VALUES ($1,$2,$3,$4,$5)',
    [randomUUID(), userId, "credential", userId, await hashPassword(PASSWORD)]);
});
test.afterAll(async () => {
  await db?.query('DELETE FROM "user" WHERE "id" = $1', [userId]);
  await db?.end();
});
test.beforeEach(async ({ page }) => { await page.route(/jotfor|userway/i, (r) => r.abort()); });

test("signed out, the menu offers Log in", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.locator(".sm-toggle").click();
  await expect(page.locator(".sm-panel").getByRole("link", { name: "Log in to your account" })).toBeVisible();
  await expect(page.locator(".sm-account")).toHaveCount(0);
});

test("signed in, the menu shows who, the dashboard and Log out", async ({ page, baseURL }) => {
  const res = await page.request.post("/api/auth/sign-in/email", { data: { email: EMAIL, password: PASSWORD }, headers: { origin: baseURL! } });
  expect(res.ok()).toBe(true);
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.locator(".sm-toggle").click();
  const account = page.locator(".sm-account");
  await expect(account).toContainText("Ada Obi");
  /* The dashboard is the list's last item; the account row carries only the way out, in red. */
  await expect(page.locator(".sm-panel").getByRole("link", { name: "Open your dashboard" })).toHaveAttribute("href", "/signed-in");
  await expect(account.getByRole("button", { name: "Log out" })).toHaveCSS("background-color", "rgb(198, 40, 40)");
  await expect(page.locator(".sm-foot .sm-footer--icons").getByRole("button", { name: "Switch theme" })).toBeVisible();
  await expect(page.locator(".sm-panel").getByRole("link", { name: "Log in to your account" })).toHaveCount(0);
  await account.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.locator(".sm-toggle").click();
  await expect(page.locator(".sm-panel").getByRole("link", { name: "Log in to your account" })).toBeVisible();
});
