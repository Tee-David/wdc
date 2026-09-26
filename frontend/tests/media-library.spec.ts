import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";
import { checkMediaFile, isMediaKey, MEDIA_MAX_BYTES } from "../lib/media-validate";
import { mediaKey } from "../lib/r2";
import { sayYes } from "./say-yes";

/**
 * The media library: the rules both sides of an upload share, and the
 * library screen against a real database.
 *
 * The screen tests need the dev server under test started with
 * COCKROACHDB_URL, BONEYARD_CAPTURE_TOKEN and the R2 variables set (any
 * values: the bucket is never reached, which is the point of the upload
 * test), and the same COCKROACHDB_URL/BONEYARD_CAPTURE_TOKEN here.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test("the rules refuse SVG, empty and oversized files, and name the type they sign", () => {
  expect(checkMediaFile("Hero.PNG", 1000)).toEqual({ ok: true, ext: "png", contentType: "image/png" });
  expect(checkMediaFile("brochure.pdf", 1000)).toMatchObject({ ok: true, contentType: "application/pdf" });
  const svg = checkMediaFile("logo.svg", 1000);
  expect(svg.ok).toBe(false);
  expect(!svg.ok && svg.error).toContain("can carry a script");
  expect(checkMediaFile("notes.exe", 1000).ok).toBe(false);
  expect(checkMediaFile("empty.png", 0).ok).toBe(false);
  expect(checkMediaFile("huge.png", MEDIA_MAX_BYTES + 1).ok).toBe(false);
  expect(checkMediaFile("   ", 10).ok).toBe(false);
});

test("a key the server mints is one it will accept back, and nothing outside media/ is", () => {
  for (const ext of ["png", "jpg", "webp", "pdf"]) expect(isMediaKey(mediaKey(ext))).toBe(true);
  expect(mediaKey("png", new Date("2026-03-05T00:00:00Z"))).toMatch(/^media\/2026\/03\//);
  expect(isMediaKey("onboarding/abc/lqz1-abcdefgh.png")).toBe(false);
  expect(isMediaKey("media/2026/03/../../onboarding/x.png")).toBe(false);
  expect(isMediaKey("media/2026/03/lqz1abc-abcdefgh.svg")).toBe(false);
  expect(isMediaKey("media/2026/03/lqz1abc-abcdefgh.png?x=1")).toBe(false);
});

test.describe("the library screen", () => {
  test.skip(!CONNECTION, "Needs a database: a library entry is a row.");
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  const tag = randomUUID().slice(0, 8);
  const IMAGE = `e2e-${tag}-hero.png`;
  const PDF = `e2e-${tag}-brochure.pdf`;
  let db: pg.Pool;

  test.beforeAll(async () => {
    const url = new URL(CONNECTION!);
    url.searchParams.delete("sslmode");
    const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
    db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
    await db.query(
      `INSERT INTO media_assets (key, filename, content_type, bytes, uploaded_by) VALUES
         ($1, $2, 'image/png', 204800, 'E2E'), ($3, $4, 'application/pdf', 1048576, 'E2E')`,
      [`media/2026/09/e2e${tag}-aaaaaaaa.png`, IMAGE, `media/2026/09/e2e${tag}-bbbbbbbb.pdf`, PDF],
    );
  });

  test.afterAll(async () => {
    await db?.query("DELETE FROM media_assets WHERE filename LIKE $1", [`e2e-${tag}-%`]);
    await db?.end();
  });

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  });

  test("Settings leads to it, and a file without a description says so until it has one", async ({ page }) => {
    await page.goto("/admin/settings", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /^Media library/ }).first().click();
    /* Generous: on a dev server the first visit compiles the route. */
    await expect(page.getByRole("heading", { level: 1, name: "Media library" })).toBeVisible({ timeout: 30_000 });

    const card = page.locator(".adMedia__card", { hasText: IMAGE });
    await expect(card).toBeVisible();
    await expect(card.getByText("200 KB")).toBeVisible();
    await expect(card.getByText("Needs a description")).toBeVisible();
    await expect(card.locator("img")).toHaveAttribute("src", /^https:\/\/media\.example\.test\/media\/2026\/09\//);
    /* A PDF has no alt text to give: its details have no such field. */
    await page.locator(".adMedia__card", { hasText: PDF }).click();
    await expect(page.getByRole("dialog").getByLabel("Description (alt text)")).toHaveCount(0);
    await page.keyboard.press("Escape");

    /* The description is set in the file's details, not on the card. */
    await card.click();
    const details = page.getByRole("dialog");
    await details.getByLabel("Description (alt text)").fill("A navy hero band with the studio's orange mark");
    await details.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".adToast", { hasText: "Details saved." })).toBeVisible({ timeout: 20_000 });

    const row = await db.query("SELECT alt FROM media_assets WHERE filename = $1", [IMAGE]);
    expect(row.rows[0].alt).toBe("A navy hero band with the studio's orange mark");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".adMedia__card", { hasText: IMAGE }).getByText("Needs a description")).toHaveCount(0);
  });

  test("archiving moves a file out of the library without deleting it, and restore puts it back", async ({ page }) => {
    await sayYes(page);
    await page.goto("/admin/settings/media", { waitUntil: "networkidle" });
    const card = page.locator(".adMedia__card", { hasText: PDF });
    /* One press, not a retry loop: a second press would find no card. */
    await card.click();
    await page.getByRole("dialog").getByRole("button", { name: "Archive" }).click();
    await expect(page.locator(".adMedia__notice")).toHaveText(`Archived ${PDF}. It is out of the library, and its address still works for any page already using it.`, { timeout: 15_000 });

    const archived = await db.query("SELECT archived_at, archived_by FROM media_assets WHERE filename = $1", [PDF]);
    expect(archived.rows[0].archived_at).not.toBeNull();
    expect(archived.rows[0].archived_by).toBe("WDC Admin");

    /* The card left the list, and the notice outlived it. */
    await expect(card).toHaveCount(0);
    await page.goto("/admin/settings/media?show=archived", { waitUntil: "networkidle" });
    const parked = page.locator(".adMedia__card", { hasText: PDF });
    await expect(parked).toBeVisible();
    await parked.click();
    await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.locator(".adMedia__notice")).toHaveText(`Restored ${PDF} to the library.`, { timeout: 15_000 });
    const back = await db.query("SELECT archived_at FROM media_assets WHERE filename = $1", [PDF]);
    expect(back.rows[0].archived_at).toBeNull();
  });

  test("an upload the bucket never received is not listed, whatever the browser says", async ({ page }) => {
    /* The browser's PUT is answered 200 here, as if R2 took it. The server
       then asks the bucket itself, which does not have it, and must refuse. */
    await page.route("**/*.r2.cloudflarestorage.com/**", (route) => route.fulfill({ status: 200, body: "" }));
    await page.goto("/admin/settings/media", { waitUntil: "networkidle" });
    const name = `e2e-${tag}-forged.png`;
    const before = await db.query("SELECT count(*) AS n FROM media_assets");

    await expect(async () => {
      await page.locator(".ad__head input[type=file]").setInputFiles({ name, mimeType: "image/png", buffer: Buffer.from("89504e47", "hex") });
      await expect(page.locator(".adTray__job", { hasText: name }).getByRole("alert")).toContainText("file store", { timeout: 20_000 });
    }).toPass({ timeout: 60_000 });

    const after = await db.query("SELECT count(*) AS n FROM media_assets");
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  test("an SVG is turned away before anything is signed", async ({ page }) => {
    await page.goto("/admin/settings/media", { waitUntil: "networkidle" });
    await expect(async () => {
      await page.locator(".ad__head input[type=file]").setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
      await expect(page.locator(".adTray__job", { hasText: "logo.svg" }).getByRole("alert")).toContainText("can carry a script", { timeout: 4_000 });
    }).toPass({ timeout: 45_000 });
  });

  test("at 320px the cards fit and the page does not scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/admin/settings/media", { waitUntil: "networkidle" });
    await expect(page.locator(".adMedia__card").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
