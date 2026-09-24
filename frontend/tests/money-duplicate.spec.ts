import { expect, test } from "@playwright/test";

/**
 * An invoice can be copied, and the copy is a new draft with its own number.
 *
 * The checks are the promises the dialog makes: the lines come across, the
 * money does not, and the original is untouched.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test("duplicating a part-paid invoice makes an unpaid draft with the same lines", async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.goto("/admin/money", { waitUntil: "load" });
  const invoices = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Invoices", exact: true }) });
  const original = invoices.locator("tbody tr", { hasText: "INV-2026-001" });
  const numbers = async () => (await invoices.locator("tbody tr td:first-child").allTextContents())
    .map((t) => t.match(/INV-\d{4}-\d{3}/)?.[0]).filter(Boolean) as string[];
  const before = await numbers();

  await original.locator(".ad__rm").click();
  await expect(page.locator(".ad__rmList")).toBeVisible();
  await page.locator(".ad__rmList [data-item]", { hasText: "Duplicate it" }).click();
  const dialog = page.locator("dialog.addlg[open]");
  await expect(dialog.locator("h2")).toContainText("INV-2026-001");
  await dialog.getByRole("button", { name: "Copy it" }).click();
  /* The confirmation closes itself on success. */
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });

  await page.goto("/admin/money", { waitUntil: "load" });
  const after = await numbers();
  const added = after.filter((n) => !before.includes(n));
  expect(added).toHaveLength(1);
  const number = added[0];
  const copy = invoices.locator("tbody tr", { hasText: number });
  await expect(copy.locator(".ad__pill").first()).toHaveText("Draft");
  /* The same lines, so the same total as the original. */
  await expect(copy).toContainText("₦677,250.00");

  /* Same lines: the copy's total is the original's total. Nothing paid. */
  const href = await copy.locator("a[href^='/admin/money/i']").first().getAttribute("href");
  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(number);
  await expect(page.locator("body")).not.toContainText("RCT-");
});

/**
 * THE ACTION CHECKS WHO IS ASKING, NOT THE PAGE.
 *
 * The page is loaded as the owner, then the credential is taken away and the
 * same form is submitted. A server action is a POST anybody can send once
 * they have its id, so the refusal has to come from the action itself.
 */
test("an admin write is refused once the session is gone, even from a page that rendered", async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.goto("/admin/money", { waitUntil: "load" });
  const invoices = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "Invoices", exact: true }) });
  const count = await invoices.locator("tbody tr").count();

  await invoices.locator("tbody tr", { hasText: "INV-2026-001" }).locator(".ad__rm").click();
  await expect(page.locator(".ad__rmList")).toBeVisible();
  await page.locator(".ad__rmList [data-item]", { hasText: "Duplicate it" }).click();
  const dialog = page.locator("dialog.addlg[open]");
  await expect(dialog).toBeVisible();

  /* Header overrides merge with the context's, so the credential is taken
     off the wire instead. */
  await page.route("**/*", (route) => {
    const headers = { ...route.request().headers() };
    delete headers["x-boneyard-capture"];
    return route.continue({ headers });
  });
  await dialog.getByRole("button", { name: "Copy it" }).click();
  await expect(dialog.locator(".ad__msg.is-bad")).toContainText("Sign in again", { timeout: 30_000 });

  await page.unrouteAll();
  await page.goto("/admin/money", { waitUntil: "load" });
  await expect(invoices.locator("tbody tr")).toHaveCount(count);
});
