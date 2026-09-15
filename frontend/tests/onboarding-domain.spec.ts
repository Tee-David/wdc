import { expect, test } from "@playwright/test";

/**
 * The domain question's opt-in checker.
 *
 * THE REGISTRIES ARE STUBBED. `/api/domain` talks to real RDAP services over
 * the network, so a suite that called it would be slow, rate-limited by
 * somebody else, and red on the day `.ng` is having one of its afternoons.
 * What is under test here is the flow around the answer, not the lookup, and
 * lib/rdap.ts is where the lookup itself belongs.
 *
 * WHAT IS BEING PINNED. Three things that are easy to break from a distance:
 * the checker stays out of the way until it is asked for, declining it is
 * reversible, and the chosen name survives into the stored answer as plain
 * text a human can read on the review screen without any parsing.
 */

const DRAFT = {
  started: true,
  service: "web",
  /* Step 2 is "Website setup", which is where `domain_ideas` lives; it shows
     only for a client who has neither hosting nor a domain. */
  step: 2,
  answers: { has_hosting: "Neither" },
};

const STORED = () =>
  JSON.parse(localStorage.getItem("wdc-onboarding-draft") ?? "{}")?.answers?.domain_ideas ?? "";

test.beforeEach(async ({ page }) => {
  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.route("**/api/domain", async (route) => {
    const sent = route.request().postDataJSON() as { domains: string[] };
    await route.fulfill({
      json: {
        results: sent.domains.map((domain) => ({
          domain,
          status: domain.startsWith("taken") ? "taken" : "available",
        })),
      },
    });
  });
  await page.addInitScript((draft) => {
    localStorage.setItem("wdc-onboarding-draft", JSON.stringify(draft));
  }, DRAFT);
});

test("keeps the checker out of the way until it is asked for, and lets it back in", async ({ page }) => {
  await page.goto("/onboarding");
  const field = page.locator('[data-field="domain_ideas"]');
  await expect(field).toBeVisible();

  /* The question on arrival is a box and an offer, nothing else. */
  await expect(field.getByRole("button", { name: "Check availability" })).toHaveCount(0);
  await expect(field.getByText("Want us to check if these names are free?")).toBeVisible();

  await field.getByRole("button", { name: "No thanks" }).click();
  await expect(field.getByText("Want us to check if these names are free?")).toHaveCount(0);
  await expect(field.getByRole("button", { name: "Check availability" })).toHaveCount(0);

  /* Reversible, like every other deferral on this form. */
  await field.getByRole("button", { name: "Check them for me" }).click();
  await expect(field.getByRole("button", { name: "Check availability" })).toBeVisible();
  await expect(field.getByText("Tap Use this one")).toBeVisible();
});

test("records the chosen name in the answer, and drops it when the name is edited", async ({ page }) => {
  await page.goto("/onboarding");
  const field = page.locator('[data-field="domain_ideas"]');
  await field.getByRole("button", { name: "Yes, check them" }).click();

  await field.getByRole("textbox", { name: "Domain idea 1" }).fill("taken-one.com");
  await field.getByRole("button", { name: "Add another" }).click();
  await field.getByRole("textbox", { name: "Domain idea 2" }).fill("free-one.com");
  await field.getByRole("button", { name: "Check availability" }).click();

  await expect(field.getByText("Already registered")).toBeVisible();
  await expect(field.getByText("Looks available")).toBeVisible();
  /* A name somebody else already owns is not a choice, so it is not offered
     as one. */
  await expect(field.getByRole("button", { name: "Use this one" })).toHaveCount(1);

  await field.getByRole("button", { name: "Use this one" }).click();
  await expect(field.getByText("Your first choice")).toBeVisible();
  await expect(field.getByText("A check is not a reservation")).toBeVisible();
  expect(await page.evaluate(STORED)).toBe("taken-one.com\nfree-one.com (first choice)");

  /* The tick beside a name you have just changed is about the old name. */
  await field.getByRole("textbox", { name: "Domain idea 2" }).fill("free-two.com");
  await expect(field.getByText("Your first choice")).toHaveCount(0);
  expect(await page.evaluate(STORED)).toBe("taken-one.com\nfree-two.com");
});
