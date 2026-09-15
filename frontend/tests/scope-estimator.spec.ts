import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/estimate. The arithmetic is checked without a
 * browser by `npm run check:estimate`; what needs one is the promise the page
 * makes about WHEN things happen.
 *
 * THE ORDER IS THE PRODUCT DECISION AND THEREFORE THE TEST. Eight questions,
 * then the figure, then the offer to send it. Nothing about that is visible in
 * a diff: moving the email field above the result would be a two-line change
 * that turns a calculator into a lead-capture form, and nothing else in the
 * repository would notice.
 */

const PAGE = "/tools/estimate";

/** Answers every question by taking its Nth option, and N is deliberately not
    always the first: the first is the cheapest everywhere, so a bug that
    ignored the answers entirely would still produce a plausible figure. */
async function answerAll(page: import("@playwright/test").Page, index = 1) {
  const groups = page.locator(".es__opts");
  const count = await groups.count();
  for (let i = 0; i < count; i += 1) {
    const options = groups.nth(i).locator(".es__opt");
    const available = await options.count();
    await options.nth(Math.min(index, available - 1)).click();
  }
  return count;
}

test("no figure appears until every question is answered", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page.locator(".es__ngn")).toHaveCount(0);

  const groups = page.locator(".es__opts");
  const total = await groups.count();
  expect(total, "the checklist asks for six to eight questions").toBeGreaterThanOrEqual(6);
  expect(total).toBeLessThanOrEqual(8);

  /* One short of the set, which is the case a partial figure would leak out
     of. The count is shown instead, because a reader needs to know how much
     is left. */
  for (let i = 0; i < total - 1; i += 1) {
    await groups.nth(i).locator(".es__opt").first().click();
  }
  await expect(page.locator(".es__ngn")).toHaveCount(0);
  await expect(page.locator(".es__count")).toContainText(`${total - 1} of ${total}`);

  await groups.nth(total - 1).locator(".es__opt").first().click();
  await expect(page.locator(".es__ngn")).toBeVisible();
});

test("the estimate arrives before the email ask, not after it", async ({ page }) => {
  await page.goto(PAGE);

  /* Nothing asks for an address while the form is being answered. */
  await expect(page.locator("#es-email")).toHaveCount(0);

  await answerAll(page);

  const range = page.locator(".es__ngn");
  await expect(range).toBeVisible();
  /* A range in naira, both ends of it. */
  await expect(range).toContainText("₦");
  expect((await range.innerText()).match(/₦/g)?.length, "a range has two ends").toBe(2);

  /* AND ONLY NOW the ask, which by then is optional rather than a toll. */
  await expect(page.locator("#es-email")).toBeVisible();
  await expect(page.locator(".es__phases .es__list li")).not.toHaveCount(0);
  await expect(page.locator(".es__assume li")).not.toHaveCount(0);
});

test("it says it is a range and not a quote, where the figure is", async ({ page }) => {
  await page.goto(PAGE);
  await answerAll(page);

  /* THE SENTENCE HAS TO TRAVEL WITH THE NUMBER. A figure like this gets
     screenshotted and sent to somebody who will never see the rest of the
     page, so the caveat lives in the same panel rather than in a footnote. */
  const panel = page.locator(".es__range");
  await expect(panel).toContainText(/range, not a quote/i);
  await expect(panel.locator(".es__usd")).toContainText("$");
});

test("different answers give different figures", async ({ page }) => {
  await page.goto(PAGE);

  await answerAll(page, 0);
  const cheapest = await page.locator(".es__ngn").innerText();

  /* The last option of every question is the largest version of that answer. */
  await answerAll(page, 9);
  const dearest = await page.locator(".es__ngn").innerText();

  expect(dearest, "a bigger project should not cost the same as a smaller one")
    .not.toBe(cheapest);
});

test("starting again clears the figure and the answers", async ({ page }) => {
  await page.goto(PAGE);
  await answerAll(page);
  await expect(page.locator(".es__ngn")).toBeVisible();

  await page.getByRole("button", { name: /start again/i }).click();

  await expect(page.locator(".es__ngn")).toHaveCount(0);
  await expect(page.locator(".es__opt.is-on")).toHaveCount(0);
});

test("the estimate is readable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(PAGE);
  await answerAll(page);

  /* 320px is where this site's layouts are held to account, and a figure at
     `clamp(1.9rem, 6vw, 2.8rem)` is the one thing on the page most likely to
     push it sideways. */
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);

  /* Every option is a real touch target, not a 30px line of text. */
  const short = await page.locator(".es__opt").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().height < 44).length);
  expect(short, "options below the 44px touch target").toBe(0);
});

/**
 * "Save as PDF" is a print stylesheet, and a print stylesheet is invisible in
 * normal use: nobody opens the page and sees it, and the first person to find
 * a fault in one is holding a piece of paper. Same reason
 * `tests/money-print.spec.ts` exists for the invoices.
 *
 * THE SECOND CASE IS THE ONE THAT MATTERS. `tools.css` is imported by all six
 * tool pages, and the first version of these rules hid the site header, the
 * hero and every section that was not the tool -- on every one of them. A
 * printed domain check would have come out as a title and nothing else, and
 * nothing in a build or a browser would have said so.
 */
test.describe("on paper", () => {
  test("the estimate prints and the eight questions do not", async ({ page }) => {
    await page.goto(PAGE);
    await answerAll(page);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator(".es__range")).toBeVisible();
    await expect(page.locator(".es__phases")).toBeVisible();
    await expect(page.locator(".es__assume")).toBeVisible();

    /* The form, the buttons and the email ask are all things that cannot be
       pressed on paper. */
    await expect(page.locator(".es__form")).toBeHidden();
    await expect(page.locator(".es__keep")).toBeHidden();
    /* And the site's own furniture, which is ink rather than information. */
    await expect(page.locator("header").first()).toBeHidden();
    await expect(page.locator(".ft")).toBeHidden();
  });

  test("another tool's page prints whole", async ({ page }) => {
    await page.goto("/tools/domain");
    await page.emulateMedia({ media: "print" });

    /* No estimator here, so none of the rules above may apply. */
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator(".wk-hero")).toBeVisible();
    await expect(page.locator(".tl__form")).toBeVisible();
  });
});
