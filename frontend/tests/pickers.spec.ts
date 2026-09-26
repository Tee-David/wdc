import { expect, test, type Page } from "@playwright/test";

/**
 * The admin's own select, calendar and date-and-time pickers
 * (components/admin/pick.tsx), which replaced the browser's: they post what
 * the native controls posted, work from the keyboard, and inside a dialog
 * neither Enter nor Escape on the picker closes the dialog around it.
 *
 * Needs the dev server started with BONEYARD_CAPTURE_TOKEN set.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 120_000 });

async function open(page: Page, path: string, width = 1280) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: "networkidle" });
}

test("a filter select opens a list, takes arrows and letters, and posts the value", async ({ page }) => {
  await open(page, "/admin/projects");
  const stage = page.getByRole("button", { name: "Stage", exact: true }).filter({ visible: true });
  await stage.focus();
  await page.keyboard.press("ArrowDown");
  const list = page.getByRole("listbox");
  await expect(list).toBeFocused();
  /* "d" jumps to Discovery, as a native list would. */
  await page.keyboard.press("d");
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(stage).toBeFocused();
  await expect(stage).toContainText("Discovery");
  await page.getByRole("button", { name: "Apply" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/stage=Discovery/);
  await expect(page.getByRole("button", { name: "Stage", exact: true }).filter({ visible: true })).toContainText("Discovery");
});

test("the calendar picks a date from the keyboard inside a dialog, and Escape closes only the calendar", async ({ page }) => {
  await open(page, "/admin/money");
  await page.getByRole("button", { name: /New invoice/ }).filter({ visible: true }).first().click();
  const dialog = page.locator("dialog[open]");
  const due = dialog.getByLabel(/^Due/);
  const before = await dialog.locator('input[name="due"]').inputValue();
  expect(before).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await due.click();
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(grid).toHaveCount(0);
  await expect(dialog).toBeVisible();
  const next = new Date(Date.parse(`${before}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  await expect(dialog.locator('input[name="due"]')).toHaveValue(next);

  /* Next month by Page Down, then close with Escape: the dialog stays. */
  await due.click();
  await page.keyboard.press("PageDown");
  await expect(page.locator(".adCal__title")).not.toHaveText(/^$/);
  await page.keyboard.press("Escape");
  await expect(grid).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="due"]')).toHaveValue(next);
});

test("the title walks up to months and years, so a date years away is four clicks", async ({ page }) => {
  await open(page, "/admin/money");
  await page.getByRole("button", { name: /New invoice/ }).filter({ visible: true }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByLabel(/^Due/).click();
  const cal = page.locator(".adPick__pop.adCal");
  await cal.locator(".adCal__title").click();
  await cal.locator(".adCal__title").click();
  await cal.getByRole("button", { name: "2024", exact: true }).click();
  await cal.getByRole("button", { name: "March 2024" }).click();
  await cal.getByRole("button", { name: /^\w+day, 15 March 2024$/ }).click();
  await expect(dialog.locator('input[name="due"]')).toHaveValue("2024-03-15");
  /* Escape from the month view goes back to the days, not out of the picker. */
  await dialog.getByLabel(/^Due/).click();
  await cal.locator(".adCal__title").click();
  await page.keyboard.press("Escape");
  await expect(cal.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
});

test("on a phone the calendar is a sheet with no sideways scroll", async ({ page }) => {
  await open(page, "/admin/money", 320);
  await page.getByRole("button", { name: /New invoice/ }).filter({ visible: true }).first().click();
  await page.locator("dialog[open]").getByLabel(/^Due/).click();
  const sheet = page.locator(".adPick__pop.adCal");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box!.x).toBe(0);
  expect(box!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const day = await page.locator(".adCal__day").first().boundingBox();
  expect(day!.height).toBeGreaterThanOrEqual(40);
});
