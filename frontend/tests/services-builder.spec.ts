import { expect, test } from "@playwright/test";

/**
 * THE SERVICES PAGE IS A PACKAGE BUILDER: tick services, the package builds,
 * and the button carries the choice to /start, which opens on the first topic
 * with the whole list in the message. Every service keeps its real links.
 */
test("ticking builds the package, suggests a pairing, and carries it to /start", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/services", { waitUntil: "load" });
  const cta = page.locator(".svb-pack__cta");
  await expect(cta).toHaveAttribute("href", "/start");

  /* Clicked until the page has hydrated and heard it, but never twice once it has. */
  await expect.poll(async () => {
    if (!(await page.locator(".svb-pack__list li").count())) await page.locator('label[for="svb-web"]').click();
    return page.locator(".svb-pack__list li").count();
  }).toBe(1);
  await expect(page.locator(".svb-add").first()).toBeVisible();
  await page.locator(".svb-add", { hasText: "SEO" }).click();
  await expect(page.locator(".svb-pack__list li")).toHaveCount(2);
  await expect(cta).toHaveAttribute("href", "/start?services=web,seo");

  await cta.click();
  await expect(page).toHaveURL(/\/start\?services=web,seo$/);
  await expect(page.locator(".cf textarea")).toHaveValue(/We are interested in: .*Web.*Search/);
  await expect(page.getByLabel("Full-Stack Web Development")).toBeChecked();
});

test("every service keeps its own link, and removing works", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/services", { waitUntil: "load" });
  expect(await page.locator('.svb-card__links a[href^="/services/"]').count()).toBe(6);
  await expect.poll(async () => {
    await page.locator(".svb-card__face").first().click();
    return page.locator(".svb-pack__list li").count();
  }).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^Remove/ }).first().click();
  await expect(page.locator(".svb-pack__list li")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 740 } });
  test("the package is a bar that appears on the first tick, and nothing is wider than the screen", async ({ page }) => {
    await page.goto("/services", { waitUntil: "load" });
    const bar = page.locator(".svb-bar");
    await expect(bar).toBeHidden();
    await expect.poll(async () => {
      await page.locator(".svb-card__face").first().tap();
      return bar.evaluate((el) => el.classList.contains("is-on"));
    }).toBe(true);
    await expect(bar).toBeVisible();
    /* Once it has finished sliding in, it sits flush with the bottom. */
    await expect.poll(async () => { const r = await bar.boundingBox(); return Math.round(r!.y + r!.height); }).toBe(740);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
