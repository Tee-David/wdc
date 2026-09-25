import { expect, test, type Page } from "@playwright/test";

/**
 * EVERY STEP IS IN VIEW WHEN ITS CARD APPEARS: the highlighted element sits
 * below the sticky header and above the phone's tab bar, so nobody has to
 * scroll to find what the tour is talking about. Walked on a phone and on a
 * short desktop window, where the most targets start off screen.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ timeout: 240_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

async function walk(page: Page, baseURL?: string) {
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(1_500);
  const skip = page.getByRole("button", { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.locator(".tourLauncher__btn").first().click();
  await page.getByRole("menuitem", { name: /walkthrough/i }).first().click();

  const out: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    await expect(page.locator(".tourCard")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(250);
    const where = await page.evaluate(() => {
      const t = document.documentElement.dataset.tourTarget ?? "body";
      if (t === "body") return null;
      const el = document.querySelector(t);
      if (!el) return { t, missing: true };
      if (el.closest(".ad__topbar, .ad__tabs, .ad__side")) return null;
      const r = el.getBoundingClientRect();
      const top = document.querySelector(".ad__topbar")?.getBoundingClientRect().bottom ?? 0;
      const tabs = document.querySelector(".ad__tabs");
      const bar = tabs && getComputedStyle(tabs).display !== "none" ? tabs.querySelector(".ad__tabsBar") : null;
      const foot = bar ? bar.getBoundingClientRect().top : window.innerHeight;
      /* A target taller than the band only has to start inside it. */
      const ok = r.top >= top - 1 && (r.bottom <= foot + 1 || r.height > foot - top);
      return { t, ok, top: Math.round(r.top), bottom: Math.round(r.bottom), band: [Math.round(top), Math.round(foot)] };
    });
    if (where && !where.missing && !where.ok) out.push(JSON.stringify(where));
    const finish = page.getByRole("button", { name: /^finish$/i });
    if (await finish.isVisible().catch(() => false)) { await finish.click(); break; }
    await page.getByRole("button", { name: /^next$/i }).click();
  }
  return out;
}

test("on a phone, every step's target is in view", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await walk(page, baseURL)).toEqual([]);
});

test("on a short desktop window, every step's target is in view", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1366, height: 640 });
  expect(await walk(page, baseURL)).toEqual([]);
});
