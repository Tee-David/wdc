import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

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

/* EVERY PLACE A BUTTON LIVES, and the last three are the ones that were
   missing when three of them were still orange and navy. `/onboarding` carries
   the form a paying client finishes, the 404 carries three, and the tool pages
   carry the pair twice over. A page that is not in this list is a page where
   the rule is not enforced. */
const publicPages = [
  "/", "/services", "/services/web", "/contact",
  "/tools/domain", "/tools/email", "/tools/seo",
  "/tools/link-preview", "/tools/business-name", "/tools/ai-cost",
  "/work", "/about", "/blog", "/onboarding", "/this-page-does-not-exist",
  /* The sign-in submit was navy in light mode and orange in dark until it was
     found in a screenshot; it is on the list so that cannot happen quietly. */
  "/login", "/forgot-password",
];

/**
 * EVERY BUTTON ON THE SITE, not just the marketing set's `.pv-btn`.
 *
 * This audited one class, which is how an orange onboarding button, a
 * navy-and-orange pair on the 404 and a hand-written hero all sat outside the
 * rule for months while the spec stayed green. A button is a labelled control
 * somebody presses; where it is written -- a shared class, a Tailwind string,
 * its own stylesheet -- does not change what it owes the reader.
 *
 * ICON-ONLY CONTROLS ARE NOT IN THIS LIST, deliberately: the rail arrows, the
 * modal's close cross, the header's round log-in. They carry no label, they
 * are chrome rather than a call to action, and the accent is exactly where the
 * brand belongs. The line is "does it have words in it".
 */
const BUTTONS = [
  ".pv-btn",
  ".btn-primary", ".btn-secondary",
  ".ob__btn",
  ".nf__btn",
  ".tl__go", ".tl__again",
  ".dm__yes", ".dm__no", ".dm__use",
  ".pv-modal__open",
  /* Google's sign-in button is not here on purpose: its look is Google's
     branding requirement, not ours to recolour. */
  ".au__submit",
].join(", ");

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

/** `#fff`, `#ffffff` and `rgb(255, 255, 255)` are the same colour, and the
    tokens and the computed styles do not agree about which spelling to use. */
function normalise(value: string) {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return `rgb(${[...hex].map((c) => parseInt(c + c, 16)).join(", ")})`;
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  }
  const m = value.match(/[\d.]+/g);
  return m ? `rgb(${m.slice(0, 3).map(Number).join(", ")})` : value.trim();
}

async function auditButtons(page: import("@playwright/test").Page, path: string, theme: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
  /* The sign-in forms' main button rests dimmed (aria-disabled) until there is
     an address to act on. Measure the button somebody actually presses. */
  if (/^\/(login|forgot-password)$/.test(path)) {
    const email = page.locator('input[type="email"]:visible').first();
    if (await email.count()) {
      await email.fill("reader@example.com");
      await page.waitForTimeout(400);
    }
  }

  return page.evaluate(`(() => {
    const BUTTONS_SELECTOR = ${JSON.stringify(BUTTONS)};
    ${CONTRAST}
    const out = [];
    for (const el of document.querySelectorAll(BUTTONS_SELECTOR)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || cs.opacity === "0") continue;
      /* An inactive control is exempt from the contrast rules (WCAG 1.4.3 and
         1.4.11), and a dimmed resting state is not a third button. */
      if (el.matches(":disabled, [aria-disabled='true']")) continue;

      /* The ground is whatever actually paints behind it, which may be several
         levels up and may reverse the section's own colour. */
      let behind = "rgba(0, 0, 0, 0)", node = el.parentElement, root = false;
      while (node && clear(behind)) {
        /* REACHING THE ROOT MEANS WE DID NOT FIND THE GROUND, not that the
           ground is white. A button over the hero photograph, or one in the
           fixed header sitting over a navy band, has an ancestor chain that
           paints nothing at all -- so the walk arrives at <body>, reports the
           page colour, and calls a white button on a photograph 1.00:1. The
           pixels are read instead, by groundBehind() below. */
        if (node === document.body || node === document.documentElement) root = true;
        behind = getComputedStyle(node).backgroundColor;
        node = node.parentElement;
      }

      const fill = rgb(cs.backgroundColor), ink = rgb(cs.color);
      const edge = rgb(cs.borderTopColor), ground = rgb(behind);
      if (!fill || !ink || !ground) continue;

      const outlined = clear(cs.backgroundColor);
      out.push({
        label: (el.textContent || "").trim().slice(0, 30) || "unnamed",
        fill: cs.backgroundColor,
        ink: cs.color,
        outlined,
        groundFromRoot: root,
        box: { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height },
        tokens: [cs.getPropertyValue("--btn-fill").trim(), cs.getPropertyValue("--btn-ink").trim()],
        /* An outlined button's label sits on the GROUND, not on a fill. */
        text: ratio(ink, outlined ? ground : fill),
        boundary: outlined
          ? (edge ? ratio(edge, ground) : 0)
          : Math.max(ratio(fill, ground), edge ? ratio(edge, ground) : 0),
      });
    }
    return out;
  })()`) as Promise<Button[]>;
}

