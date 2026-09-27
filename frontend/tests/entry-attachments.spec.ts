import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * A brief's uploads can be opened from its entry page (migration 0030,
 * lib/onboarding-files.ts). The answer keeps only names; the upload row keeps
 * where each file went, and the page turns that into signed links. A name with
 * no row (a brief from before 0030) is listed and says why it cannot open.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });

const TAG = randomUUID().slice(0, 6);
const COMPANY = `Attach ${TAG} Ltd`;
let db: pg.Pool;
let id = "";

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  db = new pg.Pool({ connectionString: url.toString(), max: 2 });
  id = (await db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, current_step, answers, email, submitted_at)
     VALUES ('branding', 'submitted', 4, $1::JSONB, $2, now()) RETURNING id`,
    [JSON.stringify({ first_name: "Ada", last_name: "Eze", email: `att-${TAG}@example.com`, company: COMPANY,
                      has_brandbook: "Yes", brandbook_file: ["Brand Book.pdf"], assets: ["photo.jpg", "old-scan.png"] }), `att-${TAG}@example.com`],
  )).rows[0].id;
  await db.query("INSERT INTO onboarding_uploads (draft_id, object_key, filename, bytes, content_type) VALUES ($1, $2, 'Brand Book.pdf', 1468000, 'application/pdf'), ($1, $3, 'photo.jpg', 2100000, 'image/jpeg')",
    [id, `onboarding/${id}/a${TAG}.pdf`, `onboarding/${id}/b${TAG}.jpg`]);
});
test.afterAll(async () => {
  await db.query("DELETE FROM onboarding_uploads WHERE draft_id = $1", [id]);
  await db.query("DELETE FROM onboarding_submissions WHERE id = $1", [id]);
  await db.end();
});

test("the entry page lists every upload with signed Open and Download links", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto(`/admin/forms/onboarding-branding/entries/${id}`, { waitUntil: "networkidle" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Attachments" }) });
  await expect(panel).toBeVisible();
  await expect(panel.locator(".adAtt__file")).toHaveCount(3);

  const pdf = panel.locator(".adAtt__file", { hasText: "Brand Book.pdf" });
  const open = await pdf.getByRole("link", { name: /^Open / }).getAttribute("href");
  expect(open).toContain(`/onboarding/${id}/a${TAG}.pdf?`);
  expect(open).toContain("X-Amz-Signature=");
  const dl = await pdf.getByRole("link", { name: /^Download / }).getAttribute("href");
  expect(decodeURIComponent(dl!)).toContain('attachment; filename="Brand Book.pdf"');

  /* The picture shows as a picture, from the same signed link. */
  await expect(panel.locator(".adAtt__file", { hasText: "photo.jpg" }).locator("img")).toHaveAttribute("src", /b.*\.jpg\?/);
  /* And the one with no record says why, rather than vanishing. */
  await expect(panel.locator(".adAtt__file", { hasText: "old-scan.png" })).toContainText("Ask the client to send it again");
});

test("on a phone the files come after the answers, as a rail that scrolls inside its panel", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto(`/admin/forms/onboarding-branding/entries/${id}`, { waitUntil: "networkidle" });
  const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Attachments" }) });
  const answers = page.locator('[data-tour="entry-answers"]');
  const [a, b] = [await answers.boundingBox(), await panel.boundingBox()];
  expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);

  const rail = panel.locator(".adAtt");
  const m = await rail.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  expect(m.sw).toBeGreaterThan(m.cw);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  for (const box of await panel.locator(".adAtt__acts .ad__btn").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
});

test("Download PDF gives the whole entry as an A4 PDF, and nobody else can fetch it", async ({ page, request }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto(`/admin/forms/onboarding-branding/entries/${id}`, { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: "Download PDF" });
  await expect(link).toHaveAttribute("href", `/admin/forms/onboarding-branding/entries/${id}/pdf`);

  const res = await page.request.get(`/admin/forms/onboarding-branding/entries/${id}/pdf`, { headers: { "x-boneyard-capture": TOKEN ?? "" } });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["content-disposition"]).toContain(".pdf");
  const bytes = await res.body();
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  expect(doc.getTitle()).toMatch(/brief/i);
  const { width: w, height: h } = doc.getPage(0).getSize();
  expect(Math.round(w)).toBe(595);
  expect(Math.round(h)).toBe(842);

  /* Signed out: the same 404 as an entry that does not exist. */
  const anon = await request.get(`/admin/forms/onboarding-branding/entries/${id}/pdf`, { maxRedirects: 0 });
  expect([404, 307, 302]).toContain(anon.status());
  expect(anon.headers()["content-type"] ?? "").not.toContain("application/pdf");
});
