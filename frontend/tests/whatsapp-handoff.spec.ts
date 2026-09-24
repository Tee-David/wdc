import { expect, test } from "@playwright/test";
import { whatsappLink } from "../lib/admin/whatsapp";

/**
 * WhatsApp is a hand-over, not an integration.
 *
 * The admin opens WhatsApp on the client's number with a draft filled in, and
 * a person writes down what was said. Nothing here claims to have sent or read
 * a message.
 */

const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test("numbers become wa.me links the way a Nigerian client list writes them", () => {
  expect(whatsappLink("0803 123 4567")).toBe("https://wa.me/2348031234567");
  expect(whatsappLink("+234 803 123 4567")).toBe("https://wa.me/2348031234567");
  expect(whatsappLink("2348031234567")).toBe("https://wa.me/2348031234567");
  expect(whatsappLink("+44 7700 900123")).toBe("https://wa.me/447700900123");
  expect(whatsappLink("803 123 4567")).toBe("https://wa.me/2348031234567");
  expect(whatsappLink("12345")).toBeNull();
  expect(whatsappLink("")).toBeNull();
  expect(whatsappLink("0803 123 4567", "Hi Tobi")).toBe("https://wa.me/2348031234567?text=Hi%20Tobi");
});

test.describe("on a client's page", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });
  test.describe.configure({ timeout: 120_000 });

  test("opens WhatsApp on their number and logs what was said", async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" },
    ]);
    await page.goto("/admin/clients/c1", { waitUntil: "load" });
    const log = page.locator(".ad__panel", { has: page.getByRole("heading", { name: "What we have sent them" }) });

    const open = log.getByRole("link", { name: "Open WhatsApp" });
    await expect(open).toHaveAttribute("href", /^https:\/\/wa\.me\/234\d{10}\?text=/);
    await expect(open).toHaveAttribute("target", "_blank");

    const subject = `Confirmed the Friday review ${Date.now()}`;
    const dialog = page.locator("dialog.addlg[open]");
    /* Retried: a press before hydration opens nothing. */
    await expect(async () => {
      await log.getByRole("button", { name: "Log a call or message" }).click();
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await dialog.getByLabel(/^About/).fill(subject);
    await dialog.getByLabel(/^What was said/).fill("Tobi will bring the marketing lead.");
    await dialog.getByRole("button", { name: "Log it" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    await page.reload({ waitUntil: "load" });
    const row = log.locator("tr", { hasText: subject });
    await expect(row).toContainText("WhatsApp");
    await expect(row).toContainText("Sent");
  });
});
