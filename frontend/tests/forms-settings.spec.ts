import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import pg from "pg";

/**
 * A FORM'S SETTINGS ARE ENFORCED WHERE THE ENTRY IS SAVED.
 *
 * Each is set through the admin's own Settings tab and then proved against
 * the public route: a closed form refuses the POST, a blocked word files the
 * entry under Spam and mails nobody, a switched-off email leaves a Skipped
 * row, and the visitor gets the studio's own words back. Run with no mail
 * server, so nothing real is sent.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.skip(Boolean(process.env.SMTP_HOST), "Mail is configured here, so this would send real email.");

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
const EMAIL = `wdc-settings-${MARK}@wedigcreativity.com.ng`;

test.afterAll(async () => {
  await db.query("DELETE FROM form_settings WHERE form_key IN ('contact', 'onboarding-seo')");
  await db.query("DELETE FROM message_log WHERE dedupe_key IN (SELECT 'enquiry-receipt:' || id::TEXT FROM contact_enquiries WHERE email = $1) OR dedupe_key IN (SELECT 'enquiry:' || id::TEXT FROM contact_enquiries WHERE email = $1)", [EMAIL]);
  await db.query("DELETE FROM contact_enquiries WHERE email = $1", [EMAIL]);
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

/* A fresh "address" per post, so the contact route's per-caller limit is not what is being tested. */
const enquire = (request: APIRequestContext, message: string) => request.post("/api/contact", {
  headers: { "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
  data: { first: "Kemi", last: `Settings${MARK}`, email: EMAIL, phone: "", topic: "Web Development", message },
});

async function openSettings(page: Page, form = "contact") {
  await page.goto(`/admin/forms/${form}?view=settings`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Taking entries" })).toBeVisible();
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.locator(".ad__msg").first()).toContainText("Saved", { timeout: 20_000 });
}

test("a closed form refuses the POST with the studio's message, and says Closed on the list", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await openSettings(page);
  await page.getByRole("checkbox", { name: /takes new entries/ }).uncheck();
  await page.getByLabel(/^What a visitor sees when it is closed/).fill(`Back on Monday ${MARK}.`);
  await save(page);

  const res = await enquire(request, "A real question about building a website for us.");
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe(`Back on Monday ${MARK}.`);

  await page.goto("/admin/forms", { waitUntil: "load" });
  await expect(page.locator("tr", { hasText: "Contact" }).first()).toContainText("Closed");

  await openSettings(page);
  await page.getByRole("checkbox", { name: /takes new entries/ }).check();
  await save(page);
  expect((await enquire(request, "A real question about building a website for us.")).status()).toBe(200);
});

test("a blocked word keeps the enquiry in Spam and mails nobody", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await openSettings(page);
  await page.getByLabel(/^Blocked words/).fill(`casino${MARK}`);
  await save(page);

  const res = await enquire(request, `Great offers at casino${MARK} dot com, visit now.`);
  expect(res.status()).toBe(200);
  const row = await db.query<{ id: string; box: string; delivery: string }>(
    "SELECT id, box, delivery FROM contact_enquiries WHERE email = $1 AND message LIKE $2", [EMAIL, `%casino${MARK}%`],
  );
  expect(row.rows[0].box).toBe("spam");
  expect(row.rows[0].delivery).toBe("skipped");
  await page.waitForTimeout(1500);
  const mails = await db.query("SELECT 1 FROM message_log WHERE dedupe_key LIKE $1", [`%:${row.rows[0].id}`]);
  expect(mails.rowCount).toBe(0);
});

test("a switched-off email leaves a Skipped row, and the visitor gets the studio's words", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await openSettings(page);
  await page.getByLabel(/^Blocked words/).fill("");
  const receipt = page.locator("fieldset", { hasText: "Receipt to the sender" });
  await receipt.getByRole("checkbox", { name: "Send this email" }).uncheck();
  await page.getByLabel(/^Heading/).fill("Thanks, {first_name}");
  await page.getByLabel(/^Message/).fill("We will be in touch within a day.");
  await save(page);

  const res = await enquire(request, "Another real question, about a shop this time.");
  expect(res.status()).toBe(200);
  expect((await res.json()).confirmation).toEqual({ heading: "Thanks, Kemi", message: "We will be in touch within a day." });

  const id = (await db.query<{ id: string }>("SELECT id FROM contact_enquiries WHERE email = $1 AND message LIKE 'Another real question%'", [EMAIL])).rows[0].id;
  await expect.poll(async () => (await db.query<{ state: string; summary: string }>(
    "SELECT state, summary FROM message_log WHERE dedupe_key = $1", [`enquiry-receipt:${id}`],
  )).rows[0]?.state, { timeout: 20_000 }).toBe("Skipped");
});

test("an address that is not one is refused, and nothing is saved", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await openSettings(page);
  const notice = page.locator("fieldset", { hasText: "Notice to the studio" });
  await notice.getByLabel(/^Copy to/).fill("not-an-address");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.locator(".ad__fe", { hasText: "Not an email address: not-an-address" })).toBeVisible({ timeout: 20_000 });
});

test("closing an onboarding service stops new briefs for it, not the others", async ({ page, baseURL, request }) => {
  await asOwner(page, baseURL);
  await openSettings(page, "onboarding-seo");
  await page.getByRole("checkbox", { name: /takes new entries/ }).uncheck();
  await page.getByLabel(/^What a visitor sees when it is closed/).fill("SEO is full this month.");
  await save(page);

  const draft = (service: string) => request.post("/api/onboarding/draft", {
    headers: { "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.1`, origin: baseURL ?? "http://localhost:3100" },
    data: { service, currentStep: 0, answers: { first_name: "Ada" } },
  });
  const seo = await draft("seo");
  expect(seo.status()).toBe(403);
  expect((await seo.json()).error).toBe("SEO is full this month.");

  /* The picker says so on the card. */
  await page.goto("/onboarding", { waitUntil: "load" });
  await expect(page.locator(".ob__svcCard.is-shut")).toContainText("SEO is full this month.");
});

test("staff do not get a Settings tab", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/forms/contact?view=settings", { waitUntil: "load" });
  await expect(page.getByRole("navigation", { name: "Contact sections" }).getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Taking entries" })).toHaveCount(0);
});
