import { expect, test, type Locator, type Page } from "@playwright/test";
import { isVisible, stepsFor, UNSURE } from "@/lib/onboarding";
import { nameColour } from "@/lib/colour-palettes";
import { isolate, seedDraft } from "./onboarding-helpers";

/**
 * The colour question in the Branding form (decision 21, research section D).
 *
 * Brief rule 6 for this field: every screen at 320, 390, 768 and 1280 in both
 * themes with no horizontal overflow and 44px targets, the two-tap path, the
 * cycling, the code and word paths, extraction from a picture, skip, the
 * reversible "not sure", and a legacy saved value still opening.
 *
 * Writes are isolated: the form saves its draft to localStorage, which is what
 * these specs read back, and every API call is refused.
 */

const ANSWERS = { job_size: "A full brand" };
const WARM = [
  "Colour preferences:",
  "Sunset orange | #E8741E | Main colour (primary)",
  "Sand | #F4E3C8 | Not decided",
  "Cocoa | #5A3A27 | Not decided",
  "Cream | #FFF8EC | Not decided",
].join("\n");

/** The step index of the colour screen for these answers, as the form counts its visible screens. */
function colourStep(answers: Record<string, string>) {
  return stepsFor("branding")
    .filter((step) => step.fields.some((field) => isVisible(field, answers)))
    .findIndex((step) => step.id === "branding_colours");
}

async function openColours(page: Page, opts: { theme?: "light" | "dark"; width?: number; answers?: Record<string, string> } = {}) {
  const answers = { ...ANSWERS, ...opts.answers };
  if (opts.width) await page.setViewportSize({ width: opts.width, height: 900 });
  await isolate(page);
  await seedDraft(page, { service: "branding", step: colourStep(answers), answers }, { theme: opts.theme });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const field = page.locator('[data-field="brand_colours"]');
  await expect(field).toBeVisible({ timeout: 30000 });
  return field;
}

async function savedDraft(page: Page): Promise<Record<string, string | string[]>> {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("wdc-onboarding-draft") ?? "{}").answers ?? {};
    } catch {
      return {};
    }
  });
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

/** Every visible control in the field is at least 44px high. Radios and the
    file input are visually hidden and their label is the target, so they are
    measured through the label that wraps them. */
async function expectTargets(scope: Locator, label: string) {
  const sizes = await scope.locator(
    "button:visible, textarea:visible, input[type=text]:visible, label:has(> input[type=radio]):visible, label:has(> input[type=checkbox]):visible, label:has(> input[type=file]):visible, label:has(> input[type=text]):visible",
  ).evaluateAll((els) => els.map((el) => ({
    tag: el.tagName, text: (el.textContent ?? "").trim().slice(0, 40), height: el.getBoundingClientRect().height,
  })));
  expect(sizes.length, `${label}: controls found`).toBeGreaterThan(0);
  for (const size of sizes) expect(size.height, `${label}: ${size.tag} "${size.text}"`).toBeGreaterThanOrEqual(43.5);
}

const card = (field: Locator, name: string) => field.locator("label.obCol__card", { hasText: name });

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(30000);
});

for (const theme of ["light", "dark"] as const) for (const width of [320, 390, 768, 1280]) {
  test(`every colour screen fits ${width}px in ${theme} with 44px targets`, async ({ page }) => {
    test.setTimeout(120_000);
    const field = await openColours(page, { theme, width });
    const label = `${theme} ${width}px`;

    // Screen 1: the feeling cards, the two quieter choices, not sure and skip.
    await expect(field.locator("label.obCol__card")).toHaveCount(6);
    await expectTargets(field, `${label} feel`);
    await expectNoOverflow(page);

    // Screen 2: a palette, with its four big swatches.
    await card(field, "Warm and friendly").click();
    await expect(field.getByRole("button", { name: "Yes, use these" })).toBeVisible();
    await expectTargets(field, `${label} suggest`);
    await expectNoOverflow(page);

    // The deeper path, and its bottom sheet.
    await field.getByRole("button", { name: "Change a colour or add my own" }).click();
    await expect(field.getByRole("button", { name: "Use these colours" })).toBeVisible();
    await expectTargets(field, `${label} deep`);
    await expectNoOverflow(page);
    await field.getByRole("button", { name: "Change Sunset orange" }).click();
    const sheet = page.locator(".obCol__sheet");
    await expect(sheet).toBeVisible();
    await expectTargets(sheet, `${label} sheet`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await field.getByRole("button", { name: "Back to the feelings" }).click();

    // Screen 3: the three ways, each with its own panel.
    await field.getByText("I already have my colours").click();
    await expect(field.getByRole("heading", { name: "Show us your colours" })).toBeVisible();
    await expectTargets(field, `${label} have upload`);
    await expectNoOverflow(page);
    await field.getByText("Type codes or pick colours").click();
    await expect(field.getByText("Type a code like #1A5C3A, or tap the box to pick a colour.")).toBeVisible();
    await expectTargets(field, `${label} have codes`);
    await expectNoOverflow(page);
    await field.getByText("Describe them in words").click();
    await expectTargets(field, `${label} have words`);
    await expectNoOverflow(page);
    await field.getByRole("button", { name: "Back to the feelings" }).click();

    // Choose for me: the confirmation screen.
    await field.getByText("Choose for me").click();
    await expect(field.getByText("Good. We will choose colours that fit your business")).toBeVisible();
    await expectTargets(field, `${label} studio`);
    await expectNoOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`colours-${theme}-${width}.png`), fullPage: true });
  });
}

