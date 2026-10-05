import { expect, test } from "@playwright/test";

/**
 * THE FOOTER SAYS WHICH IT WAS (the owner's call, 2026-10-05): a new address is
 * thanked, one already on the list is told so, and one that left and came back
 * is welcomed back. The route's answer is mocked, because what is pinned here
 * is what the visitor reads, and it needs no database.
 */
for (const [status, words] of [
  ["added", /You are on the list/],
  ["already", /already on the list/],
  ["returned", /Welcome back/],
] as const) {
  test(`the footer form says what happened: ${status}`, async ({ page }) => {
    await page.route("**/api/newsletter", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status,
          confirmation:
            status === "already"
              ? { message: "You are already on the list, so there is nothing more to do." }
              : status === "returned"
                ? { message: "Welcome back. You are on the list again." }
                : {},
        }),
      }),
    );
    await page.addInitScript(() => {
      try { localStorage.setItem("wdc-intro-seen-at", String(Date.now())); } catch { /* private mode */ }
    });
    await page.goto("/about", { waitUntil: "load" });
    const box = page.locator("#newsletter");
    await box.scrollIntoViewIfNeeded();
    /* The visible bar is drawn in SVG; the real input underneath holds the value
       and takes Enter, which is how the form is submitted. */
    const field = box.locator('input[name="email"]');
    await field.fill("someone@example.org");
    await field.press("Enter");
    await expect(box.locator(".nl__done")).toContainText(words);
    if (status === "already") await expect(box.locator(".nl__done")).toHaveAttribute("data-already", "true");
  });
}
