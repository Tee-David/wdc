import { expect, test, type Page } from "@playwright/test";

/**
 * ON A PHONE, THE PAGE IS THE SCREEN.
 *
 * Two ways this went wrong. The admin's list tables scrolled sideways inside
 * their panels, up to three screens of them, so the right-hand columns (the
 * money page's invoice pills) sat cut off at the panel's edge; and one
 * onboarding question grew past a 320px screen, which made the whole page zoom
 * out. Neither widened `scrollWidth` in the admin, so the check is both: the
 * page fits, and nothing inside it is a sideways scroller or cut short.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 180_000 });
test.use({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });

async function fits(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const problems: string[] = [];
    if (document.documentElement.scrollWidth > vw) problems.push(`page is ${document.documentElement.scrollWidth}px in ${vw}px`);
    /* A table is the one thing allowed to be wider than the screen, inside
       its own scroller (admin.css, "a table stays a table"): `.ad__scroll`,
       or any box that really scrolls sideways, like the audit list and the
       project board. The page itself never does (checked above). */
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && !p.classList.contains("ad__panel"); p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if ((o === "auto" || o === "scroll") && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll<HTMLElement>(".ad__main .ad__panel *")) {
      if (el.children.length || !el.textContent?.trim() || el.closest("thead") || el.closest(".ad__scroll") || inScroller(el)) continue;
      const panel = el.closest(".ad__panel")!.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      if (box.width && box.right > panel.right + 1) problems.push(`"${el.textContent.trim().slice(0, 30)}" runs past its panel`);
    }
    return problems;
  });
}

test.describe("admin and portal", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

  test.beforeEach(async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
  });

  for (const path of ["/admin", "/admin/money", "/admin/money/reconciliation", "/admin/clients", "/admin/clients/c1", "/admin/projects", "/admin/projects/p1", "/admin/forms", "/admin/blog", "/admin/settings", "/portal", "/portal/projects/p1"]) {
    test(`${path} fits a 320px screen`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(500);
      expect(await fits(page)).toEqual([]);
    });
  }

  test("a table on a phone stays a table: columns, a pinned first column, and a swipe", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "networkidle" });
    const invoices = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Invoices", exact: true }) });
    const scroller = invoices.locator(".ad__scroll").first();
    /* The header row is drawn, as on a desktop. */
    await expect(invoices.locator("thead th").first()).toBeVisible();
    await expect(invoices.locator("thead th").first()).toHaveText("Number");
    /* There is more to the right, and it says so. */
    await expect(scroller).toHaveAttribute("data-more", "");
    const first = invoices.locator("tbody tr").first().locator("td").first();
    expect(await first.evaluate((td) => getComputedStyle(td).position)).toBe("sticky");
    const before = (await first.boundingBox())!.x;
    await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect(scroller).toHaveAttribute("data-scrolled", "");
    await expect(scroller).not.toHaveAttribute("data-more", "");
    /* The first column stayed where it was while the rest moved. */
    expect(Math.abs((await first.boundingBox())!.x - before)).toBeLessThan(2);
  });
});

test("an onboarding question never widens the page", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "load" });
  await page.locator(".ob__svcCard").first().click();
  await page.getByRole("button", { name: /^start/i }).click();
  await expect(page.locator(".ob__card").first()).toBeVisible();
  for (const card of await page.locator(".ob__card:visible").all()) await card.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
