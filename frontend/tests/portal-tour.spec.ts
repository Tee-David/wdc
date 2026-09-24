import { expect, test } from "@playwright/test";

/**
 * The client portal's tours: the short welcome, offered once on the
 * overview, and the full walkthrough from the `?` launcher, which has to
 * reach every portal section and land every step on a real target.
 *
 * Same door as the admin specs: the capture token acts as seeded client c1.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 150_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

/* A cold dev server compiles a page on its first request, which takes longer
   than the three seconds the runtime waits for a step's target; the step is
   then skipped as missing. Compile every stop before anything is walked. */
test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(180_000);
  const base = baseURL ?? "http://localhost:3100";
  for (const path of ["/portal", "/portal/projects", "/portal/billing", "/portal/support", "/portal/settings"]) {
    await fetch(`${base}${path}`, { headers: { "x-boneyard-capture": TOKEN ?? "", cookie: "wdc.session_token=placeholder" } }).catch(() => undefined);
  }
});

async function walk(page: import("@playwright/test").Page, max = 20) {
  const seen: string[] = [];
  for (let i = 0; i < max; i += 1) {
    await expect(page.locator(".tourCard")).toBeVisible();
    seen.push(`${new URL(page.url()).pathname} ${await page.locator(".tourCard__headText b").innerText()}`);
    const finish = page.getByRole("button", { name: /^finish$/i });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      return seen;
    }
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(200);
  }
  throw new Error(`The tour did not finish in ${max} steps:\n${seen.join("\n")}`);
}

test("the welcome is offered once on the overview, and only to a client", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/portal", { waitUntil: "networkidle" });
  await expect(page.locator(".tourCard")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".tourCard__headText b")).toHaveText("Welcome to your WDC portal");
  const seen = await walk(page);
  expect(seen.some((s) => s.includes("Projects"))).toBe(true);
  expect(seen.some((s) => /admin/i.test(s))).toBe(false);
  expect(errors, errors.join("\n")).toHaveLength(0);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".tourCard")).toHaveCount(0, { timeout: 3_000 });
});

test("the full walkthrough crosses every portal section and ends at home", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/portal", { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();

  await page.locator(".tourLauncher__btn").click();
  await page.getByRole("menuitem", { name: /full platform walkthrough/i }).click();
  const seen = await walk(page);

  for (const path of ["/portal/projects", "/portal/billing", "/portal/support", "/portal/settings"]) {
    expect(seen.some((s) => s.startsWith(`${path} `)), `never reached ${path}:\n${seen.join("\n")}`).toBe(true);
  }
  /* Every stop is on screen: the page-level steps are all present. */
  for (const title of ["What needs you", "Review and approve", "Invoices and payments", "Questions and replies", "What we email you about"]) {
    expect(seen.some((s) => s.endsWith(title)), `missing "${title}":\n${seen.join("\n")}`).toBe(true);
  }
  await expect(page).toHaveURL(/\/portal$/);
  expect(errors, errors.join("\n")).toHaveLength(0);
});
