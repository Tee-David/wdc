import { expect, test } from "@playwright/test";

/**
 * THE SHARED LIST CONTROLS: the pager (components/admin/pager.tsx) and the
 * date range (components/admin/date-range.tsx), on /admin/clients because it
 * renders from the in-memory store and needs no database.
 *
 * What is pinned: rows per page is in the URL and survives, a preset
 * actually narrows the list, no form sits inside another (the first version
 * did, and React threw a hydration error for it), and the open menu stays
 * inside the screen at 320px and at 1440px.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test("rows per page is chosen from the pager and kept in the address", async ({ page }) => {
  await page.goto("/admin/clients");
  const pager = page.getByRole("navigation", { name: "Client pages" });
  await expect(pager).toBeVisible();
  const per = pager.locator(".ad__perPage > summary");
  await expect(per).toHaveText(/25 per page/);
  await expect(pager.getByText(/1–\d+ of \d+ clients?/)).toBeVisible();
  /* Previous and Next carry their arrows on the same line as the word. */
  for (const name of ["Previous", "Next"]) {
    const box = await pager.getByText(name, { exact: true }).evaluate((el) => {
      const svg = el.querySelector("svg")!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { same: svg.top >= r.top && svg.bottom <= r.bottom, lines: el.getClientRects().length };
    });
    expect(box.same && box.lines === 1, `${name} and its arrow are on one line`).toBe(true);
  }
  await per.click();
  await pager.getByRole("link", { name: "50 per page" }).click();
  await expect(page).toHaveURL(/per=50/);
  await expect(page.getByRole("navigation", { name: "Client pages" }).locator(".ad__perPage > summary")).toHaveText(/50 per page/);
});

test("a date preset narrows the list, and no form is nested in another", async ({ page }) => {
  await page.goto("/admin/clients");
  expect(await page.locator("form form").count()).toBe(0);
  const count = async () => Number((await page.locator("#client-list span").first().innerText()).match(/\d+/)![0]);
  const before = await count();
  await page.locator(".ad__range > summary").click();
  await page.locator(".ad__rangePresets").getByRole("link", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}|to=\d{4}-\d{2}-\d{2}.*from=/);
  expect(await count()).toBeLessThan(before);
  await expect(page.locator(".ad__range > summary")).toContainText("Today");
});

for (const width of [320, 1440]) {
  test(`the open date menu stays on screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/clients#client-list");
    await page.locator(".ad__range > summary").click();
    const box = (await page.locator(".ad__rangeMenu").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const moved = await page.evaluate(() => { window.scrollTo(600, window.scrollY); const m = window.scrollX; window.scrollTo(0, window.scrollY); return m; });
    expect(moved).toBe(0);
  });
}
