import { expect, test, type Page } from "@playwright/test";
import { isFilled, isQuestion, isVisible, stepsFor, UNSURE, type Field, type Step } from "@/lib/onboarding";
import type { ServiceSlug } from "@/lib/services";
import { chooseOption, isolate, PERSON, seedDraft, walkToReview, type Answer } from "./onboarding-helpers";

/**
 * The shared checks for one service's form (Apps, Software, Social). Each
 * service spec hands in its own answer sets and calls these, so the checks are
 * written once: rendering at every width, size gating against the step file,
 * required questions, reversible "not sure", and a full walk to the review.
 *
 * Nothing is saved: every spec calls `isolate` first.
 */

export type Answers = Record<string, Answer>;
export type Theme = "light" | "dark";

export type SuiteConfig = {
  /** The name the test titles start with, e.g. "Apps". */
  name: string;
  service: ServiceSlug;
  /** The opening size question's stored key. */
  sizeKey: string;
  /** A complete answer set for each size, without the shared About you answers. */
  sets: Record<"Small" | "Medium" | "Large", Answers>;
};

/** Below this a target is too small to tap; 43.5 allows for sub-pixel layout. */
export const MIN_TARGET = 43.5;

export type Screen = { index: number; step: Step; fields: Field[] };

/**
 * The screens a client sees for these answers, in order. The same rule as the
 * form: a question is shown when `isVisible` holds, and a screen with no visible
 * question is not shown, so `index` is the position the form's Next reaches.
 */
export function screensFor(service: ServiceSlug, answers: Answers): Screen[] {
  const out: Screen[] = [];
  for (const step of stepsFor(service)) {
    const fields = step.fields.filter((f) => isVisible(f, answers));
    if (fields.length) out.push({ index: out.length, step, fields });
  }
  return out;
}

/** The index of the first screen showing this question for these answers. */
export function screenWithKey(service: ServiceSlug, answers: Answers, key: string): number {
  const hit = screensFor(service, answers).find((s) => s.fields.some((f) => f.key === key));
  if (!hit) throw new Error(`no screen shows ${key} for these answers`);
  return hit.index;
}

/** The index of the screen with this step id, for these answers. */
export function screenWithStep(service: ServiceSlug, answers: Answers, stepId: string): number {
  const hit = screensFor(service, answers).find((s) => s.step.id === stepId);
  if (!hit) throw new Error(`no screen ${stepId} for these answers`);
  return hit.index;
}

/**
 * Opens the form on one screen with the answers given, the fast way every spec
 * uses. The draft is restored from localStorage, so the screen renders as it
 * would for a client who had answered these.
 */
export async function openScreen(
  page: Page,
  service: ServiceSlug,
  answers: Answers,
  index: number,
  opts: { width?: number; theme?: Theme } = {},
) {
  await page.setViewportSize({ width: opts.width ?? 390, height: 900 });
  await seedDraft(page, { service, step: index, answers }, { theme: opts.theme ?? "light" });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ob__stepNext").first()).toBeVisible({ timeout: 60_000 });
}

/** The question keys drawn on the current screen, notices included. */
export const fieldKeys = (page: Page) =>
  page.locator(".ob__fields [data-field]").evaluateAll((els) => els.map((e) => e.getAttribute("data-field") ?? ""));

export const isShown = async (page: Page, key: string) =>
  (await page.locator(`.ob__fields [data-field="${key}"]`).count()) > 0;

/** The question directly after this one on the same screen, or null. */
export async function nextKeyAfter(page: Page, key: string): Promise<string | null> {
  return page.locator(`.ob__fields [data-field="${key}"]`).evaluate(
    (el) => el.nextElementSibling?.getAttribute("data-field") ?? null,
  );
}

