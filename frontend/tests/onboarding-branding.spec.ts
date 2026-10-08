import { expect, test } from "@playwright/test";
import { UNSURE, UNSURE_LEGACY } from "@/lib/onboarding-shared";
import { chooseOption, PERSON, walkToReview, type Answer } from "./onboarding-helpers";
import {
  directlyUnder, expectScreenFits, heading, keysOnScreen, openOn, openScreen, readScreens, screensFor, summaryText,
  THEMES, touchFindings, WIDTHS, type Answers,
} from "./onboarding-screens";

/**
 * The Branding & Design form, Size first (lib/onboarding-services/branding.ts).
 *
 * Brief rule 6 for this service, plus the style route and the deliverable
 * cards: (a) every screen fits at every width in both themes with 43.5px
 * controls; (b) the size gate, checked screen by screen against the tier lists
 * below; (c) follow-ups directly under their parent; (d) required questions
 * block Next and are named; (e) not sure is reversible; (f) a complete run to
 * the review at 390 and 1280; (g) an old saved draft opens.
 */

const SMALL = "One piece or a small set";
const MEDIUM = "Several pieces";
const LARGE = "A full brand";

/* ---------------------------------------------------------- what each size asks

   Hand-written from the step file. With only the size answered, the form shows
   exactly these screens and questions. Medium adds the colour screen and the
   age question; Large adds the tier 3 questions that need no other answer. */

const SMALL_TITLES = [
  "Let's start with you", "Now, about your business", "What we are making",
  "What you already have, and the look you want", "When, and who gives the final yes",
  "Anything you can send us now", "Last bits",
];
const SMALL_KEYS = [
  "first_name", "last_name", "phone", "email", "company", "industry", "audience",
  "job_size", "deliverables", "brand_have", "style_help",
  "deadline_kind", "approver", "channel", "assets", "about", "anything_else",
];
const MEDIUM_TITLES = [...SMALL_TITLES.slice(0, 4), "Colours", ...SMALL_TITLES.slice(4)];
const MEDIUM_KEYS = [...SMALL_KEYS, "age_range", "brand_colours"];
const LARGE_TITLES = [...MEDIUM_TITLES.slice(0, 5), "A little more detail", ...MEDIUM_TITLES.slice(5)];
const LARGE_KEYS = [...MEDIUM_KEYS, "usp", "avoid", "others"];

/* ------------------------------------------------------------- answers used */

/** Every question that can show, so the layout checks measure the widest screens. */
const FULL: Answers = {
  ...PERSON,
  job_size: LARGE,
  deliverables: ["Full identity system", "Brand guidelines", "Flyers", "Motion design", "Other"],
  deliverables_other: "Stickers",
  motion_kinds: ["Logo reveal", "Explainer"],
  job_rhythm: "A batch",
  batch_count: "4 to 10",
  brand_have: ["A logo", "A brand guide"],
  untouchable: "The name stays",
  style_help: "A bit of both",
  style_links: "https://example.com",
  style_directions: "Yes",
  surfaces: ["Print", "Other"],
  surfaces_other: "Taxi roof",
  brand_voice: "Friendly",
  brand_words: ["Warm"],
  avoid: "Neon",
  age_range: ["18 to 34"],
  usp: "We listen first.",
  deadline_kind: "Within two weeks",
  fixed_dates: "The launch",
  others: "The accountant",
  about: "We make things.",
  anything_else: "Nothing else",
};

/** The smallest answers a client can give on the way to the review. */
const SMALL_WALK: Answers = { ...PERSON, job_size: SMALL, deliverables: ["Logo"], brand_have: ["Nothing yet"] };
const MEDIUM_WALK: Answers = {
  ...PERSON, job_size: MEDIUM, deliverables: ["Logo", "Flyers"], job_rhythm: "A batch", batch_count: "4 to 10",
  brand_have: ["A logo"], style_help: "Suggest for me", style_directions: "No",
};
const LARGE_WALK: Answers = {
  ...PERSON, job_size: LARGE, deliverables: ["Full identity system", "Motion design"], motion_kinds: ["Logo reveal"],
  brand_have: ["A logo", "A brand guide"], untouchable: "The name stays", surfaces: ["Print"],
  brand_voice: "Formal", brand_words: ["Trusted"], avoid: "Neon", style_help: "I have references",
  style_links: "https://example.com", age_range: ["35 to 54"], usp: "We listen first.", others: "Our accountant",
  deadline_kind: "Within a month",
};

