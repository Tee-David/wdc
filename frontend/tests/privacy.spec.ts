import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { choose } from "./choose";

/**
 * SETTINGS, PRIVACY: retention rules applied by the daily tidy, and one
 * person's request to see or erase what is held about them.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION || !TOKEN, "Needs the database and BONEYARD_CAPTURE_TOKEN.");
test.skip(Boolean(process.env.SMTP_HOST), "Mail is configured here.");

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
const MARK = randomUUID().slice(0, 8);
const EMAIL = `wdc-privacy-${MARK}@example.com`;
const ACCOUNT = `wdc-privacy-acct-${MARK}@example.com`;
/* `page.request` does not carry the page's extra headers, so a download says who it is itself. */
const OWNER = { "x-boneyard-capture": TOKEN ?? "", cookie: "wdc.session_token=placeholder" };
const STAFF = { ...OWNER, "x-boneyard-capture-role": "staff" };
const hash = (e: string) => createHash("sha256").update(e).digest("hex");
const ids: { old?: string; recent?: string; ancient?: string; enquiry?: string; brief?: string } = {};
const userId = randomUUID();

test.afterAll(async () => {
  await db.query("DELETE FROM app_settings WHERE key = 'privacy.retention'");
  await db.query("DELETE FROM onboarding_submissions WHERE id = ANY($1::UUID[])", [[ids.old, ids.recent, ids.brief].filter(Boolean)]);
  await db.query("DELETE FROM contact_enquiries WHERE id = ANY($1::UUID[])", [[ids.ancient, ids.enquiry].filter(Boolean)]);
  await db.query("DELETE FROM newsletter_subscribers WHERE email = $1", [EMAIL]);
  await db.query("DELETE FROM message_log WHERE dedupe_key LIKE $1", [`privacy-spec:${MARK}%`]);
  await db.query("DELETE FROM privacy_requests WHERE email_hash = ANY($1::TEXT[])", [[hash(EMAIL), hash(ACCOUNT)]]);
  await db.query(`DELETE FROM "user" WHERE "id" = $1`, [userId]);
  await db.end();
});

