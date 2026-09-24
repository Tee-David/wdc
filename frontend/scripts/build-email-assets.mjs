/**
 * THE PICTURES THE EMAILS CARRY, rebuilt from source.
 *
 *   node scripts/build-email-assets.mjs
 *
 * Mail cannot draw what the site draws. Gmail strips inline SVG and every
 * `@font-face`, so the stacked "We Dig / Creativity" lockup, the button's
 * arrow and the footer's social marks have to arrive as images. Each one is
 * rendered here from the same sources the site uses (the brand SVG, Space
 * Grotesk, lucide's arrow, simple-icons), so a change to any of those is one
 * run of this script rather than a picture of a logo that no longer exists.
 *
 * Rendered at 3x and displayed at 1x, for the phones that read most of our
 * mail. Written to public/email/, which lib/email-templates.ts references by
 * absolute URL.
 *
 * Needs a Chromium: WDC_E2E_CHROME, else Playwright's own.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import * as icons from "simple-icons";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, "public/email");
fs.mkdirSync(out, { recursive: true });

const font = fs.readFileSync(path.join(root, "assets/fonts/SpaceGrotesk-Bold.ttf")).toString("base64");
const mark = fs.readFileSync(path.join(root, "public/brand/icon-white.svg"), "utf8");

const WHITE = "#ffffff";
const ORANGE = "#ff6500";
/* Mid-grey on purpose: 3.4:1 on the white card, and still visible when a
   dark-mode client repaints the card near-black. */
const SOCIAL = "#8a8aa3";

/** The site header's lockup: the mark, then "We Dig / Creativity" stacked. */
function lockup(colour) {
  const svg = mark.replace(/#ffffff/gi, colour).replace(/<svg /, '<svg style="height:100%;width:auto;display:block" ');
  return `<div style="display:inline-flex;align-items:center;gap:10px;height:44px;padding:1px">
    <div style="height:44px">${svg}</div>
    <div style="font:700 21px/0.95 Grotesk;letter-spacing:-.01em;color:${colour}">We Dig<br>Creativity</div>
  </div>`;
}

/* lucide's arrow-right, the one on the site's buttons. */
const arrow = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${WHITE}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

const brand = (icon) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="${SOCIAL}" d="${icon.path}"/></svg>`;
/* LinkedIn is not in simple-icons (trademark); the site draws it as an "in"
   badge in lib/logos.ts, and so does this. */
const linkedin = `<div style="width:22px;height:22px;border-radius:4px;background:${SOCIAL};color:#fff;font:700 13px/22px Grotesk;text-align:center">in</div>`;

const assets = {
  "logo-white.png": lockup(WHITE),
  "logo-orange.png": lockup(ORANGE),
  "arrow-right-white.png": arrow,
  "social-x.png": brand(icons.siX),
  "social-instagram.png": brand(icons.siInstagram),
  "social-facebook.png": brand(icons.siFacebook),
  "social-tiktok.png": brand(icons.siTiktok),
  "social-youtube.png": brand(icons.siYoutube),
  "social-behance.png": brand(icons.siBehance),
  "social-whatsapp.png": brand(icons.siWhatsapp),
  "social-linkedin.png": linkedin,
};

const browser = await chromium.launch(process.env.WDC_E2E_CHROME ? { executablePath: process.env.WDC_E2E_CHROME } : {});
const page = await browser.newPage({ deviceScaleFactor: 3 });
for (const [name, html] of Object.entries(assets)) {
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: Grotesk; src: url(data:font/ttf;base64,${font}); }
    html, body { margin: 0; background: transparent; }
    #a { display: inline-block; }
    #a > svg { display: block; }
  </style><div id="a">${html}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#a").screenshot({ path: path.join(out, name), omitBackground: true });
  const box = await page.locator("#a").boundingBox();
  console.log(`${name}  ${Math.round(box.width)}x${Math.round(box.height)} (1x)`);
}
await browser.close();
