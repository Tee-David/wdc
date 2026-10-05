import { expect, test } from "@playwright/test";

/**
 * EVERY LANDING PAGE OPENS THE SAME WAY (AGENTS.md, "Page shape"): the navy
 * band carrying the label, the h1 and the lede, and nothing else. /about had
 * its own centred opening with four floating badges and two buttons, which made
 * it look like a different site and put calls to action in front of a page
 * nobody had read yet. The header already carries Start a Project.
 */
for (const width of [390, 1440]) {
  test(`/about opens like the other pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
    });
    await page.goto("/about", { waitUntil: "load" });
    const band = page.locator("main .wk-hero").first();
    await expect(band).toBeVisible();
    await expect(band.locator(".pv-eyebrow")).toHaveText("About");
    await expect(band.getByRole("heading", { level: 1 })).toContainText("Brilliant simplicity");
    await expect(band.locator(".pv-lede")).toBeVisible();
    await expect(band.getByRole("link")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
