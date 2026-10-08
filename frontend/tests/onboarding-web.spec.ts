import { expect, test } from "@playwright/test";
import { stepsFor } from "@/lib/onboarding";
import { UNSURE, UNSURE_LEGACY } from "@/lib/onboarding-shared";
import { chooseOption, PERSON, walkToReview, type Answer } from "./onboarding-helpers";
import {
  directlyUnder, expectScreenFits, heading, keysOnScreen, openOn, openScreen, readScreens, screensFor, summaryText,
  THEMES, WIDTHS, type Answers,
} from "./onboarding-screens";

/**
 * The web form, Size first (lib/onboarding-services/web.ts, after the UX
 * research E2 and decisions 22 to 34).
 *
 * Brief rule 6 for this service: (a) every screen fits at every width in both
 * themes with 43.5px controls; (b) the size gate, screen by screen; (c)
 * follow-ups directly under their parent; (d) required questions block Next and
 * are named; (e) not sure is reversible; (f) a complete run to the review at 390
 * and 1280; (g) an old saved draft opens.
 */

const SIMPLE = "A simple site";
const BIGGER = "A bigger site";
const LARGE = "A large site";
const IMPROVING = "Improving an existing site";

/* ---------------------------------------------------------- what each size asks

   Hand-written from the step file. With only the size answered, the form shows
   these screens and questions. The web screens hold at least one tier 1
   question each, so the screens are the same at every size; the tiers change
   which questions are on them. */

const TITLES = [
  "Let's start with you", "Now, about your business", "What the site is for", "Words and pictures",
  "Extras, and your web address", "When, and who gives the final yes", "Anything you can send us now", "Last bits",
];
const SMALL_KEYS = [
  "first_name", "last_name", "phone", "email", "company", "industry", "audience",
  "site_size", "site_new_or_existing", "site_jobs", "words_ready", "pictures_ready", "has_domain",
  "deadline_kind", "approver", "channel", "has_logo", "assets", "about", "anything_else",
];
const MEDIUM_KEYS = [...SMALL_KEYS, "age_range", "features", "search_note", "has_brandbook"];
const LARGE_KEYS = [...MEDIUM_KEYS, "page_count", "site_platform", "usp", "others"];

/* ------------------------------------------------------------- answers used */

/** Every question that can show for a large site with a little of each. */
const FULL: Answers = {
  ...PERSON,
  site_size: LARGE,
  site_new_or_existing: IMPROVING,
  current_url: "https://example.com",
  current_problem: "Slow on phones.",
  free_review: "Yes",
  site_jobs: ["Sell online", "Take bookings", "Show our work", "Get enquiries", "Share information", "A members only area", "Something else"],
  site_jobs_other: "Quizzes",
  store_items: "Some, 20 to 200",
  pay_providers: ["Paystack", "I will bring my own"],
  pay_own: "Another provider",
  book_what: ["Appointments"],
  book_pay: "Yes",
  work_count: "10 to 50",
  member_what: "Articles",
  member_join: "They pay to join",
  page_count: "6 to 15",
  site_platform: "WordPress",
  words_ready: "I need help",
  pictures_ready: "I need help",
  features: ["Blog", "Other"],
  features_other: "Events calendar",
  has_domain: "No",
  hosting_wanted: "Yes",
  deadline_kind: "Within two weeks",
  fixed_dates: "The launch",
  has_logo: "No",
  logo_wanted: "Yes",
  has_brandbook: "No",
  brandbook_wanted: "Yes",
  age_range: ["18 to 34"],
  usp: "We listen first.",
  others: "The accountant",
  about: "We sell things.",
  anything_else: "Nothing else",
};

/** The smallest answers a client can give on the way to the review. */
const SMALL_WALK: Answers = { ...PERSON, site_size: SIMPLE, site_new_or_existing: "Brand new", site_jobs: ["Share information"], words_ready: "I have them" };
const MEDIUM_WALK: Answers = {
  ...PERSON, site_size: BIGGER, site_new_or_existing: "Brand new", site_jobs: ["Show our work", "Get enquiries"], work_count: "10 to 50",
  words_ready: "I have them", pictures_ready: "I need help", features: ["Blog"], has_domain: "Yes",
  hosting_details: "Namecheap, in Tobi's name", has_brandbook: "No", brandbook_wanted: "Yes",
};
const LARGE_WALK: Answers = {
  ...PERSON, site_size: LARGE, site_new_or_existing: IMPROVING, current_url: "https://example.com", current_problem: "Slow on phones",
  free_review: "Yes", site_jobs: ["Sell online", "Take bookings"], store_items: "Some, 20 to 200", pay_providers: ["Paystack"],
  book_what: ["Appointments"], book_pay: "Yes", words_ready: "I need help", pictures_ready: "I have them", page_count: "16 to 40",
  site_platform: "WordPress", features: ["Blog", "Newsletter sign up"], has_domain: "No", hosting_wanted: "Yes",
  deadline_kind: "Within a month", has_logo: "No", logo_wanted: "No",
};

