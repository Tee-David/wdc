import { expect, test, type Page } from "@playwright/test";
import { SIZE_KEYS, stepsFor } from "@/lib/onboarding";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { FEATURE_GROUPS, POPULAR_FEATURES } from "@/lib/onboarding-services/apps";
import { DELIVERABLE_INFO } from "@/lib/onboarding-services/branding";
import { chooseOption, isolate, seedDraft } from "./onboarding-helpers";

/**
 * The rich option cards (Branding size and deliverables) and the grouped
 * feature checklist (Apps features), against brief rule 6: every step renders
 * at phone and desktop width in both themes, targets are 44px, follow-up
 * questions open under their parent, a later pick raises the tier, and an old
 * draft with plain string answers still opens.
 *
 * Writes are isolated: nothing is saved to the server.
 */

const field = (page: Page, key: string) => page.locator(`[data-field="${key}"]`);
const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
const stored = (page: Page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem("wdc-onboarding-draft") ?? "{}").answers ?? {}; } catch { return {}; }
});

/** The index of a named step in the service's full list. Checked against the heading after load. */
const stepIndex = (service: ServiceSlug, id: string) => {
  const i = stepsFor(service).findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`no step ${id} in ${service}`);
  return i;
};
const optionsOf = (service: ServiceSlug, id: string, key: string) =>
  stepsFor(service).find((s) => s.id === id)!.fields.find((f) => f.key === key)!.options ?? [];

const WIDTHS = [320, 390, 768, 1280] as const;
const THEMES = ["light", "dark"] as const;

/* WCAG contrast, from the computed colours, so the claim is measured. */
function luminance(rgb: string) {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

async function openBranding(page: Page, width: number, theme: (typeof THEMES)[number], answers: Record<string, string | string[]> = {}) {
  await isolate(page);
  await page.setViewportSize({ width, height: 900 });
  await seedDraft(page, { service: "branding", step: stepIndex("branding", "branding"), answers }, { theme });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "What we are making" })).toBeVisible({ timeout: 30000 });
}

async function openApps(page: Page, width: number, theme: (typeof THEMES)[number] = "light", answers: Record<string, string | string[]> = {}) {
  await isolate(page);
  await page.setViewportSize({ width, height: 900 });
  await seedDraft(page, { service: "apps", step: stepIndex("apps", "apps_features"), answers }, { theme });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "What it does" })).toBeVisible({ timeout: 30000 });
}

/* ---------------- 1. Cards at every width, both themes ---------------- */

for (const theme of THEMES) for (const width of WIDTHS) {
  test(`Branding size and deliverable cards at ${width}px in ${theme}`, async ({ page }) => {
    await openBranding(page, width, theme);
    const deliverables = field(page, "deliverables");
    await expect(deliverables).toBeVisible();

    const names = optionsOf("branding", "branding", "deliverables");
    const cards = deliverables.locator(".obOpt__card");
    await expect(cards).toHaveCount(names.length);

    /* One column to 559px, two from 560px, three from 900px. */
    const columns = await cards.first().evaluate((el) => getComputedStyle(el.parentElement!).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width < 560 ? 1 : width < 900 ? 2 : 3);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const card = cards.nth(i);
      await expect(card.locator(".obOpt__name")).toHaveText(name);
      const box = await card.boundingBox();
      expect(box?.height ?? 0, `${name} height`).toBeGreaterThanOrEqual(44);

      const images = card.locator("img");
      const expectImage = Boolean(DELIVERABLE_INFO[name]?.images?.length);
      expect(await images.count(), `${name} images`).toBe(expectImage ? 1 : 0);
      if (!expectImage) continue;
      const img = images.first();
      await expect(img).toHaveAttribute("alt", `Example: ${name}`);
      expect(Number(await img.getAttribute("width")), `${name} width`).toBeGreaterThan(0);
      expect(Number(await img.getAttribute("height")), `${name} height`).toBeGreaterThan(0);
      expect(await img.getAttribute("loading")).toBe("lazy");
      /* Lazy images load as they come into view; this proves the file arrives. */
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15000 }).toBe(true);
    }

    const size = field(page, "job_size").locator(".obOpt__card");
    await expect(size).toHaveCount(3);
    for (const card of await size.all()) {
      expect((await card.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await card.locator("img").count()).toBe(0);
    }
    await noHorizontalScroll(page);
    if (width === 320 || width === 1280) {
      await page.screenshot({ path: test.info().outputPath(`branding-cards-${theme}-${width}.png`), fullPage: true });
    }
  });
}

