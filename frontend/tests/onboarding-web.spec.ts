import { expect, test, type Page } from "@playwright/test";
import { stepsFor } from "@/lib/onboarding";
import { UNSURE, UNSURE_LEGACY } from "@/lib/onboarding-shared";
import {
  completeAnswers, directlyUnder, fieldKeys, isShown, layoutFindings, open, stepOf, tipSize, WIDTHS,
  type Answers, type Theme,
} from "./onboarding-size-first";

/**
 * The web form, Size first (artifact web.js, tiers 1 to 3).
 *
 * Brief rule 6 for this service: (a) layout at every width in both themes,
 * (b) the size gate, (c) conditional questions under their parent, (d)
 * required questions block Next, (e) not sure is reversible, (f) a complete
 * run to the review screen, (g) an old draft opens. Plus the web-specific
 * copy and the reveal that is not built yet.
 */

/* Every question that can show, given a Large site and a little of each. The
   layout checks walk each step with this, so the widest content is measured. */
const WEB_FULL: Answers = {
  site_size: "A large site",
  site_new_or_existing: "Improving an existing site",
  current_url: "https://example.com",
  current_problem: "Slow on phones.",
  free_review: "Yes",
  site_jobs: ["Sell online", "Take bookings", "Show our work", "Get enquiries", "Something else", "A members only area"],
  site_jobs_other: "Quizzes",
  store_items: "Some, 20 to 200",
  pay_providers: ["Paystack", "I will bring my own"],
  pay_own: "A plugin from another provider",
  book_what: "Fittings",
  book_pay: "Yes",
  work_count: "10 to 50",
  enquiry_ways: ["A contact form"],
  member_what: "Articles",
  member_join: "They pay to join",
  page_count: "6 to 15",
  content_ready: "I have some of them",
  content_needed: ["Words"],
  deadline_kind: "Within two weeks",
  features: ["Blog", "Other"],
  features_other: "Events calendar",
  has_hosting: "Neither",
  domain_ideas: "tobishop.com.ng",
  hosting_wanted: "Yes",
  wants_seo: "Yes",
};

const TIER_2 = ["features", "has_hosting", "domain_ideas", "hosting_wanted", "wants_seo"];

const card = (page: Page, field: string, name: string) =>
  page.locator(`[data-field="${field}"]`).getByRole("radio", { name, exact: true });
const box = (page: Page, field: string, name: string) =>
  page.locator(`[data-field="${field}"]`).getByRole("checkbox", { name, exact: true });

/* ----------------------------------------------------------- (a) layout */

for (const width of WIDTHS) {
  for (const theme of ["light", "dark"] as Theme[]) {
    test(`every web step fits at ${width}px in ${theme} with 44px controls`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 820 });
      const steps = stepsFor("web");
      for (let n = 0; n < steps.length; n++) {
        await open(page, "web", n, WEB_FULL, theme);
        await expect(page.locator("main")).toContainText(steps[n].title);
        expect(await fieldKeys(page).then((k) => k.length), `${steps[n].title} renders questions`).toBeGreaterThan(0);

        const found = await layoutFindings(page);
        expect(found.scrollWidth, `${steps[n].title}: page width`).toBeLessThanOrEqual(width);
        expect(found.small, `${steps[n].title}: controls under 44px`).toEqual([]);
      }
    });
  }
}

test("the tip trigger's size is measured and recorded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await open(page, "web", stepOf("web", "site_jobs"), { site_size: "A simple site" });
  const size = await tipSize(page);
  test.info().annotations.push({ type: "tip-size", description: JSON.stringify(size) });
  expect(size).not.toBeNull();
});

/* ------------------------------------------------------------- (b) gate */

test("a simple site is not asked the second tier, and a bigger, large or unsure site is", async ({ page }) => {
  const step = stepOf("web", "features");
  await open(page, "web", step, { site_size: "A simple site" });
  for (const key of TIER_2) expect(await isShown(page, key), `simple: ${key} hidden`).toBe(false);
  expect(await isShown(page, "deadline_kind"), "tier 1 still asked").toBe(true);

  for (const size of ["A bigger site", "A large site", UNSURE]) {
    await open(page, "web", step, { site_size: size, has_hosting: "Both" });
    expect(await isShown(page, "features"), `${size}: features shown`).toBe(true);
    expect(await isShown(page, "has_hosting"), `${size}: has_hosting shown`).toBe(true);
    expect(await isShown(page, "wants_seo"), `${size}: wants_seo shown`).toBe(true);
  }
});

