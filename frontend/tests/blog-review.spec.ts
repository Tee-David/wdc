import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * STAFF WRITE, THE OWNER PUBLISHES.
 *
 * Staff can save a draft and submit it for review, and nothing else: the
 * editor does not offer Published, and the server refuses it if the form is
 * tampered with. The owner sees the queue on the Blog menu item and the
 * dashboard, sends a post back with a note the writer then sees, or
 * publishes it.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
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
const MARK = randomUUID().slice(0, 6);
const SLUG = `review-flow-${MARK}`;
const TITLE = `Review flow ${MARK}`;
const DESCRIPTION = "A plain guide to what a brand audit looks at, what it costs a small business in time, and the three questions it should answer before any redesign.";
let id = "";

test.beforeAll(async () => {
  const r = await db.query<{ id: string }>(
    `INSERT INTO blog_posts (slug, title, seo_title, description, excerpt, topic, tags, cover, body, status, saved_by, saved_at)
     VALUES ($1, $2, $2, $3, 'One line.', 'branding', '[]'::JSONB, '/hero/ai-key.jpg', $4::JSONB, 'draft', 'WDC Staff', now()) RETURNING id`,
    [SLUG, TITLE, DESCRIPTION, JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body." }] }] })],
  );
  id = r.rows[0].id;
});

test.afterAll(async () => {
  await db.query("DELETE FROM blog_posts WHERE slug = $1", [SLUG]);
  await db.end();
});

async function as(page: Page, baseURL: string | undefined, role: "owner" | "staff") {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}) });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const row = async () => (await db.query<{ status: string; submitted_by: string | null; review_note: string | null }>(
  "SELECT status, submitted_by, review_note FROM blog_posts WHERE id = $1", [id])).rows[0];

test("staff are offered draft or review, and the server refuses Published anyway", async ({ page, baseURL }) => {
  await as(page, baseURL, "staff");
  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await expect(page.getByRole("radio", { name: /^Submit for review/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Published/ })).toHaveCount(0);

  /* A tampered form: the Draft radio sent as "published". */
  await page.getByRole("radio", { name: /^Draft/ }).evaluate((el) => { (el as HTMLInputElement).value = "published"; });
  await page.getByRole("radio", { name: /^Draft/ }).check();
  await page.getByLabel(/^Date shown on the post/).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.getByText("Publishing is the owner's")).toBeVisible({ timeout: 30_000 });
  expect((await row()).status).toBe("draft");

  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await page.getByRole("radio", { name: /^Submit for review/ }).check();
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Submitted for review", { timeout: 30_000 });
  expect(await row()).toMatchObject({ status: "review", submitted_by: "WDC Staff" });
});

test("the owner sees the queue, and sends it back with a note the writer then sees", async ({ page, baseURL }) => {
  await as(page, baseURL, "owner");
  await page.goto("/admin", { waitUntil: "load" });
  /* The dashboard queue shows the six worst and may cut this row; the menu
     count is always there. */
  const nav = page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: /^Blog/ });
  await expect(nav).toContainText(/\d/);

  await page.goto("/admin/blog?state=review", { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: TITLE }).locator(".ad__pill")).toHaveText("In review");

  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await expect(page.getByText("Submitted by WDC Staff")).toBeVisible();
  await page.getByLabel(/^What to change/).fill("Open with the bakery example, not the definition.");
  await page.getByRole("button", { name: "Send it back" }).click();
  await expect.poll(async () => (await row()).status, { timeout: 30_000 }).toBe("draft");
  expect((await row()).review_note).toBe("Open with the bakery example, not the definition.");

  await as(page, baseURL, "staff");
  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await expect(page.getByText("Sent back by WDC Admin:")).toBeVisible();
  await expect(page.getByText("Open with the bakery example")).toBeVisible();
});

test("resubmitting clears the note; the owner publishes; staff cannot then edit it", async ({ page, baseURL, request }) => {
  await as(page, baseURL, "staff");
  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await page.getByRole("radio", { name: /^Submit for review/ }).check();
  await page.getByRole("button", { name: /^(Save|Update)$/ }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Submitted for review", { timeout: 30_000 });
  expect(await row()).toMatchObject({ status: "review", review_note: null });

  await as(page, baseURL, "owner");
  await page.goto(`/admin/blog?state=review&q=${MARK}`, { waitUntil: "load" });
  await page.locator("tbody tr", { hasText: TITLE }).locator(".ad__rm").click();
  await page.locator(".ad__rmList [data-item]", { hasText: "Publish now" }).click();
  await page.locator("dialog.addlg[open]").getByRole("button", { name: "Publish it" }).click();
  await expect(page.locator("dialog.addlg[open]")).toHaveCount(0, { timeout: 30_000 });
  expect((await row()).status).toBe("published");
  expect((await request.get(`/blog/${SLUG}`)).status()).toBe(200);

  await as(page, baseURL, "staff");
  await page.goto(`/admin/blog/${id}`, { waitUntil: "load" });
  await expect(page.getByText("This post is live")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Save|Update)$/ })).toHaveCount(0);
});
