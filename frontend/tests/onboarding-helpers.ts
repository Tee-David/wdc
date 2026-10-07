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
