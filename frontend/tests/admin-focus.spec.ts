import { expect, test, type Page } from "@playwright/test";

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("opening an admin dialog does not put a pointer focus ring on its close button", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/projects/p1", { waitUntil: "domcontentloaded" });
  const open = page.getByRole("button", { name: "Post an update" });
  const dialog = page.locator("dialog.addlg[open]");
  await expect(async () => {
    await open.click({ timeout: 2_000 });
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });

  const close = dialog.getByRole("button", { name: "Close" });
  await expect.poll(() => dialog.evaluate((node) => document.activeElement === node)).toBe(true);
  await expect(close).not.toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await expect(close).toHaveCSS("outline-width", "2px");
});
