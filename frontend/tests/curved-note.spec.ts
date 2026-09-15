import { expect, test } from "@playwright/test";

/**
 * The footer's helper line, bent along the subscribe bar's own arc.
 *
 * WHAT IS WORTH PINNING AND WHAT IS NOT. Not the exact radius: it is derived
 * from a measured width and changes with every breakpoint, so an assertion on
 * it would be an assertion about this week's grid. What matters is the three
 * things that would make the feature wrong rather than different: the line
 * genuinely curves and curves the same way the bar does, it never silently
 * loses a word in a column too narrow to hold it, and the sentence reaches a
 * screen reader exactly once despite being drawn twice.
 */

const NOTE = "No more than once a month. Leave whenever you like.";

/**
 * How many copies of the sentence a screen reader would actually reach.
 *
 * NOT `getByText`. That walks the DOM, and the DOM holds three copies on
 * purpose: the one that is announced, the one drawn along the curve, and the
 * off-canvas ruler the component measures itself against. Two of those sit
 * inside `aria-hidden` subtrees and are invisible to assistive technology, so
 * the thing worth asserting is how many are NOT.
 */
async function exposedCopies(page: import("@playwright/test").Page, text: string) {
  return page.evaluate((needle) => {
    return [...document.querySelectorAll("footer *")]
      .filter((el) => el.textContent?.trim() === needle && !el.querySelector("*"))
      .filter((el) => !el.closest('[aria-hidden="true"]'))
      .length;
  }, text);
}

/** Three points along the note's path, in its own coordinate space. */
async function sampleArc(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(".cn__svg path");
    if (!path) return null;
    const len = path.getTotalLength();
    const at = (t: number) => {
      const p = path.getPointAtLength(len * t);
      return { x: p.x, y: p.y };
    };
    return { start: at(0), mid: at(0.5), end: at(1) };
  });
}

test("the helper line curves, and curves the way the bar does", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await page.locator("footer.ft").scrollIntoViewIfNeeded();

  const note = page.locator(".cn__svg");
  await expect(note).toBeVisible();

  const arc = await sampleArc(page);
  expect(arc).not.toBeNull();

  /* ARCHING UP, like the bar above it: in SVG coordinates y grows downward, so
     the middle of the path must sit at a SMALLER y than either end. A sagged
     line would pass a "is it curved" check and look obviously wrong. */
  expect(arc!.mid.y).toBeLessThan(arc!.start.y);
  expect(arc!.mid.y).toBeLessThan(arc!.end.y);

  /* And by enough to read as deliberate. Below a few pixels a curve looks like
     a rendering fault rather than a decision. */
  const sagitta = (arc!.start.y + arc!.end.y) / 2 - arc!.mid.y;
  expect(sagitta).toBeGreaterThan(6);

  /* Symmetric, which is what says it is a circular arc concentric with the bar
     rather than a tilted line that happens to bow. */
  expect(Math.abs(arc!.start.y - arc!.end.y)).toBeLessThan(1.5);
});

test("the sentence reaches a screen reader exactly once", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await page.locator("footer.ft").scrollIntoViewIfNeeded();
  await expect(page.locator(".cn__svg")).toBeVisible();

  /* The drawing is marked decorative and a plain node beside it carries the
     words, because screen reader support for text inside <textPath> is uneven.
     Drawn three times in the DOM, announced once. */
  expect(await exposedCopies(page, NOTE)).toBe(1);
  await expect(page.locator(".cn__svg")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".cn__ruler")).toHaveAttribute("aria-hidden", "true");
});

test("a column too narrow for one line keeps the words and drops the curve", async ({ page }) => {
  /* 320 is the narrowest width this site supports, and there the subscribe
     column is about 280px: the sentence cannot fit on that arc at a size
     anybody could read. Text on a path cannot wrap, so the honest answer is
     ordinary text. */
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.locator("footer.ft").scrollIntoViewIfNeeded();

  await expect(page.locator(".cn__plain")).toBeVisible();
  await expect(page.locator(".cn__svg")).toHaveCount(0);
  /* NOTHING LOST, AND STILL NOT DOUBLED. The whole point of the fallback. */
  expect(await exposedCopies(page, NOTE)).toBe(1);
});

test("the line never pushes the footer sideways", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.locator("footer.ft").scrollIntoViewIfNeeded();
    /* `scrollWidth` reports clipped content, so it says a page overflows when
       it cannot be scrolled a pixel. Trying to scroll is the real test. */
    const scrolled = await page.evaluate(() => {
      window.scrollTo(9999, window.scrollY);
      const x = window.scrollX;
      window.scrollTo(0, window.scrollY);
      return x;
    });
    expect(scrolled, `horizontal scroll at ${width}px`).toBe(0);
  }
});
