import { expect, test, type Page } from "@playwright/test";
import { sayYes } from "./say-yes";

/**
 * Staff: the day's work without the books, the settings or the undo-less
 * controls -- and refused at the action, not just hidden from the page.
 *
 * Needs BONEYARD_CAPTURE_TOKEN on the dev server under test and here. The
 * capture header stands in for a signed-in admin; `x-boneyard-capture-role:
 * staff` makes it a member of staff (never in production, see
 * lib/admin/capture.ts).
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.describe.configure({ timeout: 90_000 });

const as = async (page: Page, role: "owner" | "staff") =>
  page.setExtraHTTPHeaders({ "x-boneyard-capture": TOKEN ?? "", ...(role === "staff" ? { "x-boneyard-capture-role": "staff" } : {}) });

test("staff get a dashboard with the work and none of the money", async ({ page }) => {
  await as(page, "staff");
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  const nav = page.getByRole("navigation", { name: "Admin sections" });
  await expect(nav.getByRole("link", { name: "Clients" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Money" })).toHaveCount(0);
  await expect(page.getByText("Collected", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cashflow, last six months" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent payments" })).toHaveCount(0);
  await expect(page.getByText("₦")).toHaveCount(0);
});

test("the owner still gets the books", async ({ page }) => {
  await as(page, "owner");
  await page.goto("/admin", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Cashflow, last six months" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Money" })).toBeVisible();
});

test("Money is a no-access page for staff, not the ledger", async ({ page }) => {
  await as(page, "staff");
  await page.goto("/admin/money", { waitUntil: "load" });
  await expect(page.getByText("Money is for the owner")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("₦")).toHaveCount(0);
});

test("a client record for staff has the relationship, not the invoices or the archive button", async ({ page }) => {
  await as(page, "staff");
  await page.goto("/admin/clients/c1", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Invoices" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Payment history" })).toHaveCount(0);
  await expect(page.getByText("Paid to date")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);
  await expect(page.getByText("₦")).toHaveCount(0);
});

test("Settings for staff is the content tools and a no-access note", async ({ page }) => {
  await as(page, "staff");
  await page.goto("/admin/settings", { waitUntil: "load" });
  await expect(page.getByText("The FAQ and the media library are yours to edit.")).toBeVisible({ timeout: 30_000 });
  const sections = page.getByRole("navigation", { name: "Settings sections" });
  await expect(sections.getByRole("link", { name: /FAQ/ })).toBeVisible();
  await expect(sections.getByRole("link", { name: /Media/ })).toBeVisible();
  /* Only the two they can use are listed, and the owner's pages refuse them. */
  await expect(sections.getByRole("link", { name: /Email/ })).toHaveCount(0);
  await page.goto("/admin/settings/general", { waitUntil: "load" });
  await expect(page.getByText("Studio settings are for the owner")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invoice defaults" })).toHaveCount(0);
});

test("an owner-only action refuses staff even when the form is in front of them", async ({ page }) => {
  /* The owner's page renders the archive form; the request that submits it
     then carries a staff session. The action must refuse it on its own. */
  await as(page, "owner");
  await page.goto("/admin/clients/c2", { waitUntil: "networkidle" });
  const archive = page.getByRole("button", { name: "Archive", exact: true });
  await expect(archive).toBeVisible({ timeout: 30_000 });
  await as(page, "staff");
  await sayYes(page);
  await archive.click();
  await expect(page.getByText("does not have access to this").first()).toBeVisible({ timeout: 15_000 });

  /* Still on the books: the owner's page still offers Archive, not Restore. */
  await as(page, "owner");
  await page.goto("/admin/clients/c2", { waitUntil: "load" });
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Restore", exact: true })).toHaveCount(0);
});

test("the export stays the owner's", async ({ request }) => {
  const staff = await request.get("/admin/clients/export", { headers: { "x-boneyard-capture": TOKEN ?? "", "x-boneyard-capture-role": "staff" } });
  expect(staff.status()).not.toBe(200);
  const owner = await request.get("/admin/clients/export", { headers: { "x-boneyard-capture": TOKEN ?? "" } });
  expect(owner.status()).toBe(200);
});
