/**
 * Renders the entry PDF's two pictures (lib/forms/entry-pdf.ts), both on a
 * transparent ground:
 * - assets/brand/watermark.png: the favicon (app/icon.svg) without its white
 *   disc, laid faintly under every page;
 * - assets/brand/pdf-logo.png: the full logo, white with its orange accent
 *   (public/brand/logo-white-accent.svg), for the navy band on page one.
 *
 *   node scripts/make-watermark.mjs
 *
 * Needs Playwright's Chromium (set CHROME to its path if it is elsewhere).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const svg = fs.readFileSync(path.join(here, "../app/icon.svg"), "utf8").replace(/<circle[^>]*fill="#ffffff"\/>/, "");
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", '<svg width="800" height="800" ')}</body></html>`);
await page.screenshot({ path: path.join(here, "../assets/brand/watermark.png"), omitBackground: true, clip: { x: 0, y: 0, width: 800, height: 800 } });

/* The logo is 2944 x 944; drawn at about 36pt tall, 1200px wide is plenty. */
const logo = fs.readFileSync(path.join(here, "../public/brand/logo-white-accent.svg"), "utf8");
const w = 1200, h = Math.round((1200 * 944) / 2944);
await page.setViewportSize({ width: w, height: h });
await page.setContent(`<html><body style="margin:0;background:transparent">${logo.replace("<svg ", `<svg width="${w}" height="${h}" `)}</body></html>`);
await page.screenshot({ path: path.join(here, "../assets/brand/pdf-logo.png"), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
await browser.close();
console.log("wrote assets/brand/watermark.png and assets/brand/pdf-logo.png");
