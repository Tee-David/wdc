import { expect, test } from "@playwright/test";

test.describe("the engagement policy has a tab per service and a search", () => {
  for (const width of [320, 1280]) {
    test(`tabs filter by service and search crosses them, at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/legal/client-engagement-policy");
      await expect(page.getByRole("tab", { name: "Brand and design" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Reviews and the handover meeting" })).toBeVisible();
      await expect(page.getByText("three to four weeks")).toHaveCount(0);
      await page.getByRole("tab", { name: "Brand and design" }).click();
      await expect(page.getByRole("heading", { name: "How design work runs" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Reviews and the handover meeting" })).toHaveCount(0);
      await page.getByRole("tab", { name: "Websites" }).click();
      await expect(page.getByText("up to 20 products")).toBeVisible();
      await page.getByRole("searchbox", { name: "Search this policy" }).fill("banned");
      await expect(page.getByRole("heading", { name: "Your accounts are yours" })).toBeVisible();
      await expect(page.getByText("Social media").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole("button", { name: "Clear the search" }).click();
      await expect(page.getByRole("tablist")).toBeVisible();
    });
  }
});

test("every policy page offers its PDF, and the PDF downloads", async ({ page, request }) => {
  for (const slug of ["client-engagement-policy", "privacy-policy"]) {
    await page.goto(`/legal/${slug}`);
    const link = page.getByRole("link", { name: "Download this policy as a PDF" });
    await expect(link).toHaveAttribute("href", `/legal/${slug}/pdf`);
    const res = await request.get(`/legal/${slug}/pdf`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF");
  }
});
