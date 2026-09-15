import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/ai-cost. The arithmetic is checked without a
 * browser by `npm run check:ai-cost`; what needs one is the thing that makes
 * this a tool rather than a table — it answers as you type, and it keeps
 * answering.
 *
 * NO SUBMIT, NO EMAIL, ANYWHERE. That is the assertion worth having: the whole
 * calculation is pure and runs on the reader's own device, so there is nothing
 * to press and nothing to ask for. The day somebody adds a "see your results"
 * gate to this page, this test goes red.
 */

const PAGE = "/tools/ai-cost";

test("it answers before you ask, and keeps no gate in front of the answer", async ({ page }) => {
  await page.goto(PAGE);

  /* Figures on arrival, from the defaults. */
  await expect(page.locator(".es__ngn")).toBeVisible();
  await expect(page.locator(".es__ngn")).toContainText("₦");

  /* Nothing to submit and nobody to email. */
  await expect(page.locator("#ai-runs")).toBeVisible();
  expect(await page.locator('button[type="submit"]').count()).toBe(0);
  expect(await page.locator('input[type="email"]').count()).toBe(0);
});

test("every model is priced, cheapest first", async ({ page }) => {
  await page.goto(PAGE);

  const rows = page.locator(".ai__list li");
  await expect(rows).not.toHaveCount(0);

  /* Read the naira figures off the page and check the order the component
     promises. A table sorted by anything else is a table nobody can scan. */
  const money = await page.locator(".ai__money").evaluateAll((els) =>
    els.map((el) => Number((el.firstChild?.textContent ?? "").replace(/[^\d]/g, ""))));
  expect(money.length).toBeGreaterThan(4);
  expect([...money].sort((a, b) => a - b)).toEqual(money);

  /* Each row says who makes it and what it is for, or it is eight names and a
     column of numbers. */
  for (const row of await rows.all()) {
    await expect(row.locator(".ai__name b")).not.toBeEmpty();
    await expect(row.locator(".ai__note")).not.toBeEmpty();
  }
});

test("the volume drives the bill", async ({ page }) => {
  await page.goto(PAGE);

  const range = page.locator(".es__ngn");
  const before = await range.innerText();

  await page.fill("#ai-runs", "50000");
  await expect(range).not.toHaveText(before);

  /* Ten times the volume is ten times the bill, and the tool must not round
     that into the same string. */
  const after = await range.innerText();
  expect(after).not.toBe(before);

  /* An empty box is not a crash and not a NaN: it reads as nothing yet. */
  await page.fill("#ai-runs", "");
  await expect(range).not.toContainText("NaN");
});

test("choosing a shape fills in what that shape means", async ({ page }) => {
  await page.goto(PAGE);

  const inWords = page.locator("#ai-in");
  const outWords = page.locator("#ai-out");
  const readsFirst = await inWords.inputValue();

  /* "Drafting copy" writes more than it reads, which is the expensive shape and
     the point the page is making. */
  await page.getByRole("radio", { name: /Drafting copy/i }).click();
  await expect(inWords).not.toHaveValue(readsFirst);
  expect(Number(await outWords.inputValue())).toBeGreaterThan(Number(await inWords.inputValue()));

  /* And they stay editable afterwards, because the reader knows their own use
     better than our four examples do. */
  await inWords.fill("1200");
  await expect(inWords).toHaveValue("1200");
});

test("it says plainly when a model is the wrong tool", async ({ page }) => {
  await page.goto(PAGE);

  /* The sentence the tools programme asks this one to carry: it disqualifies a
     bad fit before it reaches a call, which costs us work and buys the rest of
     the page its credibility. */
  await expect(page.locator(".tl__step")).toContainText(/ordinary code/i);
  await expect(page.locator(".es__assume")).toContainText(/caching/i);
});

test("the table holds together on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(PAGE);
  await expect(page.locator(".ai__list li").first()).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
