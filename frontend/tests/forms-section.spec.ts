import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * THE FORMS SECTION, END TO END, ON THE CONTACT FORM.
 *
 * Real rows in the real tables: an enquiry is numbered when it arrives, shows
 * as new, is read when opened, can be starred, noted, trashed and put back,
 * and exports as CSV and XLSX with the filters that were on screen. Staff can
 * do the inbox work but not export or delete for good.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL: entries are database rows.");
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
const LAST = `Balogun${MARK}`;
const EMAIL = `wdc-forms-${MARK}@wedigcreativity.com.ng`;
let id = "";
let serial = 0;

/* `page.request` does not send the page's extra headers, so a download is
   asked for with them spelled out. */
const creds = (role: "owner" | "staff") => ({
  "x-boneyard-capture": TOKEN ?? "", cookie: "wdc.session_token=placeholder",
  ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}),
});

async function as(page: Page, role: "owner" | "staff", baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}) });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test.beforeAll(async () => {
  /* Through the table rather than the route, so no mail is attempted; the
     numbering is the same statement the route runs. */
  const r = await db.query<{ id: string }>(
    `INSERT INTO contact_enquiries (first_name, last_name, email, topic, message, delivery)
     VALUES ('Kemi', $1, $2, 'Web Development', '=HYPERLINK("http://evil.example","click") and a real question about a site.', 'failed')
     RETURNING id`,
    [LAST, EMAIL],
  );
  id = r.rows[0].id;
  const n = await db.query<{ last: string }>(`
    WITH n AS (INSERT INTO form_counters (form_key, last) VALUES ('contact', 1)
      ON CONFLICT (form_key) DO UPDATE SET last = form_counters.last + 1 RETURNING last)
    UPDATE contact_enquiries SET serial = n.last FROM n WHERE contact_enquiries.id = $1 RETURNING n.last
  `, [id]);
  serial = Number(n.rows[0].last);
});

test.afterAll(async () => {
  await db.query("DELETE FROM entry_events WHERE entry_id = $1", [id]);
  await db.query("DELETE FROM contact_enquiries WHERE id = $1", [id]);
  await db.end();
});

test("the enquiry is numbered, new, and counted on the forms list", async ({ page, baseURL }) => {
  await as(page, "owner", baseURL);
  await page.goto("/admin/forms", { waitUntil: "load" });
  const contact = page.locator("tr", { hasText: "Contact" }).first();
  await expect(contact).toContainText("unread of");
  await expect(contact).toContainText("not delivered");

  await page.goto(`/admin/forms/contact?q=${LAST}`, { waitUntil: "load" });
  const row = page.locator("tbody tr", { hasText: LAST });
  await expect(row).toContainText(`Enquiry #${serial}`);
  await expect(row).toContainText("New");
  await expect(row).toContainText("Not delivered");
});

test("opening it reads it; star, note, trash and put back all land on its history", async ({ page, baseURL }) => {
  await as(page, "owner", baseURL);
  await page.goto(`/admin/forms/contact/entries/${id}`, { waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText(`Kemi ${LAST}`);
  await expect.poll(async () => (await db.query("SELECT read_at FROM contact_enquiries WHERE id = $1", [id])).rows[0].read_at, { timeout: 10_000 }).not.toBeNull();

  await page.getByRole("button", { name: "Star", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unstar" })).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Add a note").fill("Called back, wants a quote by Friday.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.locator(".adForms__timeline").first()).toContainText("Called back, wants a quote by Friday.", { timeout: 20_000 });
  await expect(page.locator(".adForms__timeline").first()).toContainText("Starred");

  await page.goto(`/admin/forms/contact?tab=starred&q=${LAST}`, { waitUntil: "load" });
  const row = page.locator("tbody tr", { hasText: LAST });
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("New");

  /* Ticked and trashed from the table, then put back from Trash. */
  await row.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("moved to Trash", { timeout: 20_000 });
  expect((await db.query("SELECT box FROM contact_enquiries WHERE id = $1", [id])).rows[0].box).toBe("trash");

  await page.goto(`/admin/forms/contact?tab=trash&q=${LAST}`, { waitUntil: "load" });
  await page.locator("tbody tr", { hasText: LAST }).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Put back" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("put back", { timeout: 20_000 });
  expect((await db.query("SELECT box FROM contact_enquiries WHERE id = $1", [id])).rows[0].box).toBe("inbox");
});

test("a filter that matches nothing says so, with a way back", async ({ page, baseURL }) => {
  await as(page, "owner", baseURL);
  await page.goto(`/admin/forms/contact?q=nothing-matches-${MARK}`, { waitUntil: "load" });
  await expect(page.getByText("Nothing matches these filters")).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
});

test("the column choice is remembered and drawn by the server", async ({ page, baseURL }) => {
  await as(page, "owner", baseURL);
  await page.goto("/admin/forms/contact", { waitUntil: "load" });
  await page.getByText("Columns", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Phone" }).check();
  await page.getByRole("checkbox", { name: "Message" }).uncheck();
  await page.getByRole("button", { name: "Save columns" }).click();
  await expect(page.locator("thead th", { hasText: "Phone" })).toBeVisible({ timeout: 20_000 });
  await page.reload({ waitUntil: "load" });
  await expect(page.locator("thead th", { hasText: "Phone" })).toBeVisible();
  await expect(page.locator("thead th", { hasText: "Message" })).toHaveCount(0);
  /* Put it back for the next run. */
  await page.getByText("Columns", { exact: true }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("thead th", { hasText: "Message" })).toBeVisible({ timeout: 20_000 });
});

test("CSV and XLSX export what the filter shows, with formulas defused", async ({ page, baseURL }) => {
  await as(page, "owner", baseURL);
  const csv = await page.request.get(`/admin/forms/contact/export?format=csv&q=${LAST}`, { headers: creds("owner") });
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain(EMAIL);
  expect(text.split("\r\n").filter(Boolean)).toHaveLength(2);
  /* The message starts with "=", so it is written as text, not a formula. */
  expect(text).toContain(`"'=HYPERLINK`);

  const xlsx = await page.request.get(`/admin/forms/contact/export?format=xlsx&id=${id}`, { headers: creds("owner") });
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
  const bytes = Buffer.from(await xlsx.body());
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  /* Stored, not compressed, so the sheet's text is in the file as written. */
  expect(bytes.toString("utf8")).toContain(EMAIL);
  expect(bytes.toString("utf8")).toContain('t="inlineStr"');
});

test("staff work the inbox, but cannot export or delete for good", async ({ page, baseURL }) => {
  await as(page, "staff", baseURL);
  await page.goto(`/admin/forms/contact?q=${LAST}`, { waitUntil: "load" });
  await expect(page.locator("tbody tr", { hasText: LAST })).toBeVisible();
  await expect(page.getByRole("link", { name: "CSV", exact: true })).toHaveCount(0);
  expect((await page.request.get(`/admin/forms/contact/export?format=csv&q=${LAST}`, { headers: creds("staff") })).status()).toBe(404);

  await page.goto(`/admin/forms/contact?tab=trash`, { waitUntil: "load" });
  await expect(page.getByRole("button", { name: "Delete for good" })).toHaveCount(0);
});
