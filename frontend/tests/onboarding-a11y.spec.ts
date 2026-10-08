import { expect, test, type Locator, type Page } from "@playwright/test";
import { isolate, PERSON, SMALLEST } from "./onboarding-helpers";
import {
  audit,
  type Category,
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
 * ACCESSIBILITY AND KEYBOARD FOR THE THREE SERVICES ON THE NEW FORM (Branding,
 * Web and Apps).
 *
 * Every walk opens the service picker, chooses the service with the arrow keys,
 * and answers the smallest job through to the review using Tab, Shift+Tab,
 * Enter, Space and the arrow keys only. Nothing is clicked. Nothing is saved
 * (isolate).
 *
 * Each screen is measured for: accessible names; duplicate names inside one
 * question or section; one h2 for the step title; error messages linked to
 * their field; axe-core rules for names and roles; overflow; a visible focus
 * ring on every focusable control (Tab through the screen, focused against
 * unfocused). The walks that must pass assert those. The required state, the
 * heading contents and the reduced-motion rule are checked by the defect tests
 * below, which are `test.fail()` while the defect stands.
 */

const SERVICES = [
  { slug: "branding", pick: /^Branding/, first: /^What we are making$/ },
  { slug: "web", pick: /^Web/, first: /^What the site is for$/ },
  { slug: "apps", pick: /^Apps/, first: /^Tell us about the app$/ },
] as const;

type Svc = (typeof SERVICES)[number];
type Cfg = { name: string; width: number; height: number; dark: boolean; reduced: boolean; focus: boolean; scale: boolean };

const CONFIGS: Cfg[] = [
  { name: "390px light, reduced motion", width: 390, height: 844, dark: false, reduced: true, focus: true, scale: false },
  { name: "1280px dark", width: 1280, height: 900, dark: true, reduced: false, focus: true, scale: false },
  { name: "390px dark", width: 390, height: 844, dark: true, reduced: false, focus: true, scale: false },
  { name: "1280px light", width: 1280, height: 900, dark: false, reduced: false, focus: true, scale: false },
  { name: "320px with text at 200%", width: 320, height: 700, dark: false, reduced: false, focus: true, scale: true },
];

const LIGHT_390: Cfg = { ...CONFIGS[0], reduced: false };

/**
 * Marks the test as an expected failure while the defect stands. Set
 * A11Y_SHOW_DEFECTS=1 to run the same test as a plain test, so its real failure
 * can be read.
 */
function knownDefect(reason: string) {
  if (!process.env.A11Y_SHOW_DEFECTS) test.fail(true, reason);
}

/** Opens the form in a fresh, isolated page with the theme set. */
async function open(page: Page, cfg: Cfg, colour = false) {
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
    { dark: cfg.dark, scale: cfg.scale && !colour },
  );
}

/**
 * One walk, from the picker to the review. `focus` turns on the Tab sweep of
 * every screen, which is the slow part, so the defect tests leave it off.
 */
async function walk(page: Page, svc: Svc, cfg: Cfg, focus: boolean, log: Log) {
  await open(page, cfg);
  await startByKeyboard(page, svc.pick);
  const hook = async (title: string, first: boolean) => {
    await audit(page, log, title, cfg.reduced);
    await axeScreen(page, log, title);
    if (focus) await focusSweep(page, log, title);
    if (first) await probeRequired(page, log, title);
  };
  const titles = await walkKeyboard(page, { ...PERSON, ...SMALLEST[svc.slug] }, log, hook);
  await expect(page.locator(".ob__review")).toBeVisible();
  await audit(page, log, "review", cfg.reduced);
  await axeScreen(page, log, "review");
  if (focus) await focusSweep(page, log, "review");
  const rootFont = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  console.log(`A11Y ${svc.slug} | ${cfg.name} | ${titles.length} screens: ${titles.join(" > ")} | root font ${rootFont} | ${JSON.stringify(log.counts)}`);
  for (const item of log.items) console.log(`FINDING ${svc.slug} | ${cfg.name} | ${item}`);
  return { rootFont };
}

/* ------------------------------------------------ the walks that must pass */

for (const cfg of CONFIGS) {
  test.describe(cfg.name, () => {
    test.use({
      viewport: { width: cfg.width, height: cfg.height },
      colorScheme: cfg.dark ? "dark" : "light",
      reducedMotion: cfg.reduced ? "reduce" : "no-preference",
    });

    for (const svc of SERVICES) {
      test(`${svc.slug}: the keyboard reaches the review and the page checks hold`, async ({ page }) => {
        test.setTimeout(900_000);
        const log = new Log();
        const { rootFont } = await walk(page, svc, cfg, cfg.focus, log);
        /* At 200% text the overflow is D6, checked on its own below; the walk
           still logs any overflow it meets on a later screen. */
        const cats = cfg.scale ? ["keyboard", "names", "duplicates", "errors", "focus", "axe"] : ["keyboard", "names", "duplicates", "errors", "focus", "overflow", "axe"];
        for (const cat of cats as Category[]) expectClean(log, cat);
        if (cfg.scale) expect.soft(rootFont, "root font size at 200%").toBe("32px");
      });
    }
  });
}

