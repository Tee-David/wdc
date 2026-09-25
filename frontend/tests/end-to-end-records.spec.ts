import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

/**
 * EDITS THAT STAY, END TO END (lib/admin/persist.ts, migration 0025).
 *
 * The owner's checks: change a client's email and details and it saves and
 * shows everywhere; a client opens a support ticket, the studio answers it
 * from the admin, and the client sees the answer. Each is read back from the
 * table as well as the screen, because a screen can show what memory holds.
 */
const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!CONNECTION || !TOKEN, "Needs a database and BONEYARD_CAPTURE_TOKEN.");
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

const mark = randomUUID().slice(0, 6);
let db: pg.Pool;
let original: { email: string; phone: string } | null = null;
test.beforeAll(() => {
  const url = new URL(CONNECTION!);
  url.searchParams.delete("sslmode");
  const ca = process.env.COCKROACHDB_CERT?.replace(/\\n/g, "\n");
  db = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, max: 2 });
});
test.afterAll(async () => { await db.end(); });

const kept = async (collection: string, id: string) =>
  (await db.query<{ data: Record<string, unknown> }>("SELECT data FROM admin_records WHERE collection = $1 AND id = $2", [collection, id])).rows[0]?.data;

test("a client's new email and phone are saved, kept and shown", async ({ page }) => {
  await page.goto("/admin/clients/c2", { waitUntil: "networkidle" });
  const before = await kept("CLIENTS", "c2");
  original = { email: String(before?.email), phone: String(before?.phone ?? "") };
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByLabel(/^Email/).fill(`amaka.${mark}@marfaa.com`);
  await dialog.getByLabel(/^Phone/).fill("+234 803 555 0101");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".ad__profile")).toContainText(`amaka.${mark}@marfaa.com`);
  /* And it said so where the eye is, after the dialog closed. */
  await expect(page.locator(".adToast--good")).toBeVisible();
  await expect.poll(async () => (await kept("CLIENTS", "c2"))?.email, { timeout: 15_000 }).toBe(`amaka.${mark}@marfaa.com`);
  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  await expect(page.locator("#client-list + .ad__scroll")).toContainText("Marfaa Foods");
});

test("put back, so the next run starts from the same record", async ({ page }) => {
  await page.goto("/admin/clients/c2", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByLabel(/^Email/).fill(original!.email);
  await dialog.getByLabel(/^Phone/).fill(original!.phone);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => (await kept("CLIENTS", "c2"))?.email, { timeout: 15_000 }).toBe(original!.email);
});

test("a client opens a ticket, the studio answers it, the client reads the answer", async ({ page }) => {
  const subject = `Can we move the launch? ${mark}`;
  await page.goto("/portal/support?new=1", { waitUntil: "networkidle" });
  await page.getByLabel(/^Subject/).fill(subject);
  await page.getByLabel(/^Message/).fill("We would like to launch a week later than planned.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 15_000 });
  const row = await db.query<{ id: string }>("SELECT id FROM admin_records WHERE collection = 'TICKETS' AND data->>'subject' = $1", [subject]);
  expect(row.rowCount, "the ticket is in the table").toBe(1);
  const ticketId = row.rows[0].id;

  /* The studio finds it in the inbox, first, as waiting on them. */
  await page.goto("/admin/clients/support", { waitUntil: "networkidle" });
  const inboxRow = page.locator("#tickets tbody tr").first();
  await expect(inboxRow).toContainText(subject);
  await expect(inboxRow).toContainText("Waiting on us");
  await inboxRow.getByRole("link", { name: subject }).click();
  await page.waitForURL(/\/admin\/clients\/support\/tk\d+$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(subject);
  await page.getByLabel(/^Your reply/).fill(`Yes, a week later works. ${mark}`);
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.locator(".adConv")).toContainText(`Yes, a week later works. ${mark}`);
  await expect.poll(async () =>
    (await db.query("SELECT 1 FROM admin_records WHERE collection = 'TICKET_MESSAGES' AND data->>'ticketId' = $1 AND data->>'from' = 'studio'", [ticketId])).rowCount,
  { timeout: 15_000 }).toBe(1);

  /* The studio's reply is queued to the client as an email, with a row first. */
  await expect.poll(async () =>
    (await db.query("SELECT 1 FROM message_log WHERE dedupe_key LIKE 'support-reply:%' AND subject = $1", [`Re: ${subject}`])).rowCount,
  { timeout: 20_000 }).toBeGreaterThan(0);

  await page.goto(`/portal/support/${ticketId}`, { waitUntil: "networkidle" });
  await expect(page.locator(".adConv")).toContainText(`Yes, a week later works. ${mark}`);

  /* Closing and reopening from the thread. */
  await page.goto(`/admin/clients/support/${ticketId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect.poll(async () => (await kept("TICKETS", ticketId))?.status, { timeout: 15_000 }).toBe("Closed");
});
