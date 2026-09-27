import { expect, test } from "@playwright/test";

/**
 * The admin's guided tour, three tiers deep: a short welcome (nav only,
 * auto-offered once), the full cross-page walkthrough, and a page-only tour
 * on each of the six routes. Reached from the topbar's `?` launcher.
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

test("the welcome tour never appears before the dashboard's real numbers do", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  /* First eligible sign-in: offered, but only after the page underneath has
     already rendered -- never a blank dashboard behind a modal. */
  await expect(page.locator(".adDash__kpis")).toBeVisible();
  await expect(page.locator(".tourCard")).toHaveCount(0);
});

test("the welcome tour auto-offers once, walks the nav, and finishes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin", { waitUntil: "networkidle" });
  await expect(page.locator(".tourCard")).toBeVisible({ timeout: 4_000 });
  await expect(page.locator(".tourCard__headText b")).toHaveText("Welcome to the WDC admin");

  for (let i = 0; i < 20; i += 1) {
    const finish = page.getByRole("button", { name: /^finish$/i });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      break;
    }
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator(".tourCard")).toHaveCount(0);
  expect(errors, errors.join("\n")).toHaveLength(0);

  // Never offered a second time.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".tourCard")).toHaveCount(0, { timeout: 3_000 });
});

test("the full walkthrough, opened from the launcher, crosses every page and finishes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  /* One entry per step, and it is the step's OWN `href` -- the page it is
     already showing on, not the page the reader is about to click toward.
     An interactive nav step (`nav-clients`, `nav-projects`, ...) still
     carries the PREVIOUS page's href, because its `before` hook runs
     before that step is shown; the actual page change happens on the step
     AFTER it, whose own href is the new page. See `lib/tours/admin.ts`. */
  const expectedPages = [
    "/admin", "/admin", "/admin", "/admin", "/admin", "/admin", "/admin", "/admin", "/admin",
    "/admin/clients", "/admin/clients", "/admin/clients",
    "/admin/projects", "/admin/projects", "/admin/projects",
    "/admin/money", "/admin/money", "/admin/money",
    "/admin/forms",
    "/admin/forms/contact", "/admin/forms/contact",
    "/admin/blog", "/admin/blog", "/admin/blog",
    "/admin/settings",
    "/admin/settings/media", "/admin/settings/media", "/admin/settings/media", "/admin/settings/media",
  ];

  /* The last entry is the closing step, whose button reads "Finish", not
     "Next" -- clicked separately below rather than inside this loop. */
  for (let i = 0; i < expectedPages.length - 1; i += 1) {
    await page.waitForURL(new RegExp(`${expectedPages[i]}$`), { timeout: 8_000 });
    const button = page.getByRole("button", { name: /^next$/i });
    await expect(button).toBeVisible();
    await button.click();
  }
  await page.waitForURL(new RegExp(`${expectedPages[expectedPages.length - 1]}$`), { timeout: 8_000 });
  await page.getByRole("button", { name: /^finish$/i }).click();

  await expect(page.locator(".tourCard")).toHaveCount(0);
  expect(errors, errors.join("\n")).toHaveLength(0);

  // The launcher now offers a replay, not a repeat.
  await page.locator(".tourLauncher__btn").click();
  await expect(page.getByRole("menuitem", { name: /replay the full walkthrough/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^full platform walkthrough$/i })).toHaveCount(0);
});

test("an interactive step advances on a real click, not only on Next", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  // Step to "nav-clients", the first interactive stop.
  for (let i = 0; i < 8; i += 1) {
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(150);
  }
  await expect(page.locator(".tourCard__interact")).toBeVisible();
  await page.locator('[data-tour="nav-clients"]').click();
  await expect(page).toHaveURL(/\/admin\/clients$/);
  await expect(page.locator(".tourCard")).toBeVisible();
});

test("skipping records completion; the launcher offers to replay, not repeat", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.getByRole("button", { name: /skip tour/i }).click();
  await expect(page.locator(".tourCard")).toHaveCount(0);

  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".tourLauncher__btn").click();
  await expect(page.getByRole("menuitem", { name: /replay the full walkthrough/i })).toBeVisible();
});

test("Escape ends the tour outright, not just the current step", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".tourCard")).toHaveCount(0);
});

test("a page tour stays on one page and never offers Finish where the walkthrough would", async ({ page }) => {
  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  const launcher = page.locator(".tourLauncher__btn");
  await launcher.click();
  await page.getByRole("menuitem", { name: /^tour this page$/i }).click();

  await expect(page.locator(".tourCard")).toBeVisible();
  await page.getByRole("button", { name: /^next$/i }).click();
  await expect(page).toHaveURL(/\/admin\/clients$/);
  await expect(page.locator(".tourCard__headText span")).toHaveText(/Step 2 of 3/);
});

