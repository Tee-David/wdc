import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * THE DEFAULT LINK PREVIEW (Settings > Website and SEO). A picture saved here
 * is what app/opengraph-image draws for pages without a card of their own;
 * putting the drawn mark back draws the mark again. Only our own pictures are
 * taken: an address anywhere else is refused and nothing is saved.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN on the dev server.");

const db = new pg.Pool({ connectionString: CONNECTION, max: 2 });
const clear = () => db.query("DELETE FROM app_settings WHERE key = 'site.socialImage'");
test.afterAll(async () => { await clear(); await db.end(); });

const bar = (page: Page) => page.getByRole("region", { name: "Unsaved changes" });
const panel = (page: Page) => page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Link preview" }) });

/* The field is a picture chosen from the library; the library in a test has
   no reachable files, so the value is set as the picker would set it. */
async function choose(page: Page, src: string) {
  await panel(page).locator('input[name="socialImage"]').evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, src);
}

async function card(page: Page) {
  const res = await page.request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  return (await res.body()).length;
}

test("a chosen picture becomes the default card, and the mark comes back", async ({ page }) => {
  await clear();
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/settings/site", { waitUntil: "networkidle" });
  const mark = await card(page);

  await choose(page, "https://example.com/elsewhere.jpg");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("from the media library", { timeout: 20_000 });
  expect((await db.query("SELECT 1 FROM app_settings WHERE key = 'site.socialImage'")).rowCount).toBe(0);

  /* WebP is refused: the card renderer cannot read it. */
  await choose(page, "/brand/agent-avatar.webp");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("cannot use WebP", { timeout: 20_000 });

  await choose(page, "/hero/robotics.jpg");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: /^Saved/ })).toBeVisible({ timeout: 20_000 });
  const picture = await card(page);
  expect(Math.abs(picture - mark)).toBeGreaterThan(5_000);

  await page.reload({ waitUntil: "networkidle" });
  await expect(panel(page).locator("img").first()).toHaveAttribute("src", "/hero/robotics.jpg");
  await panel(page).getByRole("button", { name: "Use the drawn mark" }).click();
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Back to the drawn mark." })).toBeVisible({ timeout: 20_000 });
  expect(await card(page)).toBe(mark);
});