const sizeOnly = (size: string): Answers => ({ site_size: size });
const NOTHING_SAYS = ["Small", "Medium", "Large", "Tier"];
const NOTE_NOT_SURE = "Noted. We will come to this with a recommendation rather than a blank.";

/* ----------------------------------------------------------- (a) layout */

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test(`every web screen fits at ${width}px in ${theme} with 43.5px controls`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width, height: 820 });
      const screens = screensFor("web", FULL);
      for (let n = 0; n < screens.length; n++) {
        await openScreen(page, "web", FULL, n, theme);
        const title = await heading(page);
        expect(title, `screen ${n} heading`).toBe(screens[n].title);
        const found = await expectScreenFits(page, title, width);
        test.info().annotations.push({ type: "measured", description: `${width} ${theme} ${title}: ${found.measured} controls, tip ${JSON.stringify(found.tips)}` });
      }
    });
  }
}

/* ------------------------------------------------------------- (b) gate */

test("a simple site shows exactly the tier 1 screens and questions", async ({ page }) => {
  const screens = await readScreens(page, "web", sizeOnly(SIMPLE));
  expect(screens.map((s) => s.title)).toEqual(TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...SMALL_KEYS].sort());
});

test("a bigger site adds the tier 2 questions: the age, the extra features, the search note and the brand guide question", async ({ page }) => {
  const screens = await readScreens(page, "web", sizeOnly(BIGGER));
  expect(screens.map((s) => s.title)).toEqual(TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("a large site adds the tier 3 questions: the page count, the platform and the rest of the about you", async ({ page }) => {
  const screens = await readScreens(page, "web", sizeOnly(LARGE));
  expect(screens.map((s) => s.title)).toEqual(TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...LARGE_KEYS].sort());
});

test("a not sure size is asked the middle set, the same as a bigger site", async ({ page }) => {
  const screens = await readScreens(page, "web", sizeOnly(UNSURE));
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("the size is the client's own words, and no studio label is shown", async ({ page }) => {
  await openOn(page, "web", {}, "site_size");
  const text = await page.locator("main").innerText();
  for (const label of NOTHING_SAYS) expect(text.includes(label), `"${label}" must not appear`).toBe(false);
  await expect(page.locator('[data-field="site_size"] button[role="combobox"], [data-field="site_size"] [role="combobox"]')).toBeVisible();
});

test("the search note appears for a bigger site, and says search is its own service", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "site_jobs");
  expect(await keysOnScreen(page)).not.toContain("search_note");
  await openOn(page, "web", sizeOnly(BIGGER), "site_jobs");
  await expect(page.locator('[data-field="search_note"]')).toContainText("Search work is its own service");
});

test("the maintenance and blogging questions are not asked on the default path", async () => {
  const asked = stepsFor("web").flatMap((s) => s.fields).map((f) => f.key);
  for (const retired of ["wants_maintenance", "maintenance_after_reading", "wants_blogging", "site_goal", "has_hosting", "content_ready", "wants_seo"]) {
    expect(asked, `${retired} is not asked`).not.toContain(retired);
  }
});

/* --------------------------------------------- (c) conditional questions */

test("Improving an existing site opens the current address and the free review under it, and Brand new closes them", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "site_new_or_existing");
  await chooseOption(page, "site_new_or_existing", IMPROVING);
  for (const key of ["current_url", "free_review"]) {
    await expect(page.locator(`[data-field="${key}"]`), `${key} shown`).toBeVisible();
    expect(await directlyUnder(page, "web", "site_new_or_existing", key), `${key} under the question`).toBe(true);
  }
  await expect(page.locator('[data-field="free_review"]')).toContainText("A free review is advice. It is not a promise of results.");

  await chooseOption(page, "site_new_or_existing", "Brand new");
  expect(await keysOnScreen(page)).not.toContain("current_url");
  expect(await keysOnScreen(page)).not.toContain("free_review");
});

