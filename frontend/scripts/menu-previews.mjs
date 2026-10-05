// The desktop menu's film-strip frames: a real picture of each page it links to.
//
// WHY A SCRIPT. The frames are screenshots of this site, so they go stale the
// day a page changes. Re-run this whenever one of the six pages is redesigned:
//
//   npm run build && npm run start      # in one terminal, or `npm run dev`
//   BASE=http://localhost:3000 node scripts/menu-previews.mjs
//
// Writes frontend/public/menu/preview-<key>.jpg, 960x600 (a 1280x800 window at
// 0.75 scale), light theme, intro skipped, the film's still rather than the
// film. The keys match `FILM_PAGES` in components/layout/header.tsx.
//
// WDC_E2E_CHROME points at a Chromium binary when the bundled one is not
// installed (the same variable tests/ use).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "menu");
const PAGES = [
  ["home", "/"],
  ["work", "/work"],
  ["services", "/services"],
  ["blog", "/blog"],
  ["about", "/about"],
  ["contact", "/contact"],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.WDC_E2E_CHROME ? { executablePath: process.env.WDC_E2E_CHROME } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75 });
await context.addInitScript(() => {
  try {
    localStorage.setItem("wdc-intro-seen-at", String(Date.now()));
    localStorage.setItem("theme", "light");
  } catch {
    /* private mode: the intro may play; the picture is then of the intro */
  }
});
await context.route(/\.mp4(\?|$)/, (route) => route.abort()); // the poster, not a frame of the film

for (const [key, path] of PAGES) {
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // the dev-mode badge
  await page.waitForTimeout(2600); // the entrance animations
  await page.screenshot({ path: join(OUT, `preview-${key}.jpg`), type: "jpeg", quality: 80 });
  console.log("wrote", `public/menu/preview-${key}.jpg`);
  await page.close();
}
await browser.close();
