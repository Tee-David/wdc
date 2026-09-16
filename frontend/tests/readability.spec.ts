import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/readability. The scoring itself is checked
 * without a browser by `npm run check:readability`; what needs one is that
 * the tool answers as you type, starting from real sample copy rather than a
 * blank box.
 */

const PAGE = "/tools/readability";

test("starts with real sample copy already scored, not a blank box", async ({ page }) => {
  await page.goto(PAGE);

  const area = page.locator("#rd-text");
  await expect(area).not.toHaveValue("");
  await expect(page.locator(".rd__score")).toBeVisible();
  expect(await page.locator('button[type="submit"]').count()).toBe(0);
});

test("the score updates as the text changes", async ({ page }) => {
  await page.goto(PAGE);

  const before = await page.locator(".rd__score").innerText();
  const area = page.locator("#rd-text");
  await area.fill(
    "The implementation of a multivariate regression methodology necessitates " +
    "consideration of heteroscedasticity among the independent variables.",
  );

  await expect(page.locator(".rd__score")).not.toHaveText(before);
});

test("clearing the text shows a prompt instead of a broken score", async ({ page }) => {
  await page.goto(PAGE);

  const area = page.locator("#rd-text");
  await area.click();
  await area.press("ControlOrMeta+a");
  await area.press("Backspace");
  await expect(area).toHaveValue("");

  await expect(page.locator(".rd__score")).toHaveCount(0);
  await expect(page.getByText("Write or paste something above")).toBeVisible();
});

test("word, sentence and syllable counts are shown alongside the score", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator(".rd__stats li")).toHaveCount(4);
});
