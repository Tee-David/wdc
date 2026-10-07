import { expect, test, type Page } from "@playwright/test";
import { stepsFor } from "@/lib/onboarding";
import { UNSURE } from "@/lib/onboarding-shared";
import {
  completeAnswers, directlyUnder, fieldKeys, isShown, layoutFindings, open, stepOf, WIDTHS,
  type Answers, type Theme,
} from "./onboarding-size-first";

/**
 * The SEO form, Size first (artifact seo.js, tiers 1 to 3).
 *
 * Brief rule 6 for this service, plus the SEO copy: the local follow up only
 * for local customers, the time frame with its three month line, Search Console
 * and Analytics as two Yes, No, Not sure questions, and no budget question.
 */

/* Every question that can show for a big job with a little of each. */
const SEO_FULL: Answers = {
  seo_size: "A big site or many places",
  has_site: "Yes",
  site_url: "https://example.com",
  customers: "A mix",
  geo: "The three areas around the shop",
  has_gbp: "No",
  b2b_kind: "Builders and estate agents",
  seo_goals: ["More calls", "More leads", "Show up in AI answers"],
  seo_timeframe: "6 months",
  target_terms: "Wedding photographer near me",
  has_search_console: "Yes",
  has_analytics: "Yes",
  content_owner: "Nobody yet",
  content_writer_wanted: "Yes",
  competitors: "Two studios on the high street",
};

const TIER_2 = ["has_search_console", "has_analytics", "content_owner", "content_writer_wanted"];
const SEARCH_STEP = () => stepOf("seo", "seo_goals");

const card = (page: Page, field: string, name: string) =>
  page.locator(`[data-field="${field}"]`).getByRole("radio", { name, exact: true });
const box = (page: Page, field: string, name: string) =>
  page.locator(`[data-field="${field}"]`).getByRole("checkbox", { name, exact: true });

/* ----------------------------------------------------------- (a) layout */

for (const width of WIDTHS) {
  for (const theme of ["light", "dark"] as Theme[]) {
    test(`every SEO step fits at ${width}px in ${theme} with 44px controls`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 820 });
      const steps = stepsFor("seo");
      for (let n = 0; n < steps.length; n++) {
        await open(page, "seo", n, SEO_FULL, theme);
        await expect(page.locator("main")).toContainText(steps[n].title);
        expect(await fieldKeys(page).then((k) => k.length), `${steps[n].title} renders questions`).toBeGreaterThan(0);

        const found = await layoutFindings(page);
        expect(found.scrollWidth, `${steps[n].title}: page width`).toBeLessThanOrEqual(width);
        expect(found.small, `${steps[n].title}: controls under 44px`).toEqual([]);
      }
    });
  }
}

/* ------------------------------------------------------------- (b) gate */

test("a one site job is not asked the tools, the content or the competitors", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "One site, one place" });
  for (const key of [...TIER_2, "competitors"]) expect(await isShown(page, key), `one site: ${key} hidden`).toBe(false);
  for (const key of ["seo_goals", "seo_timeframe", "tf_note", "target_terms"]) {
    expect(await isShown(page, key), `one site: ${key} asked`).toBe(true);
  }
});

test("a growing job asks the tools and content, and not the competitors", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  for (const key of TIER_2) expect(await isShown(page, key), `growing: ${key} shown`).toBe(true);
  expect(await isShown(page, "competitors"), "growing: competitors hidden").toBe(false);
});

test("a big job asks everything, and not sure asks the second tier", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A big site or many places" });
  for (const key of [...TIER_2, "competitors"]) expect(await isShown(page, key), `big: ${key} shown`).toBe(true);

  await open(page, "seo", SEARCH_STEP(), { seo_size: UNSURE });
  for (const key of TIER_2) expect(await isShown(page, key), `unsure: ${key} shown`).toBe(true);
  expect(await isShown(page, "competitors"), "unsure: competitors wait for a big job").toBe(false);
});

test("the job size is the client's own words and no studio label is shown", async ({ page }) => {
  await open(page, "seo", 1, {});
  const text = await page.locator("main").innerText();
  for (const label of ["Focused", "Standard", "Broad"]) {
    expect(text.includes(label), `"${label}" must not appear on the client's page`).toBe(false);
  }
  await expect(card(page, "seo_size", "One site, one place")).toBeVisible();
  await expect(card(page, "seo_size", "A growing site")).toBeVisible();
  await expect(card(page, "seo_size", "A big site or many places")).toBeVisible();
});