/* ------------------------------------------- defects, each a test.fail() */

test.describe("defects at 390px light", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "no-preference" });

  for (const svc of SERVICES) {
    /* D1. The required state is not exposed. Required inputs, selects and choice
       groups carry the star as aria-hidden text, but no aria-required, and the
       multi-choice groups have no group role or described group to carry it. */
    test(`${svc.slug}: D1 the required state is exposed to assistive tech`, async ({ page }) => {
      test.setTimeout(600_000);
      knownDefect("D1: required questions show the star only visually; no aria-required on the input or choice group, no described group");
      const log = new Log();
      await walk(page, svc, LIGHT_390, false, log);
      expectClean(log, "required");
    });

    /* D2. The review screen renders each section's Edit button inside its h2,
       so every heading reads "...Edit" and the seven buttons are all named Edit. */
    test(`${svc.slug}: D2 headings hold only text, and review Edit buttons sit outside them`, async ({ page }) => {
      test.setTimeout(600_000);
      knownDefect("D2: the review screen renders its Edit button inside each section h2");
      const log = new Log();
      await walk(page, svc, LIGHT_390, false, log);
      expectClean(log, "headings");
    });

    /* D5. Choice cards are role="radio" buttons with no roving tabindex and no
       arrow-key handling, so the arrow keys do nothing between options and each
       option is its own Tab stop. Checked on each service's size question. */
    test(`${svc.slug}: D5 arrow keys move focus between the options of a choice card`, async ({ page }) => {
      test.setTimeout(300_000);
      knownDefect("D5: role=radio cards have no arrow-key handling; focus stays on the first option");
      const log = new Log();
      await open(page, LIGHT_390);
      await startByKeyboard(page, svc.pick);
      await walkKeyboard(page, { ...PERSON, ...SMALLEST[svc.slug] }, log, async () => {}, svc.first);
      /* The first question on this screen that is a choice card. Web's size is a
         dropdown, so the first card group is taken instead of the size. */
      const key = await page.locator(".ob__fields [data-field]:visible").evaluateAll((els) =>
        els.find((e) => e.querySelector('[role="radio"]'))?.getAttribute("data-field") ?? null,
      );
      if (!key) throw new Error("no choice card on the first screen");
      const cards = page.locator(`[data-field="${key}"] [role="radio"]`);
      log.count("cardGroupsTried");
      await tabTo(page, cards.first(), `the first option of ${key}`);
      await page.keyboard.press("ArrowDown");
      const index = await cards.evaluateAll((els) => els.indexOf(document.activeElement as HTMLElement));
      expect(index, "focus after one ArrowDown").toBe(1);
    });
  }
});

/* D6. At 320px with the text at 200%, the first screen is wider than the phone:
   the "Back to the onboarding menu" button runs 11px past the right edge. */
test.describe("defect at 320px with text at 200%", () => {
  test.use({ viewport: { width: 320, height: 700 }, colorScheme: "light", reducedMotion: "no-preference" });

  for (const svc of SERVICES) {
    test(`${svc.slug}: D6 the first screen fits 320px with text at 200%`, async ({ page }) => {
      test.setTimeout(300_000);
      knownDefect("D6: at 200% text the 'Back to the onboarding menu' button on the first screen extends to 331px on a 320px viewport");
      const log = new Log();
      await open(page, CONFIGS[4]);
      await startByKeyboard(page, svc.pick);
      await audit(page, log, "first screen", false);
      expectClean(log, "overflow");
    });
  }
});

/* D3. Transitions on inputs, choice rows, buttons and the progress bar are
   declared outside any prefers-reduced-motion rule, so they still run (0.15s to
   0.55s) when the reader has asked for no motion. Checked on every service. */
test.describe("defect under reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "reduce" });

  for (const svc of SERVICES) {
    test(`${svc.slug}: D3 nothing animates or transitions longer than 0.01s under reduced motion`, async ({ page }) => {
      test.setTimeout(600_000);
      knownDefect("D3: base-rule transitions (.2s borders and backgrounds, width .55s on the progress bar) are not gated by prefers-reduced-motion");
      const log = new Log();
      await walk(page, svc, { ...LIGHT_390, reduced: true, focus: false }, false, log);
      expectClean(log, "motion");
    });
  }
});

/* ------------------------------------------------------ the colour flow */

