import { expect, test } from "@playwright/test";

/**
 * The Settings screen's finance defaults actually reach the invoice builder:
 * changing the default VAT rate there pre-fills a NEW invoice with it, and
 * putting the override back restores what shipped.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 90_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

const bar = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Unsaved changes" });

test("a saved VAT default pre-fills a new invoice, and setting it back restores 7.5", async ({ page }) => {
  /* `networkidle`, not `domcontentloaded`: the dev server under test compiles
     a route on its first visit, and a click dispatched before that finishes
     lands on markup that is not hydrated yet. */
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByLabel(/^VAT/).fill("12");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("textbox", { name: "VAT %" })).toHaveValue("12");
  await page.keyboard.press("Escape");

  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByLabel(/^VAT/).fill("7.5");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("textbox", { name: "VAT %" })).toHaveValue("7.5");
});

test("with VAT switched off a new invoice starts at 0%, and a bad rate is refused", async ({ page }) => {
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByLabel(/^VAT/).fill("250");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".ad__fe", { hasText: "Between 0 and 100" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/^VAT/).fill("7.5");
  await page.getByRole("switch", { name: "Add VAT to new invoices" }).click();
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("textbox", { name: "VAT %" })).toHaveValue("0");
  await page.keyboard.press("Escape");

  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "Add VAT to new invoices" }).click();
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });
});
