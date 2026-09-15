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

/**
 * THE CARET IS PART OF THE LINE, and the test above cannot see it.
 *
 * `.text-type__content` holds the words only, so a phrase can pass that check
 * on one line while the blinking bar after it sits on a line of its own
 * underneath -- which is exactly what the headline did at every phone width:
 * the size was measured against the phrase and the chevron, and nothing had
 * reserved the caret any room. It reads as a third line of headline with one
 * orange mark on it, and it moves the buttons and the logo rail down with it.
 *
 * TWO THINGS HAD TO BE MEASURED RATHER THAN ASSUMED, and both were wrong on
 * the first pass:
 *
 * WHICH CARET. The reserved sizer carries a hidden copy of the caret, and it
 * comes FIRST in the DOM, so a plain `.text-type__cursor` lookup finds an
 * element that is laid out and never seen. Written that way, this test passed
 * on a page whose real caret was sitting on a line of its own. It is the
 * `:not(--sizer)` one that a reader looks at.
 *
 * WHICH COMPARISON. "Do the boxes overlap vertically" is the obvious check and
 * it does not work here: the headline's leading is 1.08 and the font's own box
 * is taller than that, so the caret's box on the NEXT line still overlaps the
 * text's box on this one. What separates the two cases cleanly is the distance
 * between their tops -- a few pixels while they share a line, a whole line
 * advance once they do not.
 */
for (const width of WIDTHS) {
  test(`the caret stays on the phrase's line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const content = page.locator(".text-type__content");
    await expect(content).toBeVisible();
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(600);

    const split: string[] = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      const shot = await page.evaluate(() => {
        const text = document.querySelector(".text-type__content");
        const caret = document.querySelector(
          ".text-type__cursor:not(.text-type__cursor--sizer)",
        );
        const h1 = document.querySelector("h1");
        if (!text || !caret || !h1) return null;
        const t = text.getBoundingClientRect();
        const c = caret.getBoundingClientRect();
        /* Half the type size: comfortably more than the few pixels an
           inline-block sits below the text beside it, and comfortably less
           than the 1.08em it would drop by to reach the next line. */
        const slack = parseFloat(getComputedStyle(h1).fontSize) / 2;
        return {
          text: text.textContent?.trim() ?? "",
          sameLine: Math.abs(c.top - t.top) < slack,
        };
      });
      if (shot?.text.endsWith("?") && !shot.sameLine && !split.includes(shot.text)) {
        split.push(shot.text);
      }
      await page.waitForTimeout(EVERY_MS);
    }

    expect(split, `the caret drops off the line at ${width}px`).toEqual([]);
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

/**
 * The footer's width, and the newsletter's alignment inside it.
 *
 * TWO THINGS THAT BOTH LOOK LIKE NOTHING IN A DIFF. The card carried a 10px
 * inset at every width below 1024, which on a phone left the footer visibly
 * narrower than the full-bleed section above it -- too little to read as a
 * margin, enough to read as a mistake. And the subscribe box was left out of
 * the rule that pulls the footer's content back to a 1280px measure on a wide
 * screen, so it ran the full width of the window while the columns and the
 * copyright line beside it sat 80px in.
 *
 * Neither is visible in a component; both are one selector list away from
 * coming back.
 */
test.describe("the footer", () => {
  test("runs the full width of a phone, like the section above it", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/contact");

    const card = await page.locator(".ft__card").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, vw: window.innerWidth };
    });
    expect(card.left).toBeCloseTo(0, 0);
    expect(card.right).toBeCloseTo(card.vw, 0);

    /* Full bleed is not an excuse to run the words into the screen edge: the
       card's own padding still has to hold them off it. */
    const cols = await page.locator(".ft__cols").evaluate((el) => el.getBoundingClientRect().left);
    expect(cols).toBeGreaterThanOrEqual(16);

    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(wide, "the footer widened the page").toBe(false);
  });

  test("every footer column sits on the same measure", async ({ page }) => {
    /* REWRITTEN, because the layout it described is gone. It used to assert
       that the subscribe box spanned the same edges as `.ft__cols`, which was
       true when the box was a full-width block below the columns. It is a
       COLUMN now, so at 768px it correctly starts at 400 rather than 41 and
       the old assertion failed on a change that was deliberate.

       What is still worth pinning is the thing the original bug was about: the
       subscribe box was once the one block in the footer not pulled back to
       the same measure as everything else. So the assertion is that no column
       escapes the grid, and that the closing line agrees with it. */
    for (const width of [320, 393, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contact");

      const m = await page.evaluate(() => {
        const cols = document.querySelector(".ft__cols")!.getBoundingClientRect();
        const base = document.querySelector(".ft__base")!.getBoundingClientRect();
        const children = [...document.querySelectorAll<HTMLElement>(".ft__cols > *")].map((c) => {
          const r = c.getBoundingClientRect();
          return {
            name: c.querySelector("h2")?.textContent?.trim() ?? c.className.split(" ")[0],
            escapes: r.left < cols.left - 1 || r.right > cols.right + 1,
          };
        });
        return {
          stray: children.filter((c) => c.escapes).map((c) => c.name),
          baseMatches: Math.abs(base.left - cols.left) < 2 && Math.abs(base.right - cols.right) < 2,
          count: children.length,
        };
      });

      expect(m.stray, `these break the measure at ${width}px`).toEqual([]);
      expect(m.baseMatches, `the closing line is off the measure at ${width}px`).toBe(true);
      expect(m.count, `the footer lost a column at ${width}px`).toBeGreaterThanOrEqual(4);
    }
  });
});


/* ITS OWN CONTEXT, BECAUSE THE RULE UNDER TEST IS `@media (pointer: coarse)`.
   Setting a 393px viewport does not make a browser report a coarse pointer --
   `hasTouch` does. Without it this test passes against a stylesheet it never
   reached, which is worse than not having it. */
test.describe("the footer on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 393, height: 900 } });

  test("the hover underline stops at the end of the words", async ({ page }) => {
    /* THE 44PX TOUCH TARGET AND THE UNDERLINE WERE FIGHTING.

       Under `pointer: coarse` the footer links become `display: flex` with a
       44px minimum height, which is right. What came with it is that a flex
       box there is BLOCK level, so the link's box grew to the whole column --
       and the hover underline is painted as `background-size: 100%` of that
       box. The address got 229px of text under a 353px rule, which read as a
       divider left in by mistake rather than as a hover state.

       Asserted as an overshoot rather than as a width, because the number that
       matters is the gap between the line and the last character. */
    await page.goto("/contact");

    const mail = page.locator(".ft__mail");
    await mail.scrollIntoViewIfNeeded();
    await mail.hover();
    await page.waitForTimeout(400);

    const m = await mail.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        overshoot: Math.round(box.width - range.getBoundingClientRect().width),
        height: Math.round(box.height),
        painted: getComputedStyle(el).backgroundSize,
      };
    });

    expect(m.overshoot, "the underline runs past the address").toBeLessThanOrEqual(2);
    expect(m.painted, "the underline did not grow on hover").toContain("100%");
    /* And the target it was widened for is still 44px tall. */
    expect(m.height).toBeGreaterThanOrEqual(44);
  });

});
