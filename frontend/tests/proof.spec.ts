import { expect, test } from "@playwright/test";
import { proofStats } from "../lib/proof";

/**
 * The figures under the homepage hero.
 *
 * THESE FOUR ARE HAND-SET, not derived from the case studies or testimonials
 * on the site; see the note at the top of `lib/proof.ts` for why. What this
 * suite can still pin is that the page renders exactly `lib/proof.ts`'s own
 * figures, that every one carries the "+" it is supposed to (a round number
 * with no suffix reads as an exact count, which these are not), and that the
 * counter is honest about arriving with JavaScript.
 *
 * THE SECOND TEST IS ABOUT TRUST OF A DIFFERENT KIND. The band is a counter,
 * and a counter written the obvious way renders zero into the HTML and
 * animates up after hydration, so a reader with no JavaScript, a crawler, and
 * anybody whose bundle is still arriving are all told the agency has ten
 * years and nothing to show for them. The figures are server-rendered at
 * their real value and the animation only runs over the top of them, which is
 * what the no-JavaScript case below proves.
 */

const HOME = "/";

test("every figure on screen matches lib/proof.ts, with the suffix it is owed", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);

  const card = page.locator(".pf__card");
  await card.scrollIntoViewIfNeeded();
  /* Past the counter's ~1.1s run, so what is read is the settled figure. */
  await page.waitForTimeout(1_800);

  const stats = proofStats();
  const nums = page.locator(".pf__num");
  await expect(nums).toHaveCount(stats.length);

  const shown = await nums.allInnerTexts();
  for (const [i, stat] of stats.entries()) {
    expect(shown[i].trim(), `figure ${i} matches lib/proof.ts`).toBe(`${stat.value}${stat.suffix ?? ""}`);
  }

  /* A hand-set round figure without its "+" reads as an exact count, which
     these are not: the suffix is what tells a reader these are the agency's
     own approximation of its history rather than a number that ends in .5. */
  for (const stat of stats) {
    expect(stat.suffix, `${stat.key} carries a "+"`).toBe("+");
  }
});

test("the real figures are in the HTML, not animated into it", async ({ browser }) => {
  /* NO JAVASCRIPT AT ALL. This is the case a counter gets wrong: server-render
     zero, count up on hydration, and every reader whose bundle has not arrived
     is told the agency has shipped nothing. */
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(HOME);

  const stats = proofStats();
  const shown = await page.locator(".pf__num").allInnerTexts();
  expect(shown.map((t) => t.trim())).toEqual(stats.map((s) => `${s.value}${s.suffix ?? ""}`));

  await context.close();
});

test("it sits directly under the hero, before the work", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);

  /* THE POSITION IS THE BRIEF. A reader who has just read the headline is at
     the moment of asking whether we can do it; the band answers that before
     the work rail rather than after it. */
  const order = await page.evaluate(() => {
    const band = document.querySelector(".pf__card");
    const work = document.querySelector("#pv-work");
    const hero = document.querySelector("h1");
    if (!band || !work || !hero) return null;
    const y = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
    return { hero: y(hero), band: y(band), work: y(work) };
  });

  expect(order, "the band, the hero and the work section should all exist").not.toBeNull();
  expect(order!.band).toBeGreaterThan(order!.hero);
  expect(order!.band).toBeLessThan(order!.work);
});

test("each figure says where it comes from, and the card carries no buttons of its own", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);

  /* A number with a label and no sentence under it is a claim. Every one of
     these carries the sentence that says what was counted. */
  const details = await page.locator(".pf__detail").allInnerTexts();
  expect(details).toHaveLength(4);
  for (const line of details) expect(line.trim().length).toBeGreaterThan(40);

  /* The hero directly above already carries the site's pair, so this card
     does not repeat it. */
  await expect(page.locator(".pf__card .pv-btn")).toHaveCount(0);
});

test("the band holds together on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);
  await page.locator(".pf__card").scrollIntoViewIfNeeded();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);

  /* The figures stack rather than squeezing four columns into 320px. */
  const lefts = await page.locator(".pf__stat").evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(new Set(lefts).size, "the four figures should share one column at 320px").toBe(1);
});
