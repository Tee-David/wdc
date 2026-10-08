import { expect, test } from "@playwright/test";
import { stepsFor } from "@/lib/onboarding";
import { UNSURE, UNSURE_LEGACY } from "@/lib/onboarding-shared";
import { chooseOption, PERSON, walkToReview, type Answer } from "./onboarding-helpers";
import {
  directlyUnder, expectScreenFits, heading, keysOnScreen, openOn, openScreen, readScreens, screensFor, summaryText,
  THEMES, WIDTHS, type Answers,
} from "./onboarding-screens";

/**
 * The SEO form, Size first (lib/onboarding-services/seo.ts, after the UX
 * research E3 and decisions 22 to 34).
 *
 * Brief rule 6 for this service: (a) every screen fits at every width in both
 * themes with 43.5px controls; (b) the size gate, screen by screen; (c)
 * follow-ups directly under their parent; (d) required questions block Next and
 * are named; (e) not sure is reversible; (f) a complete run to the review at 390
 * and 1280; (g) an old saved draft opens. The time frame's three month line and
 * the absence of any budget question are checked too.
 */

const ONE_SITE = "One site, one place";
const GROWING = "A growing site";
const BIG = "A big site or many places";

/* ---------------------------------------------------------- what each size asks

   Hand-written from the step file. The tools screen holds only tier 2 and 3
   questions, so a small job never sees it: the form skips that screen. */

const SMALL_TITLES = [
  "Let's start with you", "Now, about your business", "Who you want to find you", "What you want from search",
  "When, and who gives the final yes", "Anything you can send us now", "Last bits",
];
const MEDIUM_TITLES = [...SMALL_TITLES.slice(0, 4), "What you already have set up", ...SMALL_TITLES.slice(4)];
const SMALL_KEYS = [
  "first_name", "last_name", "phone", "email", "company", "industry", "audience",
  "seo_size", "site_url", "has_site", "customers",
  "seo_goals", "seo_timeframe", "tf_note", "target_terms",
  "deadline_kind", "approver", "channel", "has_logo", "assets", "anything_else",
];
const MEDIUM_KEYS = [...SMALL_KEYS, "about", "company_age", "age_range", "seo_tools", "content_owner", "has_brandbook"];
const LARGE_KEYS = [...MEDIUM_KEYS, "usp", "competitors", "inspiration", "others"];

/* ------------------------------------------------------------- answers used */

/** Every question that can show for a big job, with a little of each. */
const FULL: Answers = {
  ...PERSON,
  seo_size: BIG,
  site_url: "https://example.com",
  customers: "A mix",
  geo: "Three areas around the shop",
  b2b_kind: "Builders and estate agents",
  seo_goals: ["More calls", "More leads", "Show up in AI answers"],
  seo_timeframe: "6 months",
  target_terms: "Wedding photographer near me",
  seo_tools: ["Google Business Profile", "Google Analytics"],
  content_owner: "Nobody yet",
  competitors: "Two studios on the high street",
  age_range: ["35 to 54"],
  usp: "We listen first.",
  has_logo: "Yes",
  has_brandbook: "No",
  brandbook_wanted: "Yes",
  inspiration: "Two links",
  deadline_kind: "Within two weeks",
  others: "The accountant",
  about: "We sell things.",
  anything_else: "Nothing else",
};

/** The smallest answers a client can give on the way to the review. */
const SMALL_WALK: Answers = { ...PERSON, seo_size: ONE_SITE, customers: "Online, anywhere", seo_goals: ["More leads"], seo_timeframe: "3 months" };
const MEDIUM_WALK: Answers = {
  ...PERSON, seo_size: GROWING, customers: "Near me", geo: "The three areas around the shop", seo_goals: ["More calls", "More visibility"],
  seo_timeframe: "6 months", seo_tools: ["Google Business Profile"], content_owner: "My team", has_logo: "Yes", has_brandbook: "No",
};
const LARGE_WALK: Answers = {
  ...PERSON, seo_size: BIG, customers: "A mix", geo: "Three areas around the shop", b2b_kind: "Builders", seo_goals: ["Show up in AI answers"],
  seo_timeframe: "12 months", target_terms: "Wedding photographer near me", seo_tools: ["Google Search Console"],
  content_owner: "Nobody yet", competitors: "Two studios", age_range: ["18 to 34"], usp: "We listen", others: "Our accountant",
  deadline_kind: "No fixed date",
};

