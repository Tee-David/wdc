import { expect, test, type Page } from "@playwright/test";

/**
 * "Clicking a link takes me to the bottom of the page."
 *
 * Two separate causes, both covered here:
 *
 *   1. Lenis outlives the route. It owns the scroll position and keeps its own
 *      target, so after the router scrolled the new page to the top Lenis
 *      animated it straight back to the PREVIOUS page's offset.
 *   2. A link to the page you are already on is a router no-op, so the header
 *      logo never scrolled anywhere.
 *
 * Desktop viewport on purpose: Lenis only runs on a fine pointer at >=1024px.
 */

test.use({ viewport: { width: 1280, height: 900 } });
test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  /* Skip BOTH covers. The intro is gated on `wdc-intro-seen-at` and the
     preloader on the `wdc:preloaded` session flag; skipping only the intro
     makes the preloader play instead, and it locks body scroll while it owns
     the viewport. */
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
      sessionStorage.setItem("wdc:preloaded", "1");
    } catch {}
  });
});

const open = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
};

const toBottom = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
};

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/* Clicked in-page rather than through a Playwright locator: the homepage runs
   several pinned GSAP sections once it is scrolled, and waiting for the
   actionability checks on a moving element is what made this spec time out.
   The links live in the header's menu panel at every width now (the desktop
   row of links was retired on 2026-10-04), so that is where this looks. */
const clickNav = (page: Page, label: string) =>
  page.evaluate((text) => {
    const link = document.querySelector<HTMLAnchorElement>(
      `header .sm-panel a[aria-label="Go to ${text}"]`,
    );
    if (!link) throw new Error(`no menu link "${text}"`);
    link.click();
  }, label);

const clickLogo = (page: Page) =>
  page.evaluate(() => {
    const logo = document.querySelector<HTMLAnchorElement>(
      'header a[aria-label="We Dig Creativity, home"]',
    );
    if (!logo) throw new Error("no header logo");
    logo.click();
  });

test("a cross-route link lands at the top of the new page", async ({ page }) => {
  await open(page, "/");
  await toBottom(page);

  await clickNav(page, "Services");
  await page.waitForURL("**/services");
  await page.waitForTimeout(2500);

  expect(new URL(page.url()).pathname).toBe("/services");
  expect(await scrollY(page)).toBeLessThan(40);
});

test("the logo lands at the top when it navigates to another page", async ({ page }) => {
  await open(page, "/services");
  await toBottom(page);

  await clickLogo(page);
  await page.waitForURL((url) => url.pathname === "/");
  await page.waitForTimeout(2500);

  expect(await scrollY(page)).toBeLessThan(40);
});

test("the logo returns to the top of the page it is already on", async ({ page }) => {
  await open(page, "/");
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(1500);
  expect(await scrollY(page)).toBeGreaterThan(400);

  await clickLogo(page);
  await page.waitForTimeout(2500);

  expect(new URL(page.url()).pathname).toBe("/");
  expect(await scrollY(page)).toBeLessThan(40);
});

test("an in-page anchor still goes to its section, not to the top", async ({ page }) => {
  await open(page, "/");

  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="#pv-work"]')?.click();
  });
  await page.waitForTimeout(2500);

  expect(await scrollY(page)).toBeGreaterThan(100);
});

/**
 * "Back to the top doesn't go all the way to the top."
 *
 * The button reached about 200-350px and stopped, leaving the header in its
 * scrolled state at what was supposed to be the top of the page.
 *
 * THE CLICK HAS TO BE A REAL ONE. The cause was the tap focusing the button:
 * crossing the show/hide threshold on the way up re-rendered it, React
 * restored focus onto the element it had just mutated, and that `.focus()`
 * cancelled the smooth scroll still in flight. A scripted `element.click()`
 * focuses nothing, so it lands on 0 even with the bug present and proves
 * nothing. `page.click` is load-bearing here.
 */
for (const [name, size] of [
  ["a phone", { width: 390, height: 844 }],
  ["a desktop", { width: 1280, height: 900 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: size });

    test(`back to the top reaches the top on ${name}`, async ({ page }) => {
      await open(page, "/");
      await toBottom(page);

      await page.click(".st");
      await page.waitForTimeout(3000);

      expect(await scrollY(page)).toBe(0);
      /* Lenis keeps its own target on desktop; if it still holds the old one
         it will animate the page back down on some later frame. */
      expect(
        await page.evaluate(() => (window.__lenis ? Math.round(window.__lenis.scroll) : 0)),
      ).toBe(0);
    });
  });
}
