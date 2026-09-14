import { expect, test } from "@playwright/test";

/**
 * The contents rail on a case study.
 *
 * WHY THIS FILE EXISTS: the rail's links and the `<section>` ids they point at
 * are declared in two places in the same file, and two of the entries are
 * conditional. Nothing in TypeScript can catch a rail link pointing at an id
 * that is not on the page -- it is a valid string either way. The only guard
 * is walking every case study and checking every link resolves, which is what
 * this does.
 *
 * A dead anchor fails silently: the reader clicks and the page does not move.
 */

const CATEGORIES = ["branding", "web", "seo", "social", "apps", "software"];

test.describe.configure({ timeout: 180_000 });

/** Every case study on the site, found the way a reader would. */
async function everyCaseStudy(page: import("@playwright/test").Page) {
  const found = new Set<string>();
  for (const cat of CATEGORIES) {
    const res = await page.goto(`/work/${cat}`);
    if (res?.status() !== 200) continue;
    const hrefs = await page.locator(`a[href^="/work/${cat}/"]`).evaluateAll((links) =>
      links.map((l) => new URL((l as HTMLAnchorElement).href).pathname),
    );
    hrefs.forEach((h) => found.add(h));
  }
  return [...found].sort();
}

test("every case study has a rail, and every link in it lands somewhere", async ({ page }) => {
  const pages = await everyCaseStudy(page);
  expect(pages.length, "no case studies were found to check").toBeGreaterThan(5);

  const broken: string[] = [];
  for (const path of pages) {
    await page.goto(path);
    const links = await page.locator(".wk-toc__list a").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    if (!links.length) { broken.push(`${path}: no rail at all`); continue; }

    for (const href of links) {
      const id = href.replace(/^#/, "");
      const hits = await page.locator(`[id="${id}"]`).count();
      /* Exactly one: two elements sharing an id is a different bug with the
         same symptom, because the browser jumps to whichever comes first. */
      if (hits !== 1) broken.push(`${path}: ${href} matches ${hits} elements`);
    }
  }
  expect(broken, broken.join("\n")).toEqual([]);
});

test("the rail lists the sections that are actually on the page", async ({ page }) => {
  /* A case study without a palette must not carry a palette link, and one with
     a palette must. Both directions, because a rail that lists everything
     regardless is as wrong as one that lists nothing. */
  await page.goto("/work/branding/thinkers-diary");
  const withPalette = await page.locator(".wk-toc__list a").allTextContents();
  expect(withPalette).toContain("The palette");
  await expect(page.locator("#the-palette")).toHaveCount(1);

  await page.goto("/work/apps/realtors-practice");
  const links = await page.locator(".wk-toc__list a").allTextContents();
  const hasPaletteSection = await page.locator("#the-palette").count();
  expect(links.includes("The palette")).toBe(hasPaletteSection === 1);
});

test("it names the section by the heading the page actually shows", async ({ page }) => {
  /* The last section's title is `stackLabel` and varies by case study --
     "The system includes", "Built with". The rail has to say what the heading
     says, or it is describing a page that does not exist. */
  await page.goto("/work/branding/thinkers-diary");
  const last = (await page.locator(".wk-toc__list a").last().textContent())?.trim();
  const heading = (await page.locator("#the-system h2").textContent())?.trim();
  expect(last).toBe(heading);
});

test("it follows the reader down the page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/branding/thinkers-diary", { waitUntil: "networkidle" });

  /* Nothing is lit at the top, which is the honest answer: no heading has been
     reached yet, and lighting the first one on load would be a guess. */
  await expect(page.locator(".wk-toc__list a.is-on")).toHaveCount(0);

  await page.locator("#what-we-did").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const lit = page.locator(".wk-toc__list a.is-on");
  await expect(lit).toHaveCount(1);
  /* And it says the same thing to a screen reader, which cannot see the
     border fill in. */
  await expect(lit).toHaveAttribute("aria-current", "true");
});

test("on a phone it collapses above the work, not below it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/work/branding/thinkers-diary");
  /* A contents list under the thing it lists is a list nobody uses. The rail
     is first in the DOM for this reason and placed right only by the grid. */
  const railTop = await page.locator(".wk-rail").boundingBox();
  const bodyTop = await page.locator(".wk-doc__body").boundingBox();
  expect(railTop!.y).toBeLessThan(bodyTop!.y);
  /* And it is a real disclosure, so somebody can put it away. */
  await expect(page.locator(".wk-toc > summary")).toBeVisible();
});

test("on a desktop it sits to the RIGHT of the work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/branding/thinkers-diary");
  const rail = await page.locator(".wk-rail").boundingBox();
  const body = await page.locator(".wk-doc__body").boundingBox();
  expect(rail!.x).toBeGreaterThan(body!.x + body!.width - 1);
  /* The prose keeps its measure; the rail fills space the cap was already
     leaving empty rather than taking width off the reading column. */
  expect(body!.width).toBeLessThan(900);
});