test("a picked card shows a solid accent border and tick, measured in both themes", async ({ page }) => {
  for (const theme of THEMES) {
    await openBranding(page, 390, theme);
    await chooseOption(page, "deliverables", "Logo");
    const logo = field(page, "deliverables").getByRole("checkbox", { name: "Logo", exact: true });
    await expect(logo).toHaveAttribute("aria-checked", "true");
    const tick = logo.locator(".obOpt__tick");
    const style = await logo.evaluate((el) => {
      const cs = getComputedStyle(el);
      const t = getComputedStyle(el.querySelector(".obOpt__tick")!);
      return { border: cs.borderTopColor, card: cs.backgroundColor, tick: t.backgroundColor, tickInk: t.color };
    });
    /* The tick and its border are a solid fill against the card, and the white
       tick reads on the accent fill. Brief: a 3:1 minimum for graphics and
       4.5:1 for the label. */
    expect(contrast(style.tick, style.card), `${theme} tick against card`).toBeGreaterThanOrEqual(3);
    expect(contrast(style.tickInk, style.tick), `${theme} tick mark on fill`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(style.border, style.card), `${theme} selected border`).toBeGreaterThanOrEqual(3);
    await expect(tick).toBeVisible();
  }
});

test("picking radio cards stores the names, and pressing the chosen one again unchooses it", async ({ page }) => {
  await openBranding(page, 390, "light");
  const small = page.getByRole("radio", { name: "One piece or a small set", exact: true });
  await chooseOption(page, "job_size", "One piece or a small set");
  await expect(small).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await stored(page)).job_size).toBe("One piece or a small set");
  await chooseOption(page, "job_size", "One piece or a small set");
  await expect(small).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => (await stored(page)).job_size ?? "").toBe("");
});

/* ---------------- 2. Follow-ups open under their parent ---------------- */

test("Motion design opens motion kinds directly under the deliverables, and closing it removes them", async ({ page }) => {
  await openBranding(page, 390, "light");
  const deliverables = field(page, "deliverables");
  await chooseOption(page, "deliverables", "Motion design");
  await expect(field(page, "motion_kinds")).toBeVisible();
  await expect.poll(() => deliverables.evaluate((el) => el.nextElementSibling?.getAttribute("data-field"))).toBe("motion_kinds");
  await expect.poll(async () => (await stored(page)).deliverables).toEqual(["Motion design"]);

  await chooseOption(page, "deliverables", "Logo");
  await expect.poll(async () => (await stored(page)).deliverables).toEqual(["Motion design", "Logo"]);
  await chooseOption(page, "deliverables", "Motion design");
  await expect(field(page, "motion_kinds")).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).deliverables).toEqual(["Logo"]);
});

test("Flyers opens the job rhythm question directly under the deliverables, then a batch opens its count", async ({ page }) => {
  await openBranding(page, 390, "light");
  const deliverables = field(page, "deliverables");
  await chooseOption(page, "deliverables", "Flyers");
  await expect(field(page, "job_rhythm")).toBeVisible();
  await expect.poll(() => deliverables.evaluate((el) => el.nextElementSibling?.getAttribute("data-field"))).toBe("job_rhythm");

  await chooseOption(page, "job_rhythm", "A batch");
  await expect(field(page, "batch_count")).toBeVisible();
  await expect.poll(() => field(page, "job_rhythm").evaluate((el) => el.nextElementSibling?.getAttribute("data-field"))).toBe("batch_count");

  await chooseOption(page, "deliverables", "Flyers");
  await expect(field(page, "job_rhythm")).toHaveCount(0);
  await expect(field(page, "batch_count")).toHaveCount(0);
});

/* ---------------- 3. A later pick raises the tier ---------------- */