/** Presses the screen's own forward button until a question is on screen. */
export async function nextUntil(page: Page, key: string, max = 3) {
  for (let n = 0; n < max; n++) {
    if (await isShown(page, key)) return;
    await page.locator(".ob__stepNext").first().click();
    await page.waitForTimeout(250);
  }
  await expect(page.locator(`.ob__fields [data-field="${key}"]`)).toBeVisible({ timeout: 10_000 });
}

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/** Every visible control on the screen and the buttons under it that is under the target size. */
export async function undersizedTargets(page: Page) {
  const controls = page.locator(
    '.ob__fields button:visible, .ob__fields input:visible, .ob__fields textarea:visible, .ob__fields select:visible, '
    + '.ob__fields [role="combobox"]:visible, .ob__fields [role="checkbox"]:visible, .ob__fields [role="radio"]:visible, '
    + ".ob__acts button:visible",
  );
  return controls.evaluateAll((els, min) => els
    .map((el) => {
      const r = el.getBoundingClientRect();
      const name = el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("placeholder") || el.tagName;
      return { name: name.replace(/\s+/g, " ").slice(0, 60), h: Math.round(r.height * 10) / 10 };
    })
    .filter((x) => x.h < min), MIN_TARGET);
}

/* ------------------------------------------------------------- the checks */

/**
 * The checks every service shares. A spec calls this once, inside its own
 * `test.describe`, so the names read as the service's own.
 */
