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

test("a saved VAT default pre-fills a new invoice, and resetting it restores 7.5", async ({ page }) => {
  /* `networkidle`, not `domcontentloaded`: the dev server under test compiles
     a route on its first visit, and a click dispatched before that finishes
     lands on markup that is not hydrated yet. */
  await page.goto("/admin/settings", { waitUntil: "networkidle" });

  const row = page.locator("tr", { hasText: "Default VAT %" });
  await row.getByRole("button", { name: "Actions for Default VAT %" }).click();
  await page.getByRole("menuitem", { name: "Edit it" }).click();
  await page.getByRole("textbox", { name: "Default VAT %" }).fill("12");
  await page.getByRole("button", { name: "Save it" }).click();
  await expect(row).toContainText("Edited");

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("textbox", { name: "VAT %" })).toHaveValue("12");
  await page.keyboard.press("Escape");

  await page.goto("/admin/settings", { waitUntil: "networkidle" });
  await row.getByRole("button", { name: "Actions for Default VAT %" }).click();
  await page.getByRole("menuitem", { name: "Put it back" }).click();
  await page.getByRole("button", { name: "Put it back" }).click();
  await expect(row).not.toContainText("Edited");

  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("textbox", { name: "VAT %" })).toHaveValue("7.5");
});
