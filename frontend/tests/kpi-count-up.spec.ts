import { expect, test, type Page } from "@playwright/test";

/**
 * Settings owns an absolutely positioned character counter. Its CSS remains
 * in the document after a client navigation, so the KPI counter must not share
 * that counter's global class name or the real server-rendered figure moves
 * out of its tile until a full refresh clears the Settings stylesheet.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ timeout: 120_000 });

async function openFromPhoneMenu(page: Page, name: "Dashboard" | "Money") {
  const menu = page.getByRole("button", { name: "Open the menu" });
  const drawer = page.locator("dialog.adDrawer[open]");
  /* A development compile can paint the server button before React owns it.
     Retry the harmless opener until the drawer proves hydration has landed. */
  await expect.poll(async () => {
    if (await drawer.isVisible()) return true;
    await menu.click();
    return drawer.isVisible();
  }, { timeout: 60_000 }).toBe(true);
  await drawer.getByRole("link", { name: new RegExp(`^${name}`) }).click();
}

async function expectEveryTileFigure(page: Page) {
  const figures = page.locator(".ad__tile dd > span:first-child");
  await expect(figures.first()).toBeVisible({ timeout: 60_000 });
  const readings = await figures.evaluateAll((nodes) => nodes.map((node) => ({
    text: node.textContent?.trim() ?? "",
    position: getComputedStyle(node).position,
    box: node.getBoundingClientRect().toJSON(),
    parent: node.parentElement?.getBoundingClientRect().toJSON(),
  })));
  expect(readings.length).toBeGreaterThan(0);
  for (const reading of readings) {
    expect(reading.text).not.toBe("");
    expect(reading.position).not.toBe("absolute");
    expect(reading.box.width).toBeGreaterThan(0);
    expect(reading.box.left).toBeGreaterThanOrEqual(reading.parent!.left - 1);
    expect(reading.box.right).toBeLessThanOrEqual(reading.parent!.right + 1);
  }
}

for (const destination of ["Dashboard", "Money"] as const) {
  test(`KPI figures stay in their tiles after a client navigation from Settings to ${destination}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
    await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    await openFromPhoneMenu(page, destination);
    await expectEveryTileFigure(page);
  });
}
