/**
 * The preloader gallery's thumbnails (Settings > Website and SEO), captured
 * from the preloaders themselves.
 *
 * Each is /about?loader=<id> at 1280x800 in the light theme, with the clock
 * stopped and every animation held at the moment that says the most about it
 * (Ink: the hand drawing the C; Blueprint: the mark on its guide lines), then
 * written to public/preloader/thumbs/<id>.webp at the size the gallery shows
 * it. Re-run whenever a preloader changes how it looks.
 *
 *   npm run dev   (or a production build with `next start`)
 *   BASE_URL=http://localhost:3000 node scripts/capture-preloader-thumbs.mjs
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../public/preloader/thumbs");
const base = process.env.BASE_URL || "http://localhost:3000";
const AT = { ink: 1420, blueprint: 1240 };

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const [id, t] of Object.entries(AT)) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: "light" });
    await page.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch { /* private mode */ } });
    await page.clock.install();
    await page.goto(`${base}/about?loader=${id}`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.evaluate((ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }, t);
    /* The middle of the screen, where the mark is, at the gallery's 16:10 and its own size. */
    const png = await page.screenshot({ clip: { x: 400, y: 250, width: 480, height: 300 } });
    await sharp(png).resize(480, 300).webp({ quality: 82 }).toFile(path.join(out, `${id}.webp`));
    console.log("wrote", id);
    await page.close();
  }
} finally {
  await browser.close();
}
