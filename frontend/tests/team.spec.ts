import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS, TEAM: who can reach the admin, and the guards on changing it.
 *
 * Real rows in the Better Auth tables. Deactivating ends the person's
 * sessions in the same transaction; the last owner can be neither demoted nor
 * deactivated; staff do not get the page.
 */

// Never inherit the application/production database for a mutating suite.
const CONNECTION = process.env.USER_TEST_DATABASE_URL;
const ALLOW_MUTATIONS = process.env.USER_TEST_ALLOW_MUTATIONS === "1";
const SAFE_DATABASE = (() => { try { return /_test$/.test(new URL(CONNECTION ?? "").pathname.slice(1)); } catch { return false; } })();
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION || !ALLOW_MUTATIONS || !SAFE_DATABASE, "Requires USER_TEST_DATABASE_URL ending in _test and USER_TEST_ALLOW_MUTATIONS=1.");
test.skip(true, "Legacy capture-auth Team mutation suite is retired; Users writes require real sessions. Do not enable until migrated.");
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

const db = CONNECTION && ALLOW_MUTATIONS && SAFE_DATABASE ? pool() : null!;
const MARK = randomUUID().slice(0, 6);
const OWNER = `t-owner-${MARK}`;
const STAFF = `t-staff-${MARK}`;
const RENAME = `t-rename-${MARK}`;
let otherOwners: string[] = [];

test.beforeAll(async () => {
  /* The last-owner guard counts every active owner, so any others in this
     database are parked for the run and put back after. */
  otherOwners = (await db.query<{ id: string }>(`SELECT "id" FROM "user" WHERE "role" = 'owner' AND "deactivatedAt" IS NULL`)).rows.map((r) => r.id);
  if (otherOwners.length) throw new Error("Refusing test setup: dedicated test database has existing owners.");
  await db.query(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1, $2, $3, true, 'owner'), ($4, $5, $6, true, 'staff'), ($7, $8, $9, true, 'staff')`,
    [OWNER, `Owner ${MARK}`, `owner-${MARK}@example.com`, STAFF, `Staff ${MARK}`, `staff-${MARK}@example.com`, RENAME, `Rename ${MARK}`, `rename-${MARK}@example.com`]);
  await db.query(`INSERT INTO "session" ("id", "expiresAt", "token", "userId") VALUES ($1, now() + INTERVAL '1 day', $2, $3)`,
    [randomUUID(), `tok-${MARK}`, STAFF]);
});

test.afterAll(async () => {
  await db.query(`DELETE FROM "user" WHERE "id" = ANY($1::TEXT[])`, [[OWNER, STAFF, RENAME]]);

  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}
const row = (page: Page, name: string) => page.locator("tbody tr", { hasText: name });
/* A confirmed action asks in the admin's own dialog (components/admin/confirm.tsx),
   not the browser's: answer yes, ticking "I understand" when it asks for that. */
async function yes(page: Page) {
  const d = page.getByRole("dialog");
  await expect(d).toBeVisible();
  const sure = d.getByRole("checkbox");
  if (await sure.count()) await sure.check();
  await d.getByRole("button").filter({ hasNotText: /^Leave it$/ }).last().click();
}

test("the team is listed with its sessions, and deactivating ends them at once", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/team", { waitUntil: "networkidle" });
  await expect(row(page, `Staff ${MARK}`)).toContainText("1 session");
  await expect(row(page, `Owner ${MARK}`)).toContainText("Owner");

  await row(page, `Staff ${MARK}`).getByRole("button", { name: "Deactivate" }).click();
  await yes(page);
  /* The button is replaced by Reactivate once it has worked. */
  await expect(row(page, `Staff ${MARK}`)).toContainText("Deactivated", { timeout: 20_000 });
  const u = await db.query(`SELECT "deactivatedAt" FROM "user" WHERE "id" = $1`, [STAFF]);
  expect(u.rows[0].deactivatedAt).not.toBeNull();
  expect((await db.query(`SELECT 1 FROM "session" WHERE "userId" = $1`, [STAFF])).rowCount).toBe(0);

  await row(page, `Staff ${MARK}`).getByRole("button", { name: "Reactivate" }).click();
  await expect(row(page, `Staff ${MARK}`)).not.toContainText("Deactivated", { timeout: 20_000 });
  expect((await db.query(`SELECT "deactivatedAt" FROM "user" WHERE "id" = $1`, [STAFF])).rows[0].deactivatedAt).toBeNull();
});

test("an owner can rename a member from Team and the change is audited", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/settings/team", { waitUntil: "networkidle" });
  await row(page, `Rename ${MARK}`).getByRole("button", { name: "Change name" }).click();
  const dialog = page.getByRole("dialog", { name: `Change Rename ${MARK}'s name` });
  await dialog.getByLabel("Name").fill(`Studio ${MARK}`);
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".adToast", { hasText: "Updated" })).toBeVisible({ timeout: 20_000 });
  await expect(row(page, `Studio ${MARK}`)).toBeVisible();
  expect((await db.query(`SELECT "name" FROM "user" WHERE "id" = $1`, [RENAME])).rows[0].name).toBe(`Studio ${MARK}`);
  await expect.poll(async () => (await db.query(`SELECT from_value, to_value FROM audit_log WHERE subject_id = $1 AND field = 'Name' ORDER BY at DESC LIMIT 1`, [RENAME])).rows[0]).toEqual({ from_value: `Rename ${MARK}`, to_value: `Studio ${MARK}` });
});

test("the last owner can be neither demoted nor deactivated", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/team", { waitUntil: "networkidle" });
  await row(page, `Owner ${MARK}`).getByRole("button", { name: "Make staff" }).click();
  await yes(page);
  await expect(page.locator(".ad__msg.is-bad").first()).toContainText("no owner", { timeout: 20_000 });
  await page.reload({ waitUntil: "networkidle" });
  await row(page, `Owner ${MARK}`).getByRole("button", { name: "Deactivate" }).click();
  await yes(page);
  await expect(page.locator(".ad__msg.is-bad").first()).toContainText("no owner", { timeout: 20_000 });
  expect((await db.query(`SELECT "role", "deactivatedAt" FROM "user" WHERE "id" = $1`, [OWNER])).rows[0]).toMatchObject({ role: "owner", deactivatedAt: null });

  /* With a second owner, the first can be made staff. */
  await page.reload({ waitUntil: "networkidle" });
  await row(page, `Staff ${MARK}`).getByRole("button", { name: "Make owner" }).click();
  await yes(page);
  await expect(row(page, `Staff ${MARK}`).getByRole("button", { name: "Make staff" })).toBeVisible({ timeout: 20_000 });
  await page.reload({ waitUntil: "networkidle" });
  await row(page, `Owner ${MARK}`).getByRole("button", { name: "Make staff" }).click();
  await yes(page);
  await expect(row(page, `Owner ${MARK}`).getByRole("button", { name: "Make owner" })).toBeVisible({ timeout: 20_000 });
  expect((await db.query(`SELECT "role" FROM "user" WHERE "id" = $1`, [OWNER])).rows[0].role).toBe("staff");
});

test("staff do not get the team page", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/settings/team", { waitUntil: "networkidle" });
  await expect(page.getByText("The team is the owner's")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate" })).toHaveCount(0);
});
