import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * THE STUDIO'S TAX ID AND NOTE ON ITS DOCUMENTS (Settings > Studio and
 * invoices). Saved once, printed on every invoice, estimate and receipt;
 * empty prints nothing. A malformed TIN is refused and nothing is saved.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const KEYS = ["finance.tin", "finance.footerNote"];
const db = new pg.Pool({ connectionString: CONNECTION, max: 2 });
const value = async (key: string) => (await db.query("SELECT value FROM app_settings WHERE key = $1", [key])).rows[0]?.value ?? null;
test.beforeAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); });
test.afterAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); await db.end(); });

const bar = (page: Page) => page.getByRole("region", { name: "Unsaved changes" });

test("a TIN and a note saved in Settings print on the invoice and the receipt", async ({ page }) => {
  await page.goto("/i/seedInv1AAAAAAAAAAAAAAA");
  await expect(page.locator(".doc__who small")).not.toContainText("TIN");
  await expect(page.locator(".doc__studioNote")).toHaveCount(0);

  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByLabel(/^Tax ID/).fill("12AB");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toContainText("Fix 1 field", { timeout: 20_000 });
  expect(await value("finance.tin")).toBeNull();

  await page.getByLabel(/^Tax ID/).fill("12345678-0001");
  await page.getByLabel(/^Note at the foot/).fill("Thank you for working with us.");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Settings saved." })).toBeVisible({ timeout: 20_000 });
  expect(await value("finance.tin")).toBe("12345678-0001");

  for (const path of ["/i/seedInv1AAAAAAAAAAAAAAA", "/r/seedRct4AAAAAAAAAAAAAAA"]) {
    await page.goto(path);
    await expect(page.locator(".doc__who small"), path).toContainText("TIN 12345678-0001");
    await expect(page.locator(".doc__studioNote"), path).toHaveText("Thank you for working with us.");
  }
});

test("the next invoice, estimate and receipt numbers are shown, and are not fields", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Next numbers" }) });
  await expect(panel.locator("code").nth(0)).toHaveText(/^INV-\d{4}-\d{3,}$/);
  await expect(panel.locator("code").nth(1)).toHaveText(/^EST-\d{4}-\d{3,}$/);
  await expect(panel.locator("code").nth(2)).toHaveText(/^RCT-\d{4}-\d{3,}$/);
  await expect(panel.locator("input")).toHaveCount(0);
});
