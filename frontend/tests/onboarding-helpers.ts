import { expect, type Page } from "@playwright/test";

/**
 * Shared by the onboarding specs.
 *
 * `seedDraft` is the fast, deterministic way into any step: the form restores
 * a browser draft from localStorage, so a spec can land on step N of service S
 * with answers already given, with no clicking through the steps before it.
 * `isolate` blocks every write, so a spec that only looks at rendering cannot
 * save a draft or send a brief.
 */
export async function isolate(page: Page) {
  await page.route("**/api/onboarding/**", (route) => route.fulfill({ status: 503, json: { error: "Isolated rendering check; writes disabled." } }));
  await page.route(/jotfor|userway/i, (route) => route.abort());
}

export async function seedDraft(
  page: Page,
  draft: { service: string; step: number; answers?: Record<string, string | string[]> },
  opts: { theme?: "light" | "dark" } = {},
) {
  await page.addInitScript(({ draft, theme }) => {
    try {
      localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
      localStorage.setItem("wdc-onboarding-draft", JSON.stringify({ started: true, answers: {}, ...draft }));
      if (theme) localStorage.setItem("theme", theme);
    } catch { /* private mode */ }
  }, { draft, theme: opts.theme });
}

/** Chooses a service in the compact picker on the welcome screen. */
export async function pickService(page: Page, name: RegExp) {
  const picker = page.locator("#ob-service");
  await expect(picker).toHaveAttribute("aria-expanded", "false", { timeout: 30000 });
  await picker.click();
  await page.getByRole("option", { name }).click();
}

/**
 * Picks an answer the way a client does, whichever control the question uses:
 * a card, a chip or a checkbox is ticked; a two-choice or yes-and-no pair is
 * pressed; a dropdown is opened and the option chosen from its sheet or list.
 * Specs use this instead of clicking radios, so a control can change without
 * every spec changing with it. Pressing a chosen one again unchooses it.
 */
export async function chooseOption(page: Page, key: string, label: string) {
  const question = page.locator(`[data-field="${key}"]`);
  await expect(question).toBeVisible({ timeout: 30000 });
  /* An option may carry a line of help after its name ("Android phone For
     Android devices through Google's store."), and that is part of its
     accessible name. So match the name at the start, then a space or the end,
     which also keeps "Yes" from matching "Yes, I know". */
  const starts = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  const ticks = question.getByRole("checkbox", { name: starts });
  if (await ticks.count()) return ticks.first().click();
  const presses = question.getByRole("radio", { name: starts });
  if (await presses.count()) return presses.first().click();
  await question.getByRole("combobox").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

/* ------------------------------------------------------------------ walking */

export type Answer = string | string[];

/**
 * Answers every question on the CURRENT screen that the map has an answer for,
 * the way a client would: text typed, choices made through `chooseOption`.
 * A follow up only appears once its parent is answered, so this goes round
 * again until nothing new on the screen has an answer waiting. Questions the
 * map does not mention are left alone, which is how a spec checks that
 * optional ones really are optional. Uploads, domains and the colour flow are
 * never filled here: they have their own specs.
 */
export async function fillScreen(page: Page, answers: Record<string, Answer>) {
  const done = new Set<string>();
  for (let pass = 0; pass < 6; pass++) {
    const keys = await page.locator(".ob__fields [data-field]").evaluateAll((els) => els.map((e) => e.getAttribute("data-field") ?? ""));
    const todo = keys.filter((k) => k in answers && !done.has(k));
    if (!todo.length) return;
    for (const key of todo) {
      done.add(key);
      const q = page.locator(`[data-field="${key}"]`);
      const value = answers[key];
      /* A website or social list: the first row's link box takes the first line. */
      if (await q.locator(".obProf").count()) { await q.locator(".obProf input").first().fill(String(value).split("\n")[0]); continue; }
      const area = q.locator("textarea");
      if (await area.count()) { await area.first().fill(String(value)); continue; }
      const text = q.locator('input[type="tel"], input[type="text"], input[type="email"], input[type="url"], input:not([type])').filter({ hasNot: page.locator('[role="combobox"]') });
      if (typeof value === "string" && (await text.count()) && !(await q.getByRole("combobox").count()) && !(await q.getByRole("radio").count()) && !(await q.getByRole("checkbox").count())) {
        await text.first().fill(value);
        continue;
      }
      for (const label of Array.isArray(value) ? value : [value]) await chooseOption(page, key, label);
    }
  }
}

/**
 * Walks a form from its first screen to the review screen, answering what the
 * map covers and pressing the screen's own forward button. Returns the title
 * of every screen it passed through. Fails with the form's own message when a
 * screen refuses to go on, so a missing required answer says which one.
 */
export async function walkToReview(page: Page, answers: Record<string, Answer>, maxScreens = 14): Promise<string[]> {
  const titles: string[] = [];
  for (let n = 0; n < maxScreens; n++) {
    if (await page.locator(".ob__review").count()) return titles;
    titles.push((await page.locator(".ob h2").first().innerText()).trim());
    await fillScreen(page, answers);
    await page.locator(".ob__stepNext").click();
    await page.waitForTimeout(250);
    const stuck = page.locator(".ob__err");
    if (await stuck.count()) throw new Error(`Screen "${titles[titles.length - 1]}" would not go on: ${(await stuck.first().innerText()).replace(/\s+/g, " ")}`);
  }
  if (await page.locator(".ob__review").count()) return titles;
  throw new Error(`No review screen after ${maxScreens} screens: ${titles.join(" > ")}`);
}

/** Who they are, and the shared answers every service asks. */
export const PERSON: Record<string, Answer> = {
  first_name: "Ada", last_name: "Obi", phone: "0802 123 4567", email: "ada@example.org",
  company: "Moore Designs", industry: "Food and drink", audience: ["Women"],
  approver: "Ada Obi", channel: ["WhatsApp"],
};

/** The least a client can answer on the way to Send, per service. */
export const SMALLEST: Record<string, Record<string, Answer>> = {
  branding: { job_size: "One piece or a small set", deliverables: ["Logo"], brand_have: ["Nothing yet"] },
  web: { site_size: "A simple site", site_new_or_existing: "Brand new", site_jobs: ["Share information"], words_ready: "I have them" },
  seo: { seo_size: "One site, one place", customers: "Online, anywhere", seo_goals: ["More leads"], seo_timeframe: "3 months" },
  apps: { app_size: "Small", platforms: ["Android phone"], app_stage: "Only an idea", one_job: "Lets customers order and pay" },
  software: { sw_size: "Small", sw_pains: ["Reports done by hand"], sw_kind: "An automation" },
  social: { social_size: "Small", social_packages: ["Management"], channels: ["Instagram"], social_access: "Please work through me" },
};
