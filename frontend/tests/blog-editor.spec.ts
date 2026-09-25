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

/** The body is a rich-text editor now; it loads after the form. */
async function body(page: Page) {
  const doc = page.locator(".adRte__doc");
  await expect(doc).toBeVisible({ timeout: 60_000 });
  await doc.click();
  return doc;
}

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
}

test("a short description is refused with the count, and nothing is written", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill(TITLE);
  await page.getByLabel(/^Address/).fill(SLUG);
  await page.getByLabel(/^Service/).selectOption("branding");
  await page.getByLabel(/^Card sentence/).fill("What we look at before we touch a logo.");
  await page.getByLabel(/^Search result title/).fill("What a brand audit covers");
  await page.getByLabel(/^Meta description/).fill("Too short.");
  await expect(page.locator(".adBlog__count").nth(1)).toContainText("10 characters");
  await body(page);
  await page.keyboard.type("Most rebrands start in the wrong place.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__msg.is-bad")).toBeVisible();
  await expect(page.locator(".ad__fe", { hasText: "Between 120 and 155" })).toBeVisible();
  const rows = await db.query("SELECT 1 FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(rows.rowCount).toBe(0);
  /* What was typed survives the failure, body included. */
  await expect(page.getByLabel(/^Headline/)).toHaveValue(TITLE);
  await expect(page.locator(".adRte__doc")).toContainText("Most rebrands start in the wrong place.");
});

test("a draft is saved, invisible on /blog, and visible in preview to the owner", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/blog/new", { waitUntil: "load" });
  await page.getByLabel(/^Headline/).fill(TITLE);
  await page.getByLabel(/^Address/).fill(SLUG);
  await page.getByLabel(/^Service/).selectOption("branding");
  await page.getByLabel(/^Card sentence/).fill("What we look at before we touch a logo.");
  await page.getByLabel(/^Search result title/).fill("What a brand audit covers");
  await page.getByLabel(/^Meta description/).fill(DESCRIPTION);
  await body(page);
  await page.keyboard.type("Most rebrands start in the ");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("wrong place");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(".");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Heading", exact: true }).click();
  await page.keyboard.type("Where to start");
  await page.keyboard.press("Enter");
  await page.keyboard.type("With the customer, not the logo.");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Numbered list" }).click();
  await page.keyboard.type("Talk to five customers");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]{36}\?saved=1$/);
  editUrl = page.url().replace(/\?saved=1$/, "");

  const row = await db.query<{ status: string; body: unknown }>("SELECT status, body FROM blog_posts WHERE slug = $1", [SLUG]);
  expect(row.rows[0].status).toBe("draft");
  /* Stored as the cleaned document: the trailing empty line is gone. */
  expect(row.rows[0].body).toEqual({
    type: "doc",
    content: [
      { type: "paragraph", content: [
        { type: "text", text: "Most rebrands start in the " },
        { type: "text", text: "wrong place", marks: [{ type: "bold" }] },
        { type: "text", text: "." },
      ] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Where to start" }] },
      { type: "paragraph", content: [{ type: "text", text: "With the customer, not the logo." }] },
      { type: "orderedList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Talk to five customers" }] }] },
      ] },
    ],
  });

  /* A stranger sees nothing. */
  expect((await request.get(`/blog/${SLUG}`, { headers: { "x-boneyard-capture": "" } })).status()).toBe(404);

  /* The owner's preview shows it on the real page, marked as a preview. */
  await page.goto(`/api/blog/preview?slug=${SLUG}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/blog/${SLUG}$`));
  await expect(page.locator("h1")).toHaveText(TITLE);
  await expect(page.locator(".bl-preview")).toContainText("Preview");
  await expect(page.locator("#where-to-start")).toHaveText("Where to start");
  await expect(page.locator(".bl-body strong")).toHaveText("wrong place");
  await expect(page.locator(".bl-body ol li")).toHaveText("Talk to five customers");
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

