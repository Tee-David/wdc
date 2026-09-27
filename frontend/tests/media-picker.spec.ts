import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * "Choose from library" (components/admin/media-picker.tsx): the blog's cover
 * and its Picture panel take a file from the media library without leaving
 * the post, and a description written there is saved back to the file.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const tag = randomUUID().slice(0, 8);
const IMAGE = `pick-${tag}-studio.jpg`;
const KEY = `media/2026/09/pick${tag}-cccccccc.jpg`;
let db: pg.Pool;

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  db = new pg.Pool({ connectionString: url.toString(), max: 2 });
  await db.query(
    "INSERT INTO media_assets (key, filename, content_type, bytes, uploaded_by, width, height) VALUES ($1, $2, 'image/jpeg', 312000, 'E2E', 1600, 1000)",
    [KEY, IMAGE],
  );
});
test.afterAll(async () => {
  await db?.query("DELETE FROM media_assets WHERE filename LIKE $1", [`pick-${tag}-%`]);
  await db?.end();
});
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
});

test("the cover comes from the library, and its new description is saved to the file", async ({ page }) => {
  await page.goto("/admin/blog/new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Choose from the media library" }).click();
  const dlg = page.getByRole("dialog", { name: "Choose a cover from the library" });
  await expect(dlg).toBeVisible();

  /* Nothing matches: says so, with the way back. */
  await dlg.getByRole("searchbox", { name: "Search the library" }).fill(`nothing-${tag}-here`);
  await expect(dlg.getByText("No pictures match")).toBeVisible();
  await dlg.getByRole("searchbox", { name: "Search the library" }).fill(tag);
  const item = dlg.getByRole("button", { name: new RegExp(IMAGE) });
  await expect(item).toBeVisible();
  await item.click();
  await expect(item).toHaveAttribute("aria-pressed", "true");
  await expect(dlg.getByText("1600 × 1000")).toBeVisible();
  await page.screenshot({ path: "test-results/media-picker.png" });

  /* A picture needs a description, or to be marked decorative. */
  await dlg.getByRole("button", { name: "Use this picture" }).click();
  await expect(dlg.getByRole("alert")).toContainText("Describe the picture");
  await dlg.getByLabel(/^Description/).fill("The studio at work, three people round a table");
  await dlg.getByRole("button", { name: "Use this picture" }).click();
  await expect(dlg).toBeHidden();

  await expect(page.locator('input[type="hidden"][name="cover"]')).toHaveValue(new RegExp(`${KEY.replace(/\//g, "\\/")}$`));
  await expect.poll(async () => (await db.query("SELECT alt FROM media_assets WHERE key = $1", [KEY])).rows[0].alt)
    .toBe("The studio at work, three people round a table");
});

test("the editor's Picture panel fills its address and description from the library", async ({ page }) => {
  await page.goto("/admin/blog/new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Picture" }).click();
  await page.getByRole("button", { name: "From the library" }).click();
  const dlg = page.getByRole("dialog", { name: "Choose a picture from the library" });
  await dlg.getByRole("searchbox", { name: "Search the library" }).fill(tag);
  await dlg.getByRole("button", { name: new RegExp(IMAGE) }).click();
  /* It starts from the description the file already has. */
  await expect(dlg.getByLabel(/^Description/)).toHaveValue("The studio at work, three people round a table");
  await dlg.getByRole("button", { name: "Use this picture" }).click();
  await expect(dlg).toBeHidden();
  const panel = page.getByRole("group", { name: "Picture" });
  await expect(panel.getByLabel("Or its address")).toHaveValue(new RegExp(`${KEY.replace(/\//g, "\\/")}$`));
  await expect(panel.getByLabel(/^Description/)).toHaveValue("The studio at work, three people round a table");
});

test("a file's details say where it is used, and a post using it is linked", async ({ page }) => {
  const post = (await db.query("SELECT id, title, social_image FROM blog_posts WHERE trashed_at IS NULL ORDER BY saved_at DESC LIMIT 1")).rows[0];
  await page.goto(`/admin/settings/media?q=${tag}`, { waitUntil: "networkidle" });
  await page.locator(".adMedia__card", { hasText: IMAGE }).click();
  const facts = page.locator(".adMediaD__facts");
  await expect(facts).toContainText("Nothing on the site uses it.");
  const url = await page.locator(".adMediaD__tools a", { hasText: "Open" }).getAttribute("href");
  expect(url).toContain(KEY);
  try {
    await db.query("UPDATE blog_posts SET social_image = $2 WHERE id = $1", [post.id, url]);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".adMedia__card", { hasText: IMAGE }).click();
    const use = facts.locator(".adMediaD__uses li", { hasText: post.title });
    await expect(use).toContainText("social image");
    await expect(use.getByRole("link")).toHaveAttribute("href", `/admin/blog/${post.id}`);
  } finally {
    await db.query("UPDATE blog_posts SET social_image = $2 WHERE id = $1", [post.id, post.social_image]);
  }
});
