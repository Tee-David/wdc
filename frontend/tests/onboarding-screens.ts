import { expect, type Page } from "@playwright/test";
import { isVisible, stepsFor, type Step } from "@/lib/onboarding";
import type { ServiceSlug } from "@/lib/services";
import { isolate, seedDraft } from "./onboarding-helpers";

/**
 * Shared by the Size first specs for Branding, Web and SEO
 * (onboarding-branding.spec.ts, onboarding-web.spec.ts, onboarding-seo.spec.ts).
 *
 * THE SCREEN INDEX. onboarding-form.tsx shows only the screens that have at
 * least one visible question (decision 25), and a draft's `step` counts those
 * shown screens, not the step list in lib/onboarding.ts. So the index a spec
 * lands on depends on the answers, and `screensFor` computes it the same way
 * the form does. Using `stepsFor` directly lands on the wrong screen once a
 * screen is hidden (Branding's colour screen, SEO's tier 2 screen).
 *
 * WHAT A SCREEN LOOKS LIKE. Steps style shows one screen at a time, so
 * `keysOnScreen` is the questions on the current screen only.
 */

export const WIDTHS = [320, 390, 768, 1280] as const;
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export type Answers = Record<string, string | string[]>;

/** The screens the form shows for these answers, in order. */
export function screensFor(service: ServiceSlug, answers: Answers): Step[] {
  return stepsFor(service).filter((s) => s.fields.some((f) => isVisible(f, answers)));
}

/** The index of the shown screen that holds `key`, for these answers. */
export function screenOf(service: ServiceSlug, answers: Answers, key: string): number {
  const at = screensFor(service, answers).findIndex((s) => s.fields.some((f) => f.key === key));
  if (at < 0) throw new Error(`no shown screen holds ${key} for ${service}`);
  return at;
}

/** Opens the form on a shown screen with these answers. Writes are blocked. */
export async function openScreen(page: Page, service: ServiceSlug, answers: Answers, screen: number, theme: Theme = "light") {
  await isolate(page);
  await seedDraft(page, { service, step: screen, answers }, { theme });
  await page.goto("/onboarding");
  await expect(page.locator(".ob h2").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-field]").first()).toBeVisible({ timeout: 30_000 });
}

/** Opens the shown screen that holds `key`. */
export async function openOn(page: Page, service: ServiceSlug, answers: Answers, key: string, theme: Theme = "light") {
  await openScreen(page, service, answers, screenOf(service, answers, key), theme);
}

/** The heading of the screen on the page. */
export async function heading(page: Page): Promise<string> {
  return (await page.locator(".ob h2").first().innerText()).trim();
}

/** Every question on the page now, in order, including notices. */
export function keysOnScreen(page: Page): Promise<string[]> {
  return page.$$eval("[data-field]", (els) => els.map((e) => (e as HTMLElement).dataset.field ?? ""));
}

/**
 * Every shown screen for these answers: its heading and the questions on it.
 * Each screen is opened on its own, the way a client reaches it.
 */
export async function readScreens(page: Page, service: ServiceSlug, answers: Answers, theme: Theme = "light") {
  const out: { title: string; keys: string[] }[] = [];
  const count = screensFor(service, answers).length;
  for (let n = 0; n < count; n++) {
    await openScreen(page, service, answers, n, theme);
    out.push({ title: await heading(page), keys: await keysOnScreen(page) });
  }
  return out;
}

/**
 * True when `child` sits under `parent` on the page, with nothing between them
 * except other conditional questions. A conditional question elsewhere on the
 * screen is not "under its parent".
 */
export async function directlyUnder(page: Page, service: ServiceSlug, parent: string, child: string): Promise<boolean> {
  const keys = await keysOnScreen(page);
  const p = keys.indexOf(parent);
  const c = keys.indexOf(child);
  if (p < 0 || c <= p) return false;
  const conditional = new Set(stepsFor(service).flatMap((s) => s.fields).filter((f) => f.showIf).map((f) => f.key));
  return keys.slice(p + 1, c).every((k) => conditional.has(k));
}

/**
 * Every control a client can press, tick, open or type into on the current
 * screen, measured as it is drawn: width and height in CSS pixels, plus any
 * part of the page that runs past the screen edge. The tip trigger (the
 * question mark) is measured apart, because it is a help control and not a
 * question answer; the caller decides what to do with its size.
 */
export function touchFindings(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".ob") ?? document.body;
    const width = window.innerWidth;
    const overflow = document.documentElement.scrollWidth - width;
    const label = (el: HTMLElement) => {
      const field = el.closest<HTMLElement>("[data-field]")?.dataset.field ?? "(outside a question)";
      const text = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "")
        .trim().replace(/\s+/g, " ").slice(0, 40);
      return `${field}: "${text}"`;
    };
    const controls = Array.from(root.querySelectorAll<HTMLElement>(
      "button, [role=radio], [role=checkbox], [role=combobox], input:not([type=hidden]), textarea, select",
    ));
    let measured = 0;
    const small: string[] = [];
    const wide: string[] = [];
    const tips: number[] = [];
    /* A native input hidden behind a styled card (the colour feelings and
       palette radios) is not a control a client sees. The card around it is
       the target, so that is measured instead. */
    const hidden = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return cs.opacity === "0" || cs.clip === "rect(0px, 0px, 0px, 0px)";
    };
    for (const raw of controls) {
      const el = raw instanceof HTMLInputElement && hidden(raw) ? raw.closest<HTMLElement>("label") : raw;
      if (!el || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.classList.contains("tip__b") || el.closest(".tip")) { tips.push(Math.round(r.height * 10) / 10); continue; }
      measured++;
      if (r.height < 43.5) small.push(`${label(el)} ${r.height.toFixed(1)}px`);
      if (r.right > width + 1 || r.left < -1) wide.push(label(el));
    }
    return { overflow, measured, small, wide, tips };
  });
}

/** Asserts a screen fits at this width and that every control is 43.5px or taller. */
export async function expectScreenFits(page: Page, title: string, width: number) {
  const found = await touchFindings(page);
  expect(found.overflow, `${title} at ${width}px: page is wider than the screen`).toBeLessThanOrEqual(1);
  expect(found.wide, `${title} at ${width}px: controls run past the edge`).toEqual([]);
  expect(found.small, `${title} at ${width}px: controls under 43.5px`).toEqual([]);
  return found;
}

/** The text of the first error summary, flattened, or "" when there is none. */
export async function summaryText(page: Page): Promise<string> {
  const summary = page.locator(".ob__err");
  if (!(await summary.count())) return "";
  return (await summary.first().innerText()).replace(/\s+/g, " ");
}
