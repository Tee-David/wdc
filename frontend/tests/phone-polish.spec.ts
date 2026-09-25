import { expect, test } from "@playwright/test";

/**
 * FOUR THINGS SEEN ON A PHONE, pinned so they stay fixed.
 *
 * 1. The site menu lists every destination without scrolling: the Socials
 *    block that pushed "Log in" off the bottom is gone.
 * 2. Switch theme and Accessibility, side by side under the menu, are the
 *    same height; sized by their own contents they were not.
 * 3. Back-to-top clears the admin's floating tab bar instead of sitting on it.
 * 4. A dialog never scrolls sideways (iOS gave the date input a minimum width
 *    that pushed the form wider than the dialog), and a long field hint sits
 *    behind a question mark whose note opens ABOVE the dialog, not under it.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.use({ viewport: { width: 390, height: 844 } });

test("the menu shows every destination and two buttons of one height", async ({ page }) => {
  await page.goto("/contact");
  await page.locator(".sm-toggle").click();
  await expect(page.getByRole("link", { name: /log in/i }).last()).toBeInViewport();
  await expect(page.locator(".sm-socials")).toHaveCount(0);
  const heights = await page.locator(".sm-footer > *").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(heights.length).toBe(2);
  expect(heights[0]).toBe(heights[1]);
});

test.describe("admin on a phone", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

  test("back-to-top sits above the tab bar, not on it", async ({ page }) => {
    await page.goto("/admin/money");
    await page.mouse.move(195, 400);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 500);
    await expect(page.locator(".st")).toHaveClass(/is-on/, { timeout: 10_000 });
    const [st, bar] = await Promise.all([page.locator(".st").boundingBox(), page.locator(".ad__tabsBar").boundingBox()]);
    expect(st!.y + st!.height, "back-to-top overlaps the tab bar").toBeLessThan(bar!.y);
  });

  test("the payment dialog fits the phone and its help opens above it", async ({ page }) => {
    await page.goto("/admin/money/i1");
    await page.getByRole("button", { name: "Record a payment" }).first().click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    const body = await dialog.locator(".addlg__b").evaluate((b) => ({ sw: b.scrollWidth, cw: b.clientWidth }));
    expect(body.sw, "the dialog body scrolls sideways").toBeLessThanOrEqual(body.cw);
    await dialog.getByRole("button", { name: "What does this mean?" }).first().click();
    const note = dialog.locator(".tip__p");
    await expect(note).toBeVisible();
    await expect(note).toBeInViewport();
    expect(await note.evaluate((n) => getComputedStyle(n).position)).toBe("fixed");
  });
});