async function asRole(page: Page, baseURL: string | undefined, role: "owner" | "staff" = "owner") {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}) });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("retention: the daily tidy deletes an old unfinished brief and anonymises an old enquiry", async ({ page, baseURL }) => {
  const draft = (days: number) => db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, answers, updated_at) VALUES ('web', 'in_progress', $1::JSONB, now() - ($2::INT * INTERVAL '1 day')) RETURNING id`,
    [JSON.stringify({ company: `Draft ${MARK}` }), days]).then((r) => r.rows[0].id);
  ids.old = await draft(60);
  ids.recent = await draft(5);
  ids.ancient = (await db.query<{ id: string }>(
    `INSERT INTO contact_enquiries (first_name, last_name, email, topic, message, created_at) VALUES ('Old', $1, 'old-enquirer@example.com', 'Other', 'An old question.', now() - INTERVAL '800 days') RETURNING id`,
    [`Enq${MARK}`])).rows[0].id;

  await asRole(page, baseURL);
  await page.goto("/admin/settings/privacy", { waitUntil: "load" });
  await choose(page.getByLabel(/^Unfinished onboarding forms/), "30");
  await choose(page.getByLabel(/^Contact enquiries/), "730");
  /* Retention is on the shared save bar, like the rest of Settings. */
  await page.getByRole("region", { name: "Unsaved changes" }).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast", { hasText: "Saved." })).toBeVisible({ timeout: 20_000 });

  await page.goto("/admin/settings/email/log", { waitUntil: "load" });
  /* The tidy is a chore, so it is in the head's ⋮ menu behind one sentence. */
  await page.getByRole("button", { name: "More for the message log" }).click();
  await page.getByRole("menuitem", { name: "Run the daily tidy now" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Run it now" }).click();
  await expect(page.locator(".adToast", { hasText: "Done." })).toBeVisible({ timeout: 60_000 });

  expect((await db.query("SELECT 1 FROM onboarding_submissions WHERE id = $1", [ids.old])).rowCount).toBe(0);
  expect((await db.query("SELECT 1 FROM onboarding_submissions WHERE id = $1", [ids.recent])).rowCount).toBe(1);
  expect((await db.query("SELECT first_name, email, message FROM contact_enquiries WHERE id = $1", [ids.ancient])).rows[0])
    .toMatchObject({ first_name: "Removed", email: "" });
  await page.goto("/admin/settings/privacy", { waitUntil: "load" });
  /* The last run is shown as figures, zeros left out. */
  await expect(page.locator(".adPriv__figs")).toContainText(/unfinished briefs? deleted/);
});

test("a lookup finds the address everywhere, and exports it as JSON and CSV, logged", async ({ page, baseURL }) => {
  ids.enquiry = (await db.query<{ id: string }>(
    `INSERT INTO contact_enquiries (first_name, last_name, email, topic, message) VALUES ('Ada', $1, $2, 'Other', 'Please build us a clinic website.') RETURNING id`,
    [`Priv${MARK}`, EMAIL])).rows[0].id;
  ids.brief = (await db.query<{ id: string }>(
    `INSERT INTO onboarding_submissions (service, status, answers, submitted_at) VALUES ('seo', 'submitted', $1::JSONB, now()) RETURNING id`,
    [JSON.stringify({ email: EMAIL, first_name: "Ada", company: `Clinic ${MARK}` })])).rows[0].id;
  await db.query("INSERT INTO newsletter_subscribers (email, email_as_typed, source) VALUES ($1, $1, 'footer')", [EMAIL]);
  await db.query(`INSERT INTO message_log (channel, to_addr, subject, summary, state, sent_by, dedupe_key) VALUES ('Email', $1, 'We have your message', 'Receipt.', 'Sent', 'Website', $2)`, [EMAIL, `privacy-spec:${MARK}`]);

  await asRole(page, baseURL);
  await page.goto(`/admin/settings/privacy?email=${encodeURIComponent(EMAIL)}`, { waitUntil: "load" });
  const found = page.locator(".ad__panel", { hasText: "A request about one person" });
  for (const label of ["Contact enquiries", "Onboarding briefs", "Newsletter", "Emails sent to them"]) {
    await expect(found.locator(".adForms__dl > div", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd")).toHaveText("1");
  }

  const json = await page.request.get(`/admin/settings/privacy/export?email=${encodeURIComponent(EMAIL)}&format=json`, { headers: OWNER });
  expect(json.headers()["content-disposition"]).toContain("attachment");
  const body = await json.json();
  expect(body.enquiries[0].message).toBe("Please build us a clinic website.");
  expect(body.briefs[0].answers.company).toBe(`Clinic ${MARK}`);
  const csv = await (await page.request.get(`/admin/settings/privacy/export?email=${encodeURIComponent(EMAIL)}&format=csv`, { headers: OWNER })).text();
  expect(csv).toContain('"section","record","field","value"');
  expect(csv).toContain(`Clinic ${MARK}`);
  expect((await db.query("SELECT 1 FROM privacy_requests WHERE email_hash = $1 AND kind = 'export'", [hash(EMAIL)])).rowCount).toBe(2);
});

test("erasing needs the address typed, anonymises everything, and an import cannot bring it back", async ({ page, baseURL }) => {
  await asRole(page, baseURL);
  await page.goto(`/admin/settings/privacy?email=${encodeURIComponent(EMAIL)}`, { waitUntil: "load" });
  await page.getByLabel(/^Type .* to erase it/).fill("someone-else@example.com");
  await page.getByRole("button", { name: "Erase" }).click();
  await expect(page.getByText("Type the address exactly")).toBeVisible({ timeout: 20_000 });
  expect((await db.query("SELECT email FROM contact_enquiries WHERE id = $1", [ids.enquiry])).rows[0].email).toBe(EMAIL);

  await page.getByLabel(/^Type .* to erase it/).fill(EMAIL);
  await page.getByRole("button", { name: "Erase" }).click();
  await expect(page.locator(".ad__msg.is-ok")).toContainText("Erased", { timeout: 20_000 });

  expect((await db.query("SELECT first_name, email, message FROM contact_enquiries WHERE id = $1", [ids.enquiry])).rows[0]).toMatchObject({ first_name: "Erased", email: "" });
  expect((await db.query("SELECT answers, email FROM onboarding_submissions WHERE id = $1", [ids.brief])).rows[0]).toMatchObject({ answers: {}, email: null });
  expect((await db.query("SELECT 1 FROM newsletter_subscribers WHERE email = $1", [EMAIL])).rowCount).toBe(0);
  expect((await db.query("SELECT to_addr FROM message_log WHERE dedupe_key = $1", [`privacy-spec:${MARK}`])).rows[0].to_addr).toBe("erased");
  expect((await db.query("SELECT 1 FROM privacy_requests WHERE email_hash = $1 AND kind = 'erase'", [hash(EMAIL)])).rowCount).toBe(1);

  /* A list somebody kept does not sign them up again. */
  await page.goto("/admin/forms/newsletter", { waitUntil: "load" });
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.locator("dialog.addlg[open]");
  await dialog.locator('input[type="file"]').setInputFiles({ name: "list.csv", mimeType: "text/csv", buffer: Buffer.from(`email\n${EMAIL}\n`) });
  await dialog.getByRole("checkbox", { name: /asked to hear from the studio/ }).check();
  await dialog.getByRole("button", { name: "Import" }).click();
  await expect(dialog.locator(".ad__msg.is-ok")).toContainText("0 added", { timeout: 20_000 });
  expect((await db.query("SELECT 1 FROM newsletter_subscribers WHERE email = $1", [EMAIL])).rowCount).toBe(0);
});

test("an address with an account is not erased from here; staff are refused", async ({ page, baseURL }) => {
  await db.query(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "role") VALUES ($1, 'Account Holder', $2, true, 'client')`, [userId, ACCOUNT]);
  await asRole(page, baseURL);
  await page.goto(`/admin/settings/privacy?email=${encodeURIComponent(ACCOUNT)}`, { waitUntil: "load" });
  await expect(page.getByText("This address has an account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Erase" })).toHaveCount(0);

  await asRole(page, baseURL, "staff");
  await page.goto("/admin/settings/privacy", { waitUntil: "load" });
  await expect(page.getByText("Privacy is for the owner")).toBeVisible();
  expect((await page.request.get(`/admin/settings/privacy/export?email=${encodeURIComponent(ACCOUNT)}`, { headers: STAFF })).status()).toBe(404);
});
