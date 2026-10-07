import { expect, test } from "@playwright/test";
import { isolate, PERSON, seedDraft, SMALLEST, walkToReview } from "./onboarding-helpers";
import { SERVICES } from "../lib/services";

/**
 * THE WHOLE FORM, END TO END, FOR EACH SERVICE: a client who answers only what
 * is required walks from the first screen to the review screen, at a phone
 * width and a desktop width, with nothing wider than the screen and nothing
 * under 44px on any screen on the way. Nothing is saved (isolate).
 */
for (const service of SERVICES) {
  for (const [width, height] of [[390, 844], [1280, 900]] as const) {
    test(`${service.slug}: the smallest job reaches the review at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height });
      await isolate(page);
      await seedDraft(page, { service: service.slug, step: 0 });
      await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".ob__fields")).toBeVisible({ timeout: 60_000 });

      const answers = { ...PERSON, ...SMALLEST[service.slug] };
      const screens = await walkToReview(page, answers);
      expect(screens.length, `screens: ${screens.join(" > ")}`).toBeGreaterThanOrEqual(5);
      expect(screens.length).toBeLessThanOrEqual(9);

      await expect(page.locator(".ob__review")).toBeVisible();
      await expect(page.locator(".ob__review")).toContainText("Moore Designs");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    });
  }
}