const sizeOnly = (size: string): Answers => ({ seo_size: size });
const NOTHING_SAYS = ["Focused", "Standard", "Broad"];
const NOTE_NOT_SURE = "Noted. We will come to this with a recommendation rather than a blank.";

/* ----------------------------------------------------------- (a) layout */

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test(`every SEO screen fits at ${width}px in ${theme} with 43.5px controls`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width, height: 820 });
      const screens = screensFor("seo", FULL);
      for (let n = 0; n < screens.length; n++) {
        await openScreen(page, "seo", FULL, n, theme);
        const title = await heading(page);
        expect(title, `screen ${n} heading`).toBe(screens[n].title);
        const found = await expectScreenFits(page, title, width);
        test.info().annotations.push({ type: "measured", description: `${width} ${theme} ${title}: ${found.measured} controls, tip ${JSON.stringify(found.tips)}` });
      }
    });
  }
}

/* ------------------------------------------------------------- (b) gate */

test("a one site job shows exactly the tier 1 screens and questions, and skips the tools screen", async ({ page }) => {
  const screens = await readScreens(page, "seo", sizeOnly(ONE_SITE));
  expect(screens.map((s) => s.title)).toEqual(SMALL_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...SMALL_KEYS].sort());
});

test("a growing job adds the tools screen, the tools, the writing question and the age, and not the competitors", async ({ page }) => {
  const screens = await readScreens(page, "seo", sizeOnly(GROWING));
  expect(screens.map((s) => s.title)).toEqual(MEDIUM_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("a big job adds the tier 3 questions: the competitors, the inspiration and the rest of the about you", async ({ page }) => {
  const screens = await readScreens(page, "seo", sizeOnly(BIG));
  expect(screens.map((s) => s.title)).toEqual(MEDIUM_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...LARGE_KEYS].sort());
});

test("a not sure job size is asked the middle set, the same as a growing job", async ({ page }) => {
  const screens = await readScreens(page, "seo", sizeOnly(UNSURE));
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("the job size is the client's own words, and no studio label is shown", async ({ page }) => {
  await openOn(page, "seo", {}, "seo_size");
  const text = await page.locator("main").innerText();
  for (const label of NOTHING_SAYS) expect(text.includes(label), `"${label}" must not appear`).toBe(false);
  await expect(page.locator('[data-field="seo_size"] [role="combobox"]')).toBeVisible();
});

test("the SEO form does not ask for a budget, and keeps no retired keys", async () => {
  const fields = stepsFor("seo").flatMap((s) => s.fields);
  for (const f of fields) expect(`${f.key} ${f.label}`.toLowerCase(), f.key).not.toMatch(/budget|spend/);
  for (const retired of ["tools_access", "has_search_console", "has_analytics", "has_gbp", "content_writer_wanted"]) {
    expect(fields.map((f) => f.key), `${retired} is not asked`).not.toContain(retired);
  }
});

/* --------------------------------------------- (c) conditional questions */

test("Near me opens the service area directly under the customers question, and Online closes it", async ({ page }) => {
  await openOn(page, "seo", sizeOnly(GROWING), "customers");
  await chooseOption(page, "customers", "Near me");
  await expect(page.locator('[data-field="geo"]')).toBeVisible();
  expect(await directlyUnder(page, "seo", "customers", "geo")).toBe(true);
  await expect(page.locator('[data-field="geo"] .ob__label')).toContainText("Which areas do you serve?");

  await chooseOption(page, "customers", "Online, anywhere");
  expect(await keysOnScreen(page)).not.toContain("geo");
});

test("Other businesses opens the kind of business for a big job only, directly under the customers question", async ({ page }) => {
  await openOn(page, "seo", sizeOnly(BIG), "customers");
  await chooseOption(page, "customers", "Other businesses");
  await expect(page.locator('[data-field="b2b_kind"]')).toBeVisible();
  expect(await directlyUnder(page, "seo", "customers", "b2b_kind")).toBe(true);
  expect(await keysOnScreen(page)).not.toContain("geo");

  await openOn(page, "seo", sizeOnly(GROWING), "customers");
  await chooseOption(page, "customers", "Other businesses");
  expect(await keysOnScreen(page), "the kind of business waits for a big job").not.toContain("b2b_kind");
});

test("a website address is asked, and a client with no site can say so with one tick", async ({ page }) => {
  await openOn(page, "seo", sizeOnly(GROWING), "site_url");
  await expect(page.locator('[data-field="site_url"]')).toBeVisible();
  await chooseOption(page, "has_site", "I do not have one yet");
  await expect(page.locator('[data-field="has_site"]').getByRole("radio", { name: "I do not have one yet", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("the writing question carries its scope line, and choosing WDC keeps it visible", async ({ page }) => {
  await openOn(page, "seo", { seo_size: GROWING }, "content_owner");
  await expect(page.locator('[data-field="content_owner"]')).toContainText("Nothing is charged from this form.");
  await chooseOption(page, "content_owner", "I would like WDC to");
  await expect(page.locator('[data-field="content_owner"]')).toContainText("Nothing is charged from this form.");
});

test("the Search Console and Analytics question is one tick list with access said to come later", async ({ page }) => {
  await openOn(page, "seo", { seo_size: GROWING }, "seo_tools");
  const field = page.locator('[data-field="seo_tools"]');
  for (const name of ["Google Business Profile", "Google Search Console", "Google Analytics", "None of these"]) {
    await expect(field.getByRole("checkbox", { name, exact: true }), name).toBeVisible();
  }
  await expect(field).toContainText("Access comes later");
});

/* ---------------------------------------------------------- copy and rules */

test("the three month line sits under the time frame and promises no result", async ({ page }) => {
  await openOn(page, "seo", { seo_size: GROWING }, "seo_timeframe");
  const note = page.locator('[data-field="tf_note"]');
  await expect(note).toContainText("Our work starts at 3 months.");
  await expect(note).toContainText("We cannot promise rankings or results.");
  expect(await directlyUnder(page, "seo", "seo_timeframe", "tf_note")).toBe(true);
  await expect(note.getByText(/guarantee/i)).toHaveCount(0);
});

test("the time frame offers 3, 6 and 12 months, and not sure, and nothing shorter", async () => {
  const timeframe = stepsFor("seo").flatMap((s) => s.fields).find((f) => f.key === "seo_timeframe");
  expect(timeframe?.options).toEqual(["3 months", "6 months", "12 months", UNSURE]);
});

test("the AI answers goal is one of the goal ticks", async ({ page }) => {
  await openOn(page, "seo", { seo_size: GROWING }, "seo_goals");
  await expect(page.locator('[data-field="seo_goals"]').getByRole("checkbox", { name: "Show up in AI answers", exact: true })).toBeVisible();
});

/* ------------------------------------------------ (d) required questions */

test("Next is blocked on the first SEO screen, and the message names each required question", async ({ page }) => {
  await openOn(page, "seo", {}, "seo_size");
  await page.locator(".ob__stepNext").click();
  const summary = await summaryText(page);
  expect(summary).toContain("How big is the job? still needs an answer.");
  expect(summary).toContain("Where are your customers? still needs an answer.");
  await expect(page.locator(".ob h2").first()).toHaveText("Who you want to find you");
});

test("the search screen names the goal and the time frame it still needs", async ({ page }) => {
  await openOn(page, "seo", { seo_size: ONE_SITE }, "seo_goals");
  await page.locator(".ob__stepNext").click();
  const summary = await summaryText(page);
  expect(summary).toContain("What do you want search to do for you? still needs an answer.");
  expect(summary).toContain("How long would you like to run this for? still needs an answer.");
});

/* ----------------------------------------------------- (e) not sure */

test("not sure on the job size is reversible: a real size from the list replaces it", async ({ page }) => {
  await openOn(page, "seo", {}, "seo_size");
  const field = page.locator('[data-field="seo_size"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText(NOTE_NOT_SURE)).toBeVisible();
  await chooseOption(page, "seo_size", GROWING);
  await expect(field.getByRole("combobox")).toContainText(GROWING);
  await expect(field.getByText(NOTE_NOT_SURE)).toHaveCount(0);
});

test("not sure on the search words is reversible from its own escape, and typing replaces it", async ({ page }) => {
  await openOn(page, "seo", { seo_size: ONE_SITE }, "target_terms");
  const field = page.locator('[data-field="target_terms"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await field.getByRole("button", { name: "Actually, let me answer this" }).click();
  await field.locator("textarea").fill("Plumber in the north");
  await expect(field.locator("textarea")).toHaveValue("Plumber in the north");
  await expect(field.getByText(NOTE_NOT_SURE)).toHaveCount(0);
});

test("not sure on the goals is reversible, and a real goal replaces it", async ({ page }) => {
  await openOn(page, "seo", { seo_size: ONE_SITE }, "seo_goals");
  const field = page.locator('[data-field="seo_goals"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText(NOTE_NOT_SURE)).toBeVisible();
  await chooseOption(page, "seo_goals", "More calls");
  await expect(field.getByRole("checkbox", { name: "More calls", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText(NOTE_NOT_SURE)).toHaveCount(0);
});

/* ---------------------------------------------- (f) a complete run */

for (const [tier, answers] of [["small", SMALL_WALK], ["medium", MEDIUM_WALK], ["large", LARGE_WALK]] as const) {
  for (const width of [390, 1280] as const) {
    test(`a complete ${tier} SEO brief reaches the review at ${width}px`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 820 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await openScreen(page, "seo", {}, 0);
      const screens = await walkToReview(page, answers as Record<string, Answer>);
      expect(screens.length).toBeGreaterThanOrEqual(6);

      const review = page.locator(".ob__review");
      await expect(review).toBeVisible();
      await expect(review).toContainText(PERSON.company as string);
      await expect(review).toContainText(answers.seo_size as string);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      expect(errors).toEqual([]);
    });
  }
}

/* ------------------------------------------------ (g) an old saved draft */

test("an old SEO draft with the old tools and area opens without error and keeps its words", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  /* The old tools question (tools_access) is read by the admin through
     lib/onboarding-aliases.ts. The form asks seo_tools, so that screen is
     empty for this draft and nothing is lost: the old value stays stored. */
  await openOn(page, "seo", { seo_size: GROWING, tools_access: ["Search Console", "Google Business Profile"] }, "seo_tools");
  await expect(page.locator(".ob h2").first()).toHaveText("What you already have set up");
  await expect(page.locator('[data-field="seo_tools"]')).toBeVisible();

  await openOn(page, "seo", { seo_size: GROWING, customers: "Near me", geo: "The three areas around the shop" }, "geo");
  await expect(page.locator('[data-field="geo"] input')).toHaveValue("The three areas around the shop");

  await openOn(page, "seo", { seo_size: ONE_SITE, target_terms: "Wedding photographer near me" }, "target_terms");
  await expect(page.locator('[data-field="target_terms"] textarea')).toHaveValue("Wedding photographer near me");
  expect(errors).toEqual([]);
});

test("the old semicolon not sure still reads as not sure", async ({ page }) => {
  await openOn(page, "seo", { seo_size: ONE_SITE, target_terms: UNSURE_LEGACY }, "target_terms");
  await expect(page.locator('[data-field="target_terms"]').getByText(NOTE_NOT_SURE)).toBeVisible();
});
