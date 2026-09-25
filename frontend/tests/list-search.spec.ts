import { expect, test, type Page } from "@playwright/test";

/** Every list can be searched: in the page for the small ones, on the server for projects. */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 120_000 });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the forms list narrows as you type, and says when nothing matches", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/forms", { waitUntil: "networkidle" });
  const box = page.getByRole("searchbox", { name: "Search" });
  await box.fill("contact");
  await expect(page.locator("#forms-lists tbody tr:visible")).toHaveCount(1);
  await box.fill("zzzz-nothing");
  await expect(page.locator(".adLS__none")).toContainText("No forms match");
  await box.press("Escape");
  await expect(page.locator("#forms-lists tbody tr:visible").first()).toBeVisible();
});

test("projects search on the server, on the list and the board", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/projects", { waitUntil: "networkidle" });
  await page.getByRole("searchbox", { name: "Search" }).fill("Identity");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=Identity/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/admin/projects?view=board&q=Identity", { waitUntil: "networkidle" });
  await expect(page.locator("[data-card]")).toHaveCount(1);
});

test("the portal's lists can be searched", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-client": "c1" });
  await page.goto("/portal/billing", { waitUntil: "networkidle" });
  await page.getByRole("searchbox").fill("zzzz-nothing");
  await expect(page.locator(".adLS__none")).toContainText("No invoices match");
  await page.locator(".adLS__none").getByRole("button", { name: "Clear the search" }).click();
  await expect(page.locator(".adLS__none")).toHaveCount(0);
});
