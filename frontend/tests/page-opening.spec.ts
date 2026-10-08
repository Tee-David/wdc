import { expect, test, type Page } from "@playwright/test";

/**
 * "Every landing page opens the same way."
 *
 * The band carrying the eyebrow, the h1 and the lede is the one piece of page
 * shape this site shares across route families, and it is also the one that
 * has silently gone missing three times.
 *
 * The failure is always the same shape and never looks like a CSS bug. These
 * pages run `<Header overHero />`, which is white type on no background, and
 * it is only correct while a dark band sits under it. Lose the band -- by
 * dropping a hero, or by adding a route that never imported the stylesheet the
 * band's rules lived in -- and the page renders white, the logo turns white on
 * white, and the hamburger becomes three white bars on nothing. Nothing errors
 * and nothing looks broken in the source.
 *
 * So this pins the band itself: it is there, it is opaque, it clears the fixed
 * header, and everything written on it is legible against it.
 */

const OPENERS = ["/work", "/services", "/blog", "/contact", "/policies"];

/* WCAG 2.1 contrast, from the computed colours rather than from pixels: these
   are flat brand surfaces, so the composite is exact and there is no need to
   screenshot anything. */
const audit = (page: Page) =>
  page.evaluate(() => {
    const hero = document.querySelector(".wk-hero");
    const missing = {
      band: null as string | null,
      bandOpaque: false,
      clearsHeader: false,
      eyebrow: null as number | null,
      h1: null as number | null,
      lede: null as number | null,
    };
    if (!hero) return missing;
    const header = document.querySelector("header");
    const h1 = hero.querySelector("h1");
    const rgb = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const alpha = (c: string) => { const m = c.match(/[\d.]+/g)!; return m.length > 3 ? Number(m[3]) : 1; };
    const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const band = getComputedStyle(hero).backgroundColor;
    const against = (sel: string): number | null => {
      const el = hero.querySelector(sel);
      if (!el) return null;
      const [a, b] = [lum(rgb(band)), lum(rgb(getComputedStyle(el).color))].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    };
    return {
      band,
      bandOpaque: alpha(band) === 1,
      clearsHeader:
        !!h1 && !!header &&
        h1.getBoundingClientRect().top > header.getBoundingClientRect().bottom,
      eyebrow: against(".pv-eyebrow"),
      h1: against("h1"),
      lede: against(".pv-lede"),
    };
  });

for (const theme of ["light", "dark"] as const) {
  for (const [label, viewport] of [
    ["a phone", { width: 390, height: 900 }],
    ["a desktop", { width: 1280, height: 900 }],
  ] as const) {
    test.describe(`${theme} on ${label}`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await page.route(/jotfor|userway/i, (route) => route.abort());
        await page.addInitScript((t) => {
          try {
            localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
            localStorage.setItem("theme", t);
            sessionStorage.setItem("wdc:preloaded", "1");
          } catch {}
        }, theme);
      });

      for (const path of OPENERS) {
        test(`${path} opens with a legible band`, async ({ page }) => {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(600);
          const r = await audit(page);

          expect(r.band, `${path} has no .wk-hero band`).not.toBeNull();
          /* Transparent is what it computes to when the band's own rules are
             not on the page at all -- which is exactly the bug. */
          expect(r.bandOpaque, `${path} band is transparent`).toBe(true);
          expect(r.clearsHeader, `${path} h1 sits under the fixed header`).toBe(true);

          for (const [what, ratio] of [
            ["eyebrow", r.eyebrow],
            ["h1", r.h1],
            ["lede", r.lede],
          ] as const) {
            if (ratio === null) continue;
            expect(ratio, `${path} ${what} is ${ratio.toFixed(2)}:1 on the band`).toBeGreaterThanOrEqual(4.5);
          }
        });
      }
    });
  }
}
