import { expect, test } from "@playwright/test";

const browserDraft = {
  started: true,
  service: "web",
  step: 1,
  answers: {},
};

test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
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

test("uses a plain list for short selects and lets clients revise an unsure answer", async ({ page }) => {
  await page.goto("/onboarding");

  const pageCount = page.locator('[data-field="page_count"]');
  await pageCount.getByRole("combobox").click();
  await expect(pageCount.getByRole("searchbox")).toHaveCount(0);
  const popupZ = await pageCount.locator(".pk__pop").evaluate((element) => Number(getComputedStyle(element).zIndex));
  const fabZ = await page.locator(".st").evaluate((element) => Number(getComputedStyle(element).zIndex));
  expect(popupZ).toBeGreaterThan(fabZ);
  await pageCount.getByRole("option", { name: "6–15" }).click();
  await expect(pageCount.getByRole("combobox")).toContainText("6–15");

  const featureField = page.locator('[data-field="features"]');
  await featureField.getByRole("button", { name: "I'm not sure; please advise me" }).click();
  await expect(featureField.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await featureField.getByRole("button", { name: "Actually, let me answer this" }).click();
  await featureField.getByRole("checkbox", { name: "Gallery" }).click();
  await expect(featureField.getByRole("checkbox", { name: "Gallery" })).toHaveAttribute("aria-checked", "true");
  await expect(featureField.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
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
