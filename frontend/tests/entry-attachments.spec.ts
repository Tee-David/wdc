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
  const open = await pdf.getByRole("link", { name: "Open" }).getAttribute("href");
  expect(open).toContain(`/onboarding/${id}/a${TAG}.pdf?`);
  expect(open).toContain("X-Amz-Signature=");
  const dl = await pdf.getByRole("link", { name: "Download" }).getAttribute("href");
  expect(decodeURIComponent(dl!)).toContain('attachment; filename="Brand Book.pdf"');

  /* The picture shows as a picture, from the same signed link. */
  await expect(panel.locator(".adAtt__file", { hasText: "photo.jpg" }).locator("img")).toHaveAttribute("src", /b.*\.jpg\?/);
  /* And the one with no record says why, rather than vanishing. */
  await expect(panel.locator(".adAtt__file", { hasText: "old-scan.png" })).toContainText("Ask the client to send it again");
});
