import { expect, test } from "@playwright/test";

/**
 * The rotating half of the homepage headline.
 *
 * WHY THIS FILE EXISTS. The phrases are a plain array in `hero.tsx`, and
 * nothing about adding a longer one to it looks wrong: it reads correctly, it
 * compiles, and on a laptop it is fine. On a phone it takes a second line, and
 * because `reserveWidth` holds the box of the TALLEST phrase, ONE wrapping
 * phrase costs every other phrase in the set a line of empty space underneath
 * it -- so the whole hero, the buttons and the logo rail sit lower for the
 * entire time the page is open.
 *
 * WHAT IS ASSERTED IS THE LINE COUNT OF THE LIVE TEXT, not a character count
 * and not a computed column width. Both of those were tried while writing
 * this: comparing intrinsic phrase widths against "the h1 less the chevron"
 * said six phrases fitted, and three of them still wrapped on screen, because
 * the sizer shares the phrase's grid cell and carries the chevron inside it.
 * `getClientRects().length` on the element actually holding the words is the
 * only number that cannot be wrong about this.
 */

const WIDTHS = [320, 360, 390, 430];

/* Long enough to see the whole rotation several times over. Each phrase types,
   holds for 1.7s and deletes, so a five-phrase set cycles in roughly 15s. */
const SAMPLES = 170;
const EVERY_MS = 110;

test.describe.configure({ timeout: 240_000 });

for (const width of WIDTHS) {
  test(`every rotating phrase stays on one line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const content = page.locator(".text-type__content");
    await expect(content).toBeVisible();
    /* The webfont changes the measurement, so nothing is sampled until it has
       arrived -- a phrase measured in the fallback face proves nothing about
       the page a visitor sees. */
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(600);

    const worst = new Map<string, number>();
    for (let i = 0; i < SAMPLES; i += 1) {
      const shot = await content.evaluate((el) => ({
        text: el.textContent?.trim() ?? "",
        lines: el.getClientRects().length,
      }));
      /* Only complete phrases. Mid-typing the text is a prefix of one, which
         is shorter and proves nothing. Every phrase in the set ends in a
         question mark, which is what makes "complete" cheap to spot. */
      if (shot.text.endsWith("?")) {
        worst.set(shot.text, Math.max(worst.get(shot.text) ?? 0, shot.lines));
      }
      await page.waitForTimeout(EVERY_MS);
    }

    expect(worst.size, "no complete phrase was ever sampled").toBeGreaterThan(2);
    const wrapped = [...worst].filter(([, lines]) => lines > 1).map(([text]) => text);
    expect(wrapped, `these wrap at ${width}px`).toEqual([]);
  });
}

/* BOTH WIDTHS, AND THE DESKTOP ONE IS THE POINT. The homepage carried two
   `h1`s -- the hero's, and "We Dig Creativity." inside the intro splash -- and
   it never showed on a phone, because the intro does not run on a touch
   device. Every mobile check said one heading and the desktop page had two. */
for (const width of [390, 1280]) {
  test(`the headline keeps one h1 and the chevron stays out of it at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  /* The intro animates in, so a count taken on the first paint can miss a
     heading that arrives a moment later. */
  await page.waitForTimeout(1500);

  await expect(page.locator("h1")).toHaveCount(1);

  /* The chevron finishes a sentence visually and ruins it aloud: without
     aria-hidden a screen reader reads "What if we made it greater than sell
     itself". It is decoration, and the accessible name has to say so. */
  const heading = await page.locator("h1").evaluate((el) => {
    const chevron = [...el.querySelectorAll("span")].find((s) => s.textContent?.trim() === ">");
    return {
      hidden: chevron?.getAttribute("aria-hidden"),
      text: (el as HTMLElement).innerText,
    };
  });
  expect(heading.hidden).toBe("true");
  expect(heading.text).toContain("What if we made it");
  });
}
