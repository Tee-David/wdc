import { expect, test } from "@playwright/test";

const browserDraft = {
  started: true,
  service: "web",
  step: 1,
  answers: {},
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((draft) => {
    localStorage.setItem("wdc-onboarding-draft", JSON.stringify(draft));
  }, browserDraft);
});

test("uses client-facing choices and reveals Other details only when needed", async ({ page }) => {
  await page.goto("/onboarding");

  const featureField = page.locator('[data-field="features"]');
  const otherDetail = page.locator('[data-field="features_other"]');
  await expect(otherDetail).toHaveCount(0);
  await featureField.getByRole("checkbox", { name: "Other", exact: true }).click();
  await expect(otherDetail).toBeVisible();
  await expect(otherDetail.getByText("What other feature do you need?")).toBeVisible();

  await expect(page.getByRole("button", { name: "I'm not sure; please advise me" }).first()).toBeVisible();
  await expect(page.locator('[data-field="page_count"] [role="combobox"]')).toBeVisible();
});

test("pulses the single progress bar unless reduced motion is requested", async ({ page }) => {
  await page.goto("/onboarding");
  const fill = page.locator(".ob__progress > span");
  await expect(fill).toBeVisible();
  await expect.poll(() => fill.evaluate((element) => getComputedStyle(element, "::after").animationName))
    .toBe("ob-progress-pulse");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => fill.evaluate((element) => getComputedStyle(element, "::after").animationName))
    .toBe("none");
});
