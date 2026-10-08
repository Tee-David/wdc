import { expect, test } from "@playwright/test";
import { nextKeyAfter, nextUntil, noHorizontalScroll, openScreen, screensFor, screenWithKey, sharedChecks, storedAnswer, undersizedTargets, type Answers } from "./onboarding-service-suite";
import { chooseOption, isolate } from "./onboarding-helpers";
import { displayAnswers, earlierAnswers } from "@/lib/onboarding-aliases";
import { stepsFor } from "@/lib/onboarding";

/**
 * The Social Media & Paid Ads form (Size first). Shared checks come from
 * onboarding-service-suite.ts. This file adds the links box, the Paid ads
 * budget on the next screen, the account route (one of four answers), the rule
 * that passwords are never asked, and a legacy draft with handle, access and
 * an en dash budget.
 */

const SIZE = "social_size";
const MGMT = "Management";
const CONTENT = "Content creation";
const ADS = "Paid ads";

const ACCOUNT_ROUTES = [
  "I have them and can add you",
  "I have some, please help with the rest",
  "I do not have them, please set them up",
  "Please work through me",
];

const sets: Record<"Small" | "Medium" | "Large", Answers> = {
  Small: {
    social_size: "Small",
    social_packages: [MGMT],
    channels: ["Instagram"],
    social_access: "Please work through me",
  },
  Medium: {
    social_size: "Medium",
    social_packages: [MGMT, ADS],
    channels: ["Instagram", "TikTok"],
    social_links: "instagram.com/acme\ntiktok.com/@acme",
    social_access: "I have them and can add you",
    ad_spend: "Under ₦100k",
    social_approval_speed: "Same day",
    social_goal: "Sales",
    social_report: "Every month",
    social_success: "Ten new customers a month",
  },
  Large: {
    social_size: "Large",
    social_packages: [MGMT, CONTENT, ADS],
    channels: ["Instagram", "TikTok", "YouTube"],
    social_links: "instagram.com/acme\ntiktok.com/@acme\nyoutube.com/@acme",
    social_access: "I have some, please help with the rest",
    ad_spend: "₦100k to ₦500k",
    social_approval_speed: "Within two days",
    social_goal: "Bookings",
    social_report: "Every week",
    social_success: "Forty bookings a month",
    content_types: ["Short video", "Photos"],
    social_results: "About two thousand followers",
    social_notes: "Avoid politics. A launch in March.",
  },
};

const service = "social" as const;

sharedChecks({ name: "Social", service, sizeKey: SIZE, sets });

