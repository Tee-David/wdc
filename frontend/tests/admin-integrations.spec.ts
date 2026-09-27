import { expect, test } from "@playwright/test";

/**
 * Settings says what each outside service actually is.
 *
 * The screen used to describe a Cal.com booking webhook that was never
 * written. This pins the replacement: every row carries one of four honest
 * states, nothing claims to be "working", and nothing that does not exist is
 * drawn as though it does.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test.describe.configure({ timeout: 120_000 });
test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

test("integrations report configuration, never invented health", async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
  ]);
  await page.goto("/admin/settings/integrations", { waitUntil: "domcontentloaded" });
  const panel = page.locator('[data-tour="settings-integrations"]');
  await expect(panel).toBeVisible();

  /* One card per service, its state in the pill at the top. */
  const states = await panel.locator(".adIntg__card .adIntg__top .ad__pill").allTextContents();
  expect(states.length).toBeGreaterThanOrEqual(8);
  for (const state of states) expect(["Set up", "Missing", "Not built", "Manual"]).toContain(state.trim());

  const row = (name: string) => panel.locator(".adIntg__card").filter({ has: page.locator(".adIntg__top b", { hasText: name }) });
  await expect(row("Cal.com").locator(".adIntg__top .ad__pill")).toHaveText("Not built");
  await expect(row("WhatsApp").locator(".adIntg__top .ad__pill")).toHaveText("Manual");
  await expect(page.locator("body")).not.toContainText("cal_booking_uid");
  await expect(panel).not.toContainText(/\bworking\b/i);
});
