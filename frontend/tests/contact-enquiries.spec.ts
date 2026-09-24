import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * AN ENQUIRY IS KEPT EVEN WHEN THE MAIL IS NOT SENT.
 *
 * The contact form used to email the studio and keep nothing, so a refused
 * send lost the lead. This drives the real route on a server that has a
 * database and no mail server -- the harshest honest case -- and checks the
 * three things that must survive it: the visitor is thanked, the row exists
 * and says the notice failed, and the admin shows both the enquiry and the
 * failed message.
 *
 * IT REFUSES TO RUN WHERE MAIL IS CONFIGURED, because there it would send a
 * real email to the studio and a receipt to a made-up address.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL: an enquiry is a database row.");
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
  return new pg.Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 2,
    connectionTimeoutMillis: 40_000,
  });
}

const db = pool();
const MARK = randomUUID().slice(0, 8);
const EMAIL = `wdc-e2e-${MARK}@wedigcreativity.com.ng`;
const LAST = `Okafor${MARK}`;

test.afterAll(async () => {
  await db.query("DELETE FROM message_log WHERE to_addr = $1 OR dedupe_key IN (SELECT 'enquiry:' || id::TEXT FROM contact_enquiries WHERE email = $1)", [EMAIL]);
  await db.query("DELETE FROM contact_enquiries WHERE email = $1", [EMAIL]);
  await db.end();
});

test("an enquiry is stored before any mail, and the failed notice is recorded", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      first: "Chioma", last: LAST, email: EMAIL, phone: "",
      topic: "Branding & Design",
      message: "We are opening a second bakery in Yaba and need a logo refresh before March.",
    },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });

  /* The send runs behind the response, so the row is pending first and
     settles a moment later. */
  await expect.poll(async () => {
    const rows = await db.query<{ delivery: string; delivery_error: string | null }>(
      "SELECT delivery, delivery_error FROM contact_enquiries WHERE email = $1", [EMAIL],
    );
    return rows.rows[0] ? `${rows.rows[0].delivery}: ${rows.rows[0].delivery_error}` : "missing";
  }, { timeout: 20_000 }).toBe("failed: SMTP is not configured on this deployment.");
});

test("the message log is a database row, one per event, and it says why", async () => {
  const id = (await db.query<{ id: string }>("SELECT id FROM contact_enquiries WHERE email = $1", [EMAIL])).rows[0].id;
  /* Both mails for this enquiry, the receipt and the studio notice, were
     written to the table before any send was tried, and settled after. */
  await expect.poll(async () => {
    const rows = await db.query<{ dedupe_key: string; state: string; error: string | null }>(
      "SELECT dedupe_key, state, error FROM message_log WHERE dedupe_key IN ($1, $2) ORDER BY dedupe_key",
      [`enquiry:${id}`, `enquiry-receipt:${id}`],
    );
    return rows.rows.map((r) => `${r.dedupe_key.split(":")[0]} ${r.state} ${r.error}`);
  }, { timeout: 20_000 }).toEqual([
    "enquiry-receipt Failed SMTP is not configured on this deployment.",
    "enquiry Failed SMTP is not configured on this deployment.",
  ]);
  /* The database refuses a second row for the same event, whichever server
     instance tries to write it. */
  const again = await db.query(
    "INSERT INTO message_log (channel, to_addr, subject, summary, sent_by, dedupe_key) VALUES ('Email', 'x', 'x', 'x', 'test', $1) ON CONFLICT (dedupe_key) DO NOTHING",
    [`enquiry:${id}`],
  );
  expect(again.rowCount).toBe(0);
});

test("the admin shows the enquiry and the message that did not go", async ({ page, baseURL }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  const leads = page.locator('[data-tour="dash-leads"]');
  const row = leads.locator("a", { hasText: LAST });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Branding & Design");
  await expect(row).toContainText("email notice failed");
  await expect(row).toHaveAttribute("href", new RegExp(`^mailto:${EMAIL}`));

  await page.goto("/admin/money/reconciliation", { waitUntil: "domcontentloaded" });
  const failed = page.locator("section", { hasText: "Messages that did not go" });
  await expect(failed.locator("tr", { hasText: "Website enquiry: Branding & Design" }).first()).toBeVisible();
  await expect(failed.locator("tr", { hasText: EMAIL }).first()).toContainText("SMTP is not configured");
});
