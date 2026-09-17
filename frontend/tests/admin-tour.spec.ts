import { expect, test } from "@playwright/test";

/**
 * The admin's guided tour: one full walkthrough that crosses six pages, and
 * a short page-only tour on each of them.
 *
 * HOW IT GETS IN. Same door as `admin-actions.spec.ts` --
 * `BONEYARD_CAPTURE_TOKEN` on the server under test plus the matching
 * header, because the admin is behind a session this sandbox has no
 * database to seed one in. Skips rather than failing when the token is
 * absent, for the same reason that file does.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

test("the tour never appears before the dashboard's real numbers do", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  /* First eligible sign-in: offered, but only after the page underneath has
     already rendered -- never a blank dashboard behind a modal. */
  await expect(page.locator(".adDash__kpis")).toBeVisible();
  await expect(page.locator(".tourCard")).toHaveCount(0);
});

test("the full walkthrough crosses all six pages and finishes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.locator(".ad__avatar").click();
  await page.getByRole("menuitem", { name: /take a tour/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  const expectedPages = [
    "/admin", "/admin", "/admin", "/admin",
    "/admin/clients", "/admin/clients",
    "/admin/projects", "/admin/projects",
    "/admin/money", "/admin/money",
    "/admin/forms", "/admin/settings", "/admin/settings",
  ];

  for (let i = 0; i < expectedPages.length; i += 1) {
    await page.waitForURL(new RegExp(`${expectedPages[i]}$`), { timeout: 8_000 });
    const isLast = i === expectedPages.length - 1;
    const button = page.getByRole("button", { name: isLast ? /^finish$/i : /^next$/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  await expect(page.locator(".tourCard")).toHaveCount(0);
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("skipping records completion; the account menu offers to replay, not repeat", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.locator(".ad__avatar").click();
  await page.getByRole("menuitem", { name: /take a tour/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.getByRole("button", { name: /skip tour/i }).click();
  await expect(page.locator(".tourCard")).toHaveCount(0);

  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".ad__avatar").click();
  await expect(page.getByRole("menuitem", { name: /replay the tour/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^take a tour$/i })).toHaveCount(0);
});

test("Escape ends the tour outright, not just the current step", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.locator(".ad__avatar").click();
  await page.getByRole("menuitem", { name: /take a tour/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".tourCard")).toHaveCount(0);
});

test("a page tour stays on one page and never offers Finish where the full tour would", async ({ page }) => {
  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  const launcher = page.getByRole("button", { name: /tour this page/i });
  await expect(launcher).toBeVisible();
  await launcher.click();

  await expect(page.locator(".tourCard")).toBeVisible();
  await page.getByRole("button", { name: /^next$/i }).click();
  await expect(page).toHaveURL(/\/admin\/clients$/);
  await expect(page.locator(".tourCard__progress")).toHaveText("2 of 3");
});

test("a step whose target has vanished is skipped, not a stuck tour", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector('[data-tour="clients-add"]')?.removeAttribute("data-tour"));
  await page.getByRole("button", { name: /tour this page/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.getByRole("button", { name: /^next$/i }).click();
  // The second step's target no longer exists; the tour must recover on
  // its own within a few seconds rather than sit on a dead target forever.
  await expect(page.locator(".tourCard__head b")).toHaveText("Search and filter", { timeout: 8_000 });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("the card is themed by the admin's own tokens, in both themes", async ({ page }) => {
  await page.goto("/admin/clients", { waitUntil: "networkidle" });

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.getByRole("button", { name: /tour this page/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();
  const light = await page.locator(".tourCard").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(light).toBe("rgb(255, 255, 255)");

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const dark = await page.locator(".tourCard").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).toBe("rgb(14, 14, 46)");
  expect(dark).not.toBe(light);
});

test("no admin route scrolls sideways with a tour open, at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.locator(".ad__avatar").click();
  await page.getByRole("menuitem", { name: /take a tour/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  /* Not `scrollWidth - clientWidth`: `.ad`/`.ad__main` clip horizontally on
     purpose, and Chromium still counts clipped content toward `scrollWidth`
     -- see the comment in `admin-responsive.spec.ts`, which this mirrors. */
  const moved = await page.evaluate(() => {
    const before = window.scrollX;
    window.scrollTo(600, window.scrollY);
    const delta = window.scrollX - before;
    window.scrollTo(before, window.scrollY);
    return delta;
  });
  expect(moved).toBe(0);
});
