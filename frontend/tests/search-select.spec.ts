import { expect, test } from "@playwright/test";

/**
 * A LONG OR GROWING CHOICE IS SEARCHABLE (components/admin/search-select.tsx):
 * a client, a project or an invoice is picked by typing, from a list that
 * scrolls; on a phone it is a bottom sheet. The value posts like a select's.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

async function openBillTo(page: import("@playwright/test").Page) {
  await page.goto("/admin/money", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New invoice" }).first().click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: /^Bill to/ }).first().click();
  return dialog;
}

test("typing narrows the clients, and Enter chooses one", async ({ page }) => {
  const dialog = await openBillTo(page);
  const search = dialog.getByRole("combobox");
  await expect(search).toBeFocused();
  await search.fill("marf");
  const options = dialog.getByRole("option");
  await expect(options).toHaveCount(1);
  await expect(options.first()).toHaveText(/Marfaa Foods/);
  await search.press("Enter");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(dialog.locator('input[type="hidden"][name="clientId"]')).toHaveValue("c2");
  await expect(dialog.locator(".adPick__btn").first()).toContainText("Marfaa Foods");
});

test("a search with no match says so", async ({ page }) => {
  const dialog = await openBillTo(page);
  await dialog.getByRole("combobox").fill("zzzz nobody");
  await expect(dialog.getByText(/No matches for/)).toBeVisible();
});

test("on a phone the list is a bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openBillTo(page);
  const pop = dialog.locator(".adPick__pop");
  const box = (await pop.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(840);
  expect(Math.round(box.width)).toBe(390);
  expect(await dialog.locator(".adPick__list").evaluate((l) => getComputedStyle(l).overflowY)).toBe("auto");
});

test("the project list follows the client chosen in the picker", async ({ page }) => {
  const dialog = await openBillTo(page);
  await dialog.getByRole("combobox").fill("moore");
  await dialog.getByRole("combobox").press("Enter");
  await dialog.getByRole("button", { name: /^Against/ }).first().click();
  await expect(dialog.getByRole("option", { name: "Identity system" })).toBeVisible();
  await expect(dialog.getByRole("option", { name: "Always-on social" })).toHaveCount(0);
});
