import { expect, test } from "@playwright/test";

/**
 * THE RULE. A filled control carries a NEUTRAL label chosen for contrast; the
 * FILL carries the brand.
 *
 *   orange fill (#ff6500) -> BLACK label  (7.11:1)
 *   navy fill   (#000065) -> WHITE label  (17.68:1)
 *   white fill  (#ffffff) -> BLACK label  (21:1)
 *
 * Both alternatives for the orange fill were measured and rejected: white is
 * 2.95:1, which fails even the 3:1 WCAG allows large text, and navy is 5.99:1
 * but is a coloured label on a brand fill. This spec pins the choice so it
 * cannot drift back to either by accident.
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
    /* `load`, not a fixed pause. Reading computed styles off a page that has
       not settled is how this spec used to fail under load while passing on
       its own -- it was measuring half-painted controls. The chat avatar used
       to stop `load` firing at all, which is why the pause was here; now that
       it is hosted locally, `load` is a real signal again. */
    await page.goto(path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.locator("a, button").first().waitFor({ state: "visible" });

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
          ? [WHITE]         // only a navy fill takes a white label
          : BLACKS;         // orange and white fills take a black label
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
    /* `load`, not a fixed pause. Reading computed styles off a page that has
       not settled is how this spec used to fail under load while passing on
       its own -- it was measuring half-painted controls. The chat avatar used
       to stop `load` firing at all, which is why the pause was here; now that
       it is hosted locally, `load` is a real signal again. */
    await page.goto(path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.locator("a, button").first().waitFor({ state: "visible" });

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

  expect(failures, failures.join(String.fromCharCode(10))).toEqual([]);
});