test.describe("colour flow at 390px light", () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "no-preference" });

  /* The keyboard path through the colours that works today: a feeling is
     chosen, Show me another cycles the three palettes back to the first, and
     Yes, use these commits the palette with Enter and keeps focus on the page.
     If the arrow keys do not choose a feeling (D4), this falls back to Tab and
     Space and records the arrow failure, so the rest of the flow is still
     checked. */
  test("branding colours: Show me another cycles, and Yes, use these commits with Enter", async ({ page }) => {
    test.setTimeout(600_000);
    const log = new Log();
    const field = await colourScreen(page, log);
    await chooseFeeling(page, field, log);

    const suggest = page.getByRole("button", { name: "Show me another" });
    await expect(suggest).toBeVisible({ timeout: 10_000 });
    await tabTo(page, suggest, "Show me another");
    const panel = () => field.locator(".obCol__panel").innerText();
    const first = await panel();
    await page.keyboard.press("Enter");
    const second = await panel();
    await page.keyboard.press("Enter");
    const third = await panel();
    await page.keyboard.press("Enter");
    const back = await panel();
    if (second === first) log.add("colours", "Colours", "Show me another", "the first press did not change the palette");
    if (third === second || third === first) log.add("colours", "Colours", "Show me another", "the second press did not reach a third palette");
    if (back !== first) log.add("colours", "Colours", "Show me another", "the third press did not cycle back to the first palette");
    log.count("cycleChecks");

    const yes = page.getByRole("button", { name: "Yes, use these" });
    await tabTo(page, yes, "Yes, use these");
    const swatches = await field.locator(".obCol__bigBtn").count();
    await page.keyboard.press("Enter");
    const saved = field.locator(".obCol__saved").first();
    if (!(await saved.isVisible().catch(() => false))) log.add("colours", "Colours", "Yes, use these", "no saved colours shown after Enter");
    const savedCount = await field.locator(".obCol__savedList li").count();
    if (swatches && savedCount !== swatches) log.add("colours", "Colours", "Yes, use these", `saved ${savedCount} colours, the palette showed ${swatches}`);
    if (await page.evaluate(() => document.activeElement === document.body)) log.add("colours", "Colours", "Yes, use these", "focus fell to the page body after committing");
    log.count("commitChecks");

    for (const item of log.items) console.log(`FINDING colours | 390px light | ${item}`);
    for (const cat of ["colours", "focus", "names", "axe", "errors"] as const) expectClean(log, cat);
  });

  /* D4. The feeling cards are native radios, but each one carries its own name
     (`${id}-feel-${feeling}`), so the browser sees one-button groups and the
     arrow keys cannot move between feelings. */
  test("D4 arrow keys move between the colour feelings", async ({ page }) => {
    test.setTimeout(600_000);
    knownDefect("D4: feeling radios each carry a unique name, so arrow keys do not move between them");
    const log = new Log();
    const field = await colourScreen(page, log);
    const feelings = field.locator('input[type="radio"]');
    await tabTo(page, feelings.first(), "the first colour feeling");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const checked = await feelings.evaluateAll((els) => els.findIndex((e) => (e as HTMLInputElement).checked));
    expect(checked, "the feeling checked after two ArrowDowns").toBe(2);
  });
});

/** Walks the branding form to its Colours screen and runs the page checks there. */
async function colourScreen(page: Page, log: Log): Promise<Locator> {
  await open(page, { ...LIGHT_390, dark: false, scale: false }, true);
  await startByKeyboard(page, /^Branding/);
  // A medium job shows the colour screen; the other answers are the smallest job's.
  const answers = { ...PERSON, ...SMALLEST.branding, job_size: "Several pieces", deliverables: ["Logo"] };
  await walkKeyboard(page, answers, log, async () => {}, /^Colours$/);
  const field = page.locator('[data-field="brand_colours"]');
  await expect(field).toBeVisible();
  await audit(page, log, "Colours", false);
  await axeScreen(page, log, "Colours");
  await focusSweep(page, log, "Colours");
  return field;
}

/** Arrow keys first; if they do not move (D4), Tab to the third feeling and press Space. */
async function chooseFeeling(page: Page, field: Locator, log: Log) {
  const feelings = field.locator('input[type="radio"]');
  await tabTo(page, feelings.first(), "the first colour feeling");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const checked = await feelings.evaluateAll((els) => els.findIndex((e) => (e as HTMLInputElement).checked));
  if (checked !== 2) {
    log.add("keyboard", "Colours", "feeling radios", "arrow keys do not move between the feelings (D4); fell back to Tab");
    await tabTo(page, feelings.nth(2), "the third colour feeling");
  }
  await page.keyboard.press("Space");
  log.count("feelingChosen");
}
