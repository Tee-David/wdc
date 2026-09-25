import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * A PICTURE IN THE MIDDLE OF A POST reaches the table, the preview and the
 * page. The owner reported pictures added inside an article not showing.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const SLUG = `picture-in-the-middle-${randomUUID().slice(0, 6)}`;
let db: pg.Pool;
test.beforeAll(() => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
});
test.afterAll(async () => { await db.query("DELETE FROM blog_posts WHERE slug = $1", [SLUG]); await db.end(); });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

async function insertPicture(page: Page, src: string, alt: string) {
  await page.getByRole("button", { name: "Picture" }).click();
  const panel = page.getByRole("group", { name: "Picture" });
  await panel.getByLabel("Or its address").fill(src);
  await panel.getByLabel(/^Description/).fill(alt);
  await panel.getByRole("button", { name: "Insert picture" }).click();
  await expect(panel).toHaveCount(0);
}

test("a picture between two paragraphs is saved, previewed and shown", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill("A picture in the middle");
  await page.getByLabel(/^Address/).fill(SLUG);
  await page.getByLabel(/^Service/).selectOption("branding");
  await page.getByLabel(/^Card sentence/).fill("A post with a picture in the middle of it.");
  await page.getByLabel(/^Search result title/).fill("A picture in the middle");
  await page.getByLabel(/^Meta description/).fill("A test post that carries a picture between two paragraphs, to prove that it survives saving, the preview and the live post page.");
  const doc = page.locator(".adRte__doc");
  await expect(doc).toBeVisible({ timeout: 60_000 });
  await doc.click();
  await page.keyboard.type("The paragraph before the picture.");
  await page.keyboard.press("Enter");
  await insertPicture(page, "/hero/design-desk.jpg", "A designer's desk");
  await page.keyboard.type("The paragraph after the picture.");
  await expect(doc.locator('img[src="/hero/design-desk.jpg"]')).toBeVisible();
  await page.getByText("Or use one of our photos").click();
  await page.getByRole("group", { name: "Our photos" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\?saved=1$/, { timeout: 30_000 });

  const row = await db.query<{ body: { content: { type: string; attrs?: { src: string } }[] } }>("SELECT body FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(row.rows[0].body.content.map((b) => b.type)).toEqual(["paragraph", "image", "paragraph"]);

  await page.goto(`/api/blog/preview?slug=${SLUG}`, { waitUntil: "load" });
  const img = page.locator('.bl-body img[src="/hero/design-desk.jpg"]');
  await expect(img).toBeVisible();
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});
