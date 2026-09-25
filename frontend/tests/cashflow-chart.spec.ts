import { expect, test } from "@playwright/test";

/** The cashflow chart answers hover and the keyboard, and has a table view. */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

test("hover, arrow keys and the table all give the month's figures", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/money", { waitUntil: "networkidle" });
  const months = page.getByRole("group", { name: "Collected and spent by month" }).first().getByRole("button");
  await expect(months).toHaveCount(6);
  await months.nth(2).hover();
  await expect(page.locator(".adDash__tip")).toContainText("collected");
  await months.nth(5).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(months.nth(4)).toBeFocused();
  const label = await months.nth(4).getAttribute("aria-label");
  await expect(page.locator(".adDash__tip .adDash__tipH")).toHaveText(label!.split(":")[0]);
  await page.getByText("Show as a table").first().click();
  await expect(page.locator(".adDash__table tbody tr").first()).toBeVisible();
});