test("a small job that ticks Brand guidelines still reaches the colours step", async ({ page }) => {
  await openBranding(page, 390, "light", { job_size: "One piece or a small set" });
  await chooseOption(page, "deliverables", "Brand guidelines");
  await next(page).click();
  await expect(page.getByRole("heading", { name: "What you have, and the style" })).toBeVisible();
  await chooseOption(page, "brand_have", "Nothing yet");
  await next(page).click();
  await expect(page.getByRole("heading", { name: "Your colours" })).toBeVisible();
  await expect(field(page, "brand_colours")).toBeVisible();
});

test("a small logo job does not reach the colours step", async ({ page }) => {
  await openBranding(page, 390, "light", { job_size: "One piece or a small set", deliverables: ["Logo"] });
  await next(page).click();
  await expect(page.getByRole("heading", { name: "What you have, and the style" })).toBeVisible();
  await chooseOption(page, "brand_have", "Nothing yet");
  await next(page).click();
  await expect(page.getByRole("heading", { name: "Your colours" })).toHaveCount(0);
  await expect(field(page, "brand_colours")).toHaveCount(0);
});

/* ---------------- 4. Apps feature checklist ---------------- */

const allFeatures = FEATURE_GROUPS.flatMap((g) => g.options);

for (const theme of THEMES) for (const width of WIDTHS) {
  test(`Apps feature checklist fits and keeps 44px targets at ${width}px in ${theme}`, async ({ page }) => {
    await openApps(page, width, theme);
    const list = field(page, "app_features");
    await expect(list.locator(".obFeat__pill").first()).toBeVisible();
    await expect(list.getByRole("button", { name: "See all features", exact: true })).toBeVisible();
    await list.getByRole("button", { name: "See all features", exact: true }).click();
    await expect(list.locator(".obFeat__groups .obFeat__row")).toHaveCount(allFeatures.length);
    for (const el of await list.locator("button:visible, input[type=search]:visible, .obFeat__row:visible, .obFeat__chip:visible").all()) {
      const box = await el.boundingBox();
      expect(box?.height ?? 0, `${await el.textContent()} height`).toBeGreaterThanOrEqual(44);
    }
    await noHorizontalScroll(page);
    if (width === 320) await page.screenshot({ path: test.info().outputPath(`apps-features-${theme}-${width}.png`), fullPage: true });
  });
}

