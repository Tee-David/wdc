/**
 * The maintenance gallery's thumbnails, captured from the templates themselves.
 *
 * Each one is the admin preview route (/api/maintenance/preview) drawn at
 * 1280x800 a few seconds in, with the preview bar hidden, then written to
 * public/maintenance/thumbs/<id>.webp at the size the gallery shows it. Re-run
 * whenever a template changes how it looks, or the thumbnails become pictures
 * of pages that no longer exist.
 *
 * Needs a running dev server with a capture token (never production: the
 * token is refused there):
 *
 *   BONEYARD_CAPTURE_TOKEN=local npm run dev
 *   BASE_URL=http://localhost:3000 BONEYARD_CAPTURE_TOKEN=local node scripts/capture-maintenance-thumbs.mjs
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../public/maintenance/thumbs");
const base = process.env.BASE_URL || "http://localhost:3000";
const token = process.env.BONEYARD_CAPTURE_TOKEN;
if (!token) { console.error("Set BONEYARD_CAPTURE_TOKEN (the same one the dev server was started with)."); process.exit(1); }

/* How long each scene gets before its picture is taken: long enough to be in its stride. */
const WAIT = { "02": 5200, "03": 5600, "07": 16000, "09": 5500 };
const IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const id of IDS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, extraHTTPHeaders: { "x-boneyard-capture": token } });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style"); s.textContent = ".wdc-pv{display:none!important}"; document.head.appendChild(s);
      });
    });
    const res = await page.goto(`${base}/api/maintenance/preview?template=${id}`, { waitUntil: "load" });
    if (!res || res.status() !== 200) throw new Error(`Template ${id}: the preview answered ${res?.status()}. Is the capture token right?`);
    await page.waitForTimeout(WAIT[id] ?? 4500);
    const png = await page.screenshot();
    await sharp(png).resize(480, 300).webp({ quality: 80 }).toFile(path.join(out, `${id}.webp`));
    console.log(`${id}.webp`);
    await page.close();
  }
} finally {
  await browser.close();
}
