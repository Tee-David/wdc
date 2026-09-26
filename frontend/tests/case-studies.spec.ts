import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { sayYes } from "./say-yes";

/**
 * CASE STUDIES FROM THE ADMIN (Blog, Case studies; artifact "WDC Case
 * Studies"): write one in the five steps, see publishing refused until what
 * is missing is there, publish it, find it on /work, and take it off again.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
const DB = process.env.DATABASE_URL || process.env.COCKROACHDB_URL;
test.skip(!TOKEN || !DB, "Needs BONEYARD_CAPTURE_TOKEN and a database.");
test.describe.configure({ mode: "serial", timeout: 180_000 });
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

const client = `Test Kitchen ${randomUUID().slice(0, 5)}`;
const slug = client.toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function step(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

test("a new build is written in five steps, refused until complete, then published to /work", async ({ page }) => {
  await page.goto("/admin/blog/work/new?service=web", { waitUntil: "networkidle" });
  await expect(page.getByRole("radio", { name: /A build/ })).toBeChecked();
  await page.getByLabel("Client").fill(client);
  await page.getByLabel("Sector").fill("Food delivery");

  await step(page, "Next");
  await page.getByLabel("Title").fill("An ordering site and a kitchen screen on one menu");
  await page.getByLabel("Summary for the card").fill("Web ordering and a kitchen screen sharing one menu.");
  await page.getByLabel("About the client").fill("A test client made by the case-studies spec.");
  await page.getByLabel("The brief").fill("Take orders online without re-typing them.");
  await page.getByLabel("The approach").fill("One menu and one order record, read by both screens.");

  await step(page, "Next");
  await page.getByLabel("What we did").fill("Ordering site\nKitchen screen\nMenu editor");
  for (const t of ["Next.js", "PostgreSQL"]) { await page.getByLabel("Built with").fill(t); await page.keyboard.press("Enter"); }
  await page.getByLabel("Live address").fill("https://example.com");

  await step(page, "Next");
  /* No cover yet: the check step lists it and Publish stays off. */
  await step(page, "Next");
  await expect(page.locator(".ce__check")).toContainText("Add a cover picture.");
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();

  /* Save a draft with the gap: allowed, and it lands on its own address. */
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForURL(new RegExp(`/admin/blog/work/${slug}$`), { timeout: 30_000 });

  await page.getByRole("button", { name: /Pictures/ }).click();
  await page.locator(".ce__ours summary").first().click();
  await page.locator(".ce__oursGrid button").first().click();
  await page.getByLabel("Describe the cover").fill("The ordering site on a laptop");
  await step(page, "Next");
  await expect(page.locator(".ce__check")).toContainText("Everything needed is there.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator(".adToast", { hasText: "Published." }).first()).toBeVisible({ timeout: 30_000 });

  await page.goto(`/work/web/${slug}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("An ordering site and a kitchen screen");
  await page.goto("/work/web", { waitUntil: "networkidle" });
  await expect(page.getByText(client).first()).toBeVisible();
});

test("taking it off the site removes it from /work without deleting it", async ({ page }) => {
  await page.goto("/admin/blog/work", { waitUntil: "networkidle" });
  const row = page.locator("#case-list tbody tr", { hasText: client });
  await sayYes(page);
  await row.getByRole("button", { name: "Take off" }).click();
  await expect(page.locator(".adToast", { hasText: "is off the site" }).first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`/work/web/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("An ordering site");
  await page.goto("/admin/blog/work", { waitUntil: "networkidle" });
  await expect(page.locator("#case-list tbody tr", { hasText: client })).toContainText("Off the site");
});
