import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
let siblingId = "";

test.beforeAll(async () => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const configured = process.env.COCKROACHDB_CERT || "";
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
  id = (await db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, current_step, answers, email, submitted_at)
     VALUES ('branding', 'submitted', 4, $1::JSONB, $2, now()) RETURNING id`,
    [JSON.stringify({ first_name: "Ada", last_name: "Eze", email: `att-${TAG}@example.com`, company: COMPANY,
                      has_brandbook: "Yes", brandbook_file: ["Brand Book.pdf"], assets: ["photo.jpg", "old-scan.png"],
                      channel: ["Your client portal", "Email"] }), `att-${TAG}@example.com`],
  )).rows[0].id;
  siblingId = (await db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, current_step, answers, email, submitted_at)
     VALUES ('branding', 'submitted', 4, $1::JSONB, $2, now() - INTERVAL '1 minute') RETURNING id`,
    [JSON.stringify({ first_name: "Noah", last_name: "Okafor", email: `nav-${TAG}@example.com`, company: `Navigation ${TAG} Ltd` }), `nav-${TAG}@example.com`],
  )).rows[0].id;
  await db.query("INSERT INTO onboarding_uploads (draft_id, object_key, filename, bytes, content_type) VALUES ($1, $2, 'Brand Book.pdf', 1468000, 'application/pdf'), ($1, $3, 'photo.jpg', 2100000, 'image/jpeg')",
    [id, `onboarding/${id}/a${TAG}.pdf`, `onboarding/${id}/b${TAG}.jpg`]);
});
test.afterAll(async () => {
  await db.query("DELETE FROM onboarding_uploads WHERE draft_id = $1", [id]);
  await db.query("DELETE FROM onboarding_submissions WHERE id = ANY($1::UUID[])", [[id, siblingId]]);
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
  await expect(page.locator('[data-tour="entry-answers"]')).toContainText("Your client portal, Email");
});

test("on phone widths the files stay a rail inside their panel", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(`/admin/forms/onboarding-branding/entries/${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-tour="entry-answers"]')).toBeVisible({ timeout: 60_000 });
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 780 });
    const panel = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Attachments" }) });
    const answers = page.locator('[data-tour="entry-answers"]');
    const rail = panel.locator(".adAtt");
    const [a, b, r] = [await answers.boundingBox(), await panel.boundingBox(), await rail.boundingBox()];
    expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
    expect(b!.x + b!.width).toBeLessThanOrEqual(width);
    expect(r!.x + r!.width).toBeLessThanOrEqual(b!.x + b!.width + 0.5);

    const m = await rail.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(m.sw).toBeGreaterThan(m.cw);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const box of await panel.locator(".adAtt__acts .ad__btn").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  }
});

test("on phone widths the tour and equal entry navigation controls align in the page head", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(`/admin/forms/onboarding-branding/entries/${id}`, { waitUntil: "domcontentloaded" });
  const actions = page.locator(".ad__head > .ad__row");
  const tour = actions.getByRole("button", { name: /this page/ });
  const nav = actions.getByRole("navigation");
  await expect(tour).toBeVisible({ timeout: 60_000 });
  await expect(nav).toBeVisible();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 780 });
    const [actionBox, tourBox, navBox] = [await actions.boundingBox(), await tour.boundingBox(), await nav.boundingBox()];
    expect(tourBox!.width).toBeGreaterThanOrEqual(actionBox!.width - 1);
    expect(navBox!.width).toBeGreaterThanOrEqual(actionBox!.width - 1);

    const [previousBox, nextBox, counterBox] = [
      await nav.getByText("Previous", { exact: true }).boundingBox(),
      await nav.getByText("Next", { exact: true }).boundingBox(),
      await nav.locator(".adEntryNav__at").boundingBox(),
    ];
    expect(Math.abs(previousBox!.width - nextBox!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(previousBox!.height - nextBox!.height)).toBeLessThanOrEqual(1);
    expect(Math.abs((counterBox!.x + counterBox!.width / 2) - (navBox!.x + navBox!.width / 2))).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
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
