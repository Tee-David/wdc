/**
 * Full-page captures of every live project, for the preview modal's blocked
 * state.
 *
 * Most client sites refuse to be framed (see `frame-ancestors` in the README
 * note beside this file), and when a frame is refused the modal falls back to a
 * capture. A one-screen cover makes that fallback look like a header; a
 * full-page capture makes it a readable preview of the whole site.
 *
 *   node scripts/capture-projects.mjs
 *
 * Needs outbound network and a Playwright browser, so it is a LOCAL/CI script,
 * never part of the build. Output lands in public/work/long/ using the same
 * filenames `lib/projects.ts` points at.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { PROJECTS } from "../lib/projects.ts";

const OUT = "public/work/long";
/* 1440 is the width the desktop layout is designed against; deviceScaleFactor 2
   keeps text crisp when the capture is scaled down into the modal. */
const WIDTH = 1440;

const slug = (url) => new URL(url).host.replace(/^www\./, "").split(".")[0];

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const p of PROJECTS) {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1000 },
    deviceScaleFactor: 2,
  });
  try {
    await page.goto(p.url, { waitUntil: "networkidle", timeout: 60_000 });
    /* Scroll the whole page first: lazy-loaded images and reveal-on-scroll
       sections are blank in a full-page capture otherwise, which is exactly the
       half-painted look these captures exist to avoid. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const file = `${OUT}/${slug(p.url)}-full.jpg`;
    await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 82 });
    console.log(`captured ${p.name} -> ${file}`);
  } catch (err) {
    /* One unreachable site must not lose the other six. */
    console.error(`FAILED ${p.name}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log("\nAdd each file to its project as `long:` in lib/projects.ts.");
