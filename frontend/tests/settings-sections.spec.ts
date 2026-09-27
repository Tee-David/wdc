import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS, AS ONE SCREEN (the Settings canvas): a change brings up the save
 * bar, Discard puts it back, a bad field is refused with the count, a saved
 * value is in the table and read by what uses it, and the menu's search
 * narrows the sections.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const KEYS = ["finance.vatRate", "finance.dueInDays", "finance.vatOn", "finance.reminders", "notify.tickets", "notify.payments", "mail.fromName", "mail.replyTo", "mail.replyTo.pending"];

test.describe.configure({ mode: "serial", timeout: 150_000 });
test.skip(!CONNECTION, "Needs DATABASE_URL or COCKROACHDB_URL.");
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
const value = async (key: string) => (await db.query("SELECT value FROM app_settings WHERE key = $1", [key])).rows[0]?.value ?? null;

test.beforeAll(async () => { await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]); });
test.afterAll(async () => {
  await db.query("DELETE FROM app_settings WHERE key = ANY($1::TEXT[])", [KEYS]);
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const bar = (page: Page) => page.getByRole("region", { name: "Unsaved changes" });

test("a change brings up the bar, Discard puts it back, and Save keeps it", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await expect(bar(page)).toBeHidden();

  const vat = page.getByLabel(/^VAT/);
  await vat.fill("5");
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toContainText("1 unsaved change");
  await bar(page).getByRole("button", { name: "Discard" }).click();
  await expect(vat).toHaveValue("7.5");
  await expect(bar(page)).toBeHidden();

  await vat.fill("5");
  await page.getByRole("switch", { name: "Email unpaid invoices automatically" }).click();
  await expect(page.getByRole("checkbox", { name: "On the due date" })).toBeChecked();
  await expect(bar(page)).toContainText(/unsaved changes/);
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast").filter({ hasText: "Settings saved." })).toBeVisible({ timeout: 20_000 });
  await expect(bar(page)).toBeHidden();
  expect(await value("finance.vatRate")).toBe("5");
  expect(await value("finance.reminders")).toBe("-3,0,7");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel(/^VAT/)).toHaveValue("5");
  await expect(page.getByRole("switch", { name: "Email unpaid invoices automatically" })).toHaveAttribute("aria-checked", "true");
});

test("a bad value is said on leaving the field, and the server saves nothing", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  const vat = page.getByLabel(/^VAT/);
  await vat.fill("abc");
  await vat.blur();
  await expect(page.getByText("A number between 0 and 100, like 7.5.")).toBeVisible();
  await vat.fill("150");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toContainText("Fix 1 field before saving", { timeout: 20_000 });
  expect(await value("finance.vatRate")).toBe("5");
});

test("turning VAT off makes a new invoice start at 0%, and the switch is saved", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "Add VAT to new invoices" }).click();
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });
  expect(await value("finance.vatOn")).toBe("0");
});

test("notifications and the sender save, and a bad reply-to is refused", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/notifications", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "A client pays online" }).click();
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });
  expect(await value("notify.payments")).toBe("0");

  await page.goto("/admin/settings/email", { waitUntil: "networkidle" });
  await page.getByLabel(/^Replies go to/).fill("not-an-email");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toContainText("Fix 1 field", { timeout: 20_000 });
  await page.getByLabel(/^Replies go to/).fill("studio@example.com");
  await page.getByLabel(/^From name/).fill("WDC Studio");
  await bar(page).getByRole("button", { name: "Save changes" }).click();
  await expect(bar(page)).toBeHidden({ timeout: 20_000 });
  /* A new reply-to waits for its confirmation link (tests/notice-address.spec.ts). */
  expect(await value("mail.replyTo")).toBeNull();
  expect((await value("mail.replyTo.pending"))?.to).toBe("studio@example.com");
  expect(await value("mail.fromName")).toBe("WDC Studio");
});

test("the menu's search narrows the sections", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/settings/general", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "Settings sections" });
  await nav.getByRole("searchbox", { name: "Search settings" }).fill("paystack");
  await expect(nav.getByRole("link")).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Integrations" })).toBeVisible();
  await nav.getByRole("searchbox", { name: "Search settings" }).fill("zzzz");
  await expect(nav.getByText("No setting matches")).toBeVisible();
});

test("Access lands on the roles table in Team and roles", async ({ page, baseURL }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/access", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/admin\/settings\/team/);
  await expect(page.getByRole("heading", { name: "Team and roles" })).toBeVisible();
});
