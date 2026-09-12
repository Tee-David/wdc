import { expect, test } from "@playwright/test";

/**
 * Filled controls carry a NEUTRAL label, chosen for contrast, and the fill
 * carries the brand.
 *
 * The numbers behind the rule, measured rather than assumed:
 *
 *   #000000 on #ff6500 .... 7.11:1   PASS  <- the rule for orange
 *   #000065 on #ff6500 .... 5.99:1   passes, but navy is not a neutral label
 *   #ffffff on #ff6500 .... 2.95:1   FAIL
 *   #ffffff on #000065 ... 17.68:1   PASS  <- the rule for navy
 *   #000000 on #ffffff ... 21.00:1   PASS  <- the rule for white
 *
 * An earlier pass at "make the labels neutral" moved every orange fill from
 * navy to WHITE, which is neutral and also the one option that fails WCAG AA.
 * This spec exists so that cannot happen again quietly.
 */

const publicPages = ["/", "/services", "/about", "/work", "/contact", "/onboarding", "/login"];

const ORANGE = "rgb(255, 101, 0)";
const NAVY = "rgb(0, 0, 101)";
const WHITE = "rgb(255, 255, 255)";

/* Black is allowed a little latitude: several controls set #000 and a couple
   set the near-black ink, and both read as neutral. */
const BLACKS = ["rgb(0, 0, 0)", "rgb(17, 17, 17)", "rgb(14, 14, 44)"];

test.describe.configure({ timeout: 120_000 });

test("filled public controls use neutral label colours", async ({ page }) => {
  const failures: string[] = [];

  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
      sessionStorage.setItem("wdc:preloaded", "1");
    } catch {}
  });

  for (const path of publicPages) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const controls = await page.locator("a, button").evaluateAll((elements) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return [];
        if (style.visibility === "hidden" || style.opacity === "0") return [];
        const background = style.backgroundColor;
        const filled =
          background === "rgb(255, 101, 0)" ||
          background === "rgb(0, 0, 101)" ||
          background === "rgb(255, 255, 255)";
        if (!filled || parseFloat(style.borderRadius) < 12) return [];
        const label = element.textContent?.trim() || element.getAttribute("aria-label") || "unnamed";
        return [{ label, background, colour: style.color }];
      }),
    );

    for (const control of controls) {
      const expected =
        control.background === NAVY
          ? [WHITE]
          : BLACKS; // orange and white fills both take a black label
      if (!expected.includes(control.colour)) {
        failures.push(
          `${path}: "${control.label}" is ${control.colour} on ${control.background}`,
        );
      }
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});

test("no orange fill anywhere carries a white label", async ({ page }) => {
  const failures: string[] = [];

  await page.route(/jotfor|userway/i, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
      sessionStorage.setItem("wdc:preloaded", "1");
    } catch {}
  });

  for (const path of publicPages) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const bad = await page.evaluate(({ orange, white }) => {
      const out: string[] = [];
      document.querySelectorAll("*").forEach((element) => {
        const style = getComputedStyle(element);
        if (style.backgroundColor !== orange) return;
        if (style.color !== white) return;
        const text = (element.textContent || "").trim();
        if (!text) return;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        out.push(text.slice(0, 44));
      });
      return out;
    }, { orange: ORANGE, white: WHITE });

    bad.forEach((t) => failures.push(`${path}: white on orange (2.95:1) -- "${t}"`));
  }

  expect(failures, failures.join("\n")).toEqual([]);
});
