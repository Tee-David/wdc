import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * A live post can always be updated, and the editor says what happened.
 *
 * A seeded post carried a 116-character meta description while the save
 * demanded 120 to 155, so it could not be updated at all, and on a phone the
 * refusal sat a screen below the button: pictures "did not appear", and no
 * toast came, because nothing had saved. The lengths are advice now, a
 * refusal is a toast, and the first field that needs attention is focused.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

let db: pg.Pool;
let post: { id: string; description: string };

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  db = new pg.Pool({ connectionString: url.toString(), max: 1 });
  post = (await db.query<{ id: string; description: string }>("SELECT id, description FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 1")).rows[0];
});
test.afterAll(async () => {
  await db.query("UPDATE blog_posts SET description = $2 WHERE id = $1", [post.id, post.description]);
  await db.end();
});
test.beforeEach(async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
});

test("a live post with a short description updates, and says so", async ({ page }) => {
  await db.query("UPDATE blog_posts SET description = $2 WHERE id = $1", [post.id, "A short description, well under the length a search result shows in full."]);
  await page.goto(`/admin/blog/${post.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".adToast", { hasText: /^(Saved|Updated)/ })).toBeVisible({ timeout: 30_000 });
});

test("a refusal is a toast, and the field that needs attention is focused", async ({ page }) => {
  await page.goto(`/admin/blog/${post.id}`, { waitUntil: "networkidle" });
  /* On a phone the section starts folded; the refusal opens it again. */
  await page.locator("summary", { hasText: "Search and sharing" }).click();
  await page.getByLabel(/^Meta description/).fill("");
  await page.locator("summary", { hasText: "Search and sharing" }).click();
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".adToast", { hasText: "need attention" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/^Meta description/)).toBeFocused();
  await expect(page.getByLabel(/^Meta description/)).toBeInViewport();
});
