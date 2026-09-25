import { expect, test } from "@playwright/test";
import { addClient, addInvoice, addProject, getAudit, getClient, getInvoicesFor, getProjectsFor, mergeClients } from "../lib/admin/store";

/**
 * Clients can carry tags and more than one person, and a duplicate can be
 * folded into the record that stays without losing anything.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test("merging moves the duplicate's work, keeps the chosen details, and archives the duplicate", () => {
  const keep = addClient({ name: "Tobi A", company: "Keep Co", email: "tobi@keep.ng", phone: "+234 801 000 0001", services: ["branding"], sector: "Retail", tags: ["retainer"] });
  const dupe = addClient({ name: "Tobi Adeyemi", company: "Keep Company Ltd", email: "accounts@keep.ng", phone: "", services: ["web"], sector: "", tags: ["referral"], notes: "Pays by transfer." });
  const project = addProject({ clientId: dupe.id, title: "Shop", service: "web", stage: "Onboarding", due: null });
  addInvoice({ clientId: dupe.id, projectId: null, issued: new Date().toISOString(), due: new Date().toISOString(), vatRate: 0,
               lines: [{ description: "Deposit", qty: 1, unit: 50_000_00 }], status: "Sent" });

  const res = mergeClients(keep.id, dupe.id, "Babatope");
  expect(res.ok).toBe(true);
  if (!res.ok) return;
  expect(res.moved).toBeGreaterThanOrEqual(2);

  expect(getProjectsFor(keep.id, true).some((p) => p.id === project.id)).toBe(true);
  expect(getInvoicesFor(keep.id).some((i) => i.lines[0].description === "Deposit")).toBe(true);
  expect(getInvoicesFor(dupe.id)).toHaveLength(0);

  const kept = getClient(keep.id)!;
  expect(kept.email).toBe("tobi@keep.ng");
  expect(kept.services.sort()).toEqual(["branding", "web"]);
  expect(kept.tags?.sort()).toEqual(["referral", "retainer"]);
  expect(kept.contacts?.some((c) => c.email === "accounts@keep.ng")).toBe(true);
  expect(kept.notes).toContain("Pays by transfer.");

  const gone = getClient(dupe.id)!;
  expect(gone.archived).toBe(true);
  expect(gone.mergedInto).toBe(keep.id);
  expect(getAudit({ subjectId: keep.id }).some((e) => e.action === "merged in a duplicate")).toBe(true);

  /* And it cannot be done twice, or to itself. */
  expect(mergeClients(keep.id, dupe.id).ok).toBe(false);
  expect(mergeClients(keep.id, keep.id).ok).toBe(false);
});

test.describe("in the admin", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });
  test.describe.configure({ timeout: 150_000 });

  test("a client with tags and a second contact is found by its tag", async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
    const mark = Date.now().toString(36);
    const company = `Kemi Prints ${mark}`;
    await page.goto("/admin/clients", { waitUntil: "load" });
    const dialog = page.locator("dialog.addlg[open]");
    await expect(async () => {
      await page.getByRole("button", { name: "Add a client" }).first().click({ timeout: 2_000 });
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await dialog.getByLabel(/^Company/).fill(company);
    await dialog.getByLabel(/^Who you deal with/).fill("Kemi Bello");
    await dialog.getByLabel(/^Email/).fill(`kemi-${mark}@example.com`);
    await dialog.getByText("Branding", { exact: true }).click();
    await dialog.getByLabel(/^Tags/).fill(`Wholesale, tag${mark}`);
    await dialog.getByLabel(/^Other contacts/).fill(`Sade Bello, accounts, sade-${mark}@example.com, +234 803 111 2222`);
    await dialog.getByRole("button", { name: "Add them" }).click();

    await expect(page).toHaveURL(/\/admin\/clients\/c\d+$/, { timeout: 30_000 });
    await expect(page.locator(".ad__profile .ad__pill", { hasText: `tag${mark}` })).toBeVisible();
    await expect(page.locator(".ad__profile .ad__pill", { hasText: "wholesale" })).toBeVisible();
    const contacts = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Other contacts" }) });
    await expect(contacts).toContainText("Sade Bello");
    await expect(contacts.getByRole("link", { name: `sade-${mark}@example.com` })).toHaveAttribute("href", `mailto:sade-${mark}@example.com`);
    const url = page.url();

    await page.goto(`/admin/clients?q=tag${mark}`, { waitUntil: "load" });
    await expect(page.locator("#client-list + .ad__scroll tbody tr")).toHaveCount(1);
    await expect(page.locator("#client-list + .ad__scroll tbody tr")).toContainText(company);

    /* Archived again: other specs count the active list. */
    await page.goto(url, { waitUntil: "load" });
    page.on("dialog", (d) => d.accept());
    await expect(async () => {
      await page.getByRole("button", { name: "Archive", exact: true }).click({ timeout: 2_000 });
      await expect(page.getByRole("button", { name: "Restore" })).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
  });
});
