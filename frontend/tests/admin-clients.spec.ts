import { expect, test } from "@playwright/test";

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 180_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

test("client filters are useful, reversible, and keep their context", async ({ page }) => {
  await page.goto("/admin/clients?q=marfaa#client-list", { waitUntil: "domcontentloaded" });
  const rows = page.locator("#client-list + .ad__scroll tbody tr");

  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Marfaa Foods");
  await expect(page.locator(".ad__listMeta")).toContainText("1 client");

  const exportResponse = await page.request.get("/admin/clients/export?q=marfaa");
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  const exportBody = await exportResponse.text();
  expect(exportBody).toContain("Marfaa Foods");
  expect(exportBody).not.toContain("Moore Designs");

  await page.locator('input[name="q"]').fill("nobody matches this");
  await page.locator('.ad__filterBar button[type="submit"]').click();
  await expect(page).toHaveURL(/q=nobody(?:\+|%20)matches(?:\+|%20)this/);
  await expect(page.getByText("No clients match these filters")).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/admin\/clients(?:#client-list)?$/);
  await expect(page.locator("#client-list + .ad__scroll tbody tr")).toHaveCount(5);

  const companySort = page.locator("th").getByRole("link", { name: "Client", exact: true });
  await expect(companySort).toHaveAttribute("href", /sort=company/);
  await page.goto((await companySort.getAttribute("href"))!);
  await expect(page).toHaveURL(/sort=company/);
  await expect(page.locator("th[aria-sort=ascending]")).toContainText("Client");
});

test("client filters remain usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/admin/clients", { waitUntil: "domcontentloaded" });

  const controls = page.locator(".ad__filterBar input, .ad__filterBar select, .ad__filterBar button");
  for (let index = 0; index < await controls.count(); index += 1) {
    expect((await controls.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  const pageOverflow = await page.evaluate(async () => {
    window.scrollTo({ left: 500, top: 0 });
    await new Promise(requestAnimationFrame);
    return { bodyWidth: document.body.scrollWidth, scrollX: window.scrollX };
  });
  expect(pageOverflow).toEqual({ bodyWidth: 320, scrollX: 0 });
  const tableScroller = page.locator("#client-list + .ad__scroll");
  expect(await tableScroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});
