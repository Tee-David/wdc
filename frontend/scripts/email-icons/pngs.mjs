/**
 * THE STILL PICTURES THE EMAILS CARRY, rebuilt from source with sharp.
 *
 *   node scripts/email-icons/pngs.mjs
 *
 * Gmail strips inline SVG, so every mark in an email arrives as a PNG. Each
 * one is drawn here from the same sources the site uses, at 2x:
 *
 *   btn-<icon>-white.png / btn-<icon>-black.png  the icon in front of a button
 *     label (18 px). White sits on the black light-mode button; black on the
 *     white dark-mode button. Every shape in shapes.mjs gets both.
 *   hero-mark.png  the WDC mark, one navy step lighter than the hero band,
 *     cropped into the band's top right corner (150 x 96).
 *   logo-color.png / logo-white-accent.png  the brand lockup for the footer
 *     (light card) and the header and dark footer (navy ground), 148 x 47.
 *
 * Written to public/email/, which lib/email-templates.ts references by
 * absolute URL. The animated tile icons come from tiles.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ICON_SHAPES } from "./shapes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(root, "public/email");
const brand = (f) => fs.readFileSync(path.join(root, "public/brand", f), "utf8");
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const write = async (name, svg, w, h) => {
  await sharp(Buffer.from(svg), { density: 288 }).resize(w, h).png().toFile(path.join(out, name));
  console.log(name);
};

/* Button icons: one colour, 36 px (18 px at 2x). */
for (const [name, parts] of Object.entries(ICON_SHAPES)) {
  for (const [tone, colour] of [["white", "#ffffff"], ["black", "#0a0a0a"]]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</svg>`;
    await write(`btn-${name}-${tone}.png`, svg, 36, 36);
  }
}

/* The hero mark: the icon at 190 px wide, shifted so its top right is cut by
   the band's edge, inside a 150 x 96 box. Drawn at 2x. */
const icon = brand("icon-white.svg");
const [, , iw, ih] = icon.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const markW = 190, markH = Math.round((190 * ih) / iw);
const tone = inner(icon).replace(/fill="#ffffff"/gi, 'fill="#14148c"');
await write("hero-mark.png",
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="192" viewBox="0 0 150 96"><svg x="16" y="-46" width="${markW}" height="${markH}" viewBox="0 0 ${iw} ${ih}">${tone}</svg></svg>`,
  300, 192);

/* The lockups, straight from the brand files. */
for (const [file, name] of [["logo-color.svg", "logo-color.png"], ["logo-white-accent.svg", "logo-white-accent.png"]]) {
  await write(name, brand(file), 296, 94);
}