export function sharedChecks(cfg: SuiteConfig) {
  const { name, service, sizeKey, sets } = cfg;

  /* (a) every screen fits and keeps its targets, at each width and theme. */
  for (const theme of ["light", "dark"] as const) for (const width of [320, 390, 768, 1280] as const) {
    test(`${name}: every screen fits at ${width}px in ${theme} with no sideways scroll and 44px targets`, async ({ page }) => {
      test.setTimeout(900_000);
      await isolate(page);
      const answers = sets.Large;
      for (const s of screensFor(service, answers)) {
        await openScreen(page, service, answers, s.index, { width, theme });
        expect(await noHorizontalScroll(page), `${s.step.title} scrolls sideways at ${width}px`).toBeTruthy();
        expect(await undersizedTargets(page), `${s.step.title}: targets under ${MIN_TARGET}px`).toEqual([]);
      }
    });
  }

  /* (b) the size question gates exactly what the step file says. */
  test(`${name}: size gating: Small shows tier 1 only, Medium adds tier 2, Large adds tier 3`, async ({ page }) => {
    test.setTimeout(600_000);
    await isolate(page);
    const drawn = async (size: "Small" | "Medium" | "Large") => {
      const answers = { [sizeKey]: size };
      const expected = new Set(screensFor(service, answers).flatMap((s) => s.fields.map((f) => f.key)));
      const seen = new Set<string>();
      for (const s of screensFor(service, answers)) {
        await openScreen(page, service, answers, s.index);
        for (const k of await fieldKeys(page)) seen.add(k);
      }
      return { expected, seen: [...seen].sort(), want: [...expected].sort(), size };
    };
    const small = await drawn("Small");
    const medium = await drawn("Medium");
    const large = await drawn("Large");

    expect(small.seen, "Small: questions on screen match the step file").toEqual(small.want);
    expect(medium.seen, "Medium: questions on screen match the step file").toEqual(medium.want);
    expect(large.seen, "Large: questions on screen match the step file").toEqual(large.want);

    const tier2 = [...medium.expected].filter((k) => !small.expected.has(k));
    const tier3 = [...large.expected].filter((k) => !medium.expected.has(k));
    expect(tier2.length, "Medium adds questions").toBeGreaterThan(0);
    expect(tier3.length, "Large adds questions").toBeGreaterThan(0);
    expect(small.seen.filter((k) => tier2.includes(k)), "no tier 2 question at Small").toEqual([]);
    expect(medium.seen.filter((k) => tier3.includes(k)), "no tier 3 question at Medium").toEqual([]);
  });

  /* (d) a required question blocks Next and the message names it. */
  test(`${name}: required questions block Next, and the message names each one`, async ({ page }) => {
    test.setTimeout(600_000);
    await isolate(page);
    const answers = { [sizeKey]: "Large" };
    const failures: string[] = [];
    for (const s of screensFor(service, answers)) {
      /* The update channel starts with the client portal ticked (withAnswerDefaults), so it is never unanswered. */
      const required = s.fields.filter((f) => f.required && isQuestion(f) && f.key !== "channel" && !isFilled(answers[f.key]));
      if (!required.length) continue;
      await openScreen(page, service, answers, s.index);
      await page.locator(".ob__stepNext").first().click();
      const err = page.locator(".ob__err");
      await expect(err, `${s.step.title} shows a message`).toBeVisible();
      const text = (await err.innerText()).replace(/\s+/g, " ");
      for (const f of required) {
        if (!text.includes(`${f.label} still needs an answer.`)) failures.push(`${s.step.title}: "${f.label}" not named`);
      }
      if (await page.locator(".ob__review").count()) failures.push(`${s.step.title}: Next went on`);
    }
    expect(failures).toEqual([]);
  });

  /* (e) "not sure" is reversible wherever it is offered. */
  test(`${name}: not sure is recorded, can be undone, and a real answer replaces it`, async ({ page }) => {
    test.setTimeout(900_000);
    await isolate(page);
    const answers = { [sizeKey]: "Large" };
    const failures: string[] = [];
    for (const s of screensFor(service, answers)) for (const f of s.fields.filter((x) => x.assist && isQuestion(x))) {
      await openScreen(page, service, answers, s.index);
      const q = page.locator(`[data-field="${f.key}"]`);
      const unsure = q.locator(".ob__unsure");
      if (!(await unsure.count())) { failures.push(`${f.key}: no not sure control`); continue; }
      await unsure.click();
      if ((await unsure.getAttribute("aria-pressed")) !== "true") failures.push(`${f.key}: not pressed after a tap`);
      if (!(await q.locator(".ob__unsureNote").count())) failures.push(`${f.key}: no note after not sure`);
      for (const c of await q.locator('[role="radio"], [role="checkbox"], [role="combobox"], input, textarea').all()) {
        if (!(await c.isEnabled())) failures.push(`${f.key}: a control is disabled while not sure`);
      }
      if (f.kind === "text" || f.kind === "textarea" || f.kind === "email" || f.kind === "tel" || f.kind === "url") {
        await q.locator("input, textarea").first().fill("A real answer");
      } else {
        const real = (f.options ?? []).find((o) => o !== UNSURE);
        if (!real) { failures.push(`${f.key}: no real option to choose`); continue; }
        await chooseOption(page, f.key, real);
      }
      if ((await unsure.getAttribute("aria-pressed")) !== "false") failures.push(`${f.key}: still not sure after a real answer`);
      if (await q.locator(".ob__unsureNote").count()) failures.push(`${f.key}: note still shown after a real answer`);
    }
    expect(failures).toEqual([]);
  });

  /* (f) a full walk to the review, for each size, at phone and desktop widths. */
  for (const size of ["Small", "Medium", "Large"] as const) for (const width of [390, 1280] as const) {
    test(`${name}: a ${size} job walks to the review at ${width}px and the review holds the answers`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width, height: 844 });
      await isolate(page);
      await seedDraft(page, { service, step: 0 });
      await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".ob__fields")).toBeVisible({ timeout: 60_000 });

      const all = { ...PERSON, ...sets[size] };
      const screens = await walkToReview(page, all);
      expect(screens.length, `screens: ${screens.join(" > ")}`).toBeGreaterThanOrEqual(4);
      await expect(page.locator(".ob__review")).toBeVisible();
      expect(await noHorizontalScroll(page)).toBeTruthy();

      const review = page.locator(".ob__review");
      for (const s of screensFor(service, all)) for (const f of s.fields) {
        if (!isQuestion(f) || !isFilled(all[f.key])) continue;
        const values = Array.isArray(all[f.key]) ? (all[f.key] as string[]) : [all[f.key] as string];
        for (const v of values) await expect(review, `${f.key} on the review`).toContainText(v);
      }
    });
  }
}

/** The value of one stored answer in the browser draft, or undefined. */
export const storedAnswer = (page: Page, key: string) =>
  page.evaluate((k) => {
    try { return (JSON.parse(localStorage.getItem("wdc-onboarding-draft") ?? "{}").answers ?? {})[k]; } catch { return undefined; }
  }, key);
