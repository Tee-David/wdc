import { expect, test } from "@playwright/test";
import { nextKeyAfter, nextUntil, openScreen, screensFor, screenWithKey, screenWithStep, sharedChecks, undersizedTargets, type Answers } from "./onboarding-service-suite";
import { chooseOption, isolate } from "./onboarding-helpers";
import { displayAnswers, earlierAnswers, shownInBrief } from "@/lib/onboarding-aliases";
import { POPULAR_FEATURES } from "@/lib/onboarding-services/apps";
import { stepsFor } from "@/lib/onboarding";

/**
 * The Apps form (Size first). Shared checks come from onboarding-service-suite.ts;
 * this file adds the Apps follow-ups, the three Apps notices and the feature
 * checklist, and the legacy draft (platforms "iOS" and "Android", payments).
 *
 * Answer sets below use only popular features, because an unpopular one sits
 * behind "See all" and cannot be ticked without opening it.
 */

const SIZE = "app_size";

const sets: Record<"Small" | "Medium" | "Large", Answers> = {
  Small: {
    app_size: "Small",
    platforms: ["Android phone"],
    app_stage: "Only an idea",
    one_job: "Lets customers order and pay",
    app_features: ["Sign up and log in", "Take payments"],
  },
  Medium: {
    app_size: "Medium",
    platforms: ["iPhone", "Web browser"],
    app_stage: "Designs are ready",
    one_job: "Lets staff take orders on a phone",
    app_roles: ["Customers", "Staff"],
    accounts: "Customers place orders, staff update them",
    offline: "No",
    app_connects: ["WhatsApp"],
    store_accounts: "Both",
    app_features: ["Sign up and log in", "Take payments", "Push notifications"],
  },
  Large: {
    app_size: "Large",
    platforms: ["iPhone", "Android phone", "Web browser"],
    app_stage: "An app to rebuild or extend",
    app_existing: "https://example.org/our-app",
    one_job: "Runs bookings for a clinic network",
    app_roles: ["Customers", "Staff", "Owner or admin"],
    accounts: "Patients book, staff confirm, the owner sees reports",
    offline: "Only some parts",
    app_connects: ["Paystack", "WhatsApp"],
    store_accounts: "One of them",
    store_accounts_wanted: "Yes",
    app_features: ["Sign up and log in", "Profiles", "Messaging", "Admin panel"],
    app_users_count: "100 to 1,000",
    app_data: ["Names and phones", "Payment details"],
    backend: "One exists",
    app_know: "Yes",
    app_tools: ["A web app that installs"],
  },
};

const service = "apps" as const;

sharedChecks({ name: "Apps", service, sizeKey: SIZE, sets });

