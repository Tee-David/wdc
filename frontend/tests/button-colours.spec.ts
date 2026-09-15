import { expect, test } from "@playwright/test";

/**
 * THE RULE, REWRITTEN. The site's buttons are black and white, and WHICH of
 * the two is decided by what the button is sitting on.
 *
 *   on paper        primary = black fill, white label
 *   on a dark ground primary = white fill, black label
 *   secondary       = the outline of whichever the primary is
 *
 * Orange is no longer a button fill anywhere. It is an accent again.
 *
 * WHAT THIS SPEC USED TO ASSERT was the colour pairing by name: an orange fill
 * takes a black label, a navy fill takes white. That checked the LABEL and
 * never the fill, which is how the site carried two invisible buttons for
 * months without this going red -- a navy submit at 1.15:1 against the dark
 * theme's own page, and later a white one at 1.00:1 on white paper. A label
 * can be perfect on a button nobody can see the edge of.
 *
 * So it measures both halves now, from the real page:
 *   1.4.3  the label against its own fill, 4.5:1
 *   1.4.11 the fill against what it actually sits on, 3:1
 *
 * The ground is read by walking up until something paints a background, which
 * is the only way to catch a light card inside a dark band -- the exact case
 * that produced the white-on-white button.
 */

const publicPages = [
  "/", "/services", "/services/web", "/contact",
  "/tools/domain", "/tools/email", "/work", "/about", "/blog",
];

test.describe.configure({ timeout: 240_000 });

/** WCAG relative luminance, and the ratio between two of them. */
const CONTRAST = `
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const rgb = (s) => {
    const m = String(s).match(/rgba?\\(([^)]+)\\)/);
    return m ? m[1].split(",").map(Number).slice(0, 3) : null;
  };
  const clear = (s) => /rgba\\([^)]+,\\s*0\\)/.test(String(s));
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
`;

async function auditButtons(page: import("@playwright/test").Page, path: string, theme: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  return page.evaluate(`(() => {
    ${CONTRAST}
    const out = [];
    for (const el of document.querySelectorAll(".pv-btn")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || cs.opacity === "0") continue;

      /* The ground is whatever actually paints behind it, which may be several
         levels up and may reverse the section's own colour. */
      let behind = "rgba(0, 0, 0, 0)", node = el.parentElement;
      while (node && clear(behind)) { behind = getComputedStyle(node).backgroundColor; node = node.parentElement; }

      const fill = rgb(cs.backgroundColor), ink = rgb(cs.color);
      const edge = rgb(cs.borderTopColor), ground = rgb(behind);
      if (!fill || !ink || !ground) continue;

      const outlined = clear(cs.backgroundColor);
      out.push({
        label: (el.textContent || "").trim().slice(0, 30) || "unnamed",
        fill: cs.backgroundColor,
        ink: cs.color,
        outlined,
        /* An outlined button's label sits on the GROUND, not on a fill. */
        text: ratio(ink, outlined ? ground : fill),
        boundary: outlined
          ? (edge ? ratio(edge, ground) : 0)
          : Math.max(ratio(fill, ground), edge ? ratio(edge, ground) : 0),
      });
    }
    return out;
  })()`) as Promise<Array<{ label: string; fill: string; ink: string; outlined: boolean; text: number; boundary: number }>>;
}

for (const theme of ["light", "dark"]) {
  test(`every button is legible and visible in ${theme} mode`, async ({ page }) => {
    await page.route(/jotfor|userway/i, (route) => route.abort());
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
        localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
        sessionStorage.setItem("wdc:preloaded", "1");
      } catch { /* private mode */ }
    }, theme);

    const failures: string[] = [];
    let counted = 0;

    for (const path of publicPages) {
      for (const b of await auditButtons(page, path, theme)) {
        counted += 1;
        if (b.text < 4.5) {
          failures.push(`${path} "${b.label}" label ${b.text.toFixed(2)}:1 (needs 4.5)`);
        }
        if (b.boundary < 3) {
          failures.push(`${path} "${b.label}" ${b.fill} is ${b.boundary.toFixed(2)}:1 against what it sits on (needs 3)`);
        }
      }
    }

    expect(counted, "no buttons were found to check").toBeGreaterThan(10);
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

test("no button is filled with the brand orange", async ({ page }) => {
  /* The fill carried the brand and the label had to be chosen around it. Now
     the fill is neutral and the brand lives in type, icons, chips and rules.
     This is the assertion that would have caught the one override left behind
     when the buttons were repainted: `.pv .sv-hero__cta .pv-btn--accent` sat
     at (0,3,0) in a different stylesheet and kept both hero buttons orange. */
  await page.route(/jotfor|userway/i, (route) => route.abort());
  const offenders: string[] = [];

  for (const path of publicPages) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const found = await page.locator(".pv-btn").evaluateAll((els) =>
      els
        .map((el) => ({ bg: getComputedStyle(el).backgroundColor, label: (el.textContent || "").trim().slice(0, 30) }))
        .filter((x) => x.bg === "rgb(255, 101, 0)")
        .map((x) => x.label),
    );
    offenders.push(...found.map((l) => `${path}: "${l}"`));
  }

  expect(offenders, offenders.join("\n")).toEqual([]);
});
