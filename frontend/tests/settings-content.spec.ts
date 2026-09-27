import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS > BLOG AND SITE COPY: two defaults that something reads, and the
 * copy still set in code listed with its reason. The service saved here is
 * the one a new post opens under; the feed length is read by the RSS route.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const KEYS = ["blog.defaultTopic", "blog.rssCount"];

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN on the dev server.");

const db = new pg.Pool({ connectionString: CONNECTION, max: 2 });
const value = async (key: string) => (await db.query("SELECT value FROM app_settings WHERE key = $1", [key])).rows[0]?.value ?? null;
test.beforeAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); });
test.afterAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); await db.end(); });

const bar = (page: Page) => page.getByRole("region", { name: "Unsaved changes" });

test("the blog defaults save, and a new post opens under the chosen service", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.goto("/admin/settings/content", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Blog and site copy", level: 1 })).toBeVisible();

  /* The copy in code, each with its reason. */
  for (const what of ["Services", "Case studies", "Legal documents", "Testimonials", "Posts per page"]) {
    await expect(page.locator("tbody tr", { hasText: what }).locator("td").nth(2)).not.toBeEmpty();
  }

  const service = page.getByRole("button", { name: /New posts start as/ });
  await service.click();
  await page.getByRole("option", { name: "Search Engine Optimization" }).click();
  await page.getByLabel(/Posts in the RSS feed/).fill("3");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toContainText("Fix 1 field", { timeout: 20_000 });
  expect(await value("blog.rssCount")).toBeNull();

  await page.getByLabel(/Posts in the RSS feed/).fill("12");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Settings saved." })).toBeVisible({ timeout: 20_000 });
  expect(await value("blog.rssCount")).toBe("12");
  expect(await value("blog.defaultTopic")).toBe("seo");

  await page.goto("/admin/blog/new", { waitUntil: "networkidle" });
  await expect(page.locator('input[name="topic"]')).toHaveValue("seo");

  const rss = await page.request.get("/blog/rss.xml");
  expect(rss.status()).toBe(200);
  expect((await rss.text()).match(/<item>/g)?.length ?? 0).toBeLessThanOrEqual(12);
});
