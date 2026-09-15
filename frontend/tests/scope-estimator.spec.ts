import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/estimate. The arithmetic is checked without a
 * browser by `npm run check:estimate`; what needs one is the promise the page
 * makes about WHEN things happen, and now also the promise the conversational
 * form makes about ONE question at a time.
 *
 * THE ORDER IS THE PRODUCT DECISION AND THEREFORE THE TEST. Eight questions,
 * then the figure, then the offer to send it. Nothing about that is visible in
 * a diff: moving the email field above the result would be a two-line change
 * that turns a calculator into a lead-capture form, and nothing else in the
 * repository would notice.
 */

const PAGE = "/tools/estimate";

/** Waits past the auto-advance timer, which is skipped under reduced motion
    but is real time in every other run of this suite. */
async function settle(page: import("@playwright/test").Page) {
  await page.waitForTimeout(450);
}

/** Answers the CURRENT question by opening its dropdown and taking its Nth
    option, and N is deliberately not always the first: the first is the
    cheapest everywhere, so a bug that ignored the answers entirely would
    still produce a plausible figure. Choosing an option both answers the
    question and turns the page, so this walks the whole wizard rather than
    one field. */
async function answerAll(page: import("@playwright/test").Page, index = 1) {
  let count = 0;
  while (await page.locator(".es__stepSelect .sf__btn").count() > 0) {
    await page.locator(".es__stepSelect .sf__btn").click();
    const options = page.locator(".es__stepSelect .pk__opt");
    const available = await options.count();
    await options.nth(Math.min(index, available - 1)).click();
    count += 1;
    await settle(page);
  }
  return count;
}

test("only one question shows at a time, and no figure appears until the last is answered", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page.locator(".es__ngn")).toHaveCount(0);
  /* Never more than one question's dropdown on screen at once. */
  await expect(page.locator(".es__stepSelect")).toHaveCount(1);

  const total = await answerAll(page);
  expect(total, "the checklist asks for six to eight questions").toBeGreaterThanOrEqual(6);
  expect(total).toBeLessThanOrEqual(8);
  await expect(page.locator(".es__ngn")).toBeVisible();
  /* The wizard is gone once the range has appeared. */
  await expect(page.locator(".es__stepSelect")).toHaveCount(0);
});

test("the count and the progress bar move with each answer", async ({ page }) => {
  await page.goto(PAGE);

  await expect(page.locator(".es__count")).toContainText("Question 1 of 8");
  await expect(page.locator(".es__prog[aria-valuenow='1']")).toHaveCount(1);

  await page.locator(".es__stepSelect .sf__btn").click();
  await page.locator(".es__stepSelect .pk__opt").first().click();
  await settle(page);

  await expect(page.locator(".es__count")).toContainText("Question 2 of 8");
  await expect(page.locator(".es__prog[aria-valuenow='2']")).toHaveCount(1);
});

test("back reopens the previous question with its answer still showing", async ({ page }) => {
  await page.goto(PAGE);

  await page.locator(".es__stepSelect .sf__btn").click();
  const options = page.locator(".es__stepSelect .pk__opt");
  const label = (await options.nth(2).locator(".pk__optT").innerText()).trim();
  await options.nth(2).click();
  await settle(page);

  await expect(page.locator(".es__count")).toContainText("Question 2 of 8");
  await page.getByRole("button", { name: /back/i }).click();

  await expect(page.locator(".es__count")).toContainText("Question 1 of 8");
  /* The answer that was already there is still what the closed dropdown says. */
  await expect(page.locator(".es__stepSelect .sf__val")).toHaveText(label);
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

  await page.goto(PAGE);
  /* The last option of every question is the largest version of that answer. */
  await answerAll(page, 9);
  const dearest = await page.locator(".es__ngn").innerText();

  expect(dearest, "a bigger project should not cost the same as a smaller one")
    .not.toBe(cheapest);
});

test("changing an answer from the result reopens the last question", async ({ page }) => {
  await page.goto(PAGE);
  await answerAll(page);
  await expect(page.locator(".es__ngn")).toBeVisible();

  await page.getByRole("button", { name: /change an answer/i }).click();

  await expect(page.locator(".es__ngn")).toHaveCount(0);
  await expect(page.locator(".es__count")).toContainText("Question 8 of 8");
  /* The answer that was already there is still on it, not the placeholder. */
  await expect(page.locator(".es__stepSelect .sf__btn")).not.toHaveClass(/is-empty/);
});

test("starting again clears the figure and the answers", async ({ page }) => {
  await page.goto(PAGE);
  await answerAll(page);
  await expect(page.locator(".es__ngn")).toBeVisible();

  await page.getByRole("button", { name: /start again/i }).click();

  await expect(page.locator(".es__ngn")).toHaveCount(0);
  await expect(page.locator(".es__count")).toContainText("Question 1 of 8");
  /* Back to the unanswered placeholder, not a leftover choice. */
  await expect(page.locator(".es__stepSelect .sf__btn")).toHaveClass(/is-empty/);
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
});

test("every control is a real touch target on the way through", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(PAGE);

  /* The closed dropdown, before anything has been answered away. */
  const trigger = page.locator(".es__stepSelect .sf__btn");
  const triggerHeight = await trigger.evaluate((el) => el.getBoundingClientRect().height);
  expect(triggerHeight, "the select button is below the 44px touch target").toBeGreaterThanOrEqual(44);

  /* And every row inside it once it opens -- the whole set the first
     question ever puts on screen at once. */
  await trigger.click();
  const short = await page.locator(".es__stepSelect .pk__opt").evaluateAll((els) =>
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
  test("the estimate prints and the wizard does not", async ({ page }) => {
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
