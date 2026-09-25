import { expect, test } from "@playwright/test";
import { passwordProblem, suggestPassword } from "../lib/auth/password-policy";

/**
 * THE PASSWORD RULE (lib/auth/password-policy.ts): eight or more characters,
 * a capital, a small letter, a number and a symbol. The forms tick it off; the
 * server refuses anything that breaks it, which is what these pin.
 */
test("the rule says what is missing, and passes a password that meets it", () => {
  expect(passwordProblem("Ab1!")).toMatch(/at least 8 characters/);
  expect(passwordProblem("abcdefgh1!")).toBe("Add a capital.");
  expect(passwordProblem("ABCDEFGH")).toBe("Add a small letter, a number and a symbol.");
  expect(passwordProblem("Coffee-at-7")).toBeNull();
  for (let i = 0; i < 50; i++) expect(passwordProblem(suggestPassword())).toBeNull();
});

test("the server refuses a weak new password before it looks at the reset token", async ({ request }) => {
  const res = await request.post("/api/auth/reset-password", {
    data: { newPassword: "longbutweak", token: "not-a-real-token" },
    headers: { origin: "http://localhost:3100" },
  });
  expect(res.status()).toBe(400);
  expect(await res.text()).toMatch(/capital/);
});

test("log in offers Remember me, unticked", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).first().fill("someone@example.com");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Password" }).click();
  const box = page.getByRole("checkbox", { name: "Remember me" });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
});