test("the four drill-down pages each have their own tour, matched by route template", async ({ page }) => {
  const routes: Array<[string, string]> = [
    ["/admin/clients/c1", "One client's record"],
    ["/admin/projects/p1", "One project, start to delivery"],
    ["/admin/money/i1", "One invoice"],
    ["/admin/money/reconciliation", "Where the books and the bank are asked to agree"],
  ];

  for (const [path, introTitle] of routes) {
    await page.goto(path, { waitUntil: "networkidle" });
    const launcher = page.locator(".tourLauncher__btn");
    await expect(launcher).toBeVisible();
    await launcher.click();
    const item = page.getByRole("menuitem", { name: /^tour this page$/i });
    await expect(item).toBeEnabled();
    await item.click();
    await expect(page.locator(".tourCard__headText b")).toHaveText(introTitle);

    // Click through to the end, tolerating an optional step's missing
    // target along the way, and confirm it ends cleanly: no leftover card,
    // no leftover blur band. Tries Finish first every round rather than
    // checking `isVisible` up front, which is a point-in-time read that
    // can miss the moment a skipped optional step swaps Next for Finish.
    for (let i = 0; i < 8; i += 1) {
      try {
        await page.getByRole("button", { name: /^finish$/i }).click({ timeout: 3_000 });
        break;
      } catch {
        await page.getByRole("button", { name: /^next$/i }).click({ timeout: 3_000 });
      }
    }
    await expect(page.locator(".tourCard")).toHaveCount(0);
    await expect(page.locator(".tourBlur")).toHaveCount(0, { timeout: 3_000 });
  }
});

test("blog, support, a form, an entry, media and the settings overview each have a page tour", async ({ page }) => {
  await page.goto("/admin/forms/contact", { waitUntil: "networkidle" });
  const entry = await page.locator('a[href*="/admin/forms/contact/entries/"]').first().getAttribute("href").catch(() => null);
  const routes: Array<[string, string]> = [
    ["/admin/blog", "The blog"],
    ["/admin/clients/support", "Support"],
    ["/admin/forms/contact", "One form"],
    ["/admin/settings/media", "The media library"],
    ["/admin/settings", "Settings"],
    ...(entry ? [[entry.split("?")[0], "One entry"] as [string, string]] : []),
  ];
  for (const [path, introTitle] of routes) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^(tour this page|replay this page's tour)$/i }).click();
    await expect(page.locator(".tourCard__headText b"), path).toHaveText(introTitle);
    for (let i = 0; i < 8; i += 1) {
      try {
        await page.getByRole("button", { name: /^finish$/i }).click({ timeout: 3_000 });
        break;
      } catch {
        await page.getByRole("button", { name: /^next$/i }).click({ timeout: 3_000 });
      }
    }
    await expect(page.locator(".tourCard"), path).toHaveCount(0);
    expect(new URL(page.url()).pathname, "a page tour never leaves its page").toBe(path);
    /* And it ends back at the top of that page, not on the dashboard. */
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: `${path} ends at the top` }).toBeLessThan(4);
  }
});

test("an optional step's missing target never ends the tour early", async ({ page }) => {
  // c1 has no credit balance, so the client workspace tour's "credit" step
  // has nothing to spotlight -- it must skip straight to "payments" (the
  // step placed after it on purpose) rather than closing the tour on it.
  await page.goto("/admin/clients/c1", { waitUntil: "networkidle" });
  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /^tour this page$/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.getByRole("button", { name: /^next$/i }).click(); // projects
  await page.getByRole("button", { name: /^next$/i }).click(); // invoices
  await page.getByRole("button", { name: /^next$/i }).click(); // credit (missing) -> skips
  await expect(page.locator(".tourCard__headText b")).toHaveText("What they have actually paid", { timeout: 8_000 });
  await expect(page.getByRole("button", { name: /^finish$/i })).toBeVisible();
});

test("a step whose target has vanished is skipped, not a stuck tour", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector('[data-tour="clients-add"]')?.removeAttribute("data-tour"));
  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /^tour this page$/i }).click();
  await expect(page.locator(".tourCard")).toBeVisible();

  await page.getByRole("button", { name: /^next$/i }).click();
  // The second step's target no longer exists; the tour must recover on
  // its own within a few seconds rather than sit on a dead target forever.
  await expect(page.locator(".tourCard__headText b")).toHaveText("Search and filter", { timeout: 8_000 });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("the card is themed by the admin's own tokens, in both themes", async ({ page }) => {
  await page.goto("/admin/clients", { waitUntil: "networkidle" });

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /^tour this page$/i }).click();
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
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
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
