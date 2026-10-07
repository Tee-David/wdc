import { expect, test } from "@playwright/test";
import { FIELD_EXAMPLES, OPTION_HELP } from "@/lib/onboarding-help";
import { isVisible, stepsFor } from "@/lib/onboarding";
import { SERVICES } from "@/lib/services";

/* Help the help file still carries for questions the step lists have since cut
   or renamed (7 October redesign). They are named here so the test fails the day
   any NEW help drifts from its field, and again when one of these is fixed; then
   take it off this list. The cleanup itself is in lib/onboarding-help.ts. */
const RETIRED_HELP = [
  "tools_access",
  "features/Online store", "features/Bookings", "features/Gallery", "features/Members area",
  "platforms/iOS", "platforms/Android",
];
const RETIRED_EXAMPLES = ["tools_access", "has_hosting", "access_ok"];

test("service help stays attached to stable fields and choices", () => {
  const fields = SERVICES.flatMap((service) => stepsFor(service.slug).flatMap((step) => step.fields));
  const stale: string[] = [];
  for (const [key, options] of Object.entries(OPTION_HELP)) {
    const field = fields.find((field) => field.key === key);
    if (!field) stale.push(key);
    else for (const option of Object.keys(options)) if (!field.options?.includes(option)) stale.push(`${key}/${option}`);
  }
  expect(stale.sort()).toEqual([...RETIRED_HELP].sort());
  const staleExamples = Object.keys(FIELD_EXAMPLES).filter((key) => !fields.some((field) => field.key === key));
  expect(staleExamples.sort()).toEqual([...RETIRED_EXAMPLES].sort());
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

/* The colour question, rewritten for the research flow (decision 21). This keeps
   the rendering check at every width; every path through it is in
   onboarding-colours.spec.ts. The step index is the colour screen of Branding
   for a full brand, counted the way the form counts its visible screens. */
const colourScreen = stepsFor("branding")
  .filter((step) => step.fields.some((field) => isVisible(field, { job_size: "A full brand" })))
  .findIndex((step) => step.id === "branding_colours");

for (const theme of ["light", "dark"]) for (const width of [320, 390, 768, 1440]) {
  test(`colour preferences stay usable at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(({ theme, step }) => {
      localStorage.setItem("theme", theme);
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, service: "branding", step, answers: { job_size: "A full brand" } }));
    }, { theme, step: colourScreen });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const field = page.locator('[data-field="brand_colours"]');
    await expect(field).toBeVisible({ timeout: 30000 });
    await expect(field.locator("label.obCol__card")).toHaveCount(6);
    await field.locator("label.obCol__card", { hasText: "Warm and friendly" }).click();
    await expect(field.getByRole("button", { name: "Yes, use these" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`colours-${theme}-${width}.png`), fullPage: true });
    for (const button of await field.locator("button:visible").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height, `${await button.getAttribute("class")}: ${await button.textContent()}`).toBeGreaterThanOrEqual(43);
    }
    await field.getByRole("button", { name: "Show me another" }).click();
    await expect(field.getByText("2 of 3")).toBeVisible();
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
    if (await page.locator(".ob--board").count()) {
      const card = page.locator(".obb__card.is-open");
      await expect.poll(async () => (await card.boundingBox())?.y ?? Infinity).toBeLessThan(160);
      expect((await card.boundingBox())?.y).toBeGreaterThanOrEqual(72);
    } else {
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
    }
    await expect(page.locator(".ob")).toBeFocused();
  });
}

for (const service of SERVICES) {
  test(`${service.name} explains its service choices on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    const steps = stepsFor(service.slug);
    const step = steps.findIndex((step) => step.fields.some((field) => FIELD_EXAMPLES[field.key] && field.key !== "has_brandbook" && !field.showIf));
    const field = steps[step].fields.find((field) => FIELD_EXAMPLES[field.key] && field.key !== "has_brandbook" && !field.showIf)!;
    await page.addInitScript(({ service, step }) => {
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, service, step, answers: {} }));
    }, { service: service.slug, step });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const question = page.locator(`[data-field="${field.key}"]`);
    await expect(question).toBeVisible({ timeout: 30000 });
    await question.locator(".tip__b").click();
    await expect(page.locator(".obExample")).toContainText(FIELD_EXAMPLES[field.key].title);
    const panel = page.locator(".tip__p");
    const bounds = await panel.boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(391);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await panel.getByRole("button").click();
    await expect(panel).toHaveCount(0);
  });
}

test.describe("native touch navigation", () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  test("a tap on Next reveals the new section without desktop scroll interception", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, service: "branding", step: 1, answers: { brand_state: "Nothing yet" } })));
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const next = page.locator(".ob__stepNext").first();
    await expect(next).toBeVisible({ timeout: 30000 });
    await next.scrollIntoViewIfNeeded();
    await next.tap();
    if (await page.locator(".ob--board").count()) {
      await expect.poll(async () => (await page.locator(".obb__card.is-open").boundingBox())?.y ?? Infinity).toBeLessThan(160);
      expect((await page.locator(".obb__card.is-open").boundingBox())?.y).toBeGreaterThanOrEqual(72);
    } else await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
    expect(await page.evaluate(() => Boolean(window.__lenis))).toBeFalsy();
  });
});