const sizeOnly = (size: string): Answers => ({ job_size: size });
const NOTHING_SAYS = ["Small", "Medium", "Large", "Tier"];

/* ----------------------------------------------------------- (a) layout */

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test(`every Branding screen fits at ${width}px in ${theme} with 43.5px controls`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width, height: 820 });
      const screens = screensFor("branding", FULL);
      for (let n = 0; n < screens.length; n++) {
        await openScreen(page, "branding", FULL, n, theme);
        const title = await heading(page);
        expect(title, `screen ${n} heading`).toBe(screens[n].title);
        const found = await expectScreenFits(page, title, width);
        test.info().annotations.push({ type: "measured", description: `${width} ${theme} ${title}: ${found.measured} controls, tip ${JSON.stringify(found.tips)}` });
      }
    });
  }
}

test("the tip trigger on a Branding question is at least 43.5px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await openOn(page, "branding", sizeOnly(SMALL), "deliverables");
  const tips = (await touchFindings(page)).tips;
  test.info().annotations.push({ type: "tip-size", description: JSON.stringify(tips) });
  expect(tips.length).toBeGreaterThan(0);
  for (const h of tips) expect(h, "tip trigger height").toBeGreaterThanOrEqual(43.5);
});

/* ------------------------------------------------------------- (b) gate */

test("a small job shows exactly the tier 1 screens and questions", async ({ page }) => {
  const screens = await readScreens(page, "branding", sizeOnly(SMALL));
  expect(screens.map((s) => s.title)).toEqual(SMALL_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...SMALL_KEYS].sort());
});

