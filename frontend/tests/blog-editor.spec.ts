import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * The blog editor, end to end, against the real table.
 *
 * A draft is invisible, a preview shows it on the real page to the owner
 * alone, publishing puts it on /blog and in the sitemap, and unpublishing
 * takes it out of both -- without the code fixture bringing it back.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 180_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL: a post is a database row.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");

function pool() {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const configured = process.env.COCKROACHDB_CERT || "";
  const local = process.env.APPDATA ? path.join(process.env.APPDATA, "postgresql", "root.crt") : "";
  const ca = configured.startsWith("-----BEGIN CERTIFICATE-----")
    ? configured.replace(/\\n/g, "\n")
    : local && fs.existsSync(local) ? fs.readFileSync(local, "utf8") : undefined;
  return new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2, connectionTimeoutMillis: 40_000 });
}

const db = pool();
const SLUG = `what-a-brand-audit-covers-${randomUUID().slice(0, 6)}`;
const TITLE = "What a brand audit actually covers";
const DESCRIPTION = "A plain guide to what a brand audit looks at, what it costs a small business in time, and the three questions it should answer before any redesign starts.";
let editUrl = "";

test.afterAll(async () => {
  await db.query("DELETE FROM blog_posts WHERE slug = $1", [SLUG]);
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
}

test("a short description is refused with the count, and nothing is written", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill(TITLE);
  await page.getByLabel(/^Address/).fill(SLUG);
  await page.getByLabel(/^Service/).selectOption("branding");
  await page.getByLabel(/^Card sentence/).fill("What we look at before we touch a logo.");
  await page.getByLabel(/^Search result title/).fill("What a brand audit covers");
  await page.getByLabel(/^Meta description/).fill("Too short.");
  await expect(page.locator(".adBlog__count").nth(1)).toContainText("10 characters");
  await page.getByLabel(/^Block 1 text/).fill("Most rebrands start in the wrong place.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__msg.is-bad")).toBeVisible();
  await expect(page.locator(".ad__fe", { hasText: "Between 120 and 155" })).toBeVisible();
  const rows = await db.query("SELECT 1 FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(rows.rowCount).toBe(0);
  /* What was typed survives the failure. */
  await expect(page.getByLabel(/^Headline/)).toHaveValue(TITLE);
});

test("a draft is saved, invisible on /blog, and visible in preview to the owner", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill(TITLE);
  await page.getByLabel(/^Address/).fill(SLUG);
  await page.getByLabel(/^Service/).selectOption("branding");
  await page.getByLabel(/^Card sentence/).fill("What we look at before we touch a logo.");
  await page.getByLabel(/^Search result title/).fill("What a brand audit covers");
  await page.getByLabel(/^Meta description/).fill(DESCRIPTION);
  await page.getByLabel(/^Block 1 text/).fill("Most rebrands start in the wrong place.");
  await page.getByRole("button", { name: "Section heading" }).click();
  await page.getByLabel(/^Block 2 text/).fill("Where to start");
  await page.getByRole("button", { name: "Paragraph" }).click();
  await page.getByLabel(/^Block 3 text/).fill("With the customer, not the logo.");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/admin\/settings\/blog\/[0-9a-f-]{36}\?saved=1$/);
  editUrl = page.url().replace(/\?saved=1$/, "");

  const row = await db.query<{ status: string; body: unknown[] }>("SELECT status, body FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(row.rows[0].status).toBe("draft");
  expect(row.rows[0].body).toEqual([
    { kind: "p", text: "Most rebrands start in the wrong place." },
    { kind: "h2", text: "Where to start" },
    { kind: "p", text: "With the customer, not the logo." },
  ]);

  /* A stranger sees nothing. */
  expect((await request.get(`/blog/${SLUG}`, { headers: { "x-boneyard-capture": "" } })).status()).toBe(404);

  /* The owner's preview shows it on the real page, marked as a preview. */
  await page.goto(`/api/blog/preview?slug=${SLUG}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/blog/${SLUG}$`));
  await expect(page.locator("h1")).toHaveText(TITLE);
  await expect(page.locator(".bl-preview")).toContainText("Preview");
  await expect(page.locator("#where-to-start")).toHaveText("Where to start");
  await page.getByRole("button", { name: "Leave preview" }).click();
  await expect(page.locator(".bl-preview")).toHaveCount(0);
});

test("preview is refused to anybody who is not the owner", async ({ request }) => {
  const res = await request.get(`/api/blog/preview?slug=${SLUG}`, { maxRedirects: 0 });
  expect(res.status()).toBe(401);
});

test("publishing puts it on /blog and in the sitemap; unpublishing takes it out", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await page.goto(editUrl, { waitUntil: "load" });
  await page.getByRole("radio", { name: /^Published/ }).check();
  await page.getByLabel(/^Date shown on the post/).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Saved and live");

  const live = await request.get(`/blog/${SLUG}`);
  expect(live.status()).toBe(200);
  expect(await live.text()).toContain(TITLE);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(`/blog/${SLUG}`);
  expect(await (await request.get("/blog")).text()).toContain(TITLE);

  /* The address is fixed once live. */
  await page.reload({ waitUntil: "load" });
  await page.getByLabel(/^Address/).fill(`${SLUG}-moved`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__fe", { hasText: "address is fixed" })).toBeVisible();

  await page.goto(editUrl, { waitUntil: "load" });
  await page.getByRole("radio", { name: /^Draft/ }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("draft");

  expect((await request.get(`/blog/${SLUG}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(`/blog/${SLUG}`);
});
