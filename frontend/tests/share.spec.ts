import { expect, test } from "@playwright/test";

/**
 * Share this page, and take it with you.
 *
 * WHY THIS FILE EXISTS: the block is one component now, rendered on three
 * different kinds of page, and the thing most likely to break is not the
 * markup -- it is the URL. Every share link carries the address as a query
 * parameter and the QR code encodes it, so a route change or a stray relative
 * path produces a row of buttons that all still look right and all send people
 * somewhere else. A wrong link here is a lost reader, not a broken page, which
 * is exactly the kind of fault a browser test catches and a type check cannot.
 */

const PAGES = [
  { path: "/work/web/traxstaff", what: "case study" },
  { path: "/work/branding", what: "page" },
];

test.describe.configure({ timeout: 120_000 });

test("the end block is on the work pages, and every link carries the real address", async ({ page, baseURL }) => {
  for (const { path, what } of PAGES) {
    await page.goto(path);

    const end = page.locator(".sh-end");
    await expect(end, `no share block on ${path}`).toHaveCount(1);

    /* THE CANONICAL ADDRESS, NOT THE ONE THE TEST IS BROWSING. The share
       targets are built from SITE_URL so that a link forwarded from a preview
       deployment still points at the live page. Reading the canonical off the
       page rather than hard-coding it keeps this honest if the domain moves. */
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, `no canonical on ${path}`).toBeTruthy();

    const hrefs = await end.locator("a[href]").evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).href),
    );
    expect(hrefs.length, `no share links on ${path}`).toBeGreaterThan(5);
    for (const href of hrefs) {
      expect(decodeURIComponent(href), `a share link on ${path} does not carry the page`)
        .toContain(canonical!);
    }

    /* The QR is a real code, generated on the server: an <svg> with modules in
       it, not an empty box waiting on JavaScript that never runs. */
    const modules = await end.locator(".qr__code svg rect, .qr__code svg path").count();
    expect(modules, `the code on ${path} has nothing in it`).toBeGreaterThan(0);

    /* The accessible names say what is being shared. Seven buttons that all
       read "this post" on a case study is the failure this catches. */
    await expect(end.getByRole("button", { name: `Copy link to this ${what}` })).toHaveCount(1);

    expect(baseURL, "baseURL is unset").toBeTruthy();
  }
});

test("copying the link reports that it copied", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are a chromium API here");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/work/web/traxstaff");

  const copy = page.getByRole("button", { name: "Copy link to this case study" });
  await copy.scrollIntoViewIfNeeded();
  await copy.click();

  /* Announced, not merely coloured. The tick on its own tells a screen reader
     nothing, so the status line is the thing worth asserting. */
  await expect(page.locator(".sh-said")).toHaveText("Link copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/work/web/traxstaff");
});

test("the article still ends the way it did", async ({ page }) => {
  await page.goto("/blog");
  const first = await page.locator('a[href^="/blog/"]').first().getAttribute("href");
  expect(first).toBeTruthy();
  await page.goto(first!);

  const end = page.locator(".sh-end");
  await expect(end).toHaveCount(1);
  await expect(end.getByRole("button", { name: "Copy link to this post" })).toHaveCount(1);
  /* It sits below the article, which is what lets the sticky contents rail go.
     If it climbs back inside the post, the rail travels beside a share row. */
  await expect(page.locator(".bl-after .sh-end")).toHaveCount(1);
});