test("a medium job adds the colour screen and the age question, and nothing else", async ({ page }) => {
  const screens = await readScreens(page, "branding", sizeOnly(MEDIUM));
  expect(screens.map((s) => s.title)).toEqual(MEDIUM_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("a large job adds the tier 3 questions that need no other answer", async ({ page }) => {
  const screens = await readScreens(page, "branding", sizeOnly(LARGE));
  expect(screens.map((s) => s.title)).toEqual(LARGE_TITLES);
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...LARGE_KEYS].sort());
});

test("a not sure size is asked the middle set, the same as a medium job", async ({ page }) => {
  const screens = await readScreens(page, "branding", sizeOnly(UNSURE));
  expect(screens.flatMap((s) => s.keys).sort()).toEqual([...MEDIUM_KEYS].sort());
});

test("the tier 3 questions that depend on other answers open for a large job, and not for a medium one", async ({ page }) => {
  await openOn(page, "branding", { job_size: LARGE, deliverables: ["Logo"], brand_have: ["A logo"] }, "brand_have");
  await expect(page.locator('[data-field="untouchable"]')).toBeVisible();
  expect(await directlyUnder(page, "branding", "brand_have", "untouchable"), "untouchable under brand_have").toBe(true);

  await openOn(page, "branding", { job_size: MEDIUM, deliverables: ["Logo"], brand_have: ["A logo"] }, "brand_have");
  await expect(page.locator('[data-field="brand_have"]')).toBeVisible();
  expect(await keysOnScreen(page)).not.toContain("untouchable");
});

test("the size answer is the client's own words and no studio label is shown", async ({ page }) => {
  await openOn(page, "branding", {}, "job_size");
  const text = await page.locator("main").innerText();
  for (const label of NOTHING_SAYS) expect(text.includes(label), `"${label}" must not appear`).toBe(false);
  for (const name of [SMALL, MEDIUM, LARGE]) {
    await expect(page.locator('[data-field="job_size"]').getByRole("radio", { name, exact: true })).toBeVisible();
  }
});

/* --------------------------------------------- (c) conditional questions */

test("Motion design opens the kinds of motion directly under it, and unticking it closes them", async ({ page }) => {
  await openOn(page, "branding", sizeOnly(SMALL), "deliverables");
  await chooseOption(page, "deliverables", "Motion design");
  await expect(page.locator('[data-field="motion_kinds"]')).toBeVisible();
  expect(await directlyUnder(page, "branding", "deliverables", "motion_kinds")).toBe(true);

  await chooseOption(page, "deliverables", "Motion design");
  await expect(page.locator('[data-field="motion_kinds"]')).toHaveCount(0);
});

test("Flyers opens the job rhythm, a batch opens the count, and each closes when its parent changes", async ({ page }) => {
  await openOn(page, "branding", sizeOnly(SMALL), "deliverables");
  await chooseOption(page, "deliverables", "Flyers");
  await expect(page.locator('[data-field="job_rhythm"]')).toBeVisible();
  expect(await directlyUnder(page, "branding", "deliverables", "job_rhythm")).toBe(true);

  await chooseOption(page, "job_rhythm", "A batch");
  await expect(page.locator('[data-field="batch_count"]')).toBeVisible();
  expect(await directlyUnder(page, "branding", "job_rhythm", "batch_count")).toBe(true);

  await chooseOption(page, "job_rhythm", "One piece");
  await expect(page.locator('[data-field="batch_count"]')).toHaveCount(0);

  await chooseOption(page, "job_rhythm", "A batch");
  await chooseOption(page, "deliverables", "Flyers");
  await expect(page.locator('[data-field="job_rhythm"]')).toHaveCount(0);
  await expect(page.locator('[data-field="batch_count"]')).toHaveCount(0);
});

test("a small job that ticks Brand guidelines still reaches the Colours screen, and a small logo job does not", async ({ page }) => {
  await openOn(page, "branding", { job_size: SMALL, deliverables: ["Brand guidelines"], brand_have: ["Nothing yet"] }, "brand_have");
  await page.locator(".ob__stepNext").click();
  await expect(page.locator(".ob h2").first()).toHaveText("Colours");
  await expect(page.locator('[data-field="brand_colours"]')).toBeVisible();

  await openOn(page, "branding", { job_size: SMALL, deliverables: ["Logo"], brand_have: ["Nothing yet"] }, "brand_have");
  await page.locator(".ob__stepNext").click();
  await expect(page.locator(".ob h2").first()).toHaveText("When, and who gives the final yes");
});

test("the style route opens its follow ups under it, and the directions question carries the approved sentence", async ({ page }) => {
  const base = { job_size: SMALL, deliverables: ["Logo"], brand_have: ["Nothing yet"] };
  await openOn(page, "branding", base, "style_help");
  for (const key of ["style_links", "style_files", "style_directions"]) {
    expect(await keysOnScreen(page), `${key} hidden before a style is chosen`).not.toContain(key);
  }

  await chooseOption(page, "style_help", "I have references");
  for (const key of ["style_links", "style_files"]) {
    expect(await directlyUnder(page, "branding", "style_help", key), `${key} under style_help`).toBe(true);
  }
  expect(await keysOnScreen(page)).not.toContain("style_directions");

  await chooseOption(page, "style_help", "Suggest for me");
  await expect(page.locator('[data-field="style_directions"]')).toBeVisible();
  expect(await directlyUnder(page, "branding", "style_help", "style_directions")).toBe(true);
  await expect(page.locator('[data-field="style_directions"]')).toContainText("Either way, we will do this properly.");
  expect(await keysOnScreen(page)).not.toContain("style_links");

  await chooseOption(page, "style_help", "A bit of both");
  for (const key of ["style_links", "style_files", "style_directions"]) {
    await expect(page.locator(`[data-field="${key}"]`), `${key} with a bit of both`).toBeVisible();
  }
  await expect(page.locator('[data-field="style_directions"]')).toContainText("Either way, we will do this properly.");
});

test("the deliverable cards show one picture each, and every picture loads", async ({ page }) => {
  await openOn(page, "branding", sizeOnly(SMALL), "deliverables");
  const cards = page.locator('[data-field="deliverables"] .obOpt__card');
  await expect(cards).toHaveCount(13);
  const names = await cards.evaluateAll((els) => els.map((el) => el.querySelector(".obOpt__name")?.textContent?.trim() ?? ""));
  for (let i = 0; i < names.length; i++) {
    const images = cards.nth(i).locator("img");
    if (names[i] === "Other") {
      expect(await images.count(), "Other has no picture").toBe(0);
      continue;
    }
    expect(await images.count(), `${names[i]} has one picture`).toBe(1);
    await images.first().scrollIntoViewIfNeeded();
    await expect.poll(() => images.first().evaluate((el) => (el as HTMLImageElement).naturalWidth), { message: `${names[i]} picture loads` }).toBeGreaterThan(0);
  }
});

/* ------------------------------------------------------- (d) required */

test("Next is blocked on the job screen until the size and the deliverables are answered, and both are named", async ({ page }) => {
  await openOn(page, "branding", {}, "job_size");
  await page.locator(".ob__stepNext").click();
  const summary = await summaryText(page);
  expect(summary).toContain("How big is this job? still needs an answer.");
  expect(summary).toContain("What are we making? still needs an answer.");
  await expect(page.locator(".ob h2").first()).toHaveText("What we are making");
});

test("the what-you-have screen names its required question when Next is pressed", async ({ page }) => {
  await openOn(page, "branding", { job_size: SMALL, deliverables: ["Logo"] }, "brand_have");
  await page.locator(".ob__stepNext").click();
  expect(await summaryText(page)).toContain("What do you already have? still needs an answer.");
  await expect(page.locator(".ob h2").first()).toHaveText("What you already have, and the look you want");
});

/* ------------------------------------------------------ (e) not sure */

test("not sure on the size is reversible: a real size replaces it and the cards stay enabled", async ({ page }) => {
  await openOn(page, "branding", {}, "job_size");
  const field = page.locator('[data-field="job_size"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  const medium = field.getByRole("radio", { name: MEDIUM, exact: true });
  await expect(medium).toBeEnabled();

  await medium.click();
  await expect(medium).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

test("not sure on the deliverables is reversible from its own button, and a real pick replaces it", async ({ page }) => {
  await openOn(page, "branding", sizeOnly(SMALL), "deliverables");
  const field = page.locator('[data-field="deliverables"]');
  await field.getByRole("button", { name: UNSURE }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await field.getByRole("button", { name: "Actually, let me answer this" }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);

  await field.getByRole("button", { name: UNSURE }).click();
  await chooseOption(page, "deliverables", "Logo");
  const logo = field.getByRole("checkbox", { name: "Logo", exact: true });
  await expect(logo).toHaveAttribute("aria-checked", "true");
  await expect(logo).toBeEnabled();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

/* ------------------------------------------------------ (f) a complete run */

for (const [tier, answers] of [["small", SMALL_WALK], ["medium", MEDIUM_WALK], ["large", LARGE_WALK]] as const) {
  for (const width of [390, 1280] as const) {
    test(`a complete ${tier} Branding brief reaches the review at ${width}px`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 820 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await openScreen(page, "branding", answers, 0);
      const screens = await walkToReview(page, answers as Record<string, Answer>);
      expect(screens.length).toBeGreaterThanOrEqual(6);

      const review = page.locator(".ob__review");
      await expect(review).toBeVisible();
      await expect(review).toContainText(PERSON.company as string);
      await expect(review).toContainText((answers.deliverables as string[])[0]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      expect(errors).toEqual([]);
    });
  }
}

/* -------------------------------------------------- (g) an old saved draft */

test("an old Branding draft with the old brand state opens without error and asks the question again", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  /* brand_state was the old "what exists today" question. It is not shown as
     an answer here: the form reads the stored keys it asks, and the admin view
     maps the old value (onboarding-aliases.spec.ts). */
  await openOn(page, "branding", { job_size: LARGE, deliverables: ["Logo"], brand_state: "A logo only" }, "brand_have");
  await expect(page.locator(".ob h2").first()).toHaveText("What you already have, and the look you want");
  await expect(page.locator('[data-field="brand_have"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("an old semicolon not sure on the style question still reads as not sure", async ({ page }) => {
  await openOn(page, "branding", { job_size: SMALL, deliverables: ["Logo"], style_help: UNSURE_LEGACY }, "style_help");
  await expect(page.locator('[data-field="style_help"]').getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
});
