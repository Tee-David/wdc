import { expect, test, type Page } from "@playwright/test";

/**
 * The phone's menu keeps its theme switch and Sign out reachable on a short
 * screen. It was the bottom bar's More sheet, whose list shrank to its two
 * borders on a phone (the owner's screenshot, 2026-09-25); phones use the
 * sidebar as a drawer now (AGENTS.md), and the promise moved with it.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 667 }, hasTouch: true, isMobile: true });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the theme switch and Sign out are in the phone's menu, full size, and the switch works", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open the menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Admin menu" });
  await expect(drawer).toBeVisible();
  const theme = drawer.getByRole("button", { name: "Switch to dark theme" });
  const out = drawer.getByRole("button", { name: "Sign out" });

  for (const row of [theme, out]) {
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeInViewport();
    const box = (await row.boundingBox())!;
    expect(Math.min(box.height, box.width)).toBeGreaterThanOrEqual(40);
  }
  /* Back to top is the page's, and must not sit over the menu. */
  await expect(page.locator(".st")).toBeHidden();

  await theme.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(drawer.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});
