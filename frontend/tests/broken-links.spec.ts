import { expect, test } from "@playwright/test";

/**
 * The browser half of /tools/broken-links.
 *
 * WHAT IS CHECKED WITHOUT A BROWSER, by `npm run check:broken-links`: reading
 * `<a href>` out of a page's HTML and turning a status into a verdict. What
 * needs one is the shape of the result -- broken links sorted first, an
 * honest word for the ones we could not check, and the page holding together
 * once there is something to show.
 *
 * RENDERED FROM A FIXTURE, for the reason written in `seo-snapshot.spec.ts`:
 * a spec that depends on real pages elsewhere on the internet depends on a
 * stranger's uptime and a network this suite may not have. The route's own
 * fetching and its SSRF guard are covered by `check:fetch-page` and by the
 * refusal case at the end of this file, which uses the real endpoint.
 */

const PAGE = "/tools/broken-links";

const FIXTURE = {
  url: "https://example.com/",
  finalUrl: "https://example.com/",
  redirected: false,
  total: 3,
  truncated: false,
  links: [
    {
      href: "https://example.com/about",
      text: "About us",
      external: false,
      verdict: "ok",
      status: 200,
      redirected: false,
      note: "Answers with 200.",
    },
    {
      href: "https://example.com/old-page",
      text: "An old page",
      external: false,
      verdict: "broken",
      status: 404,
      redirected: false,
      note: "Answered with 404.",
    },
    {
      href: "https://other.example/partner",
      text: "Our partner",
      external: true,
      verdict: "unverified",
      status: null,
      redirected: false,
      note: "Did not answer within six seconds.",
    },
  ],
};

async function checkWithFixture(page: import("@playwright/test").Page) {
  await page.route("**/api/tools/broken-links", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.goto(PAGE);
  await page.fill("#broken-links-url", "https://example.com");
  await page.click(".tl__go");
  await page.waitForSelector(".tl__find");
}

test("broken links are sorted before ones that simply work", async ({ page }) => {
  await checkWithFixture(page);

  const rows = page.locator(".tl__find");
  await expect(rows).toHaveCount(3);
  /* Broken, then unverified, then ok -- the order `ORDER` in the component
     defines, and the one a reader who pastes a URL here actually wants. */
  await expect(rows.nth(0)).toHaveClass(/tl__find--missing/);
  await expect(rows.nth(0)).toContainText("Broken");
  await expect(rows.nth(1)).toHaveClass(/tl__find--unknown/);
  await expect(rows.nth(1)).toContainText("Could not check");
  await expect(rows.nth(2)).toHaveClass(/tl__find--good/);
  await expect(rows.nth(2)).toContainText("Works");
});

test("the headline counts the broken ones honestly", async ({ page }) => {
  await checkWithFixture(page);
  await expect(page.locator(".tl__verdict")).toContainText("1 of 3 links is broken");
});

test("a link we could not verify is never called broken", async ({ page }) => {
  await checkWithFixture(page);
  const unverified = page.locator(".tl__find--unknown");
  await expect(unverified).toContainText("Could not check");
  await expect(unverified).not.toContainText("Broken");
});

test("an external link is marked as leaving the site", async ({ page }) => {
  await checkWithFixture(page);
  const external = page.locator(".tl__find", { hasText: "Our partner" });
  await expect(external.locator(".bl__ext")).toHaveCount(2); // beside the name, and beside the address
});

test("a private address is refused in a sentence, the real endpoint", async ({ page }) => {
  await page.goto(PAGE);
  await page.fill("#broken-links-url", "http://169.254.169.254/latest/meta-data/");
  await page.click(".tl__go");

  const error = page.locator(".tl__err");
  await expect(error).toBeVisible();
  await expect(error).toContainText(/public web pages/i);
});

test("the result holds together on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await checkWithFixture(page);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