type Button = {
  label: string; fill: string; ink: string; outlined: boolean;
  groundFromRoot: boolean;
  box: { x: number; y: number; width: number; height: number };
  tokens: [string, string]; text: number; boundary: number;
};

/**
 * THE PIXELS BESIDE A BUTTON, when the DOM cannot say what is behind it.
 *
 * Two real cases on this site, and both are white buttons that the walk above
 * reports as sitting on white paper: the hero's pair, which sits on a
 * photograph that no ancestor declares as a background colour, and the fixed
 * header's CTA, which floats over whatever band happens to be beneath it.
 * Neither is a fault and both failed, which is the worst kind of check -- one
 * that cries wolf until somebody deletes it.
 *
 * A four-pixel square just outside the button's own edge, averaged. It is the
 * same thing the eye does and the same technique `tests/money-print.spec.ts`
 * uses to count pages in a rendered PDF: when the question is "what does this
 * actually look like", read the picture.
 */
async function groundBehind(page: import("@playwright/test").Page, box: Button["box"]) {
  /* Outside the left edge where there is room, outside the right edge where
     the button is against the side of the window. Vertically centred, so a
     rounded corner cannot be what gets sampled. */
  const gap = 5;
  const x = Math.round(box.x > 24 ? box.x - gap - 4 : box.x + box.width + gap);
  const y = Math.round(box.y + box.height / 2 - 2);
  if (x < 0 || y < 0) return null;

  let png: PNG;
  try {
    const shot = await page.screenshot({ fullPage: true, clip: { x, y, width: 4, height: 4 } });
    png = PNG.sync.read(shot);
  } catch {
    /* A clip outside the page cannot be captured. Nothing sampled is better
       than a number invented. */
    return null;
  }

  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n += 1;
  }
  return n ? ([r / n, g / n, b / n] as [number, number, number]) : null;
}

/** The WCAG ratio again, in Node this time, for the sampled ground. */
function contrast(a: [number, number, number], b: [number, number, number]) {
  const lum = ([r, g, bl]: [number, number, number]) => {
    const c = [r, g, bl].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function asRgb(value: string): [number, number, number] {
  const m = value.match(/[\d.]+/g);
  return m ? ([Number(m[0]), Number(m[1]), Number(m[2])] as [number, number, number]) : [0, 0, 0];
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
        let boundary = b.boundary;
        if (b.groundFromRoot && boundary < 3) {
          /* Only where the walk failed, and only when it failed the check:
             a screenshot per button on every page would double the runtime of
             this spec to answer a question most buttons have already passed. */
          const sampled = await groundBehind(page, b.box);
          if (sampled) {
            boundary = Math.max(
              contrast(asRgb(b.fill), sampled),
              contrast(asRgb(b.ink), sampled),
            );
          }
        }
        if (boundary < 3) {
          failures.push(`${path} "${b.label}" ${b.fill} is ${boundary.toFixed(2)}:1 against what it sits on (needs 3)`);
        }
      }
    }

    expect(counted, "no buttons were found to check").toBeGreaterThan(10);
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

/**
 * THE PAIR, AND THAT THERE IS ONLY ONE PAIR.
 *
 * The homepage hero shows the site's two buttons: "Let's Talk" filled in the
 * ground's strong tone with the weak tone as its label, and "Explore our work"
 * filled the other way round. Everything else on the site is one of those two,
 * and this is the assertion that says so.
 *
 * WHY IT IS NOT COVERED BY THE CONTRAST TEST ABOVE. A navy button with white
 * type passes both contrast checks on white paper and is still wrong: it is a
 * third button, and three buttons is no system. This one asks a different
 * question -- are the two colours on this control the two the ground has
 * declared -- and it is the one that would have caught the orange onboarding
 * button, the navy-and-orange 404 pair and a hero written by hand.
 *
 * NAVY AND ORANGE ARE NOT ON TRIAL HERE. They carry the bands, the heroes, the
 * icon chips, the eyebrows, the rules and the accents in type, and nothing in
 * this file looks at any of those.
 */
for (const theme of ["light", "dark"]) {
  test(`every button is one of the two, in ${theme} mode`, async ({ page }) => {
    await page.route(/jotfor|userway/i, (route) => route.abort());
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
        localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
        sessionStorage.setItem("wdc:preloaded", "1");
      } catch { /* private mode */ }
    }, theme);

    const strays: string[] = [];
    let counted = 0;

    for (const path of publicPages) {
      for (const b of await auditButtons(page, path, theme)) {
        counted += 1;
        const [fill, ink] = b.tokens.map(normalise);
        const bg = normalise(b.fill);
        const label = normalise(b.ink);

        /* Primary: the ground's fill with its ink on top.
           Secondary: exactly the reverse. Anything else is a third button. */
        const primary = bg === fill && label === ink;
        const secondary = bg === ink && label === fill;
        if (!primary && !secondary) {
          strays.push(
            `${path} "${b.label}" is ${b.fill} on ${b.ink}, and this ground's pair is ${b.tokens.join(" / ")}`,
          );
        }
      }
    }

    expect(counted, "no buttons were found to check").toBeGreaterThan(20);
    expect(strays, strays.join("\n")).toEqual([]);
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
