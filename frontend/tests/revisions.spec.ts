import { expect, test } from "@playwright/test";
import pg from "pg";
import { sayYes } from "./say-yes";

/**
 * EARLIER VERSIONS (lib/revisions.ts). Updating a live post keeps the version
 * readers saw, Restore puts it back (and keeps the one it replaced), and the
 * FAQ keeps its last lists the same way.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 150_000 });

let db: pg.Pool;
let post: { id: string; slug: string; excerpt: string };

test.beforeAll(async () => {
  db = new pg.Pool({ connectionString: CONNECTION, max: 1 });
  post = (await db.query("SELECT id, slug, excerpt FROM blog_posts WHERE status = 'published' AND trashed_at IS NULL AND published_at <= now() ORDER BY published_at DESC LIMIT 1")).rows[0];
});
test.afterAll(async () => {
  await db.query("UPDATE blog_posts SET excerpt = $2 WHERE id = $1", [post.id, post.excerpt]);
  await db.query("DELETE FROM site_content WHERE key = 'faq'");
  await db.end();
});
test.beforeEach(async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
});

test("updating a live post keeps the version readers saw, and Restore puts it back", async ({ page }) => {
  const edited = `An edited card sentence, ${Date.now()}.`;
  const before = Number((await db.query("SELECT count(*)::INT AS n FROM blog_post_revisions WHERE post_id = $1", [post.id]).catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n);

  await page.goto(`/admin/blog/${post.id}`, { waitUntil: "networkidle" });
  await page.getByLabel(/^Card sentence/).fill(edited);
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".adToast").filter({ hasText: /Updated|Saved/ }).first()).toBeVisible({ timeout: 20_000 });

  const kept = await db.query("SELECT content->>'excerpt' AS excerpt FROM blog_post_revisions WHERE post_id = $1 ORDER BY kept_at DESC", [post.id]);
  expect(kept.rows.length).toBe(before + 1);
  expect(kept.rows[0].excerpt).toBe(post.excerpt);

  /* Pressing Update again with nothing changed keeps nothing new. */
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".adToast").filter({ hasText: /Updated|Saved/ }).first()).toBeVisible({ timeout: 20_000 });
  expect(Number((await db.query("SELECT count(*)::INT AS n FROM blog_post_revisions WHERE post_id = $1", [post.id])).rows[0].n)).toBe(before + 1);

  await page.reload({ waitUntil: "networkidle" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Earlier versions" }) });
  await expect(panel.locator(".adRevs > li")).toHaveCount(Math.min(before + 1, 25));
  await sayYes(page);
  await panel.locator(".adRevs > li").first().getByRole("button", { name: "Restore" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Restored" })).toBeVisible({ timeout: 20_000 });
  expect((await db.query("SELECT excerpt FROM blog_posts WHERE id = $1", [post.id])).rows[0].excerpt).toBe(post.excerpt);
  /* And the edited one is now the newest kept version, so the restore can be undone. */
  expect((await db.query("SELECT content->>'excerpt' AS e FROM blog_post_revisions WHERE post_id = $1 ORDER BY kept_at DESC LIMIT 1", [post.id])).rows[0].e).toBe(edited);
});

test("the FAQ keeps the list each save replaced, and Restore brings it back", async ({ page }) => {
  await db.query("DELETE FROM site_content WHERE key = 'faq'");
  const edited = `What does WDC do, briefly? ${Date.now()}`;
  await page.goto("/admin/settings/faq", { waitUntil: "networkidle" });
  await page.locator(".adFaq__head").first().click();
  const first = page.getByRole("textbox", { name: "Question 1", exact: true });
  const shipped = await first.inputValue();
  await first.fill(edited);
  await page.getByRole("button", { name: "Save the FAQ" }).click();
  await expect(page.locator(".adToast, .ad__msg.is-ok").filter({ hasText: "Saved." }).first()).toBeVisible({ timeout: 20_000 });

  await page.reload({ waitUntil: "networkidle" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Earlier versions" }) });
  const row = panel.locator(".adRevs > li").first();
  await expect(row).toContainText("The questions that shipped");
  await sayYes(page);
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Restored" })).toBeVisible({ timeout: 20_000 });
  expect((await db.query("SELECT 1 FROM site_content WHERE key = 'faq'")).rowCount).toBe(0);
  expect(await (await page.request.get("/contact")).text()).toContain(shipped.replace(/'/g, "&#x27;"));
});
