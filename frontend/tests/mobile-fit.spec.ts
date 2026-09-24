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
    for (const el of document.querySelectorAll<HTMLElement>(".ad__scroll")) {
      const scrolls = /(auto|scroll)/.test(getComputedStyle(el).overflowX);
      if (scrolls && el.scrollWidth > el.clientWidth + 1) problems.push(`a table scrolls sideways: ${el.scrollWidth}px in ${el.clientWidth}px`);
    }
    for (const el of document.querySelectorAll<HTMLElement>(".ad__main .ad__panel *")) {
      if (el.children.length || !el.textContent?.trim() || el.closest("thead")) continue;
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

  test("a table row on a phone is a card whose lines name their column", async ({ page }) => {
    await page.goto("/admin/money", { waitUntil: "load" });
    const aging = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Who owes what, and for how long" }) });
    const row = aging.locator("tbody tr").first();
    await expect(row.locator("td").nth(1)).toHaveAttribute("data-label", "Owed");
    await expect(row.locator("td").nth(2)).toHaveAttribute("data-label", "Invoices");
    /* The header row is still there for a screen reader, just not drawn. */
    await expect(aging.locator("thead th").first()).toHaveText("Age");
    const pill = aging.locator(".ad__pill").first();
    const [pillBox, panelBox] = [await pill.boundingBox(), await aging.boundingBox()];
    expect(pillBox!.x + pillBox!.width).toBeLessThanOrEqual(panelBox!.x + panelBox!.width);
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