test("a large site is asked everything in the second tier, with the parent answers that open them", async ({ page }) => {
  await open(page, "web", stepOf("web", "features"), { site_size: "A large site", has_hosting: "Neither", features: ["Other"] });
  for (const key of ["features", "features_other", "has_hosting", "domain_ideas", "hosting_wanted", "wants_seo", "deadline_kind"]) {
    expect(await isShown(page, key), `${key} shown for a large site`).toBe(true);
  }
  expect(await isShown(page, "hosting_details"), "details wait for Both or Domain only").toBe(false);
});

test("the size answer is the client's own words and no studio label is ever shown", async ({ page }) => {
  await open(page, "web", stepOf("web", "site_jobs"), {});
  const text = await page.locator("main").innerText();
  for (const label of ["Small", "Medium", "Large", "Tier"]) {
    expect(text.includes(label), `"${label}" must not appear on the client's page`).toBe(false);
  }
  await expect(card(page, "site_size", "A simple site")).toBeVisible();
  await expect(card(page, "site_size", "A bigger site")).toBeVisible();
  await expect(card(page, "site_size", "A large site")).toBeVisible();
});

/* --------------------------------------------- (c) conditional questions */

test("the questions under 'Improving an existing site' appear beneath it and leave when it changes", async ({ page }) => {
  await open(page, "web", stepOf("web", "site_new_or_existing"), { site_size: "A simple site" });
  await card(page, "site_new_or_existing", "Improving an existing site").click();
  for (const key of ["current_url", "current_problem", "free_review"]) {
    expect(await isShown(page, key), `${key} shown`).toBe(true);
    expect(await directlyUnder(page, "web", "site_new_or_existing", key), `${key} directly under its parent`).toBe(true);
  }
  await expect(page.locator('[data-field="free_review"]')).toContainText("A free review is advice. It is not a promise of results.");

  await card(page, "site_new_or_existing", "Brand new").click();
  for (const key of ["current_url", "current_problem", "free_review"]) {
    expect(await isShown(page, key), `${key} gone for a brand new site`).toBe(false);
  }
});

test("choosing outcomes opens their follow ups under the question, and unticking closes them", async ({ page }) => {
  await open(page, "web", stepOf("web", "site_jobs"), { site_size: "A simple site" });

  await box(page, "site_jobs", "Sell online").click();
  for (const key of ["store_items", "pay_note", "pay_providers"]) {
    expect(await directlyUnder(page, "web", "site_jobs", key), `${key} directly under site_jobs`).toBe(true);
  }
  await box(page, "site_jobs", "Take bookings").click();
  for (const key of ["book_what", "book_pay"]) {
    expect(await directlyUnder(page, "web", "site_jobs", key), `${key} directly under site_jobs`).toBe(true);
  }

  await box(page, "site_jobs", "Sell online").click();
  for (const key of ["store_items", "pay_note", "pay_providers", "pay_own"]) {
    expect(await isShown(page, key), `${key} gone once Sell online is unticked`).toBe(false);
  }
  expect(await isShown(page, "book_what"), "bookings stay").toBe(true);
});

