import { expect, test } from "@playwright/test";

/**
 * The Invoices panel on /admin/money, filtered, sorted, paginated and
 * exportable -- the same shape the clients list already had, closing the gap
 * the 4.1 audit named: only one admin list offered this.
 *
 * Seeded data: c2 (Marfaa Foods) holds two invoices, i2 and i5, and is the
 * only company matching "marfaa".
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 90_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

test("invoice filters are useful, reversible, and the export matches the screen", async ({ page }) => {
  await page.goto("/admin/money?q=marfaa#invoice-list", { waitUntil: "domcontentloaded" });
  const rows = page.locator("#invoice-list + .ad__scroll tbody tr");

  await expect(rows).toHaveCount(2);
  await expect(page.locator(".ad__listMeta")).toContainText("2 invoices");
  for (const row of await rows.all()) await expect(row).toContainText("Marfaa Foods");

  const exportResponse = await page.request.get("/admin/money/export?q=marfaa");
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  const exportBody = await exportResponse.text();
  expect(exportBody).toContain("INV-2026-002");
  expect(exportBody).toContain("INV-2026-005");
  expect(exportBody).not.toContain("Moore Designs");

  const search = page.locator('.ad__filterBar input[type="search"][name="q"]');
  await search.fill("nobody matches this");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=nobody(?:\+|%20)matches(?:\+|%20)this/);
  await expect(page.getByText("No invoices match these filters")).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/admin\/money(?:#invoice-list)?$/);
  /* Every invoice again. Counted from the list's own total rather than a
     fixed six, because other specs raise invoices on the same server. */
  const total = Number((await page.locator(".ad__listMeta").innerText()).match(/\d+/)?.[0]);
  expect(total).toBeGreaterThanOrEqual(6);
  await expect(page.locator("#invoice-list + .ad__scroll tbody tr")).toHaveCount(total);

  /* The statuses are tabs: one press filters, and "All" undoes it. */
  const everything = await page.locator("#invoice-list + .ad__scroll tbody tr").count();
  await page.locator('nav[aria-label="Invoice status"]').getByRole("link", { name: "Overdue", exact: true }).click();
  await expect(page).toHaveURL(/status=Overdue/);
  for (const row of await page.locator("#invoice-list + .ad__scroll tbody tr").all()) await expect(row).toContainText("Overdue");
  await page.locator('nav[aria-label="Invoice status"]').getByRole("link", { name: "All", exact: true }).click();
  await expect(page.locator("#invoice-list + .ad__scroll tbody tr")).toHaveCount(everything);

  const numberSort = page.locator("th").getByRole("link", { name: "Number", exact: true });
  await expect(numberSort).toHaveAttribute("href", /sort=number/);
});

test("a struck invoice still shows on the unfiltered list", async ({ page }) => {
  await page.goto("/admin/money#invoice-list", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#invoice-list + .ad__scroll")).toContainText("INV-2026-006");
});
