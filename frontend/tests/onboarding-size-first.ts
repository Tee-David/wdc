import { expect, type Page } from "@playwright/test";
import { isQuestion, isVisible, stepsFor, type Field } from "@/lib/onboarding";
import type { ServiceSlug } from "@/lib/services";
import { isolate, seedDraft } from "./onboarding-helpers";

/**
 * Shared by the Size first specs (onboarding-web.spec.ts, onboarding-seo.spec.ts).
 *
 * Everything here reads the form the way a client sees it: the questions that
 * are on the page (`data-field`), the controls on them, and the page's own
 * width. Nothing reads the step data to decide what should be there, except to
 * choose which step to land on and what answer to give.
 */

export const WIDTHS = [320, 390, 768, 1280] as const;
export type Theme = "light" | "dark";
export type Answers = Record<string, string | string[]>;

/** The index of the step a question lives on, for landing a spec on it. */
export function stepOf(service: ServiceSlug, key: string): number {
  const at = stepsFor(service).findIndex((step) => step.fields.some((f) => f.key === key));
  if (at < 0) throw new Error(`no step holds ${key} for ${service}`);
  return at;
}

/** Opens the form on a step with answers already given. Writes are blocked. */
export async function open(page: Page, service: ServiceSlug, step: number, answers: Answers, theme: Theme = "light") {
  await isolate(page);
  await seedDraft(page, { service, step, answers }, { theme });
  await page.goto("/onboarding");
  await expect(page.locator("[data-field]").first()).toBeVisible({ timeout: 20_000 });
}

/** Every question on the page now, in the order the page shows them. */
export function fieldKeys(page: Page): Promise<string[]> {
  return page.$$eval("[data-field]", (els) => els.map((e) => (e as HTMLElement).dataset.field ?? ""));
}

export async function isShown(page: Page, key: string): Promise<boolean> {
  return (await fieldKeys(page)).includes(key);
}

/**
 * True when `child` sits under `parent` on the page with nothing between them
 * except other conditional questions of the same group. A conditional question
 * that appears somewhere else on the page is not "under its parent".
 */
export async function directlyUnder(page: Page, service: ServiceSlug, parent: string, child: string): Promise<boolean> {
  const keys = await fieldKeys(page);
  const p = keys.indexOf(parent);
  const c = keys.indexOf(child);
  if (p < 0 || c <= p) return false;
  const conditional = new Set(stepsFor(service).flatMap((s) => s.fields).filter((f) => f.showIf).map((f) => f.key));
  return keys.slice(p + 1, c).every((k) => conditional.has(k));
}

/**
 * Layout on the page as it is now: horizontal overflow in pixels, and every
 * control that is smaller than 44px high. The tip trigger is skipped here; its
 * size is measured and reported separately, because it lives in form-kit.css.
 */
export function layoutFindings(page: Page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      ".ob__f button, .ob__f [role=checkbox], .ob__f [role=radio], .ob__f [role=combobox], .ob__stepNext, .ob__stepBack, .ob__btn",
    ));
    const small = controls
      .filter((el) => !el.closest(".tip"))
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && box.height < 44)
      .map(({ el, box }) => `${el.closest("[data-field]")?.getAttribute("data-field") ?? el.className}: ${box.height.toFixed(1)}px "${(el.textContent ?? "").trim().slice(0, 40)}"`);
    return { overflow, small, scrollWidth: document.documentElement.scrollWidth };
  });
}

/** The tip trigger's height, measured on the first question that has one. */
export function tipSize(page: Page) {
  return page.evaluate(() => {
    const tip = document.querySelector<HTMLElement>(".ob__f .tip__b");
    if (!tip) return null;
    const box = tip.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
}

/** A value for one required question, the first option of a choice. */
function sample(f: Field): string | string[] | undefined {
  switch (f.kind) {
    case "email": return "you@business.com";
    case "tel": return "+234 802 123 4567";
    case "url": return "https://example.com";
    case "text": case "textarea": return "Test answer";
    case "cards": return f.options?.[0] ?? "Yes";
    case "yesno": return "Yes";
    case "select": return f.options?.[0];
    case "multi": return f.options?.[0] ? [f.options[0]] : undefined;
    default: return undefined;
  }
}

/**
 * A full set of answers for a service: the given ones, then one answer for
 * every question that is asked and required. Walks the steps in order, so a
 * question is answered only once the answers it depends on are in place.
 */
export function completeAnswers(service: ServiceSlug, given: Answers = {}): Answers {
  const answers: Answers = { ...given };
  for (const step of stepsFor(service)) {
    for (const f of step.fields) {
      if (!isQuestion(f) || !f.required || answers[f.key] !== undefined) continue;
      if (!isVisible(f, answers)) continue;
      const value = sample(f);
      if (value !== undefined) answers[f.key] = value;
    }
  }
  return answers;
}
