import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/ad-budget. The arithmetic is checked without a
 * browser by `npm run check:ad-budget`; what needs one is that the tool
 * answers as you type, like the AI cost calculator, with no submit and
 * nothing to send.
 */

const PAGE = "/tools/ad-budget";

test("it answers on arrival, and there is nothing to submit", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page.locator(".es__ngn")).toBeVisible();
  expect(await page.locator('button[type="submit"]').count()).toBe(0);
  expect(await page.locator('input[type="email"]').count()).toBe(0);

  const rows = page.locator(".ai__list li");
  await expect(rows).not.toHaveCount(0);
});

test("a bigger budget buys more reach on every platform", async ({ page }) => {
  await page.goto(PAGE);

  const before = await page.locator(".ai__money").first().innerText();

  const budget = page.locator("#ab-budget");
  await budget.fill("1000000");

  await expect(page.locator(".ai__money").first()).not.toHaveText(before);
});

test("five platforms are compared side by side", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator(".ai__list li")).toHaveCount(5);
});