/* --------------------------------------------- (c) conditional questions */

test("local follow ups appear only for local customers", async ({ page }) => {
  await open(page, "seo", 1, { seo_size: "A growing site" });
  const local = ["geo", "has_gbp"];
  const businesses = ["b2b_kind"];

  await card(page, "customers", "Online, anywhere").click();
  for (const key of [...local, ...businesses]) expect(await isShown(page, key), `online: ${key} hidden`).toBe(false);

  await card(page, "customers", "Near me").click();
  for (const key of local) expect(await directlyUnder(page, "seo", "customers", key), `near me: ${key} under customers`).toBe(true);
  expect(await isShown(page, "b2b_kind"), "near me: business question hidden").toBe(false);

  await card(page, "customers", "Other businesses").click();
  expect(await directlyUnder(page, "seo", "customers", "b2b_kind"), "businesses: b2b_kind under customers").toBe(true);
  for (const key of local) expect(await isShown(page, key), `businesses: ${key} hidden`).toBe(false);

  await card(page, "customers", "A mix").click();
  for (const key of [...local, ...businesses]) expect(await isShown(page, key), `mix: ${key} shown`).toBe(true);
});

test("the service area is asked as Which areas do you serve, and a Google Business Profile card has its own answers", async ({ page }) => {
  await open(page, "seo", 1, { seo_size: "A growing site", customers: "Near me" });
  await expect(page.locator('[data-field="geo"] .ob__label')).toContainText("Which areas do you serve?");
  await expect(card(page, "has_gbp", "Yes")).toBeVisible();
  await expect(card(page, "has_gbp", "No")).toBeVisible();
  await expect(card(page, "has_gbp", UNSURE)).toBeVisible();
});

test("the site address appears only when the client has a website", async ({ page }) => {
  await open(page, "seo", 1, { seo_size: "A growing site" });
  await card(page, "has_site", "Yes").click();
  expect(await directlyUnder(page, "seo", "has_site", "site_url")).toBe(true);
  await card(page, "has_site", "Not yet").click();
  expect(await isShown(page, "site_url")).toBe(false);
});

test("the writing offer appears under 'Nobody yet' and carries its scope line", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  await card(page, "content_owner", "Nobody yet").click();
  expect(await directlyUnder(page, "seo", "content_owner", "content_writer_wanted")).toBe(true);
  await expect(page.locator('[data-field="content_writer_wanted"]')).toContainText("Nothing is charged from this form.");
  await card(page, "content_owner", "My team").click();
  expect(await isShown(page, "content_writer_wanted")).toBe(false);
});

/* ---------------------------------------------------------- copy and rules */

test("the three month line sits under the time frame and promises no result", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  const note = page.locator('[data-field="tf_note"]');
  await expect(note).toContainText("Our work starts at 3 months.");
  await expect(note).toContainText("We cannot promise rankings or results.");
  expect(await directlyUnder(page, "seo", "seo_timeframe", "tf_note")).toBe(true);
  await expect(note.getByText(/guarantee/i)).toHaveCount(0);
});

test("the time frame offers 3, 6 and 12 months and not sure, and nothing shorter", async () => {
  const timeframe = stepsFor("seo").flatMap((s) => s.fields).find((f) => f.key === "seo_timeframe");
  expect(timeframe?.options).toEqual(["3 months", "6 months", "12 months", UNSURE]);
});

test("Search Console and Analytics are two Yes, No, Not sure questions with access said to come later", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  for (const key of ["has_search_console", "has_analytics"]) {
    for (const name of ["Yes", "No", UNSURE]) await expect(card(page, key, name), `${key}: ${name}`).toBeVisible();
    await expect(page.locator(`[data-field="${key}"]`)).toContainText("Access comes later");
  }
});

test("the AI answers goal is one of the goal cards", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  await expect(box(page, "seo_goals", "Show up in AI answers")).toBeVisible();
});

test("no budget question is asked anywhere in the SEO flow", async () => {
  const keys = stepsFor("seo").flatMap((s) => s.fields).map((f) => `${f.key} ${f.label}`.toLowerCase());
  expect(keys.some((k) => k.includes("budget") || k.includes("spend"))).toBe(false);
});

/* ------------------------------------------------ (d) required questions */

