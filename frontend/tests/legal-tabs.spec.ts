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

test("a link to one tab or one section lands there, and a tab downloads on its own", async ({ page, request }) => {
  await page.goto("/legal/client-engagement-policy#web:online-shops");
  await expect(page.getByRole("tab", { name: "Websites", selected: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Online shops" })).toBeInViewport();
  await page.goto("/legal/client-engagement-policy#domains");
  await expect(page.getByRole("tab", { name: "Domains and hosting", selected: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "This tab PDF" })).toHaveAttribute("href", "/legal/client-engagement-policy/pdf?tab=domains");
  const one = await request.get("/legal/client-engagement-policy/pdf?tab=domains");
  const all = await request.get("/legal/client-engagement-policy/pdf");
  expect(one.status()).toBe(200);
  expect((await one.body()).length).toBeLessThan((await all.body()).length);
  expect((await request.get("/legal/client-engagement-policy/pdf?tab=nope")).status()).toBe(404);
});

test("policies link to each other, and the index offers every PDF", async ({ page }) => {
  await page.goto("/legal/terms-of-service");
  await expect(page.locator('.lg-body a[href="/legal/client-engagement-policy"]').first()).toBeVisible();
  await page.goto("/legal/client-engagement-policy#web");
  await expect(page.locator('.lg-body a[href="#domains"]').first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Related policies" }).getByRole("link")).toHaveCount(5);
  await page.goto("/legal");
  await expect(page.locator(".lg-pdfs a")).toHaveCount(6);
});

test("the policy editor's checks keep text, repair tabs, and refuse half a policy", async () => {
  const { parseLegalOverride } = await import("../lib/legal-validate");
  const ok = parseLegalOverride({
    blurb: " Summary ", intro: "Opening.",
    tabs: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    sections: [{ heading: "One", tab: "gone", body: [" Para ", ""] }, { heading: "Two", tab: "b", body: ["Text"] }],
  });
  expect(ok).toEqual({ ok: true, value: {
    blurb: "Summary", intro: "Opening.", tabs: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    sections: [{ heading: "One", body: ["Para"], tab: "a" }, { heading: "Two", body: ["Text"], tab: "b" }],
  } });
  expect(parseLegalOverride({ blurb: "x", intro: "y", sections: [] }).ok).toBe(false);
  expect(parseLegalOverride({ blurb: "x", intro: "y", sections: [{ heading: "H", body: [] }] }).ok).toBe(false);
  expect(parseLegalOverride({ blurb: "x", intro: "y", tabs: [{ id: "a", label: "Same" }, { id: "a", label: "Same" }], sections: [{ heading: "H", body: ["t"] }] }).ok).toBe(false);
  expect(parseLegalOverride("not json").ok).toBe(false);
});
