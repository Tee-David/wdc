import { expect, test } from "@playwright/test";

/**
 * THE SIDEBAR'S TOUR BUTTON (components/admin/side-kit.tsx): in the foot of
 * both dashboards, it opens the tours menu upwards with this page's tour and
 * the full walkthrough.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" }, viewport: { width: 1440, height: 900 } });

for (const path of ["/admin/clients", "/portal/billing"]) {
  test(`the sidebar's Tour button on ${path} offers the tours`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const tour = page.locator(".ad__side .tourLauncher__btn");
    await expect(tour).toBeVisible();
    await tour.click();
    const menu = page.locator(".ad__side .tourLauncher__menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /walkthrough/i })).toBeVisible();
  });
}
