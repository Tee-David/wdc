/**
 * Renders the PDF watermark (assets/brand/watermark.png) from the favicon
 * (app/icon.svg) without its white disc, on a transparent ground, so
 * lib/forms/entry-pdf.ts can lay it faintly under every page.
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
await browser.close();
console.log("wrote assets/brand/watermark.png");
