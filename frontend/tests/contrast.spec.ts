import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/contrast. The arithmetic is checked without a
 * browser by `npm run check:contrast`; what needs one is that the page
 * answers as you type, like the AI cost calculator, with no submit and
 * nothing to send.
 */

const PAGE = "/tools/contrast";

test("it answers on arrival, and there is nothing to submit", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page.locator(".cc__ratioNum")).toBeVisible();
  await expect(page.locator(".cc__ratioNum")).toContainText(":1");
  expect(await page.locator('button[type="submit"]').count()).toBe(0);
  expect(await page.locator('input[type="email"]').count()).toBe(0);

  /* The default pair is black ink on white paper, which clears every
     threshold there is. */
  await expect(page.locator(".cc__list li.is-fail")).toHaveCount(0);
});

test("typing a new pair of colours updates the ratio live", async ({ page }) => {
  await page.goto(PAGE);

  const before = await page.locator(".cc__ratioNum").innerText();

  const fg = page.locator("#cc-fg");
  await fg.fill("#ff6500");
  await fg.dispatchEvent("input");

  await expect(page.locator(".cc__ratioNum")).not.toHaveText(before);
  /* Orange on white is a real, specific case this site cares about: it is
     below 3:1, which is why the brand rule forbids it as a button fill. */
  const after = await page.locator(".cc__ratioNum").innerText();
  expect(Number(after.replace(":1", ""))).toBeLessThan(3);
  await expect(page.locator(".cc__list li.is-fail")).not.toHaveCount(0);
});

test("swapping the two colours keeps the same ratio", async ({ page }) => {
  await page.goto(PAGE);
  const before = await page.locator(".cc__ratioNum").innerText();

  await page.getByRole("button", { name: /swap/i }).click();

  await expect(page.locator(".cc__ratioNum")).toHaveText(before);
});

test("a half-typed colour holds the last good answer rather than erroring", async ({ page }) => {
  await page.goto(PAGE);
  const before = await page.locator(".cc__ratioNum").innerText();

  const fg = page.locator("#cc-fg");
  await fg.fill("#ff65");
  await fg.dispatchEvent("input");

  await expect(page.locator(".cc__ratioNum")).toHaveText(before);
  await expect(page.locator(".tl__form").getByRole("status")).toBeVisible();
});

test("the preview shows the reader's own two colours, not a fixed swatch", async ({ page }) => {
  await page.goto(PAGE);

  const fg = page.locator("#cc-fg");
  await fg.fill("#112233");
  await fg.dispatchEvent("input");

  const color = await page.locator(".cc__preview").evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(17, 34, 51)");
});
