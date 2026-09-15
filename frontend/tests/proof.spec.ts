import { expect, test } from "@playwright/test";
import { CASE_STUDIES } from "../lib/work";
import { TESTIMONIALS } from "../lib/testimonials";
import { SERVICES } from "../lib/services";
import { proofStats } from "../lib/proof";

/**
 * The figures under the homepage hero.
 *
 * THE ONLY ASSERTION THAT REALLY MATTERS IS THE FIRST ONE: every number on
 * screen is the count of something in the repository. A stats band is the
 * easiest thing on a marketing site to quietly inflate -- one hand-typed "40+"
 * in a component, six months later nobody remembers it was a guess -- and this
 * site has already deleted eight fabricated testimonials for exactly that
 * reason (see the note at the top of `lib/testimonials.ts`). So the test walks
 * the rendered page and checks each figure against the data it claims to
 * count, which is the one check a typed-in number cannot pass.
 *
 * THE SECOND ONE IS ABOUT TRUST OF A DIFFERENT KIND. The band is a counter, and
 * a counter written the obvious way renders zero into the HTML and animates up
 * after hydration -- so a reader with no JavaScript, a crawler, and anybody
 * whose bundle is still arriving are all told this studio has delivered no
 * projects. The figures are server-rendered at their real value and the
 * animation only runs over the top of them, which is what the no-JavaScript
 * case below proves.
 */

const HOME = "/";

/** What the page should be able to count, computed here from the same data. */
const EXPECTED = {
  projects: CASE_STUDIES.length,
  deliverables: CASE_STUDIES.reduce((n, c) => n + c.did.length, 0),
  quoted: TESTIMONIALS.length,
  services: SERVICES.length,
};

test("every figure is a count of something real", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);

  const card = page.locator(".pf__card");
  await card.scrollIntoViewIfNeeded();
  /* Past the counter's ~1.1s run, so what is read is the settled figure. */
  await page.waitForTimeout(1_800);

  const shown = (await page.locator(".pf__num").allInnerTexts()).map((t) => Number(t.trim()));
  expect(shown, "the band should show four figures").toHaveLength(4);

  /* Each one against the thing it claims to count. Order is the component's,
     and `lib/proof.ts` is the single place both it and this test read. */
  const stats = proofStats();
  expect(stats.map((s) => s.value)).toEqual(shown);

  expect(shown[0], "projects delivered is the case study count").toBe(EXPECTED.projects);
  expect(shown[1], "things shipped is the sum of every case study's deliverables").toBe(EXPECTED.deliverables);
  expect(shown[2], "clients on the record is the testimonial count").toBe(EXPECTED.quoted);
  expect(shown[3], "disciplines is the service count").toBe(EXPECTED.services);

  /* AND NOTHING IS ROUNDED UP OR DECORATED. A "+" or a "k" on a figure this
     size is the first step back towards a claim nobody can check. */
  for (const text of await page.locator(".pf__num").allInnerTexts()) {
    expect(text.trim(), "a figure carries a suffix it has not earned").toMatch(/^\d+$/);
  }
});

test("the real figures are in the HTML, not animated into it", async ({ browser }) => {
  /* NO JAVASCRIPT AT ALL. This is the case a counter gets wrong: server-render
     zero, count up on hydration, and every reader whose bundle has not arrived
     is told the studio has shipped nothing. */
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(HOME);

  const shown = (await page.locator(".pf__num").allInnerTexts()).map((t) => Number(t.trim()));
  expect(shown).toEqual(proofStats().map((s) => s.value));
  expect(shown).not.toContain(0);

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

test("each figure says where it comes from, and the pair of buttons is the site's", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto(HOME);

  /* A number with a label and no sentence under it is a claim. Every one of
     these carries the sentence that says what was counted. */
  const details = await page.locator(".pf__detail").allInnerTexts();
  expect(details).toHaveLength(4);
  for (const line of details) expect(line.trim().length).toBeGreaterThan(40);

  /* And the two buttons are the site's pair, not a third thing invented for
     this card. `tests/button-colours.spec.ts` checks their colours; this
     checks they are the shared component at all. */
  await expect(page.locator(".pf__acts .pv-btn--accent")).toHaveCount(1);
  await expect(page.locator(".pf__acts .pv-btn--light")).toHaveCount(1);
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
