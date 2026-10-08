import { expect, test } from "@playwright/test";
import { isolate, PERSON, seedDraft } from "./onboarding-helpers";

/**
 * A draft saved before the redesign still opens with its answers showing in
 * the current questions, so a client who comes back is not asked again for
 * something they already said (the admin reads old briefs the same way, through
 * lib/onboarding-aliases.ts).
 */
test("an old Apps draft shows its platforms ticked", async ({ page }) => {
  await isolate(page);
  await seedDraft(page, { service: "apps", step: 2, answers: { ...PERSON, platforms: ["iOS", "Android"], app_size: "Small" } });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const q = page.locator('[data-field="platforms"]');
  await expect(q).toBeVisible({ timeout: 60_000 });
  await expect(q.getByRole("checkbox", { name: /^iPhone/ })).toHaveAttribute("aria-checked", "true");
  await expect(q.getByRole("checkbox", { name: /^Android phone/ })).toHaveAttribute("aria-checked", "true");
});

test("an old Social draft shows its ad budget and the new not sure wording", async ({ page }) => {
  await isolate(page);
  await seedDraft(page, {
    service: "social", step: 3,
    answers: { ...PERSON, social_size: "Small", social_packages: ["Paid ads"], ad_spend: "₦100k–₦500k", access_ok: "I can give WDC access" },
  });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-field="ad_spend"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-field="ad_spend"] [role="combobox"]')).toContainText("₦100k to ₦500k");
  await expect(page.locator('[data-field="social_access"] [role="combobox"]')).toContainText("I have them and can add you");
});
