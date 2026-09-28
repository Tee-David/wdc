import { expect, test, type Page } from "@playwright/test";
import { deliverableFiles } from "../lib/admin/validate";

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ timeout: 120_000 });

test("deliverable uploads only accept a bounded, unique media-library file list", () => {
  const key = "media/2026/09/abc123-abcdef12.pdf";
  const fd = new FormData();
  fd.set("files", JSON.stringify([{ name: " Brand book.pdf ", key }]));
  const errors: Record<string, string> = {};
  expect(deliverableFiles(fd, errors)).toEqual([{ name: "Brand book.pdf", key }]);
  expect(errors).toEqual({});

  fd.set("files", JSON.stringify([{ name: "Brand book.pdf", key }, { name: "Copy.pdf", key }]));
  expect(deliverableFiles(fd, errors)).toEqual([]);
  expect(errors.files).toContain("not available");
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("the deliverable dialog starts on its panel and keeps file controls inside a phone", async ({ page, baseURL }) => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/projects/p1", { waitUntil: "domcontentloaded" });
  const add = page.getByRole("button", { name: "Add a deliverable" });
  await expect(add).toBeVisible({ timeout: 60_000 });
  const dialog = page.locator("dialog.addlg[open]");
  /* The first mobile visit also hydrates the project workspace. Retry the
     intent rather than declaring a pre-hydration tap a modal regression. */
  await expect(async () => {
    await add.click({ timeout: 2_000 });
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect.poll(() => dialog.evaluate((node) => document.activeElement === node)).toBe(true);
  await expect(dialog.locator('input[type="file"]')).toHaveAttribute("multiple", "");
  await expect(dialog.getByText("Optional. Upload files, add a link, or do both.")).toBeVisible();
  const dropzone = dialog.locator(".adFileDrop");
  await expect(dropzone.getByText("Choose files", { exact: true })).toBeVisible();
  await expect(dropzone).toContainText("or drag them here");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect((await dropzone.boundingBox())!.width).toBeLessThanOrEqual((await dialog.boundingBox())!.width);
    expect((await dropzone.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("newsletter import uses the same responsive file dropzone", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/forms/newsletter", { waitUntil: "domcontentloaded" });
  const open = page.getByRole("button", { name: "Import CSV" });
  await expect(open).toBeVisible({ timeout: 60_000 });
  const dialog = page.locator("dialog.addlg[open]");
  await expect(async () => {
    await open.click({ timeout: 2_000 });
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  const dropzone = dialog.locator(".adFileDrop");
  await expect(dropzone).toContainText("Choose files or drag them here");
  const input = dropzone.locator('input[type="file"]');
  await input.setInputFiles({ name: "clients.csv", mimeType: "text/csv", buffer: Buffer.from("email\nhello@example.com\n") });
  expect(await input.evaluate((node: HTMLInputElement) => node.files?.[0]?.name)).toBe("clients.csv");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect((await dropzone.boundingBox())!.width).toBeLessThanOrEqual((await dialog.boundingBox())!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