test.describe("Apps follow-up questions", () => {
  test.beforeEach(async ({ page }) => {
    await isolate(page);
  });

  test("Designs are ready opens the upload directly under the stage, and the other stages close it", async ({ page }) => {
    const answers = { app_size: "Small" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "app_stage"));
    await chooseOption(page, "app_stage", "Designs are ready");
    await expect(page.locator('[data-field="app_files"]')).toBeVisible();
    expect(await nextKeyAfter(page, "app_stage")).toBe("app_files");

    await chooseOption(page, "app_stage", "Only an idea");
    await expect(page.locator('[data-field="app_files"]')).toHaveCount(0);
  });

  test("An app to rebuild opens the link to see it, directly under the stage", async ({ page }) => {
    const answers = { app_size: "Small" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "app_stage"));
    await chooseOption(page, "app_stage", "An app to rebuild or extend");
    await expect(page.locator('[data-field="app_existing"]')).toBeVisible();
    expect(await nextKeyAfter(page, "app_stage")).toBe("app_existing");
    await expect(page.locator('[data-field="app_files"]')).toHaveCount(0);

    await chooseOption(page, "app_stage", "A prototype exists");
    await expect(page.locator('[data-field="app_existing"]')).toHaveCount(0);
    await expect(page.locator('[data-field="app_files"]')).toBeVisible();
  });

  test("a phone at Medium opens store accounts on the next screen, and One of them or Neither opens the set up offer", async ({ page }) => {
    const base = { app_size: "Medium", platforms: ["iPhone"], app_stage: "Only an idea", one_job: "Takes orders" };
    await openScreen(page, service, base, screenWithKey(service, base, "platforms"));
    await nextUntil(page, "store_accounts");
    await expect(page.locator('[data-field="store_accounts"]')).toBeVisible();

    await chooseOption(page, "store_accounts", "Neither");
    await expect(page.locator('[data-field="store_accounts_wanted"]')).toBeVisible();
    expect(await nextKeyAfter(page, "store_accounts")).toBe("store_accounts_wanted");

    await chooseOption(page, "store_accounts", "Both");
    await expect(page.locator('[data-field="store_accounts_wanted"]')).toHaveCount(0);

    await chooseOption(page, "store_accounts", "One of them");
    await expect(page.locator('[data-field="store_accounts_wanted"]')).toBeVisible();
  });

  test("store accounts stay away when no phone is picked, and when the platform is a web browser only", async ({ page }) => {
    const webOnly = { app_size: "Medium", platforms: ["Web browser"], app_stage: "Only an idea", one_job: "Takes orders" };
    await openScreen(page, service, webOnly, screenWithKey(service, webOnly, "app_roles"));
    await expect(page.locator('[data-field="store_accounts"]')).toHaveCount(0);

    /* A phone at Small is not asked either: the store question is a tier 2 question. */
    const phoneSmall = { app_size: "Small", platforms: ["iPhone"], app_stage: "Only an idea", one_job: "Takes orders" };
    expect(screensFor(service, phoneSmall).some((s) => s.fields.some((f) => f.key === "store_accounts"))).toBe(false);
  });

  test("Know the tools opens the tool choice directly under it, and No closes it, at Large", async ({ page }) => {
    const answers = { app_size: "Large" };
    await openScreen(page, service, answers, screenWithKey(service, answers, "app_know"));
    await chooseOption(page, "app_know", "Yes");
    await expect(page.locator('[data-field="app_tools"]')).toBeVisible();
    expect(await nextKeyAfter(page, "app_know")).toBe("app_tools");

    await chooseOption(page, "app_know", "No");
    await expect(page.locator('[data-field="app_tools"]')).toHaveCount(0);
  });

  test("the feature list inside the form: popular first, See all, search, and picked chips", async ({ page }) => {
    const answers = { app_size: "Medium" };
    await openScreen(page, service, answers, screenWithStep(service, answers, "apps_features"));
    const list = page.locator('[data-field="app_features"]');
    await expect(list.locator(".obFeat__pills .obFeat__pill")).toHaveCount(POPULAR_FEATURES.length);
    expect(await list.locator(".obFeat__pills .obFeat__pill").allTextContents()).toEqual(POPULAR_FEATURES);
    await expect(list.getByRole("button", { name: "See all features", exact: true })).toBeVisible();
    await expect(list.getByRole("searchbox", { name: "Search features", exact: true })).toBeVisible();

    await chooseOption(page, "app_features", "Profiles");
    await expect(list.locator(".obFeat__count")).toHaveText("1 feature picked");
    await expect(list.getByRole("button", { name: "Remove Profiles", exact: true })).toBeVisible();
  });

  test("the early notice says what we do not build, and sits above the first question", async ({ page }) => {
    const answers = { app_size: "Small" };
    await openScreen(page, service, answers, screenWithStep(service, answers, "apps"));
    const first = page.locator(".ob__fields > [data-field]").first();
    await expect(first).toHaveAttribute("data-field", "n_kind");
    await expect(first).toContainText("We do not build games");
    await expect(first).toContainText("heavy hardware");
  });

  test("the prototype notice explains the first version before the full build", async ({ page }) => {
    const answers = { app_size: "Small" };
    await openScreen(page, service, answers, screenWithStep(service, answers, "apps_features"));
    await expect(page.locator('[data-field="n_proto"]')).toContainText("prototype");
    await expect(page.locator('[data-field="n_proto"]')).toBeVisible();
  });
});

test("a legacy Apps draft opens, its answers map through the aliases, and nothing typed is lost", async ({ page }) => {
  await isolate(page);
  const legacy = {
    app_size: "Medium",
    platforms: ["iOS", "Android"],
    payments: "Subscriptions",
    one_job: "Lets people book a fitting",
  };
  /* The form opens on the screen with the old platform answers and keeps the answers it can read. */
  const screen = screenWithKey(service, legacy, "one_job");
  await openScreen(page, service, legacy, screen);
  await expect(page.locator('[data-field="one_job"] input, [data-field="one_job"] textarea').first()).toHaveValue("Lets people book a fitting");
  expect(await undersizedTargets(page)).toEqual([]);

  /* The admin reads old answers through the aliases: iOS and Android are the current phone options. */
  const shown = displayAnswers(service, legacy);
  const platformOptions = stepsFor(service).flatMap((s) => s.fields).find((f) => f.key === "platforms")!.options!;
  expect(shown.platforms).toEqual(["iPhone", "Android phone"]);
  for (const v of shown.platforms as string[]) expect(platformOptions).toContain(v);
  expect(shown.app_features).toEqual(["Subscriptions"]);

  /* A Medium brief with an iPhone asks the store question, through the alias. */
  const store = stepsFor(service).flatMap((s) => s.fields).find((f) => f.key === "store_accounts")!;
  expect(shownInBrief(service, store, shown)).toBe(true);

  /* payments no longer has a question, so the admin lists it under Earlier questions. */
  expect(earlierAnswers(service, legacy)).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "payments", value: "Subscriptions" }),
  ]));
});