test("Apps features: popular first, See all, search, picked count, removable chips, and keyboard toggling", async ({ page }) => {
  await openApps(page, 320, "light");
  const list = field(page, "app_features");
  const search = list.getByRole("searchbox", { name: "Search features", exact: true });

  /* Popular first, and the groups are folded. The search box is never focused on load. */
  await expect(search).not.toBeFocused();
  await expect.poll(async () => list.locator(".obFeat__pills .obFeat__pill").allTextContents()).toEqual(POPULAR_FEATURES);
  await expect(list.locator(".obFeat__groups")).toHaveCount(0);
  const seeAll = list.getByRole("button", { name: "See all features", exact: true });
  await expect(seeAll).toHaveAttribute("aria-expanded", "false");
  expect((await seeAll.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  await seeAll.click();
  await expect(seeAll).toHaveAttribute("aria-expanded", "true");
  await expect.poll(async () => list.locator(".obFeat__groups > .obFeat__group > .obFeat__h").allTextContents()).toEqual(FEATURE_GROUPS.map((g) => g.name));
  await expect(list.locator(".obFeat__groups .obFeat__row")).toHaveCount(allFeatures.length);

  /* Toggling changes the count and the chips, and nothing above moves. */
  const headingY = (await list.locator(".obFeat__pop").boundingBox())?.y ?? 0;
  const pills = list.locator(".obFeat__pills");
  await chooseOption(page, "app_features", "Profiles");
  await expect(list.locator(".obFeat__count")).toHaveText("1 feature picked");
  expect(Math.abs(((await list.locator(".obFeat__pop").boundingBox())?.y ?? 0) - headingY)).toBeLessThan(1);

  /* A row in a group is a 44px checkbox, and Space toggles it from the keyboard. */
  const row = list.locator(".obFeat__groups").getByRole("checkbox", { name: "Sign up and log in", exact: true });
  await row.focus();
  await page.keyboard.press("Space");
  await expect(row).toBeChecked();
  await expect(list.locator(".obFeat__count")).toHaveText("2 features picked");
  await expect(list.getByRole("button", { name: "Remove Profiles", exact: true })).toBeVisible();
  await expect(list.getByRole("button", { name: "Remove Sign up and log in", exact: true })).toBeVisible();

  /* Removing a chip unpicks the option everywhere it appears. */
  await list.getByRole("button", { name: "Remove Profiles", exact: true }).click();
  await expect(list.locator(".obFeat__count")).toHaveText("1 feature picked");
  await expect(pills.getByRole("checkbox", { name: "Profiles", exact: true })).toHaveAttribute("aria-checked", "false");

  /* Search filters the groups, hides the popular row and See all, and says so when nothing matches. */
  await search.fill("push");
  await expect(list.locator(".obFeat__groups .obFeat__row")).toHaveCount(1);
  await expect(list.locator(".obFeat__groups .obFeat__row")).toContainText("Push notifications");
  await expect(list.locator(".obFeat__pills")).toHaveCount(0);
  await expect(seeAll).toHaveCount(0);
  await search.fill("zzqx");
  await expect(list.getByText("No features match")).toBeVisible();
  await expect(list.getByText("No features match")).toContainText("zzqx");
  await list.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(list.locator(".obFeat__pills .obFeat__pill")).toHaveCount(POPULAR_FEATURES.length);

  /* The clear box in the search row empties the search too. */
  await search.fill("pay");
  await list.getByRole("button", { name: "Clear search box", exact: true }).click();
  await expect(search).toHaveValue("");

  await noHorizontalScroll(page);
});

test("a legacy draft with plain string answers still opens and shows its answers", async ({ page }) => {
  /* Older drafts stored one string for a list. It reads as one pick. */
  await openApps(page, 390, "light", { app_features: "Profiles" });
  const list = field(page, "app_features");
  await expect(list.locator(".obFeat__count")).toHaveText("1 feature picked");
  await expect(list.getByRole("button", { name: "Remove Profiles", exact: true })).toBeVisible();

  await openBranding(page, 390, "light", { job_size: "Several pieces", deliverables: "Logo" });
  await expect(field(page, "deliverables").getByRole("checkbox", { name: "Logo", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(field(page, "job_size").getByRole("radio", { name: "Several pieces", exact: true })).toHaveAttribute("aria-checked", "true");
});


/* ---------------- 5. Short choices are dropdowns, pairs or chips ---------------- */

const stepOf = (service: ServiceSlug, key: string) =>
  stepsFor(service).find((s) => s.fields.some((f) => f.key === key))!.id;

test("a three-choice question is a dropdown: one tap opens the sheet, one more picks", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedDraft(page, { service: "apps", step: stepIndex("apps", "apps") });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const question = field(page, "app_stage");
  await expect(question).toBeVisible({ timeout: 30000 });
  await expect(question.locator(".ob__cards")).toHaveCount(0);
  await expect(page.getByText("Required", { exact: true })).toHaveCount(0);
  const combo = question.getByRole("combobox");
  await expect(combo).toContainText("Choose one");
  await combo.click();
  const sheet = page.locator(".pk__pop");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  /* A bottom sheet: it ends at the bottom edge, within the sheet's own shadow. */
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844 + 4);
  expect(box?.y ?? 0).toBeGreaterThan(300);
  await expect(page.getByRole("option")).toHaveCount(4);
  await page.getByRole("option", { name: "Designs are ready", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(combo).toContainText("Designs are ready");
  await expect.poll(async () => (await stored(page)).app_stage).toBe("Designs are ready");
  await noHorizontalScroll(page);
});

test("the dropdown list scrolls inside its sheet and the last option is reachable at 320px", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 320, height: 640 });
  /* The longest plain single choice in the lists is six options. */
  await seedDraft(page, { service: "social", step: stepIndex("social", stepOf("social", "social_goal")), answers: { social_size: "Large" } });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const question = field(page, "social_goal");
  await expect(question).toBeVisible({ timeout: 30000 });
  await question.getByRole("combobox").click();
  const list = page.locator(".pk__list");
  await expect(list).toBeVisible();
  expect(["auto", "scroll"]).toContain(await list.evaluate((el) => getComputedStyle(el).overflowY));
  const options = optionsOf("social", stepOf("social", "social_goal"), "social_goal");
  await expect(page.getByRole("option")).toHaveCount(options.length);
  const last = page.getByRole("option", { name: options[options.length - 1], exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pk__pop")).toHaveCount(0);
  await noHorizontalScroll(page);
});

test("a two-choice question is one compact line at 320px", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 320, height: 700 });
  const key = "site_new_or_existing";
  const service: ServiceSlug = "web";
  const options = optionsOf(service, stepOf(service, key), key);
  expect(options).toHaveLength(2);
  await seedDraft(page, { service, step: stepIndex(service, stepOf(service, key)) });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const question = field(page, key);
  await expect(question).toBeVisible({ timeout: 30000 });
  const seg = question.locator(".ob__seg");
  const buttons = seg.getByRole("radio");
  await expect(buttons).toHaveCount(2);
  await expect(question.locator(".ob__card")).toHaveCount(0);
  const tops = await buttons.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size, "both halves on one line").toBe(1);
  for (const b of await buttons.all()) expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  const segBox = await seg.boundingBox();
  expect((segBox?.x ?? 0) + (segBox?.width ?? 0)).toBeLessThanOrEqual(320);
  await chooseOption(page, key, options[0]);
  await expect(question.getByRole("radio", { name: options[0], exact: true })).toHaveAttribute("aria-checked", "true");
  await chooseOption(page, key, options[0]);
  await expect(question.getByRole("radio", { name: options[0], exact: true })).toHaveAttribute("aria-checked", "false");
  await noHorizontalScroll(page);
});

