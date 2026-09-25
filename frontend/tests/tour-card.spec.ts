import { expect, test } from "@playwright/test";

/**
 * THE SIDEBAR'S TOUR OFFER CAN BE DISMISSED (components/admin/side-foot.tsx):
 * the cross records a skipped walkthrough, so the card stays gone after a
 * reload, and the "?" launcher in the top bar still offers the tour.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" }, viewport: { width: 1440, height: 900 } });

for (const path of ["/admin/clients", "/portal/billing"]) {
  test(`the tour card on ${path} closes and stays closed`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const card = page.locator(".ad__tourCard");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Dismiss the tour offer" }).click();
    await expect(card).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".ad__tourCard")).toHaveCount(0);
    await expect(page.locator(".tourLauncher__btn")).toBeVisible();
  });
}
