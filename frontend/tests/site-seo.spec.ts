import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

/**
 * SETTINGS, SITE AND SEO: the noindex switch and the default description.
 *
 * The switch is read by the root layout's metadata, so a public page that
 * sets no `robots` of its own says noindex while it is on, and the admin
 * shows a notice until it is off or dismissed. Turning it on needs the site's
 * address typed out.
 */

const CONNECTION = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ mode: "serial", timeout: 120_000 });
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

test.afterAll(async () => {
  await db.query("DELETE FROM app_settings WHERE key IN ('site.noindex', 'site.description')");
  await db.end();
});

async function asRole(page: Page, baseURL: string | undefined, role: "owner" | "staff" = "owner") {
  await page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}) });
  await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
}

const robotsOf = async (page: Page, url: string) => {
  const html = await (await page.request.get(url)).text();
  return /<meta name="robots" content="([^"]+)"/.exec(html)?.[1] ?? "";
};
/* Filled until it holds: a value typed before hydration is merged away. */
async function fillHeld(page: Page, label: RegExp, value: string) {
  await expect(async () => {
    await page.getByLabel(label).fill(value);
    await expect(page.getByLabel(label)).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}
const descriptionOf = async (page: Page, url: string) => {
  const html = await (await page.request.get(url)).text();
  return /<meta name="description" content="([^"]+)"/.exec(html)?.[1] ?? "";
};

test("noindex needs the address typed, reaches public pages, and shows a notice", async ({ page, baseURL }) => {
  expect(await robotsOf(page, "/")).toMatch(/^index, follow/);
  await asRole(page, baseURL);
  await page.goto("/admin/settings/site", { waitUntil: "networkidle" });

  await page.getByRole("switch", { name: "Show in search engines" }).click();
  await fillHeld(page, /^Type .* to confirm/, "yes");
  await page.getByRole("button", { name: "Hide from search" }).click();
  await expect(page.getByText(/^Type .* to confirm\.$/)).toBeVisible({ timeout: 20_000 });
  expect((await db.query("SELECT 1 FROM app_settings WHERE key = 'site.noindex'")).rowCount).toBe(0);

  /* The address the page asks for, read off its own label. */
  const label = await page.locator("label", { hasText: /^Type \S+ to confirm/ }).first().textContent();
  const host = /Type (\S+) to confirm/.exec(label ?? "")![1];
  await page.getByLabel(/^Type .* to confirm/).fill(host);
  await page.getByRole("button", { name: "Hide from search" }).click();
  await expect(page.getByRole("switch", { name: "Show in search engines" })).toHaveAttribute("aria-checked", "false", { timeout: 20_000 });

  expect(await robotsOf(page, "/")).toBe("noindex, nofollow");
  expect(await robotsOf(page, "/work")).toBe("noindex, nofollow");

  const notice = page.locator(".ad__banner", { hasText: "Search engines are asked not to index" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: /^Dismiss/ }).click();
  await expect(notice).toHaveCount(0);
  await page.reload({ waitUntil: "load" });
  await expect(notice).toHaveCount(0);
});

test("staff see the notice, not the switch", async ({ page, baseURL }) => {
  await asRole(page, baseURL, "staff");
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page.locator(".ad__banner", { hasText: "Search engines are asked not to index" })).toBeVisible();
  await page.goto("/admin/settings/site", { waitUntil: "load" });
  await expect(page.getByText("Site and SEO are the owner's")).toBeVisible();
});

test("turning it off lets search engines back in", async ({ page, baseURL }) => {
  await asRole(page, baseURL);
  await page.goto("/admin/settings/site", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "Show in search engines" }).click();
  await page.getByRole("button", { name: "Show in search", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Show in search engines" })).toHaveAttribute("aria-checked", "true", { timeout: 20_000 });
  expect(await robotsOf(page, "/")).toMatch(/^index, follow/);
  await expect(page.locator(".ad__banner", { hasText: "Search engines are asked" })).toHaveCount(0);
});

test("the default description is replaced, bounded, and reset", async ({ page, baseURL }) => {
  const original = await descriptionOf(page, "/work");
  await asRole(page, baseURL);
  await page.goto("/admin/settings/site", { waitUntil: "load" });
  await fillHeld(page, /^Description/, "Too short.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Between 50 and 160 characters/)).toBeVisible({ timeout: 20_000 });

  const text = "A studio for branding, websites, SEO and software that earns its keep for the business.";
  await fillHeld(page, /^Description/, text);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".adToast", { hasText: "Saved." })).toBeVisible({ timeout: 20_000 });
  expect(await descriptionOf(page, "/")).toBe(text);

  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Use the default" }).click();
  await expect(page.locator(".adToast", { hasText: "Back to the default" })).toBeVisible({ timeout: 20_000 });
  expect(await descriptionOf(page, "/")).not.toBe(text);
  /* A page with its own description was never affected. */
  expect(await descriptionOf(page, "/work")).toBe(original);
});
