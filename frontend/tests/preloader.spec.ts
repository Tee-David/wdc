import { expect, test, type Page } from "@playwright/test";

/**
 * The preloader, the curtain between pages, and the intro on phones.
 *
 * What would break quietly if this file did not exist:
 *   - a link that leaves the reader behind a curtain (the run must end with
 *     the overlay gone, `data-curtain` cleared and the new page at the top);
 *   - the floating chrome (chat, accessibility, back-to-top) left hidden
 *     after the curtain or the preloader;
 *   - a curtain under reduced motion, or on a link out of the public site;
 *   - the intro switched off on phones again, which is how it went missing
 *     for a month.
 */

test.describe.configure({ timeout: 120_000 });

/* Runs in the page before anything else: the intro and the first-load
   preloader count as seen, and the concept is chosen the way the settings
   page's Preview chooses it, for this tab. */
const seen = (concept: string) => {
  try {
    const now = String(Date.now());
    localStorage.setItem("wdc-intro-seen-at", now);
    localStorage.setItem("wdc-preload-seen-at", now);
    sessionStorage.setItem("wdc-loader", concept);
  } catch {}
};

/* Clicked in the page rather than through a locator, the same as
   navigation-scroll.spec.ts: pinned sections move under a locator's
   actionability checks. */
const follow = (page: Page, href: string) =>
  page.evaluate((h) => {
    const a = document.querySelector<HTMLAnchorElement>(`footer a[href="${h}"]`);
    if (!a) throw new Error(`no footer link ${h}`);
    a.click();
  }, href);

const curtainSeen = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __curtain?: string[] };
    w.__curtain = [];
    new MutationObserver(() => {
      const c = document.documentElement.dataset.curtain;
      if (c) w.__curtain!.push(c);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-curtain"] });
  });

for (const concept of ["ink", "blueprint"] as const) {
  test(`${concept}: a footer link runs the curtain and lands at the top of the next page`, async ({ page }) => {
    await page.route(/jotfor/i, (route) => route.abort());
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(seen, concept);
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await curtainSeen(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await follow(page, "/services");

    await expect(page.locator(`.pl-${concept === "ink" ? "ink" : "bp"}[data-mode="route"]`)).toHaveCount(1);
    await page.waitForURL("**/services", { timeout: 30_000 });
    await expect(page.locator('.pl[data-mode="route"]')).toHaveCount(0, { timeout: 10_000 });

    const after = await page.evaluate(() => ({
      curtain: document.documentElement.dataset.curtain ?? null,
      seen: (window as unknown as { __curtain: string[] }).__curtain,
      y: Math.round(window.scrollY),
    }));
    expect(after.curtain).toBeNull();
    expect(after.seen).toContain(concept);
    expect(after.y).toBe(0);
    /* Polled: the button has its own fade, and comes back through it. */
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.querySelector("#wdc-userway-trigger")!).opacity))
      .toBe("1");
  });
}

test("no curtain under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(seen, "ink");
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await curtainSeen(page);
  await follow(page, "/services");
  await page.waitForURL("**/services", { timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __curtain: string[] }).__curtain)).toEqual([]);
});

test("the first-load preloader plays once, then gives the chrome back", async ({ page }) => {
  await page.goto("/about?loader=blueprint", { waitUntil: "domcontentloaded" });
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-preload", "play");
  await expect(page.locator('.pl-bp[data-mode="load"]')).toBeVisible();
  await expect(page.locator('.pl-ink[data-mode="load"]')).toBeHidden();
  await expect(html).toHaveAttribute("data-preload", "done", { timeout: 15_000 });
  await expect(page.locator('.pl[data-mode="load"]')).toHaveCount(0);
});

test("the intro plays on a phone", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible({ timeout: 30_000 });
  await ctx.close();
});

test("the owner's choice reaches a new visitor before the first paint", async ({ browser }) => {
  /* The proxy hands over the choice from Settings > Website and SEO
     (lib/preloader.ts) as a cookie; the page must play exactly that. */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.goto("/about", { waitUntil: "domcontentloaded" });
  const chosen = /wdc-loader-site=(ink|blueprint)/.exec((await res!.allHeaders())["set-cookie"] ?? "")?.[1];
  expect(chosen).toBeTruthy();
  await expect(page.locator("html")).toHaveAttribute("data-loader", chosen!);
  /* A preview of the other one wins in its own tab only. */
  const other = chosen === "ink" ? "blueprint" : "ink";
  await page.goto(`/about?loader=${other}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-loader", other);
  const tab = await ctx.newPage();
  await tab.goto("/services", { waitUntil: "domcontentloaded" });
  await expect(tab.locator("html")).toHaveAttribute("data-loader", chosen!);
  await ctx.close();
});

test("ink types the name without a cursor on the letters, and blueprint has no seam", async ({ page }) => {
  await page.goto("/about?loader=ink", { waitUntil: "domcontentloaded" });
  const caret = await page.evaluate(() =>
    [...document.querySelectorAll(".ink-ch")].some((el) => getComputedStyle(el, "::after").content !== "none"),
  );
  expect(caret).toBe(false);
  await expect(page.locator(".bp-seam")).toHaveCount(0);
});
