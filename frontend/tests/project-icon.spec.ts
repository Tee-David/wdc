import { expect, test, type Page } from "@playwright/test";

/** A project's icon is picked in the admin and is the one the client sees. */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 120_000 });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the icon picked in Edit details shows on the project and in the portal", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/projects/p1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Edit details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radiogroup", { name: "Project icon" })).toBeVisible();
  await dialog.getByRole("radio", { name: "Rocket" }).check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__profileAv svg.lucide-rocket")).toBeVisible({ timeout: 20_000 });

  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-client": "c1" });
  await page.goto("/portal/projects", { waitUntil: "load" });
  await expect(page.locator(".pProj__icon svg.lucide-rocket").first()).toBeVisible();
});

test("a new project offers Shuffle, and gets a random icon if none is picked", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/projects", { waitUntil: "domcontentloaded" });
  const add = page.getByRole("button", { name: "New project" }).first();
  await expect(add).toBeVisible({ timeout: 60_000 });
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { checked: true })).toHaveCount(0);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const top = dialog.locator(".adIcons__top");
    const [topBox, previewBox, hintBox, shuffleBox] = [
      await top.boundingBox(),
      await top.locator(".adIcons__now").boundingBox(),
      await top.locator(".adIcons__hint").boundingBox(),
      await top.getByRole("button", { name: "Shuffle" }).boundingBox(),
    ];
    expect(hintBox!.y).toBeGreaterThanOrEqual(Math.max(previewBox!.y + previewBox!.height, shuffleBox!.y + shuffleBox!.height) - 1);
    expect(hintBox!.width).toBeGreaterThanOrEqual(topBox!.width - 1);
    expect(shuffleBox!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await dialog.getByRole("button", { name: "Shuffle" }).click();
  await expect(dialog.getByRole("radio", { checked: true })).toHaveCount(1);
});
