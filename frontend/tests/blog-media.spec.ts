import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { choose } from "./choose";

/**
 * MEDIA IN THE MIDDLE OF A POST reaches the table, a fresh editor load and
 * the ordinary public page. The owner reported pictures added inside an
 * article not showing and asked that videos be checked too.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 150_000 });
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const SLUG = `picture-in-the-middle-${randomUUID().slice(0, 6)}`;
let db: pg.Pool;
test.beforeAll(() => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const configured = process.env.COCKROACHDB_CERT ?? "";
  const local = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const ca = configured.startsWith("-----BEGIN CERTIFICATE-----")
    ? configured.replace(/\\n/g, "\n")
    : local && fs.existsSync(local) ? fs.readFileSync(local, "utf8") : undefined;
  db = new pg.Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 2,
    connectionTimeoutMillis: 40_000,
  });
});
test.afterAll(async () => { await db.query("DELETE FROM blog_posts WHERE slug = $1", [SLUG]); await db.end(); });

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

async function insertLibraryPicture(page: Page) {
  await page.getByRole("button", { name: "Picture" }).click();
  const panel = page.getByRole("group", { name: "Picture" });
  await panel.getByRole("button", { name: "From the library" }).click();
  const dialog = page.getByRole("dialog", { name: "Choose a picture from the library" });
  const item = dialog.locator(".adMP__item").first();
  await expect(item).toBeVisible({ timeout: 30_000 });
  const src = await item.locator("img").getAttribute("src");
  expect(src).toMatch(/^https:\/\//);
  /* Read the URL shape from the real library without changing that asset's
     saved description as part of a regression test. */
  await dialog.getByRole("button", { name: "Close" }).click();
  await panel.getByLabel("Or its address").fill(src!);
  await panel.getByLabel(/^Description/).fill("A saved media-library picture");
  await panel.getByRole("button", { name: "Insert picture" }).click();
  await expect(panel).toHaveCount(0);
  return src!;
}

async function insertVideo(page: Page, src: string) {
  await page.getByRole("button", { name: "Video" }).click();
  const panel = page.getByRole("group", { name: "Video" });
  await panel.getByLabel("Or its address").fill(src);
  await panel.getByLabel(/^What it shows/).fill("A short walkthrough on a phone");
  await panel.getByRole("button", { name: "Insert video" }).click();
  await expect(panel).toHaveCount(0);
}

test("article media survives save, editor reload and the live post", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  /* The test clip uses the real configured media origin without writing a
     throwaway object to R2. Give the editor deterministic metadata for that
     address; the save and public render still receive the ordinary https URL. */
  await page.addInitScript(() => {
    const original = Document.prototype.createElement;
    Document.prototype.createElement = function (name: string, options?: ElementCreationOptions) {
      const element = original.call(this, name, options);
      if (name.toLowerCase() !== "video") return element;
      Object.defineProperties(element, {
        videoWidth: { configurable: true, get: () => 720 },
        videoHeight: { configurable: true, get: () => 1280 },
        src: {
          configurable: true,
          get: () => element.getAttribute("src") ?? "",
          set: (value: string) => {
            element.setAttribute("src", value);
            queueMicrotask(() => element.dispatchEvent(new Event("loadedmetadata")));
          },
        },
      });
      return element;
    };
  });
  await page.goto("/admin/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill("A picture in the middle");
  await page.locator("summary", { hasText: "Details" }).click();
  await page.getByLabel(/^Address/).fill(SLUG);
  await choose(page.getByLabel(/^Service/), "branding");
  await page.getByLabel(/^Card sentence/).fill("A post with a picture in the middle of it.");
  await page.locator("summary", { hasText: "Search and sharing" }).click();
  await page.getByLabel(/^Search result title/).fill("A picture in the middle");
  await page.getByLabel(/^Meta description/).fill("A test post that carries a picture between two paragraphs, to prove that it survives saving, the preview and the live post page.");
  const doc = page.locator(".adRte__doc");
  await expect(doc).toBeVisible({ timeout: 60_000 });
  await doc.click();
  await page.keyboard.type("The paragraph before the picture.");
  await page.keyboard.press("Enter");
  const imageSrc = await insertLibraryPicture(page);
  await page.keyboard.type("The paragraph between the picture and video.");
  await page.keyboard.press("Enter");
  const videoSrc = `${new URL(imageSrc).origin}/media/e2e-inline-video.webm`;
  await insertVideo(page, videoSrc);
  await page.keyboard.type("The paragraph after the video.");
  await expect(doc.locator(`img[src="${imageSrc}"]`)).toBeVisible();
  await expect(doc.locator(`video[src="${videoSrc}"]`)).toHaveCount(1);
  await page.getByText("Or use one of our photos").click();
  await page.getByRole("group", { name: "Our photos" }).getByRole("button").first().click();
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]{36}/, { timeout: 30_000 });

  const row = await db.query<{ id: string; body: { content: { type: string; attrs?: { src: string } }[] } }>("SELECT id, body FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(row.rows[0].body.content.map((b) => b.type)).toEqual(["paragraph", "image", "paragraph", "video", "paragraph"]);
  expect(row.rows[0].body.content.find((b) => b.type === "image")?.attrs?.src).toBe(imageSrc);
  expect(row.rows[0].body.content.find((b) => b.type === "video")?.attrs?.src).toBe(videoSrc);

  /* A narrow reload proves this is persisted content, not only the editor's
     client state, and catches media widening a text-heavy phone screen. */
  await page.setViewportSize({ width: 320, height: 780 });
  await page.reload({ waitUntil: "load" });
  const reloaded = page.locator(".adRte__doc");
  await expect(reloaded.locator(`img[src="${imageSrc}"]`)).toBeVisible({ timeout: 60_000 });
  await expect(reloaded.locator(`video[src="${videoSrc}"]`)).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  /* Make this test post public after the editor save, then ask the ordinary
     reader route for it. No preview-only renderer can make these assertions pass. */
  await db.query("UPDATE blog_posts SET status = 'published', published_at = now() - interval '1 minute' WHERE id = $1", [row.rows[0].id]);
  await page.goto(`/blog/${SLUG}?media-test=${Date.now()}`, { waitUntil: "load" });
  const article = page.locator(".bl-body");
  await expect(article.locator(`img[src*="${encodeURIComponent(imageSrc)}"], img[src="${imageSrc}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(article.locator(`video[src="${videoSrc}"]`)).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
