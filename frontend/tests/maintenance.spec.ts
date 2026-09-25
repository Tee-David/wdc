import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import pg from "pg";

/**
 * MAINTENANCE MODE: public pages answer 503, and nothing that must keep
 * working is in its way.
 *
 * The switch reaches the proxy within half a minute (it holds the setting
 * per instance), so every check polls rather than asserting once.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 180_000 });
test.skip(!CONNECTION || !TOKEN, "Needs the database and BONEYARD_CAPTURE_TOKEN.");

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
const MESSAGE = `Moving house, back soon ${randomUUID().slice(0, 6)}`;
const WAITING = `waiting-${randomUUID().slice(0, 8)}@example.com`;

test.afterAll(async ({ playwright, baseURL }) => {
  await db.query("DELETE FROM app_settings WHERE key = 'site.maintenance'");
  await db.query("DELETE FROM maintenance_waitlist WHERE email = $1", [WAITING]);
  /* Nothing after this file may find the site down. */
  const r = await playwright.request.newContext({ baseURL });
  await expect.poll(async () => (await r.get("/")).status(), { timeout: 45_000, intervals: [2_000] }).toBe(200);
  await r.dispose();
  await db.end();
});

async function asOwner(page: Page, baseURL?: string) {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const status = (r: APIRequestContext, url: string) => r.get(url, { maxRedirects: 0 }).then((x) => x.status());

test("switched on, visitors get a 503 holding page and the rest keeps working", async ({ page, baseURL, playwright }) => {
  await asOwner(page, baseURL);
  await page.goto("/admin/settings/maintenance", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "Maintenance mode" }).click();
  const panel = page.locator(".adConfirm");
  await panel.getByLabel(/^What visitors are told/).fill(MESSAGE);
  const label = await panel.locator("label", { hasText: /^Type \S+ to confirm/ }).first().textContent();
  await panel.getByLabel(/^Type .* to confirm/).fill(/Type (\S+) to confirm/.exec(label ?? "")![1]);
  await panel.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByRole("switch", { name: "Maintenance mode" })).toHaveAttribute("aria-checked", "true", { timeout: 20_000 });

  const visitor = await playwright.request.newContext({ baseURL });
  await expect.poll(() => status(visitor, "/"), { timeout: 45_000, intervals: [2_000] }).toBe(503);
  const home = await visitor.get("/");
  expect(home.headers()["retry-after"]).toMatch(/^\d+$/);
  expect(home.headers()["x-robots-tag"]).toBe("noindex");
  expect(await home.text()).toContain(MESSAGE);
  expect(await status(visitor, "/work")).toBe(503);
  /* the template chosen in Settings, Site, and its notify-me box */
  expect(await home.text()).toMatch(/<body data-template="\d{2}">/);
  const origin = new URL(baseURL ?? "http://localhost:3100").origin;
  const joined = await visitor.post("/api/maintenance/notify", { data: { email: WAITING }, headers: { origin } });
  expect(joined.status()).toBe(200);
  const answered = await visitor.post("/api/maintenance/notify", { data: { email: WAITING, reason: "project" }, headers: { origin } });
  expect(answered.status()).toBe(200);
  const row = await db.query("SELECT reason FROM maintenance_waitlist WHERE email = $1", [WAITING]);
  expect(row.rows[0]?.reason).toBe("project");

  /* Never in the way: signing in, the webhook, money a client is paying, files. */
  expect(await status(visitor, "/login")).toBe(200);
  expect(await status(visitor, "/api/paystack/webhook")).not.toBe(503);
  expect(await status(visitor, "/i/not-a-real-token")).not.toBe(503);
  expect(await status(visitor, "/pay/done")).not.toBe(503);
  /* A brief or a built form being filled in is not interrupted either. */
  expect(await status(visitor, "/onboarding")).not.toBe(503);
  expect(await status(visitor, "/f/anything")).not.toBe(503);
  expect(await status(visitor, "/robots.txt")).toBe(200);
  await visitor.dispose();

  /* The admin, with its notice. */
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page.locator(".ad__banner", { hasText: "in maintenance" })).toBeVisible();
});

test("an admin's pass and a reviewer's link see the site; a wrong link does not", async ({ page, baseURL, browser }) => {
  await asOwner(page, baseURL);
  await page.goto("/api/maintenance/pass", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/")).status()).toBe(200);

  await page.goto("/admin/settings/maintenance", { waitUntil: "load" });
  const link = (await page.locator(".ad__panel", { hasText: "Maintenance mode" }).locator("code").textContent())!.trim();
  const url = new URL(link);

  const reviewer = await browser.newContext({ baseURL });
  const r = await reviewer.newPage();
  await r.goto(`${url.pathname}${url.search}`, { waitUntil: "load" });
  expect((await r.request.get("/")).status()).toBe(200);
  await reviewer.close();

  const stranger = await browser.newContext({ baseURL });
  const s = await stranger.newPage();
  await s.goto("/api/maintenance/pass?t=not-the-token", { waitUntil: "load" });
  expect((await s.request.get("/")).status()).toBe(503);
  await stranger.close();
});

test("staff cannot switch it; switched off, the site is back for everybody", async ({ page, baseURL, playwright }) => {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
  await page.goto("/admin/settings/maintenance", { waitUntil: "load" });
  await expect(page.getByText("Maintenance is the owner's")).toBeVisible();

  await asOwner(page, baseURL);
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "" });
  await page.goto("/admin/settings/maintenance", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "Maintenance mode" }).click();
  await page.locator(".adConfirm").getByRole("button", { name: "Bring it back" }).click();
  await expect(page.getByRole("switch", { name: "Maintenance mode" })).toHaveAttribute("aria-checked", "false", { timeout: 20_000 });
  const visitor = await playwright.request.newContext({ baseURL });
  await expect.poll(() => status(visitor, "/"), { timeout: 45_000, intervals: [2_000] }).toBe(200);
  await visitor.dispose();
});