test("a large site that is improving a site is also asked what they like and dislike about it", async ({ page }) => {
  await openOn(page, "web", { site_size: LARGE }, "site_new_or_existing");
  await chooseOption(page, "site_new_or_existing", IMPROVING);
  await expect(page.locator('[data-field="current_problem"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "current_url", "current_problem")).toBe(true);
});

test("Sell online opens the store size, the payments note and the providers under the question, and unticking it closes them", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "site_jobs");
  await chooseOption(page, "site_jobs", "Sell online");
  for (const key of ["store_items", "pay_note", "pay_providers"]) {
    await expect(page.locator(`[data-field="${key}"]`), `${key} shown`).toBeVisible();
    expect(await directlyUnder(page, "web", "site_jobs", key), `${key} under site_jobs`).toBe(true);
  }
  const note = page.locator('[data-field="pay_note"]');
  await expect(note).toContainText("Paystack and Flutterwave");
  await expect(note).toContainText("Stripe, PayPal and Square");
  await expect(note).toContainText("bring your own provider");

  await chooseOption(page, "site_jobs", "Sell online");
  for (const key of ["store_items", "pay_note", "pay_providers", "pay_own"]) {
    expect(await keysOnScreen(page), `${key} gone`).not.toContain(key);
  }
});

test("bring your own provider opens the provider's name directly under the providers", async ({ page }) => {
  await openOn(page, "web", { site_size: SIMPLE, site_jobs: ["Sell online"] }, "pay_providers");
  await chooseOption(page, "pay_providers", "I will bring my own");
  await expect(page.locator('[data-field="pay_own"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "pay_providers", "pay_own")).toBe(true);

  await chooseOption(page, "pay_providers", "I will bring my own");
  await expect(page.locator('[data-field="pay_own"]')).toHaveCount(0);
});

test("Take bookings opens what people book and whether they pay, and Show our work opens the count from a bigger site", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "site_jobs");
  await chooseOption(page, "site_jobs", "Take bookings");
  for (const key of ["book_what", "book_pay"]) {
    expect(await directlyUnder(page, "web", "site_jobs", key), `${key} under site_jobs`).toBe(true);
  }
  await chooseOption(page, "site_jobs", "Show our work");
  expect(await keysOnScreen(page), "work count hidden for a simple site").not.toContain("work_count");

  await openOn(page, "web", sizeOnly(BIGGER), "site_jobs");
  await chooseOption(page, "site_jobs", "Show our work");
  await expect(page.locator('[data-field="work_count"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "site_jobs", "work_count")).toBe(true);
});

test("Something else opens its own question directly under the list", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "site_jobs");
  await chooseOption(page, "site_jobs", "Something else");
  await expect(page.locator('[data-field="site_jobs_other"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "site_jobs", "site_jobs_other")).toBe(true);
});

test("a domain answer opens exactly the questions for it, and the hosting cost line is always shown", async ({ page }) => {
  await openOn(page, "web", sizeOnly(BIGGER), "has_domain");
  await chooseOption(page, "has_domain", "No");
  for (const key of ["domain_ideas", "hosting_wanted"]) {
    await expect(page.locator(`[data-field="${key}"]`), `${key} shown for no domain`).toBeVisible();
    expect(await directlyUnder(page, "web", "has_domain", key), `${key} under has_domain`).toBe(true);
  }
  await expect(page.locator('[data-field="hosting_wanted"]')).toContainText("not to us");
  expect(await keysOnScreen(page)).not.toContain("hosting_details");

  await chooseOption(page, "has_domain", "Yes");
  expect(await keysOnScreen(page)).not.toContain("domain_ideas");
  expect(await keysOnScreen(page)).not.toContain("hosting_wanted");
  await expect(page.locator('[data-field="hosting_details"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "has_domain", "hosting_details")).toBe(true);
});

test("needing help with the words shows the note that writing is quoted separately, and goes when both are ready", async ({ page }) => {
  await openOn(page, "web", sizeOnly(SIMPLE), "words_ready");
  expect(await keysOnScreen(page)).not.toContain("content_scope");
  await chooseOption(page, "words_ready", "I need help");
  await expect(page.locator('[data-field="content_scope"]')).toContainText("quoted separately");
  await chooseOption(page, "words_ready", "I have them");
  expect(await keysOnScreen(page)).not.toContain("content_scope");
});

test("a bigger site that wants a few features can name one more", async ({ page }) => {
  await openOn(page, "web", sizeOnly(BIGGER), "features");
  await chooseOption(page, "features", "Other");
  await expect(page.locator('[data-field="features_other"]')).toBeVisible();
  expect(await directlyUnder(page, "web", "features", "features_other")).toBe(true);
});

/* ------------------------------------------------- (d) required questions */

test("Next is blocked on the first web screen, and the message names each required question", async ({ page }) => {
  await openOn(page, "web", {}, "site_size");
  await page.locator(".ob__stepNext").click();
  const summary = await summaryText(page);
  expect(summary).toContain("How big is the site? still needs an answer.");
  expect(summary).toContain("Is this a new website, or improving one you have? still needs an answer.");
  expect(summary).toContain("What should the site do for you? still needs an answer.");
  await expect(page.locator(".ob h2").first()).toHaveText("What the site is for");
});

test("an improving site is asked for its current address before Next goes on, and the message names it", async ({ page }) => {
  await openOn(page, "web", { site_size: SIMPLE, site_new_or_existing: IMPROVING, site_jobs: ["Share information"] }, "current_url");
  await page.locator(".ob__stepNext").click();
  expect(await summaryText(page)).toContain("Your current site still needs an answer.");
});

test("the words question names itself when Next is pressed without an answer", async ({ page }) => {
  await openOn(page, "web", { site_size: SIMPLE }, "words_ready");
  await page.locator(".ob__stepNext").click();
  expect(await summaryText(page)).toContain("The words for the site still needs an answer.");
  await expect(page.locator(".ob h2").first()).toHaveText("Words and pictures");
});

/* ----------------------------------------------------- (e) not sure */

test("not sure on the size is reversible: a real size from the list replaces it", async ({ page }) => {
  await openOn(page, "web", {}, "site_size");
  const field = page.locator('[data-field="site_size"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText(NOTE_NOT_SURE)).toBeVisible();

  await chooseOption(page, "site_size", LARGE);
  await expect(field.getByRole("combobox")).toContainText(LARGE);
  await expect(field.getByText(NOTE_NOT_SURE)).toHaveCount(0);
  await expect(field.getByRole("button", { name: UNSURE })).toBeVisible();
});

test("not sure on the jobs list is reversible from its own button, and a real pick replaces it", async ({ page }) => {
  await openOn(page, "web", { site_size: SIMPLE }, "site_jobs");
  const field = page.locator('[data-field="site_jobs"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText(NOTE_NOT_SURE)).toBeVisible();
  await chooseOption(page, "site_jobs", "Take bookings");
  await expect(field.getByRole("checkbox", { name: "Take bookings", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText(NOTE_NOT_SURE)).toHaveCount(0);
});

/* ---------------------------------------------- (f) a complete run */

for (const [tier, answers] of [["small", SMALL_WALK], ["medium", MEDIUM_WALK], ["large", LARGE_WALK]] as const) {
  for (const width of [390, 1280] as const) {
    test(`a complete ${tier} web brief reaches the review at ${width}px`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 820 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await openScreen(page, "web", {}, 0);
      const screens = await walkToReview(page, answers as Record<string, Answer>);
      expect(screens.length).toBeGreaterThanOrEqual(6);

      const review = page.locator(".ob__review");
      await expect(review).toBeVisible();
      await expect(review).toContainText(PERSON.company as string);
      await expect(review).toContainText(answers.site_size as string);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      expect(errors).toEqual([]);
    });
  }
}

/* ------------------------------------------------ (g) an old saved draft */

test("an old web draft with the old values opens without error and keeps the answers it has", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  /* features: "Online store" was a feature, and is now a job. "Blog" still
     exists and stays ticked. The form reads the stored keys it asks; the admin
     reads old values through lib/onboarding-aliases.ts. */
  await openOn(page, "web", { site_size: BIGGER, features: ["Online store", "Blog"], has_hosting: "Neither" }, "features");
  await expect(page.locator('[data-field="features"]').getByRole("checkbox", { name: "Blog", exact: true })).toHaveAttribute("aria-checked", "true");

  /* page_count: the old en dash range opens and the question is there. */
  await openOn(page, "web", { site_size: LARGE, page_count: "1–5" }, "page_count");
  await expect(page.locator('[data-field="page_count"]')).toBeVisible();

  /* content_ready was the old one question about words and pictures. */
  await openOn(page, "web", { site_size: SIMPLE, content_ready: "I need WDC to produce them", content_needed: ["Words"] }, "words_ready");
  await expect(page.locator('[data-field="words_ready"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("the old semicolon not sure still reads as not sure", async ({ page }) => {
  await openOn(page, "web", { site_size: UNSURE_LEGACY }, "site_size");
  await expect(page.locator('[data-field="site_size"]').getByText(NOTE_NOT_SURE)).toBeVisible();
});
