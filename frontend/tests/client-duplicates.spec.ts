import { expect, test } from "@playwright/test";

/**
 * A new client is checked against the existing ones before it is created:
 * the same email under different capitalisation, or the same phone typed in
 * a different format, is the same contact and should not become a second
 * record. Seeded case: c1 is Tobi Adeyemi / Moore Designs,
 * tobi@mooredesigns.ng, +234 802 123 4567.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 90_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

async function openAddClient(page: import("@playwright/test").Page) {
  await page.goto("/admin/clients", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add a client" }).click();
}

test("the same email in different case is caught as a duplicate", async ({ page }) => {
  await openAddClient(page);
  await page.getByLabel("Company").fill("A Second Company");
  await page.getByLabel("Who you deal with").fill("Someone Else");
  await page.getByLabel("Email").fill("TOBI@MooreDesigns.ng");
  await page.getByLabel("Phone").fill("+234 700 000 0000");
  await page.getByRole("checkbox", { name: "SEO" }).check();
  await page.getByRole("button", { name: "Add them" }).click();

  await expect(page.getByRole("status")).toContainText("Moore Designs already matches this email or phone");
  await expect(page).toHaveURL(/\/admin\/clients$/);
});

test("the same phone in a different format is caught as a duplicate", async ({ page }) => {
  await openAddClient(page);
  await page.getByLabel("Company").fill("A Third Company");
  await page.getByLabel("Who you deal with").fill("Someone Else Again");
  await page.getByLabel("Email").fill("nottobi@example.com");
  await page.getByLabel("Phone").fill("0802-123-4567");
  await page.getByRole("checkbox", { name: "SEO" }).check();
  await page.getByRole("button", { name: "Add them" }).click();

  await expect(page.getByRole("status")).toContainText("Moore Designs already matches this email or phone");
});

test("an unrelated new client is not blocked", async ({ page }) => {
  await openAddClient(page);
  await page.getByLabel("Company").fill("Genuinely New Co");
  await page.getByLabel("Who you deal with").fill("A New Contact");
  await page.getByLabel("Email").fill("hello@genuinelynew.example");
  await page.getByLabel("Phone").fill("+234 701 234 5678");
  await page.getByRole("checkbox", { name: "SEO" }).check();
  await page.getByRole("button", { name: "Add them" }).click();

  await expect(page).toHaveURL(/\/admin\/clients\/c\d+/);
  await expect(page.getByRole("heading", { name: "Genuinely New Co" })).toBeVisible();
});
