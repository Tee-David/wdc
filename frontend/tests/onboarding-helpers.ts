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
  const ticks = question.getByRole("checkbox", { name: label, exact: true });
  if (await ticks.count()) return ticks.first().click();
  const presses = question.getByRole("radio", { name: label, exact: true });
  if (await presses.count()) return presses.first().click();
  await question.getByRole("combobox").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
