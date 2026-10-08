import { expect, test } from "@playwright/test";
import { pickService } from "./onboarding-helpers";

/**
 * A CLIENT WHO PICKED THE WRONG SERVICE CAN GO BACK AND PICK AGAIN.
 *
 * Step one had no Back, and the only way out of a chosen service was "Start
 * over" on the review page, which wipes the draft: the whole form had to be
 * finished to reach the picker. "Back to the onboarding menu" returns to the picker with
 * every answer kept.
 */
test("the first step can go back to the service picker without losing what was typed", async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
  });
  await page.goto("/onboarding", { waitUntil: "load" });

  await pickService(page, /Web/);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const first = page.getByLabel(/first name/i).first();
  await first.fill("Ada");
  await page.getByLabel(/^your email|^email/i).first().fill("ada@example.org");

  await page.getByRole("button", { name: /Back to the onboarding menu/ }).click();
  await expect(page.getByRole("heading", { name: /Let.s get started/ })).toBeVisible();

  await pickService(page, /Branding/);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByLabel(/first name/i).first()).toHaveValue("Ada");
  await expect(page.getByLabel(/^your email|^email/i).first()).toHaveValue("ada@example.org");
});
