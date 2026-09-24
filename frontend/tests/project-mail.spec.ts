import { expect, test, type Page } from "@playwright/test";

/**
 * The project messages are written to the client's log when they happen.
 *
 * Run against a server with no mail server, so every one of them lands as a
 * Failed row -- which is the point: before, these events sent nothing and left
 * nothing, and now a row exists whether or not the mail went.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.skip(Boolean(process.env.SMTP_HOST), "Mail is configured here, so this would send real email.");
test.describe.configure({ mode: "serial", timeout: 150_000 });
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
});

async function clientLog(page: Page) {
  await page.goto("/admin/clients/c1", { waitUntil: "load" });
  return page.locator(".ad__panel", { has: page.getByRole("heading", { name: "What we have sent them" }) });
}

/* Presses a form button, retrying until the page says it took. */
async function press(page: Page, name: string, done: () => Promise<void>) {
  await expect(async () => {
    await page.getByRole("button", { name, exact: true }).first().click({ timeout: 2_000 });
    await done();
  }).toPass({ timeout: 60_000 });
}

test("a stage change tells the client, and the log shows it", async ({ page }) => {
  await page.goto("/admin/projects/p2", { waitUntil: "load" });
  await press(page, "Discovery", () => expect(page.locator('.ad__stageBtn.is-on')).toHaveText("Discovery", { timeout: 3_000 }));
  await expect.poll(async () => (await clientLog(page)).locator("tr", { hasText: "Shop rebuild is now at Discovery" }).count(), { timeout: 20_000 })
    .toBeGreaterThan(0);

  /* Back where it was, for the specs that read this project after us. */
  await page.goto("/admin/projects/p2", { waitUntil: "load" });
  await press(page, "Onboarding", () => expect(page.locator('.ad__stageBtn.is-on')).toHaveText("Onboarding", { timeout: 3_000 }));
});

test("an approval in the portal sends the client a sign-off record", async ({ page }) => {
  await page.goto("/portal/projects/p1", { waitUntil: "load" });
  /* The Approve form leaves once it has worked, so its absence is the sign. */
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  await expect(async () => {
    if (await approve.count()) await approve.first().click({ timeout: 2_000 });
    await expect(approve).toHaveCount(0, { timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await expect.poll(async () => (await clientLog(page)).locator("tr", { hasText: "Signed off: Identity routes" }).count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
});

test("sending a deliverable for approval asks the client, and puts the seed back", async ({ page }) => {
  await page.goto("/admin/projects/p1", { waitUntil: "load" });
  const dialog = page.locator("dialog.addlg[open]");
  await expect(async () => {
    await page.getByRole("button", { name: "Record a response" }).first().click({ timeout: 2_000 });
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await dialog.getByLabel(/^What happened/).selectOption("Awaiting client");
  await dialog.getByRole("button", { name: "Record it" }).click();
  await expect.poll(async () => (await clientLog(page)).locator("tr", { hasText: "Identity routes (v1)" }).count(), { timeout: 20_000 })
    .toBeGreaterThan(1);
});
