import { expect, test } from "@playwright/test";
import { withSocials } from "../lib/email-templates";
import { parseSocial, socialLinks } from "../lib/social";

/**
 * Settings > Business profile: the studio's social profiles, checked against
 * each network's own domain, and drawn in every email's footer by sendMail.
 */
const TOKEN = process.env.BONEYARD_CAPTURE_TOKEN;

test("an address must be on the network's own domain; WhatsApp takes a number", () => {
  expect(parseSocial("linkedin")("https://www.linkedin.com/company/wdc")).toEqual({ ok: true, value: "https://www.linkedin.com/company/wdc" });
  expect(parseSocial("instagram")("instagram.com/wedigcreativity")).toEqual({ ok: true, value: "https://instagram.com/wedigcreativity" });
  expect(parseSocial("x")("https://evil.example/x.com").ok).toBe(false);
  expect(parseSocial("x")("https://x.com.evil.example/wdc").ok).toBe(false);
  expect(parseSocial("facebook")("https://www.facebook.com/").ok).toBe(false);
  expect(parseSocial("whatsapp")("+234 803 555 0142")).toEqual({ ok: true, value: "https://wa.me/2348035550142" });
  expect(parseSocial("youtube")("")).toEqual({ ok: true, value: "" });
});

test("the email footer draws one mark per saved profile, and nothing while there are none", () => {
  const html = "<p>footer</p><!--wdc-social--><p>end</p>";
  expect(withSocials(html, [])).toBe("<p>footer</p><p>end</p>");
  const set: Record<string, string> = { "social.linkedin": "https://www.linkedin.com/company/wdc", "social.x": "https://x.com/wdc" };
  const links = socialLinks((k) => set[k] ?? null);
  expect(links.map((l) => l.network)).toEqual(["linkedin", "x"]);
  const out = withSocials(html, links);
  expect(out).toContain('href="https://www.linkedin.com/company/wdc"');
  expect(out).toContain("social-x.png");
  expect(out).not.toContain("<!--wdc-social-->");
});

test.describe("the settings page", () => {
  test.skip(!TOKEN, "Needs BONEYARD_CAPTURE_TOKEN set on the dev server under test.");
  test.use({ extraHTTPHeaders: { "x-boneyard-capture": TOKEN ?? "" } });

  test("saves a profile, refuses a wrong domain in words, and clears back to none", async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "wdc.session_token", value: "placeholder", url: baseURL ?? "http://localhost:3100" }]);
    await page.goto("/admin/settings/business", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "Business profile" })).toBeVisible();
    await expect(page.getByText("BN 8480926")).toBeVisible();

    const li = page.getByLabel("LinkedIn");
    await li.fill("https://example.com/not-linkedin");
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText(/A LinkedIn address/).first()).toBeVisible({ timeout: 15_000 });

    await li.fill("https://www.linkedin.com/company/wdc-test");
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page.locator(".adToast", { hasText: "Settings saved." })).toBeVisible({ timeout: 15_000 });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("LinkedIn")).toHaveValue("https://www.linkedin.com/company/wdc-test");

    await page.getByLabel("LinkedIn").fill("");
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page.locator(".adToast", { hasText: "Settings saved." })).toBeVisible({ timeout: 15_000 });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("LinkedIn")).toHaveValue("");
  });
});