test("two editors on one post: the second save is refused and says who saved", async ({ page, baseURL, context }) => {
  await asOwner(page, baseURL);
  /* Headers set on a page do not reach a second one; the context's do. */
  await context.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  const other = await context.newPage();
  await page.goto(editUrl, { waitUntil: "load" });
  await other.goto(editUrl, { waitUntil: "load" });

  await page.getByLabel(/^Card sentence/).fill("First editor's sentence.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Saved", { timeout: 30_000 });

  await other.getByLabel(/^Card sentence/).fill("Second editor's sentence.");
  await other.getByRole("button", { name: "Save" }).click();
  await expect(other.locator(".ad__msg.is-bad")).toContainText("WDC Admin saved this post at", { timeout: 30_000 });
  expect((await db.query("SELECT excerpt FROM blog_posts WHERE slug = $1", [SLUG])).rows[0].excerpt).toBe("First editor's sentence.");
  /* What they typed is still in front of them. */
  await expect(other.getByLabel(/^Card sentence/)).toHaveValue("Second editor's sentence.");

  /* The first editor holds the new version, so saving again is not refused. */
  await page.getByLabel(/^Card sentence/).fill("First editor, second save.");
  await page.getByRole("button", { name: "Save" }).click();
  /* The first save's "Saved" is still on screen, so wait on the row. */
  await expect.poll(async () => (await db.query("SELECT excerpt FROM blog_posts WHERE slug = $1", [SLUG])).rows[0].excerpt, { timeout: 30_000 })
    .toBe("First editor, second save.");
  await expect(page.locator(".ad__msg.is-bad")).toHaveCount(0);
  await other.close();
});

test("Blog is its own admin page, the old Settings address still lands there, and the list's actions work", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin", { waitUntil: "load" });
  const nav = page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Blog" });
  await expect(nav).toHaveAttribute("href", "/admin/blog");

  const moved = await request.get("/admin/settings/blog", { maxRedirects: 0 });
  expect([301, 308]).toContain(moved.status());
  expect(moved.headers()["location"]).toContain("/admin/blog");

  /* A draft to act on, written straight into the table. */
  const slug = `list-actions-${Date.now().toString(36)}`;
  await db.query(
    `INSERT INTO blog_posts (slug, title, seo_title, description, excerpt, topic, tags, cover, body, status)
     VALUES ($1, 'List actions check', 'List actions check', $2, 'One line.', 'seo', '[]'::JSONB, '/hero/ai-key.jpg', $3::JSONB, 'draft')`,
    [slug, DESCRIPTION, JSON.stringify([{ kind: "p", text: "Body." }])],
  );
  try {
    const row = () => page.locator("tbody tr", { hasText: "List actions check" });
    const act = async (item: string, verb: string) => {
      await page.goto("/admin/blog?q=list+actions", { waitUntil: "load" });
      await row().locator(".ad__rm").click();
      await page.locator(".ad__rmList [data-item]", { hasText: item }).click();
      await page.locator("dialog.addlg[open]").getByRole("button", { name: verb }).click();
      await expect(page.locator("dialog.addlg[open]")).toHaveCount(0, { timeout: 30_000 });
    };

    await act("Publish now", "Publish it");
    expect((await request.get(`/blog/${slug}`)).status()).toBe(200);

    await act("Move to draft", "Move to draft");
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);

    /* Refused without the owner's credential, served with it. */
    expect((await request.get("/admin/blog/export", { maxRedirects: 0 })).status()).toBe(307);
    expect((await request.get("/admin/blog/export", { headers: { cookie: "wdc.session_token=placeholder" } })).status()).toBe(404);
    const csv = await request.get("/admin/blog/export", { headers: { "x-boneyard-capture": TOKEN ?? "", cookie: "wdc.session_token=placeholder" } });
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain(`/blog/${slug}`);

    /* Trash, not deletion: the row stays, out of the list, and comes back. */
    await act("Move to the Trash", "Move to the Trash");
    expect((await db.query("SELECT trashed_at FROM blog_posts WHERE slug = $1", [slug])).rows[0].trashed_at).not.toBeNull();
    await expect(row()).toHaveCount(0);
    const trashed = () => page.locator("tbody tr", { hasText: "List actions check" });
    const inTrash = async (item: string, verb: string) => {
      await page.goto("/admin/blog?state=trash&q=list+actions", { waitUntil: "load" });
      await trashed().locator(".ad__rm").click();
      await page.locator(".ad__rmList [data-item]", { hasText: item }).click();
      await page.locator("dialog.addlg[open]").getByRole("button", { name: verb }).click();
      await expect(page.locator("dialog.addlg[open]")).toHaveCount(0, { timeout: 30_000 });
    };
    await inTrash("Restore", "Restore it");
    expect((await db.query("SELECT trashed_at, status FROM blog_posts WHERE slug = $1", [slug])).rows[0]).toMatchObject({ trashed_at: null, status: "draft" });

    await act("Move to the Trash", "Move to the Trash");
    await inTrash("Delete for good", "Delete it for good");
    expect((await db.query("SELECT 1 FROM blog_posts WHERE slug = $1", [slug])).rowCount).toBe(0);
  } finally {
    await db.query("DELETE FROM blog_posts WHERE slug = $1", [slug]);
  }
});