test("tapping a card and then Yes, use these stores the palette", async ({ page }) => {
  const field = await openColours(page);
  await card(field, "Warm and friendly").click();
  await expect(field.getByText("1 of 3")).toBeVisible();
  await field.getByRole("button", { name: "Yes, use these" }).click();
  await expect(field.getByText("Saved. Main colour: Sunset orange.")).toBeVisible();
  const answers = await savedDraft(page);
  expect(answers.brand_colours).toBe(WARM);
  expect(answers.brand_vibe).toBe("Warm and friendly");
  expect(answers.brand_colour_source).toBe("vibe");
  // The card that was saved reads back as chosen.
  await expect(card(field, "Warm and friendly")).toHaveClass(/is-on/);
});

test("Show me another cycles 1 of 3, 2 of 3, 3 of 3 and back", async ({ page }) => {
  const field = await openColours(page);
  await card(field, "Calm and trusted").click();
  const count = field.locator(".obCol__count");
  await expect(count).toHaveText("1 of 3");
  await expect(field.getByRole("button", { name: "Make Deep navy the main colour" })).toHaveCount(0);
  await field.getByRole("button", { name: "Show me another" }).click();
  await expect(count).toHaveText("2 of 3");
  await expect(field.getByRole("button", { name: /Ocean blue/ })).toBeVisible();
  await field.getByRole("button", { name: "Show me another" }).click();
  await expect(count).toHaveText("3 of 3");
  await field.getByRole("button", { name: "Show me another" }).click();
  await expect(count).toHaveText("1 of 3");
  await expect(field.getByRole("button", { name: "Deep navy, main colour" })).toBeVisible();
});

test("tapping another swatch makes it the main colour that is saved", async ({ page }) => {
  const field = await openColours(page);
  await card(field, "Warm and friendly").click();
  await field.getByRole("button", { name: "Make Sand the main colour" }).click();
  await field.getByRole("button", { name: "Yes, use these" }).click();
  const answers = await savedDraft(page);
  expect(answers.brand_colours).toBe([
    "Colour preferences:",
    "Sand | #F4E3C8 | Main colour (primary)",
    "Sunset orange | #E8741E | Not decided",
    "Cocoa | #5A3A27 | Not decided",
    "Cream | #FFF8EC | Not decided",
  ].join("\n"));
});

test("the picker box sits between the code and the remove button and fills the code", async ({ page }) => {
  const field = await openColours(page);
  await field.getByText("I already have my colours").click();
  await field.getByText("Type codes or pick colours").click();
  const row = field.locator(".obCol__codeRow").first();
  const kids = await row.locator("> *").evaluateAll((els) => els.map((e) => e.tagName + ":" + (e as HTMLInputElement).type));
  expect(kids.slice(0, 3)).toEqual(["LABEL:undefined", "INPUT:color", "BUTTON:button"]);
  await row.locator('input[type="color"]').fill("#1a5c3a");
  await expect(field.getByRole("textbox", { name: "Colour 1", exact: true })).toHaveValue("#1A5C3A");
});

test("three palettes show at a time, and Shuffle deals three new ones with a title and a line each", async ({ page }) => {
  const field = await openColours(page);
  const cards = field.locator("label.obCol__card");
  await expect(cards).toHaveCount(3);
  const titles = async () => (await cards.locator(".obCol__cardName").allInnerTexts()).sort();
  const first = await titles();
  expect(first).toEqual(["Bold and energetic", "Calm and trusted", "Warm and friendly"]);
  await expect(cards.locator(".obCol__cardLine")).toHaveCount(3);
  await field.getByRole("button", { name: "Shuffle for more palettes" }).click();
  await expect(cards).toHaveCount(3);
  const second = await titles();
  expect(second.some((t) => first.includes(t))).toBe(false);
  await expect(cards.locator(".obCol__cardLine")).toHaveCount(3);
});

test("codes show the error copy, then save with plain names", async ({ page }) => {
  const field = await openColours(page);
  await field.getByText("I already have my colours").click();
  await field.getByText("Type codes or pick colours").click();
  const first = field.getByRole("textbox", { name: "Colour 1", exact: true });
  await first.fill("zz");
  await expect(field.getByText("That code needs 6 letters or numbers, like 1A5C3A. Check it and try again.")).toBeVisible();
  await expect(field.getByRole("button", { name: "Use these colours" })).toBeDisabled();
  await first.fill("1A5C3A");
  await expect(field.getByText("That code needs 6 letters or numbers")).toHaveCount(0);
  await field.getByRole("button", { name: "Add another colour" }).click();
  await field.getByRole("textbox", { name: "Colour 2", exact: true }).fill("#FFD93B");
  await field.getByRole("button", { name: "Use these colours" }).click();
  const answers = await savedDraft(page);
  expect(answers.brand_colour_source).toBe("codes");
  expect(answers.brand_colours).toBe([
    "Colour preferences:",
    `${nameColour("#1A5C3A")} | #1A5C3A | Main colour (primary)`,
    `${nameColour("#FFD93B")} | #FFD93B | Not decided`,
  ].join("\n"));
});

