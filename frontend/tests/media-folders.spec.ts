import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { sayYes } from "./say-yes";

/**
 * Folders in the media library (db/migrations/0029_media_folders.sql,
 * lib/media-folders.ts, components/admin/media-folders.tsx): made and nested
 * from the tree, a file dragged onto one and put back with Undo, the five
 * level limit, and a delete that moves what was inside up a level instead of
 * losing it.
 *
 * Needs the dev server started with COCKROACHDB_URL (or DATABASE_URL),
 * BONEYARD_CAPTURE_TOKEN and the R2 variables set (any values).
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION, "Needs a database: a folder is a row.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

const tag = randomUUID().slice(0, 6);
const FILE = `e2e-${tag}-poster.png`;
const TOP = `E2E ${tag} top`;
const SUB = `E2E ${tag} sub`;
let db: pg.Pool;

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
  await db.query(`INSERT INTO media_assets (key, filename, content_type, bytes, uploaded_by) VALUES ($1, $2, 'image/png', 1000, 'E2E')`,
    [`media/2026/09/e2e${tag}-cccccccc.png`, FILE]);
});

test.afterAll(async () => {
  await db?.query("UPDATE media_assets SET folder_id = NULL WHERE filename = $1", [FILE]);
  await db?.query("DELETE FROM media_assets WHERE filename = $1", [FILE]);
  /* Deepest first: a folder cannot go while one still points at it. */
  await db?.query("DELETE FROM media_folders WHERE name LIKE $1 AND depth = 5", [`E2E ${tag}%`]);
  for (let d = 4; d >= 1; d--) await db?.query("DELETE FROM media_folders WHERE name LIKE $1 AND depth = $2", [`E2E ${tag}%`, d]);
  await db?.end();
});

async function open(page: Page) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await sayYes(page);
  await page.goto("/admin/settings/media", { waitUntil: "networkidle" });
  return page.locator(".adMedia__pane");
}
const folderId = async (name: string) => (await db.query<{ id: string }>("SELECT id FROM media_folders WHERE name = $1", [name])).rows[0]?.id ?? null;

test("a folder is made from the tree, and another inside it from its menu", async ({ page }) => {
  const pane = await open(page);
  await pane.getByRole("button", { name: "New folder" }).click();
  await pane.getByRole("textbox", { name: "New folder" }).fill(TOP);
  await page.keyboard.press("Enter");
  await expect(pane.getByRole("treeitem", { name: new RegExp(TOP) })).toBeVisible({ timeout: 20_000 });

  await pane.getByRole("button", { name: `More for ${TOP}` }).click();
  await page.getByRole("menuitem", { name: /New folder inside/ }).click();
  await pane.getByRole("textbox", { name: `New folder inside ${TOP}` }).fill(SUB);
  await page.keyboard.press("Enter");
  await expect(pane.getByRole("treeitem", { name: new RegExp(SUB) })).toHaveAttribute("aria-level", "2", { timeout: 20_000 });
  const sub = (await db.query("SELECT depth, parent_id FROM media_folders WHERE name = $1", [SUB])).rows[0];
  expect(sub).toMatchObject({ depth: 2, parent_id: await folderId(TOP) });
});

test("a file dragged onto a folder moves into it, and Undo puts it back", async ({ page }) => {
  const pane = await open(page);
  /* Open folders are remembered per device, so a fresh browser starts closed. */
  await pane.locator(".adFold__row", { hasText: TOP }).locator(".adFold__chev").click();
  const card = page.locator(".adMedia__grid > li", { hasText: FILE });
  await card.dragTo(pane.locator(".adFold__row", { hasText: SUB }));
  const toast = page.locator(".adToast", { hasText: `to ${SUB}` });
  await expect(toast).toBeVisible({ timeout: 20_000 });
  expect((await db.query("SELECT folder_id FROM media_assets WHERE filename = $1", [FILE])).rows[0].folder_id).toBe(await folderId(SUB));

  await toast.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await db.query("SELECT folder_id FROM media_assets WHERE filename = $1", [FILE])).rows[0].folder_id, { timeout: 15_000 }).toBeNull();
});

test("five levels is the limit: the fifth offers no folder inside", async ({ page }) => {
  let parent = await folderId(SUB);
  for (let d = 3; d <= 5; d++) {
    parent = (await db.query<{ id: string }>("INSERT INTO media_folders (parent_id, depth, name, created_by) VALUES ($1, $2, $3, 'E2E') RETURNING id",
      [parent, d, `E2E ${tag} L${d}`])).rows[0].id;
  }
  const pane = await open(page);
  await pane.getByRole("treeitem", { name: new RegExp(`${TOP}`) }).focus();
  /* Open the path down with the keyboard: Right opens, Down steps in. */
  for (let i = 0; i < 4; i++) { await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); }
  await expect(pane.getByRole("treeitem", { name: new RegExp(`L5`) })).toHaveAttribute("aria-level", "5");
  await pane.getByRole("button", { name: `More for E2E ${tag} L5` }).click();
  await expect(page.getByRole("menuitem", { name: /Rename/ })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /New folder inside/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("deleting a folder moves its files and folders up a level; no file is lost", async ({ page }) => {
  await db.query("UPDATE media_assets SET folder_id = $2 WHERE filename = $1", [FILE, await folderId(TOP)]);
  const pane = await open(page);
  await pane.getByRole("button", { name: `More for ${TOP}` }).click();
  await page.getByRole("menuitem", { name: /Delete folder/ }).click();
  await expect(page.locator(".adToast", { hasText: `Deleted ${TOP}` })).toBeVisible({ timeout: 20_000 });

  expect(await folderId(TOP)).toBeNull();
  const sub = (await db.query("SELECT depth, parent_id FROM media_folders WHERE name = $1", [SUB])).rows[0];
  expect(sub).toMatchObject({ depth: 1, parent_id: null });
  /* The chain below moved up with it. */
  expect((await db.query("SELECT depth FROM media_folders WHERE name = $1", [`E2E ${tag} L5`])).rows[0].depth).toBe(4);
  expect((await db.query("SELECT folder_id FROM media_assets WHERE filename = $1", [FILE])).rows[0].folder_id).toBeNull();
});
