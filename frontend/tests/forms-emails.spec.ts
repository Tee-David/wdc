import fs from "node:fs";
import path from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { choose } from "./choose";

/**
 * A FORM'S EMAILS: RESEND, PREVIEW, UNSUBSCRIBE, IMPORT.
 *
 * Run with no mail server: a resend is refused by the mail path and says so,
 * on the entry's history and on the original message's trail. The preview is
 * the real email for the latest real entry. The unsubscribe link only works
 * with its signature and only on a press, and an import never puts back
 * somebody who left.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.BETTER_AUTH_SECRET || "";

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
const EMAIL = `wdc-emails-${MARK}@wedigcreativity.com.ng`;
const SUB = `wdc-sub-${MARK}@example.com`;
const LEFT = `wdc-left-${MARK}@example.com`;
const NEW1 = `wdc-new1-${MARK}@example.com`;
const NEW2 = `wdc-new2-${MARK}@example.com`;
let id = "";

test.afterAll(async () => {
  const ids = (await db.query<{ id: string }>("SELECT id FROM contact_enquiries WHERE email = $1", [EMAIL])).rows.map((r) => r.id);
  for (const x of ids) await db.query("DELETE FROM message_log WHERE dedupe_key LIKE $1", [`%${x}%`]);
  await db.query("DELETE FROM entry_events WHERE entry_id = ANY($1::UUID[])", [ids]);
  await db.query("DELETE FROM contact_enquiries WHERE email = $1", [EMAIL]);
  await db.query("DELETE FROM newsletter_subscribers WHERE email = ANY($1::TEXT[])", [[SUB, LEFT, NEW1, NEW2]]);
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

test("a resend is rebuilt from the entry, and a refusal lands on its history and the original's trail", async ({ page, baseURL, request }) => {
  const res = await request.post("/api/contact", {
    headers: { "x-forwarded-for": `10.7.${Math.floor(Math.random() * 250)}.9` },
    data: { first: "Tunde", last: `Emails${MARK}`, email: EMAIL, phone: "", topic: "Branding & Design", message: "A real question about a logo refresh for a bakery." },
  });
  expect(res.status()).toBe(200);
  id = (await db.query<{ id: string }>("SELECT id FROM contact_enquiries WHERE email = $1", [EMAIL])).rows[0].id;
  await expect.poll(async () => (await db.query("SELECT 1 FROM message_log WHERE dedupe_key = $1", [`enquiry-receipt:${id}`])).rowCount, { timeout: 20_000 }).toBe(1);

  await asOwner(page, baseURL);
  await page.goto(`/admin/forms/contact/entries/${id}`, { waitUntil: "load" });
  await choose(page.getByLabel(/^Email$/), "receipt");
  await page.getByRole("button", { name: "Resend" }).click();
  await expect(page.locator(".ad__msg.is-bad")).toContainText("SMTP is not configured", { timeout: 30_000 });

  await page.reload({ waitUntil: "load" });
  await expect(page.locator(".adForms__timeline").first()).toContainText(`Resending "Receipt to the sender" to ${EMAIL} failed`);
  const trail = (await db.query<{ resends: { to: string; sent: boolean }[] }>("SELECT resends FROM message_log WHERE dedupe_key = $1", [`enquiry-receipt:${id}`])).rows[0].resends;
  expect(trail.at(-1)).toMatchObject({ to: EMAIL, sent: false });
});

test("the Settings tab previews each email for the latest real entry", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/forms/contact?view=settings", { waitUntil: "load" });
  const notice = page.locator("fieldset", { hasText: "Notice to the studio" });
  await notice.getByText("Preview, for the latest entry").click();
  const frame = notice.locator("iframe");
  await expect(frame).toHaveAttribute("sandbox", "");
  expect(await frame.getAttribute("srcdoc")).toContain("Open it in the admin");
});

test("the unsubscribe link asks first, works only with its signature, and one-click works too", async ({ page, request }) => {
  test.skip(!SECRET, "Needs the signing secret in this shell to build a link.");
  await db.query("INSERT INTO newsletter_subscribers (email, email_as_typed, source) VALUES ($1, $1, 'footer')", [SUB]);
  const sign = (e: string) => createHmac("sha256", SECRET).update(`newsletter-unsubscribe:${e}`).digest("base64url").slice(0, 32);

  await page.goto(`/unsubscribe?e=${encodeURIComponent(SUB)}&t=wrong`, { waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText("This link does not work");

  /* Opening the real link changes nothing; pressing the button does. */
  await page.goto(`/unsubscribe?e=${encodeURIComponent(SUB)}&t=${sign(SUB)}`, { waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText("Leave the newsletter?");
  expect((await db.query("SELECT unsubscribed_at FROM newsletter_subscribers WHERE email = $1", [SUB])).rows[0].unsubscribed_at).toBeNull();
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(page.locator("h1")).toHaveText("You are off the list");
  expect((await db.query("SELECT unsubscribed_at FROM newsletter_subscribers WHERE email = $1", [SUB])).rows[0].unsubscribed_at).not.toBeNull();

  /* A mail client's one-click POST (RFC 8058). */
  await db.query("UPDATE newsletter_subscribers SET unsubscribed_at = NULL WHERE email = $1", [SUB]);
  const oneClick = await request.post(`/api/newsletter/unsubscribe?e=${encodeURIComponent(SUB)}&t=${sign(SUB)}`, { form: { "List-Unsubscribe": "One-Click" } });
  expect(oneClick.status()).toBe(200);
  expect((await db.query("SELECT unsubscribed_at FROM newsletter_subscribers WHERE email = $1", [SUB])).rows[0].unsubscribed_at).not.toBeNull();
  expect((await request.post(`/api/newsletter/unsubscribe?e=${encodeURIComponent(SUB)}&t=nope`)).status()).toBe(400);
});

test("an import adds the new, leaves the rest, and never re-subscribes somebody who left", async ({ page, baseURL }) => {
  await db.query("INSERT INTO newsletter_subscribers (email, email_as_typed, source, unsubscribed_at) VALUES ($1, $1, 'footer', now())", [LEFT]);
  await asOwner(page, baseURL);
  await page.goto("/admin/forms/newsletter", { waitUntil: "load" });
  await page.getByRole("button", { name: "Import CSV" }).click();
  const dialog = page.locator("dialog.addlg[open]");
  await expect(dialog.locator(".adFileDrop")).toContainText("Choose files or drag them here");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "list.csv", mimeType: "text/csv",
    buffer: Buffer.from(`name,email\nOne,${NEW1}\nTwo,"${NEW2}"\nThree,${LEFT}\nFour,not-an-address@\n`),
  });
  await dialog.getByRole("checkbox", { name: /asked to hear from the studio/ }).check();
  await dialog.getByRole("button", { name: "Import" }).click();
  await expect(dialog.locator(".ad__msg.is-ok")).toContainText("2 added. 1 were already on the list", { timeout: 20_000 });

  const rows = await db.query<{ email: string; source: string; unsubscribed_at: Date | null }>(
    "SELECT email, source, unsubscribed_at FROM newsletter_subscribers WHERE email = ANY($1::TEXT[]) ORDER BY email", [[NEW1, NEW2, LEFT]],
  );
  expect(rows.rows.find((r) => r.email === NEW1)?.source).toBe("import");
  expect(rows.rows.find((r) => r.email === LEFT)?.unsubscribed_at).not.toBeNull();
  /* Nobody imported was mailed. */
  expect((await db.query("SELECT 1 FROM message_log WHERE dedupe_key LIKE $1", [`newsletter-welcome:${NEW1}%`])).rowCount).toBe(0);
});
