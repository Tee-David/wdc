import { expect, test } from "@playwright/test";
import { isolate, PERSON, SMALLEST } from "./onboarding-helpers";
import {
  audit,
  axeScreen,
  expectClean,
  focusSweep,
  Log,
  probeRequired,
  startByKeyboard,
  tabTo,
  walkKeyboard,
} from "./onboarding-a11y-helpers";

/**
 * ACCESSIBILITY AND KEYBOARD, FOR THE THREE SERVICES WITH THE NEW FORM (Branding,
 * Web and Apps). Every walk starts on the service picker and ends on the review,
 * and it never uses a mouse: Tab, Shift+Tab, Enter, Space and the arrow keys
 * only. The page is opened fresh and nothing is saved (isolate).
 *
 * Each walk measures every screen it passes through for: accessible names and
 * duplicate names inside one question; one h2 for the step title and no skipped
 * heading levels; the required star hidden and the required state exposed; error
 * messages linked to their field; axe-core rules for names and roles; overflow;
 * a visible focus ring on every focusable control (Tab through the screen,
 * focused against unfocused); and, under reduced motion, no animation longer
 * than 0.01s. Findings are collected rather than thrown, so one walk reports all
 * of its problems, and each category is then asserted on its own.
 */

const SERVICES = [
  { slug: "branding", pick: /^Branding/ },
  { slug: "web", pick: /^Web/ },
  { slug: "apps", pick: /^Apps/ },
] as const;

const CONFIGS = [
  { name: "390px light, reduced motion", width: 390, height: 844, dark: false, reduced: true, focus: true, scale: false },
  { name: "1280px dark", width: 1280, height: 900, dark: true, reduced: false, focus: true, scale: false },
  { name: "390px dark", width: 390, height: 844, dark: true, reduced: false, focus: true, scale: false },
  { name: "1280px light", width: 1280, height: 900, dark: false, reduced: false, focus: true, scale: false },
  { name: "320px with text at 200%", width: 320, height: 700, dark: false, reduced: false, focus: false, scale: true },
] as const;

for (const cfg of CONFIGS) {
  test.describe(cfg.name, () => {
    test.use({
      viewport: { width: cfg.width, height: cfg.height },
      colorScheme: cfg.dark ? "dark" : "light",
      reducedMotion: cfg.reduced ? "reduce" : "no-preference",
    });

    for (const svc of SERVICES) {
      test(`${svc.slug}: keyboard walk and page checks`, async ({ page }) => {
        test.setTimeout(900_000);
        const log = new Log();
        await isolate(page);
        await page.addInitScript(
          ({ dark, scale }: { dark: boolean; scale: boolean }) => {
            try {
              localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
              localStorage.setItem("theme", dark ? "dark" : "light");
            } catch { /* private mode */ }
            if (scale) {
              document.addEventListener("DOMContentLoaded", () => {
                const style = document.createElement("style");
                style.textContent = "html { font-size: 200% !important; }";
                document.documentElement.appendChild(style);
              });
            }
          },
          { dark: cfg.dark, scale: cfg.scale },
        );

        await startByKeyboard(page, svc.pick);
        const hook = async (title: string, first: boolean) => {
          await audit(page, log, title, cfg.reduced);
          await axeScreen(page, log, title);
          if (cfg.focus) await focusSweep(page, log, title);
          if (first) await probeRequired(page, log, title);
        };
        const titles = await walkKeyboard(page, { ...PERSON, ...SMALLEST[svc.slug] }, log, hook);

        await expect(page.locator(".ob__review")).toBeVisible();
        await audit(page, log, "review", cfg.reduced);
        await axeScreen(page, log, "review");
        if (cfg.focus) await focusSweep(page, log, "review");

        console.log(`A11Y ${svc.slug} | ${cfg.name} | screens: ${titles.join(" > ")} | counts: ${JSON.stringify(log.counts)}`);
        for (const item of log.items) console.log(`FINDING ${svc.slug} | ${cfg.name} | ${item}`);
        for (const cat of ["keyboard", "names", "duplicates", "headings", "required", "errors", "focus", "motion", "overflow", "axe"] as const) {
          expectClean(log, cat);
        }
      });
    }
  });
}

/**
 * THE COLOUR FLOW, BY KEYBOARD. A branding client who wants colours reaches the
 * Colours screen, chooses a feeling with the arrow keys, presses "Show me
 * another" until the three palettes have cycled back to the first, and then
 * chooses "Yes, use these" with Enter.
 */
test.describe("colour flow at 390px light", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "light" });

  test("branding colours: arrows choose a feeling, Show me another cycles, Enter commits", async ({ page }) => {
    test.setTimeout(600_000);
    const log = new Log();
    await isolate(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
        localStorage.setItem("theme", "light");
      } catch { /* private mode */ }
    });
    await startByKeyboard(page, /^Branding/);
    // A medium job shows the colour screen; the rest of the answers are the smallest job's.
    const answers = { ...PERSON, ...SMALLEST.branding, job_size: "Several pieces", deliverables: ["Logo"] };
    const titles = await walkKeyboard(page, answers, log, async () => {}, /^Colours$/);
    expect(titles.length).toBeGreaterThanOrEqual(2);

    const field = page.locator('[data-field="brand_colours"]');
    await expect(field).toBeVisible();
    await audit(page, log, "Colours", false);
    await axeScreen(page, log, "Colours");
    await focusSweep(page, log, "Colours");

    // Choose a feeling with the arrow keys from the first feeling.
    await tabTo(page, field.locator('input[type="radio"]').first(), "the first colour feeling");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const suggest = page.getByRole("button", { name: "Show me another" });
    await tabTo(page, suggest, "Show me another");
    const palette = () => field.locator(".obCol__panel").innerText();
    const first = await palette();
    await page.keyboard.press("Enter");
    const second = await palette();
    await page.keyboard.press("Enter");
    const third = await palette();
    await page.keyboard.press("Enter");
    const back = await palette();
    if (second === first) log.add("colours", "Colours", "Show me another", "the first press did not change the palette");
    if (third === second || third === first) log.add("colours", "Colours", "Show me another", "the second press did not reach a third palette");
    if (back !== first) log.add("colours", "Colours", "Show me another", "the third press did not cycle back to the first palette");
    log.count("cycleChecks");

    // Yes, use these, with Enter.
    const yes = page.getByRole("button", { name: "Yes, use these" });
    await tabTo(page, yes, "Yes, use these");
    const swatches = await field.locator(".obCol__bigBtn").count();
    await page.keyboard.press("Enter");
    const saved = field.locator(".obCol__saved");
    await expect(saved.first()).toBeVisible({ timeout: 10_000 }).catch(() => log.add("colours", "Colours", "Yes, use these", "no saved colours shown after Enter"));
    const savedCount = await field.locator(".obCol__savedList li").count();
    if (swatches && savedCount !== swatches) log.add("colours", "Colours", "Yes, use these", `saved ${savedCount} colours, the palette showed ${swatches}`);
    const focusAfter = await page.evaluate(() => (document.activeElement === document.body ? "body" : document.activeElement?.tagName ?? ""));
    if (focusAfter === "body") log.add("colours", "Colours", "Yes, use these", "focus fell to the page body after committing");

    console.log(`A11Y colours | screens: ${titles.join(" > ")} | counts: ${JSON.stringify(log.counts)}`);
    expectClean(log, "colours");
    expectClean(log, "keyboard");
    expectClean(log, "names");
    expectClean(log, "axe");
    expectClean(log, "focus");
  });
});
