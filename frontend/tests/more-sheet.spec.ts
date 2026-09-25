import { expect, test, type Page } from "@playwright/test";

/**
 * The phone's More sheet keeps its theme switch and Sign out reachable on a
 * short screen. They sat in a list the sheet's flex column was allowed to
 * shrink, and on a phone it shrank to its two borders: a line under Media
 * and nothing after it (the owner's screenshot, 2026-09-25).
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 390, height: 667 }, hasTouch: true, isMobile: true });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the theme switch and Sign out are at the end of More, full size, and the switch works", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "More" }).click();
  const sheet = page.getByRole("dialog", { name: "More" });
  const theme = sheet.getByRole("button", { name: "Switch to dark theme" });
  const out = sheet.getByRole("button", { name: "Sign out" });

  await sheet.locator(".ad__sheetBody").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  for (const row of [theme, out]) {
    await expect(row).toBeInViewport();
    expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  /* Back to top is the page's, and must not sit over the sheet. */
  await expect(page.locator(".st")).toBeHidden();

  await theme.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(sheet.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});