test("a short multi list is compact chips, and a long one keeps its cards", async ({ page }) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await seedDraft(page, { service: "branding", step: stepIndex("branding", "branding_have") });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const short = field(page, "brand_have");
  await expect(short).toBeVisible({ timeout: 30000 });
  await expect(short.locator(".ob__card--chip")).toHaveCount(optionsOf("branding", "branding_have", "brand_have").length);
  for (const chip of await short.locator(".ob__card--chip").all()) expect((await chip.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await chooseOption(page, "brand_have", "A logo");
  await expect(short.getByRole("checkbox", { name: "A logo", exact: true })).toHaveClass(/is-on/);

  await isolate(page);
  await seedDraft(page, { service: "apps", step: stepIndex("apps", "apps_setup"), answers: { app_size: "Medium" } });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const long = field(page, "app_connects");
  await expect(long).toBeVisible({ timeout: 30000 });
  await expect(long.locator(".ob__card--chip")).toHaveCount(0);
  await expect(long.locator(".ob__card")).toHaveCount(optionsOf("apps", "apps_setup", "app_connects").length);
});

test("no single choice of three or more plain options renders as a stack of cards, in any service", async ({ page }) => {
  /* About seventy screens, one page load each. */
  test.setTimeout(600000);
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem("wdc-intro-seen-at", String(Date.now())));
  let dropdowns = 0;
  for (const service of SERVICES.map((s) => s.slug)) {
    const steps = stepsFor(service);
    /* Every size question at its largest, so the tier 2 and tier 3 screens render too. */
    const answers: Record<string, string> = {};
    for (const step of steps) for (const f of step.fields) if ((SIZE_KEYS as readonly string[]).includes(f.key) && f.options?.length) answers[f.key] = f.options[f.options.length - 1];
    for (let i = 0; i < steps.length; i++) {
      await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
      await page.evaluate((draft) => localStorage.setItem("wdc-onboarding-draft", JSON.stringify(draft)), { started: true, service, step: i, answers });
      await page.reload({ waitUntil: "domcontentloaded" });
      /* Every question screen has its blurb under the title. The review screen
         has none, and then it has no question fields to check either. */
      await page.locator(".ob__blurb").first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
      for (const f of steps[i].fields) {
        if (f.kind !== "cards" || f.optionInfo || (f.options?.length ?? 0) < 3) continue;
        const question = field(page, f.key);
        if (!(await question.count())) continue;
        dropdowns++;
        expect(await question.locator(".ob__cards").count(), `${service} ${f.key} is a stack of cards`).toBe(0);
        await expect(question.getByRole("combobox"), `${service} ${f.key} is a dropdown`).toHaveCount(1);
      }
    }
  }
  expect(dropdowns).toBeGreaterThanOrEqual(10);
});
