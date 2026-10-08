import { expect, test } from "@playwright/test";
import { nextKeyAfter, nextUntil, openScreen, screensFor, screenWithKey, screenWithStep, sharedChecks, type Answers } from "./onboarding-service-suite";
import { chooseOption, isolate } from "./onboarding-helpers";
import { displayAnswers, earlierAnswers } from "@/lib/onboarding-aliases";
import { stepsFor } from "@/lib/onboarding";

/**
 * The Software & AI form (Size first). Shared checks come from
 * onboarding-service-suite.ts; this file adds the follow-ups, the scope and
 * demo notices, and a legacy draft with old process and systems answers.
 */

const SIZE = "sw_size";
const AI = "An AI assistant or chatbot";

const PAINS = ["Copying data between tools", "Slow approvals"];

const sets: Record<"Small" | "Medium" | "Large", Answers> = {
  Small: {
    sw_size: "Small",
    sw_pains: ["Reports done by hand"],
    sw_kind: "An automation",
  },
  Medium: {
    sw_size: "Medium",
    sw_pains: PAINS,
    process: "Staff copy each morning's orders into a sheet by hand.",
    sw_kind: AI,
    sw_tools: ["WhatsApp", "Google Sheets or Excel"],
    sw_ai_rules: ["Data must stay in Nigeria"],
    compliance: "No customer records leave the business.",
    sw_ai_review: "Spot checks",
    users_count: "Ten staff in two offices",
    data_home: "Spreadsheets",
    sw_success: ["Save time"],
  },
  Large: {
    sw_size: "Large",
    sw_pains: PAINS,
    process: "Orders come in on WhatsApp and are keyed into the accounts package.",
    sw_kind: "A data pipeline",
    sw_tools: ["Other", "A database"],
    systems: "Our accounts package and the bank export",
    sw_ai_rules: ["Only some staff may see it"],
    compliance: "Customer names and phones stay inside the business.",
    users_count: "Two hundred agents in six branches",
    data_home: "An existing system",
    sw_success: ["Better reports"],
    success_metric: "Hours saved each week",
  },
};

const service = "software" as const;

sharedChecks({ name: "Software", service, sizeKey: SIZE, sets });

test.describe("Software follow-up questions", () => {
  test.beforeEach(async ({ page }) => {
    await isolate(page);
  });

  test("Other in the tools opens the name box directly under it, and removing it closes the box", async ({ page }) => {
    const answers = { sw_size: "Medium" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "sw_tools"));
    await chooseOption(page, "sw_tools", "Other");
    await expect(page.locator('[data-field="systems"]')).toBeVisible();
    expect(await nextKeyAfter(page, "sw_tools")).toBe("systems");

    await chooseOption(page, "sw_tools", "Other");
    await expect(page.locator('[data-field="systems"]')).toHaveCount(0);
  });

  test("an AI assistant opens the review question and the data rules on the next screen, and another kind removes them", async ({ page }) => {
    const base = { sw_size: "Medium", sw_pains: PAINS };
    await openScreen(page, service, base, screenWithKey(service, base, "sw_kind"));
    await chooseOption(page, "sw_kind", AI);
    await nextUntil(page, "sw_ai_review");
    await expect(page.locator('[data-field="sw_ai_review"]')).toBeVisible();
    await expect(page.locator('[data-field="sw_ai_rules"]')).toBeVisible();
    await expect(page.locator('[data-field="compliance"]')).toBeVisible();

    /* A kind that is not AI, automation or pipeline has no review question and no data rules. */
    const internal = { ...base, sw_kind: "An internal tool" };
    await openScreen(page, service, internal, screenWithKey(service, internal, "users_count"));
    await expect(page.locator('[data-field="sw_ai_review"]')).toHaveCount(0);
    await expect(page.locator('[data-field="sw_ai_rules"]')).toHaveCount(0);
    await expect(page.locator('[data-field="compliance"]')).toHaveCount(0);
  });

  test("an automation keeps the data rules but not the AI review question", async ({ page }) => {
    const automation = { sw_size: "Medium", sw_pains: PAINS, sw_kind: "An automation" };
    await openScreen(page, service, automation, screenWithKey(service, automation, "sw_ai_rules"));
    await expect(page.locator('[data-field="sw_ai_rules"]')).toBeVisible();
    await expect(page.locator('[data-field="sw_ai_review"]')).toHaveCount(0);
  });

  test("the AI review and data rule questions are on the screen the flow reaches, not the kind screen", async () => {
    const answers = { ...sets.Medium };
    const reviewScreen = screensFor(service, answers).find((s) => s.fields.some((f) => f.key === "sw_ai_review"))!;
    const kindScreen = screensFor(service, answers).find((s) => s.fields.some((f) => f.key === "sw_kind"))!;
    expect(reviewScreen.index).toBeGreaterThan(kindScreen.index);
  });

  test("the scope notice says very heavy software is out of scope, above the first question", async ({ page }) => {
    const answers = { sw_size: "Small" };
    await openScreen(page, service, answers, screenWithStep(service, answers, "software"));
    const first = page.locator(".ob__fields > [data-field]").first();
    await expect(first).toHaveAttribute("data-field", "n_scope");
    await expect(first).toContainText("Very heavy software is out of scope");
  });

  test("the demo notice says past work is shown on the discovery call", async ({ page }) => {
    const answers = { sw_size: "Small" };
    await openScreen(page, service, answers, screenWithStep(service, answers, "software_kind"));
    await expect(page.locator('[data-field="n_demo"]')).toContainText("We show demos of past work on the discovery call.");
  });
});

test("a legacy Software draft opens with its old process and systems answers, and the form shows them", async ({ page }) => {
  await isolate(page);
  const legacy = {
    sw_size: "Medium",
    sw_pains: ["Reports done by hand"],
    process: "Old notes: we key orders in from WhatsApp every morning.",
    sw_kind: "An internal tool",
    sw_tools: ["Other"],
    systems: "Our old accounts package",
  };
  /* The process answer is on the first software screen, the systems answer on the kind screen. */
  await openScreen(page, service, legacy, screenWithStep(service, legacy, "software"));
  await expect(page.locator('[data-field="process"] textarea')).toHaveValue("Old notes: we key orders in from WhatsApp every morning.");

  await openScreen(page, service, legacy, screenWithStep(service, legacy, "software_kind"));
  await expect(page.locator('[data-field="systems"] input')).toHaveValue("Our old accounts package");

  /* Software has no alias rules: the stored answers read the same, and nothing is listed as an earlier question. */
  expect(displayAnswers(service, legacy)).toEqual(legacy);
  expect(earlierAnswers(service, legacy)).toEqual([]);
  const known = new Set(stepsFor(service).flatMap((s) => s.fields.map((f) => f.key)));
  expect(known.has("process") && known.has("systems")).toBe(true);
});
