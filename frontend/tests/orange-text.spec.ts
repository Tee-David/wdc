import { expect, test, type Page } from "@playwright/test";

/**
 * ORANGE AS TEXT IS LEGIBLE WHEREVER IT SITS, in both themes.
 *
 * The site has three oranges and each has one job (AGENTS.md): `#ff6500` is a
 * mark with no words on it, `#b84a00` is a fill that carries white words, and
 * orange TYPE is `--accent-ink` on paper or the bright orange on a dark band.
 * A rule that says `color: var(--accent)` is right in one theme and wrong in
 * the other, because `--accent` is `#ff6500` in light and `#b84a00` in dark;
 * that is how the hero eyebrows ended up at 3.60:1.
 *
 * This walks the public pages, finds every text node drawn in an orange, and
 * measures it against the first opaque ground behind it: 4.5:1, or 3:1 for
 * large type (24px, or 18.66px bold). Text over a picture is skipped, since
 * the DOM cannot say what is behind it.
 */

const PAGES = [
  "/", "/services", "/services/web", "/contact", "/work", "/about", "/blog",
  "/tools", "/tools/ai-cost", "/tools/business-name",
  "/legal/privacy", "/this-page-does-not-exist",
];

type Hit = { text: string; fg: string; bg: string; ratio: number; large: boolean; where: string };

async function sweep(page: Page): Promise<Hit[]> {
  return page.evaluate(() => {
    const rgb = (s: string) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /* Orange: red high, blue low, green between. Covers #ff6500, #b84a00,
       #c95000, #b64800 and the hovers near them, and nothing navy or grey. */
    const isOrange = (c: { r: number; g: number; b: number }) => c.r > 150 && c.b < 60 && c.g > 40 && c.g < 140;
    const out: Hit[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (el.closest("[aria-hidden='true'], .sr-only, .ad__sr, svg")) continue;
      const fg = rgb(cs.color);
      if (!fg || fg.a < 1 || !isOrange(fg)) continue;
      /* The first opaque ground behind it. */
      let bg: { r: number; g: number; b: number; a: number } | null = null;
      let picture = false;
      for (let p: Element | null = el; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.backgroundImage && ps.backgroundImage !== "none" && !ps.backgroundImage.startsWith("linear-gradient")) { picture = true; break; }
        const c = rgb(ps.backgroundColor);
        if (c && c.a >= 1) { bg = c; break; }
      }
      if (picture) continue;
      bg ??= rgb(getComputedStyle(document.documentElement).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      out.push({
        text: n.textContent.trim().slice(0, 40),
        fg: cs.color, bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        ratio: (hi + 0.05) / (lo + 0.05),
        large: size >= 24 || (bold && size >= 18.66),
        where: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
      });
    }
    return out;
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`orange type is legible on every public page in ${theme} mode`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.route(/jotfor|userway/i, (route) => route.abort());
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
        localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
        sessionStorage.setItem("wdc:preloaded", "1");
      } catch { /* private mode */ }
    }, theme);
    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      /* Everything scrolled past once, so reveal-on-scroll text has its real colour. */
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);
      for (const h of await sweep(page)) {
        const need = h.large ? 3 : 4.5;
        if (h.ratio < need) failures.push(`${path} ${h.where} "${h.text}" ${h.fg} on ${h.bg} = ${h.ratio.toFixed(2)}:1 (needs ${need})`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