test("describing colours in words stores the words and their source", async ({ page }) => {
  const field = await openColours(page);
  await field.getByText("I already have my colours").click();
  await field.getByText("Describe them in words").click();
  await field.locator("textarea").fill("dark green, gold and white");
  const answers = await savedDraft(page);
  expect(answers.brand_colours_words).toBe("dark green, gold and white");
  expect(answers.brand_colour_source).toBe("words");
  expect(answers.brand_colours).toBe("dark green, gold and white");
});

test("a picture is read on the phone, drops the white background and saves its colours", async ({ page }) => {
  const field = await openColours(page);
  await field.getByText("I already have my colours").click();
  // A 40 by 40 picture: half dark green, a corner of gold, the rest white.
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, 40, 40);
    context.fillStyle = "#1E5B3A";
    context.fillRect(0, 0, 40, 20);
    context.fillStyle = "#C9A227";
    context.fillRect(0, 20, 10, 20);
    return canvas.toDataURL("image/png");
  });
  await field.locator('input[type="file"]').setInputFiles({
    name: "picture.png", mimeType: "image/png", buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
  });
  await expect(field.getByText("We found these colours")).toBeVisible();
  await expect(field.getByText("We ignored the white background.")).toBeVisible();
  const green = nameColour("#1E5B3A");
  const gold = nameColour("#C9A227");
  await expect(field.getByRole("button", { name: `${green}, main colour` })).toBeVisible();
  await expect(field.getByRole("button", { name: `Remove ${gold}` })).toBeVisible();
  await field.getByRole("button", { name: "Use these colours" }).click();
  const answers = await savedDraft(page);
  expect(answers.brand_colour_source).toBe("picture");
  expect(answers.brand_colours).toBe([
    "Colour preferences:",
    `${green} | #1E5B3A | Main colour (primary)`,
    `${gold} | #C9A227 | Not decided`,
  ].join("\n"));
});

test("skip for now stores the source as skipped and an empty colour value", async ({ page }) => {
  const field = await openColours(page);
  await card(field, "Bold and energetic").click();
  await field.getByRole("button", { name: "Yes, use these" }).click();
  await field.getByRole("button", { name: "Skip for now" }).click();
  const answers = await savedDraft(page);
  expect(answers.brand_colour_source).toBe("skipped");
  expect(answers.brand_colours).toBe("");
});

test("not sure is reversible: a real choice replaces it and the control stays enabled", async ({ page }) => {
  const field = await openColours(page);
  const notSure = field.getByRole("button", { name: UNSURE });
  await notSure.click();
  await expect(field.getByRole("button", { name: "Actually, let me answer this" })).toHaveAttribute("aria-pressed", "true");
  expect((await savedDraft(page)).brand_colours).toBe(UNSURE);
  await expect(field.getByRole("button", { name: "Actually, let me answer this" })).toBeEnabled();
  await card(field, "Calm and trusted").click();
  await field.getByRole("button", { name: "Yes, use these" }).click();
  const answers = await savedDraft(page);
  expect(answers.brand_colours).toMatch(/^Colour preferences:\n/);
  await expect(field.getByRole("button", { name: UNSURE })).toHaveAttribute("aria-pressed", "false");
});

test("Choose for me stores the not sure answer from the studio", async ({ page }) => {
  const field = await openColours(page);
  await field.getByText("Choose for me").click();
  await expect(field.getByText("Good. We will choose colours that fit your business")).toBeVisible();
  const answers = await savedDraft(page);
  expect(answers.brand_colours).toBe(UNSURE);
  expect(answers.brand_colour_source).toBe("studio");
  expect(answers.brand_vibe).toBe("Not sure");
});

test("a legacy saved colour value still opens and displays", async ({ page }) => {
  const legacy = await openColours(page, {
    answers: { brand_colours: "Colour preferences:\nNavy | #14284B | Main colour (primary)\nSand | #F4E3C8 | Not decided" },
  });
  await expect(legacy.getByText("Your colours", { exact: true })).toBeVisible();
  await expect(legacy.getByText("Navy", { exact: false }).first()).toBeVisible();
  await expect(legacy.getByRole("button", { name: "Change a colour or add my own" })).toBeVisible();
  await expectNoOverflow(page);
});

test("an old free-text colour note opens in the words box with its text", async ({ page }) => {
  const note = "Deep green, cream; no exact codes yet.";
  const field = await openColours(page, { answers: { brand_colours: note } });
  await expect(field.locator("textarea")).toHaveValue(note);
  await field.getByRole("button", { name: "Back to the feelings" }).click();
  await expect(field.getByText("Your colours, in your words")).toBeVisible();
  await expect(field.getByText(note)).toBeVisible();
});
