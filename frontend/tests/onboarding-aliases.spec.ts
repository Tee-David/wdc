import { expect, test } from "@playwright/test";
import { displayAnswers, shownInBrief } from "@/lib/onboarding-aliases";
import { stepsFor, type Field } from "@/lib/onboarding";
import { UNSURE, UNSURE_LEGACY } from "@/lib/onboarding-shared";

/**
 * Old stored answers read as the current questions show them. No browser.
 * Nothing here may change what is stored: each check also confirms the input
 * is left as it was.
 */

const EN = "–";

test("the old en dash page ranges read in the new wording, and the new ones are unchanged", () => {
  const before = { page_count: `1${EN}5` };
  expect(displayAnswers("web", before).page_count).toBe("1 to 5");
  expect(displayAnswers("web", { page_count: `6${EN}15` }).page_count).toBe("6 to 15");
  expect(displayAnswers("web", { page_count: `16${EN}40` }).page_count).toBe("16 to 40");
  expect(displayAnswers("web", { page_count: "More than 40" }).page_count).toBe("More than 40");
  expect(displayAnswers("web", { page_count: "6 to 15" }).page_count).toBe("6 to 15");
  expect(before.page_count).toBe(`1${EN}5`);
});

test("the old features that were jobs move to What should the site do, and the rest of features stays", () => {
  const stored = { features: ["Online store", "Bookings", "Members area", "Blog"] };
  const shown = displayAnswers("web", stored);
  expect(shown.site_jobs).toEqual(["Sell online", "Take bookings", "A members only area"]);
  expect(shown.features).toEqual(["Blog"]);
  expect(stored.features).toEqual(["Online store", "Bookings", "Members area", "Blog"]);
  expect(stored).not.toHaveProperty("site_jobs");
});

test("an answer to the new question wins over an old feature value", () => {
  const shown = displayAnswers("web", { features: ["Online store"], site_jobs: ["Show our work"] });
  expect(shown.site_jobs).toEqual(["Show our work"]);
  expect(shown.features).toEqual(["Online store"]);
});

test("the old semicolon not sure reads in the current wording, for every service", () => {
  expect(displayAnswers("web", { has_hosting: UNSURE_LEGACY }).has_hosting).toBe(UNSURE);
  expect(displayAnswers("seo", { target_terms: UNSURE_LEGACY }).target_terms).toBe(UNSURE);
  expect(displayAnswers("web", { features: [UNSURE_LEGACY, "Blog"] }).features).toEqual([UNSURE, "Blog"]);
});

test("the old SEO tools become the Yes or No questions, and an answer to the new question wins", () => {
  const shown = displayAnswers("seo", { tools_access: ["Search Console", "Google Business Profile"] });
  expect(shown.has_search_console).toBe("Yes");
  expect(shown.has_analytics).toBe("No");
  expect(shown.has_gbp).toBe("Yes");

  const newer = displayAnswers("seo", { tools_access: ["Analytics"], has_analytics: UNSURE });
  expect(newer.has_analytics).toBe(UNSURE);
  expect(newer.has_search_console).toBe("No");
});

test("old keys with no current question are kept for display, not dropped", () => {
  expect(displayAnswers("web", { wants_maintenance: "Yes", maintenance_after_reading: "No", wants_blogging: "No" })).toEqual({
    wants_maintenance: "Yes", maintenance_after_reading: "No", wants_blogging: "No",
  });
  expect(displayAnswers("seo", { competitors: "Two shops", geo: "The shop area" })).toEqual({
    competitors: "Two shops", geo: "The shop area",
  });
});

test("a service with no alias is shown as it is stored", () => {
  const stored = { deliverables: ["Logo"], has_logo: "Yes" };
  expect(displayAnswers("branding", stored)).toEqual(stored);
});

test("a legacy brief with no size answer shows every question it has an answer to", () => {
  const legacy = { has_hosting: "Neither", features: ["Blog"], page_count: `1${EN}5` };
  const web = stepsFor("web").flatMap((s) => s.fields);
  const field = (key: string) => web.find((f) => f.key === key)!;

  /* isVisible alone would hide these: the size gate has no answer. */
  expect(shownInBrief("web", field("has_hosting"), legacy)).toBe(true);
  expect(shownInBrief("web", field("features"), legacy)).toBe(true);
  /* A question with no answer is not invented into the view. */
  expect(shownInBrief("web", field("wants_seo"), legacy)).toBe(false);
});

test("a brief that has a size answer keeps the gate, so a stale answer below it stays hidden", () => {
  const sized = { site_size: "A simple site", has_hosting: "Neither" };
  const web = stepsFor("web").flatMap((s) => s.fields);
  const hosting = web.find((f) => f.key === "has_hosting") as Field;
  expect(shownInBrief("web", hosting, sized)).toBe(false);
  expect(shownInBrief("web", hosting, { ...sized, site_size: "A large site" })).toBe(true);
});

test("the SEO legacy brief shows its local answers without a job size", () => {
  const legacy = { geo: "The shop area" };
  const seo = stepsFor("seo").flatMap((s) => s.fields);
  const geo = seo.find((f) => f.key === "geo")!;
  expect(shownInBrief("seo", geo, legacy)).toBe(true);
});