test("Next is blocked until the job size is answered, and the message names it", async ({ page }) => {
  await open(page, "seo", 1, {});
  await page.locator(".ob__stepNext").click();
  await expect(page.locator(".ob__err")).toContainText("How big is the job?");
  await expect(page.locator('[data-field="customers"]')).toBeVisible();
});

test("the search step names the goal and the time frame it still needs", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "One site, one place" });
  await page.locator(".ob__stepNext").click();
  await expect(page.locator(".ob__err")).toContainText("What do you want search to do for you?");
  await expect(page.locator(".ob__err")).toContainText("How long would you like to run this for?");
});

/* ----------------------------------------------------- (e) not sure */

test("not sure on the job size is reversible and the cards stay usable", async ({ page }) => {
  await open(page, "seo", 1, {});
  const field = page.locator('[data-field="seo_size"]');
  await field.getByRole("button", { name: "I'm not sure, please advise me" }).click();
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toBeVisible();
  await expect(card(page, "seo_size", "A growing site")).toBeEnabled();
  await card(page, "seo_size", "A growing site").click();
  await expect(card(page, "seo_size", "A growing site")).toHaveAttribute("aria-checked", "true");
  await expect(field.getByText("Noted. We will come to this with a recommendation rather than a blank.")).toHaveCount(0);
});

test("not sure as a card on a Yes, No question is reversible by choosing a real answer", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "A growing site" });
  await card(page, "has_analytics", UNSURE).click();
  await expect(card(page, "has_analytics", UNSURE)).toHaveAttribute("aria-checked", "true");
  await card(page, "has_analytics", "Yes").click();
  await expect(card(page, "has_analytics", "Yes")).toHaveAttribute("aria-checked", "true");
  await expect(card(page, "has_analytics", UNSURE)).toHaveAttribute("aria-checked", "false");
  await expect(card(page, "has_analytics", "Yes")).toBeEnabled();
});

test("not sure on the search words is reversible from the escape", async ({ page }) => {
  await open(page, "seo", SEARCH_STEP(), { seo_size: "One site, one place" });
  const field = page.locator('[data-field="target_terms"]');
  await field.getByRole("button", { name: "I'm not sure, please advise me" }).click();
  await field.getByRole("button", { name: "Actually, let me answer this" }).click();
  await field.getByRole("textbox").fill("Plumber in the north");
  await expect(field.getByRole("textbox")).toHaveValue("Plumber in the north");
});

/* ---------------------------------------------- (f) a complete run */

for (const width of [390, 1280] as const) {
  test(`a complete big job brief reaches the review screen at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 820 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, "seo", 0, completeAnswers("seo", { seo_size: "A big site or many places" }));
    const send = page.getByRole("button", { name: /Send the brief/ });
    for (let n = 0; n < 6 && !(await send.isVisible()); n++) {
      await page.locator(".ob__stepNext").click();
    }
    await expect(send).toBeVisible();
    expect(errors).toEqual([]);
  });
}

/* ------------------------------------------------ (g) an old saved draft */

test("an old SEO draft with the old tools and area still opens and shows its words", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  /* The old form had no job size, so the second tier of the new questions is
     not asked of this draft. Its stored answers are kept, not shown, and the
     answers already given are still there. */
  await open(page, "seo", SEARCH_STEP(), {
    target_terms: "Wedding photographer near me",
    tools_access: ["Search Console", "Google Business Profile"],
    geo: "The three areas around the shop",
  });
  await expect(page.locator('[data-field="target_terms"] textarea')).toHaveValue("Wedding photographer near me");
  expect(errors).toEqual([]);
});

test("a stored old area answer shows in the area question for a local job", async ({ page }) => {
  await open(page, "seo", 1, { seo_size: "A growing site", customers: "Near me", geo: "The three areas around the shop" });
  await expect(page.locator('[data-field="geo"] input')).toHaveValue("The three areas around the shop");
});

test("the form asks about the same keys the artifact names", async () => {
  const keys = new Set(stepsFor("seo").flatMap((s) => s.fields).map((f) => f.key));
  for (const key of ["seo_size", "has_site", "site_url", "customers", "geo", "has_gbp", "seo_goals", "seo_timeframe", "target_terms", "has_search_console", "has_analytics", "content_owner", "competitors"]) {
    expect(keys.has(key), `${key} is asked`).toBe(true);
  }
});
