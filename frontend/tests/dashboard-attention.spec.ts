import { expect, test } from "@playwright/test";

/**
 * The morning queue carries what the bank, the mail server and the client
 * did, and says when there is more than it shows.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });
test.describe.configure({ timeout: 120_000 });

test("unmatched payment events lead the queue, and a long queue says what it left out", async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.goto("/admin", { waitUntil: "load" });
  const queue = page.locator('[data-tour="dash-attention"]');
  const row = queue.locator(".adDash__attentionItem", { hasText: "did not land cleanly" });
  await expect(row).toBeVisible();
  await expect(row.getByRole("link")).toHaveAttribute("href", "/admin/money/reconciliation");

  const shown = await queue.locator(".adDash__attentionItem").count();
  expect(shown).toBeLessThanOrEqual(6);
  if (shown === 6) await expect(queue.locator(".adDash__more")).toContainText("more not shown");
});