test("Something else reveals its own detail, and a Show our work answer opens the work count", async ({ page }) => {
  await open(page, "web", stepOf("web", "site_jobs"), { site_size: "A simple site" });
  await box(page, "site_jobs", "Something else").click();
  await expect(page.locator('[data-field="site_jobs_other"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "site_jobs", "site_jobs_other")).toBe(true);

  await box(page, "site_jobs", "Show our work").click();
  await expect(page.locator('[data-field="work_count"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "site_jobs", "work_count")).toBe(true);
});

test("the payments line names both groups of providers, and bring your own opens a follow up", async ({ page }) => {
  await open(page, "web", stepOf("web", "site_jobs"), { site_size: "A simple site", site_jobs: ["Sell online"] });
  const note = page.locator('[data-field="pay_note"]');
  await expect(note).toContainText("Paystack and Flutterwave");
  await expect(note).toContainText("Stripe, PayPal and Square");
  await expect(note).toContainText("bring your own provider");
  await expect(note).toContainText("Some setups are limited by the type of site.");

  await box(page, "pay_providers", "I will bring my own").click();
  await expect(page.locator('[data-field="pay_own"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "pay_providers", "pay_own")).toBe(true);
  await box(page, "pay_providers", "I will bring my own").click();
  await expect(page.locator('[data-field="pay_own"]')).toHaveCount(0);
});

test("a domain and hosting answer opens exactly the questions for it", async ({ page }) => {
  await open(page, "web", stepOf("web", "has_hosting"), { site_size: "A bigger site" });
  await card(page, "has_hosting", "Neither").click();
  for (const key of ["domain_ideas", "hosting_wanted"]) {
    expect(await directlyUnder(page, "web", "has_hosting", key), `${key} directly under has_hosting`).toBe(true);
  }
  expect(await isShown(page, "hosting_details")).toBe(false);

  await card(page, "has_hosting", "Both").click();
  expect(await isShown(page, "domain_ideas")).toBe(false);
  expect(await isShown(page, "hosting_wanted")).toBe(false);
  expect(await directlyUnder(page, "web", "has_hosting", "hosting_details")).toBe(true);
});

test("the words-and-pictures follow up appears only when the client needs help", async ({ page }) => {
  await open(page, "web", stepOf("web", "content_ready"), { site_size: "A simple site" });
  await expect(page.locator('[data-field="content_needed"]')).toHaveCount(0);
  await card(page, "content_ready", "I need WDC to produce them").click();
  expect(await directlyUnder(page, "web", "content_ready", "content_needed")).toBe(true);
  await card(page, "content_ready", "They are ready").click();
  await expect(page.locator('[data-field="content_needed"]')).toHaveCount(0);
});

test("no maintenance question is asked on the default path", async ({ page }) => {
  const asked = stepsFor("web").flatMap((s) => s.fields).map((f) => f.key);
  for (const retired of ["wants_maintenance", "maintenance_after_reading", "wants_blogging", "site_goal"]) {
    expect(asked, `${retired} is not asked`).not.toContain(retired);
  }
  await open(page, "web", stepOf("web", "wants_seo"), WEB_FULL);
  expect(await fieldKeys(page)).not.toContain("wants_maintenance");
});

/* ------------------------------------------------- (d) required questions */

test("Next is blocked until the size question is answered, and the message names it", async ({ page }) => {
  await open(page, "web", 1, {});
  await page.locator(".ob__stepNext").click();
  const summary = page.locator(".ob__err");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("How big is the site?");
  await expect(page.locator('[data-field="site_jobs"]')).toBeVisible();
});

test("the one-line messages name the conditional questions that are now required", async ({ page }) => {
  await open(page, "web", 1, { site_size: "A simple site", site_new_or_existing: "Improving an existing site" });
  await page.locator(".ob__stepNext").click();
  await expect(page.locator(".ob__err")).toContainText("Your current site");
  await expect(page.locator(".ob__err")).toContainText("What should the site do for you?");
});

/* ----------------------------------------------------- (e) not sure */

test("not sure on the size question is reversible, and the cards stay usable", async ({ page }) => {
  await open(page, "web", 1, {});
  const field = page.locator('[data-field="site_size"]');
  await field.getByRole("button", { name: "I'm not sure, please advise me" }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await expect(card(page, "site_size", "A large site")).toBeEnabled();

  await card(page, "site_size", "A large site").click();
  await expect(card(page, "site_size", "A large site")).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

test("not sure on a multiple choice question is reversible from the escape", async ({ page }) => {
  await open(page, "web", 1, { site_size: "A simple site" });
  const field = page.locator('[data-field="site_jobs"]');
  await field.getByRole("button", { name: "I'm not sure, please advise me" }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await field.getByRole("button", { name: "Actually, let me answer this" }).click();
  await box(page, "site_jobs", "Sell online").click();
  await expect(box(page, "site_jobs", "Sell online")).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

/* ---------------------------------------------- (f) a complete run */

for (const width of [390, 1280] as const) {
  test(`a complete large site brief reaches the review screen at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 820 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, "web", 0, completeAnswers("web", { site_size: "A large site" }));
    const send = page.getByRole("button", { name: /Send the brief/ });
    for (let n = 0; n < 8 && !(await send.isVisible()); n++) {
      await page.locator(".ob__stepNext").click();
    }
    await expect(send).toBeVisible();
    expect(errors).toEqual([]);
  });
}

/* ------------------------------------------------ (g) an old saved draft */

test("an old draft with the old values still opens and shows them", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  /* The features step: old feature values include "Online store", which is now
     a job, and "Blog", which still exists. The old values are not an error. */
  await open(page, "web", stepOf("web", "features"), {
    site_size: "A large site",
    features: ["Online store", "Blog"],
    has_hosting: "Neither",
  });
  await expect(box(page, "features", "Blog")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('[data-field="has_hosting"]')).toBeVisible();

  /* The page count step: the old en dash range opens and the field is there. */
  await open(page, "web", stepOf("web", "page_count"), { page_count: "1–5" });
  await expect(page.locator('[data-field="page_count"]')).toBeVisible();

  expect(errors).toEqual([]);
});

test("the old semicolon not sure still reads as not sure", async ({ page }) => {
  await open(page, "web", stepOf("web", "has_hosting"), { site_size: "A bigger site", has_hosting: UNSURE_LEGACY });
  await expect(page.locator('[data-field="has_hosting"]').getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
});