test.describe("Social follow-up questions", () => {
  test.beforeEach(async ({ page }) => {
    await isolate(page);
  });

  test("a platform opens the links box directly under the platforms, and None yet closes it", async ({ page }) => {
    const answers = { social_size: "Small" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "channels"));
    await chooseOption(page, "channels", "Instagram");
    await expect(page.locator('[data-field="social_links"]')).toBeVisible();
    expect(await nextKeyAfter(page, "channels")).toBe("social_links");

    await chooseOption(page, "channels", "None yet");
    await expect(page.locator('[data-field="social_links"]')).toHaveCount(0);
  });

  test("Paid ads opens the ad budget on the next screen, and leaving it out hides the budget", async ({ page }) => {
    const base = { social_size: "Small", channels: ["Instagram"] };
    await openScreen(page, service, base, screenWithKey(service, base, "social_packages"));
    await chooseOption(page, "social_packages", ADS);
    await nextUntil(page, "social_access");
    await expect(page.locator('[data-field="ad_spend"]')).toBeVisible();

    /* Without Paid ads, the same screen has no budget. Seeded, so the rule is shown without walking back. */
    const withoutAds = { ...base, social_packages: [MGMT], social_access: "Please work through me" };
    await openScreen(page, service, withoutAds, screenWithKey(service, withoutAds, "social_access"));
    await expect(page.locator('[data-field="ad_spend"]')).toHaveCount(0);
  });

  test("the ad budget is paid to the platform, and says so under the question", async ({ page }) => {
    const answers = { social_size: "Small", social_packages: [ADS], channels: ["Instagram"], social_access: "Please work through me" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "ad_spend"));
    await expect(page.locator('[data-field="ad_spend"]')).toContainText("paid to Meta or Google, not to us");
  });

  test("Other as the goal opens the other result box directly under it, at Medium", async ({ page }) => {
    const answers = { social_size: "Medium" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "social_goal"));
    await chooseOption(page, "social_goal", "Other");
    await expect(page.locator('[data-field="social_goal_other"]')).toBeVisible();
    expect(await nextKeyAfter(page, "social_goal")).toBe("social_goal_other");

    await chooseOption(page, "social_goal", "Sales");
    await expect(page.locator('[data-field="social_goal_other"]')).toHaveCount(0);
  });

  test("how we work says we plan the calendar and that the client approves posts before they go out", async ({ page }) => {
    const answers = { social_size: "Small" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "n_how"));
    const note = page.locator('[data-field="n_how"]');
    await expect(note).toContainText("We plan a content calendar, schedule the posts and bring trend ideas.");
    await expect(note).toContainText("You approve content before we post it.");
  });

  test("the account route stores one of the four answers, and choosing another replaces it", async ({ page }) => {
    const answers = { social_size: "Small" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "social_access"));
    const question = page.locator('[data-field="social_access"]');
    for (const route of ACCOUNT_ROUTES) {
      await chooseOption(page, "social_access", route);
      await expect(question.getByRole("combobox")).toContainText(route);
      await expect.poll(() => storedAnswer(page, "social_access")).toBe(route);
    }
    /* One answer, never a list, whichever was chosen last. */
    expect(Array.isArray(await storedAnswer(page, "social_access"))).toBe(false);
  });

  test("passwords are never asked on any screen, at any size", async ({ page }) => {
    test.setTimeout(600_000);
    const answers = sets.Large;
    const offences: string[] = [];
    for (const s of screensFor(service, answers)) {
      await openScreen(page, service, answers, s.index, { width: 390 });
      const passwordInputs = await page.locator('.ob__fields input[type="password"], .ob__fields input[autocomplete*="password"]').count();
      if (passwordInputs) offences.push(`${s.step.title}: a password input`);
      for (const label of await page.locator(".ob__fields .ob__label").allTextContents()) {
        if (/password|passcode|pin\b|one-time code|otp/i.test(label)) offences.push(`${s.step.title}: "${label.trim()}"`);
      }
    }
    expect(offences).toEqual([]);
  });
});

test("a legacy Social draft opens, its answers map through the aliases, and the form keeps what it can read", async ({ page }) => {
  await isolate(page);
  const legacy = {
    social_size: "Medium",
    social_packages: [ADS],
    channels: ["Instagram"],
    handle_instagram: "@acme",
    access_ok: "I can give WDC access",
    ad_spend: "₦100k–₦500k",
  };
  /* The access question and the budget are on the same screen. Both keep their place. */
  await openScreen(page, service, legacy, screenWithKey(service, legacy, "social_access"));
  await expect(page.locator('[data-field="ad_spend"]')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBeTruthy();
  expect(await undersizedTargets(page)).toEqual([]);

  const shown = displayAnswers(service, legacy);
  expect(shown.ad_spend).toBe("₦100k to ₦500k");
  expect(shown.social_access).toBe("I have them and can add you");
  expect(shown.social_links).toBe("@acme");

  const options = stepsFor(service).flatMap((s) => s.fields).find((f) => f.key === "ad_spend")!.options!;
  expect(options).toContain(shown.ad_spend as string);
  expect(earlierAnswers(service, legacy).map((x) => x.key).sort()).toEqual(["access_ok", "handle_instagram"]);
});
