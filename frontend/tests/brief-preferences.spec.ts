import { expect, test } from "@playwright/test";
import { FIELD_EXAMPLES, OPTION_HELP } from "@/lib/onboarding-help";
import { stepsFor } from "@/lib/onboarding";
import { SERVICES } from "@/lib/services";

test("service help stays attached to stable fields and choices", () => {
  const fields = SERVICES.flatMap((service) => stepsFor(service.slug).flatMap((step) => step.fields));
  for (const [key, options] of Object.entries(OPTION_HELP)) {
    const field = fields.find((field) => field.key === key);
    expect(field, `help for existing field ${key}`).toBeTruthy();
    for (const option of Object.keys(options)) expect(field?.options).toContain(option);
  }
  for (const key of Object.keys(FIELD_EXAMPLES)) expect(fields.some((field) => field.key === key)).toBeTruthy();
  for (const service of SERVICES) expect(stepsFor(service.slug).some((step) => step.fields.some((field) => FIELD_EXAMPLES[field.key] && field.key !== "has_brandbook"))).toBeTruthy();
});

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(30000);
  // This suite exercises rendering only; it cannot save a draft or send a message.
  await page.route("**/api/onboarding/**", (route) => route.fulfill({ status: 503, json: { error: "Isolated rendering check; writes disabled." } }));
  await page.route(/jotfor|userway/i, (route) => route.abort());
});

test("welcome uses the shared compact service picker and an explicit next step", async ({ page }) => {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const picker = page.locator("#ob-service");
  await expect(picker).toHaveAttribute("aria-expanded", "false", { timeout: 30000 });
  await picker.click();
  await expect(page.getByRole("option")).toHaveCount(6);
  await page.getByRole("option", { name: /Branding/ }).click();
  await expect(picker).toContainText("Branding");
  await expect(page.locator(".ob__svcCard")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
});

for (const theme of ["light", "dark"]) for (const width of [320, 390, 768, 1440]) {
  test(`colour preferences stay usable at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(({ theme }) => {
      localStorage.setItem("theme", theme);
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, service: "branding", step: 3, answers: { has_brandbook: "Yes" } }));
    }, { theme });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const field = page.locator('[data-field="brand_colours"]');
    await expect(field).toBeVisible({ timeout: 30000 }); // Preferences remain available with a guide.
    await field.locator("summary").click();
    for (let index = 0; index < 5; index++) await field.getByRole("button", { name: "Add a colour", exact: true }).click();
    await expect(field.getByRole("button", { name: "Add a colour", exact: true })).toBeDisabled();
    await field.getByPlaceholder("e.g. Deep green").first().fill("A long descriptive colour name for our brand");
    await field.getByPlaceholder("#336699").first().fill("#abc");
    await field.getByRole("button", { name: /Choose shade for A long/ }).click();
    await expect(field.getByRole("slider", { name: "Hue", exact: true })).toBeVisible();
    await field.getByRole("slider", { name: "Hue", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`colours-${theme}-${width}.png`), fullPage: true });
    for (const button of await field.locator("button:visible").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height, `${await button.getAttribute("class")}: ${await button.textContent()}`).toBeGreaterThanOrEqual(43);
    }
    await field.getByRole("button", { name: "Done choosing shade" }).click();
    await field.getByRole("button", { name: /Remove A long/ }).click();
    await expect(field.locator(".obColours__row")).toHaveCount(4);
    await field.getByRole("button", { name: "Please recommend colours" }).click();
    await expect(field.getByRole("button", { name: "Let me choose colours" })).toHaveAttribute("aria-pressed", "true");
    await field.getByRole("button", { name: "Add a colour", exact: true }).click();
    await field.getByPlaceholder("e.g. Deep green").fill("Green");
    await expect(field.getByRole("button", { name: "Please recommend colours" })).toHaveAttribute("aria-pressed", "false");
  });
}

for (const width of [320, 1440]) {
  test(`next opens the following section at the top at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.addInitScript(() => {
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, service: "branding", step: 1, answers: { brand_state: "Nothing yet" } }));
    });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const next = page.locator(".ob__stepNext").first();
    await expect(next).toBeVisible({ timeout: 30000 });
    await next.scrollIntoViewIfNeeded();
    await next.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
    await expect(page.locator(".ob")).toBeFocused();
  });
}
