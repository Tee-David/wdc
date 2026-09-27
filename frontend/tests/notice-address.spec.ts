import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * A NEW "REPLIES GO TO" PROVES ITSELF (lib/notice-address.ts). Saving one
 * holds it and mails a link; only that link, opened and confirmed, moves the
 * studio's notices. A wrong or missing token changes nothing, and the owner
 * can withdraw a change that is waiting.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN on the dev server.");

const KEYS = ["mail.replyTo", "mail.replyTo.pending"];
const db = new pg.Pool({ connectionString: CONNECTION, max: 2 });
const value = async (key: string) => (await db.query("SELECT value FROM app_settings WHERE key = $1", [key])).rows[0]?.value ?? null;
test.beforeAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); });
test.afterAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); await db.end(); });

const bar = (page: Page) => page.getByRole("region", { name: "Unsaved changes" });

test("saving a new address holds it and says where to look; Withdraw lets it go", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/settings/email", { waitUntil: "networkidle" });
  await page.getByLabel(/^Replies go to/).fill("notices@wedigcreativity.com.ng");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Check notices@wedigcreativity.com.ng" })).toBeVisible({ timeout: 20_000 });
  expect(await value("mail.replyTo")).toBeNull();
  const pending = await value("mail.replyTo.pending");
  expect(pending.to).toBe("notices@wedigcreativity.com.ng");
  expect(pending.hash).toMatch(/^[0-9a-f]{64}$/);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("status").filter({ hasText: "Waiting for notices@wedigcreativity.com.ng" })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Withdrawn" })).toBeVisible({ timeout: 20_000 });
  expect(await value("mail.replyTo.pending")).toBeNull();

  /* A temporary inbox is refused outright. */
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel(/^Replies go to/).fill("someone@mailinator.com");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toContainText("Fix 1 field", { timeout: 20_000 });
  expect(await value("mail.replyTo.pending")).toBeNull();
});

test("only the mailed link, confirmed, moves the notices; any other token changes nothing", async ({ page }) => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await db.query("INSERT INTO app_settings (key, value, saved_by, saved_at) VALUES ('mail.replyTo.pending', $1::JSONB, 'test', now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [JSON.stringify({ to: "notices@wedigcreativity.com.ng", hash, by: "Test", at: new Date().toISOString(), expires: new Date(Date.now() + 3_600_000).toISOString() })]);

  /* Opening a wrong link asks, and confirming it changes nothing. */
  await page.goto(`/confirm-notice-address?t=${"x".repeat(43)}`);
  await page.getByRole("button", { name: "Confirm this address" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link does not work");
  expect(await value("mail.replyTo")).toBeNull();

  /* No token at all is not an invitation to confirm. */
  await page.goto("/confirm-notice-address");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link does not work");
  await expect(page.getByRole("button", { name: "Confirm this address" })).toHaveCount(0);

  await page.goto(`/confirm-notice-address?t=${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm this address?");
  expect(await value("mail.replyTo")).toBeNull();
  await page.getByRole("button", { name: "Confirm this address" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Address confirmed");
  expect(await value("mail.replyTo")).toBe("notices@wedigcreativity.com.ng");
  expect(await value("mail.replyTo.pending")).toBeNull();

  /* Used once. */
  await page.goto(`/confirm-notice-address?t=${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This link does not work");
});
