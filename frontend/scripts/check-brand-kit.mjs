/**
 * The pure half of the brand asset pack: turning a raw pixel buffer into a
 * palette. Decoding the upload and rendering the favicon set needs sharp and
 * is exercised by hand through the running dev server instead.
 *
 *   node --experimental-strip-types scripts/check-brand-kit.mjs
 */
import { dominantColors } from "../lib/color-quantize.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

/** Builds an RGBA buffer from a list of [r,g,b,a] pixels, so a test case
 *  reads as the picture it describes rather than as a wall of numbers. */
function rgba(pixels) {
  const buf = new Uint8Array(pixels.length * 4);
  pixels.forEach(([r, g, b, a = 255], i) => {
    buf.set([r, g, b, a], i * 4);
  });
  return buf;
}

console.log("-- picking the dominant colours --");

const solidOrange = rgba(Array.from({ length: 100 }, () => [255, 101, 0, 255]));
const one = dominantColors(solidOrange, 4);
report("a solid-colour image returns exactly one swatch", one.length === 1);
report("the swatch is the exact colour", one[0].r === 255 && one[0].g === 101 && one[0].b === 0);
report("a single swatch has the full share", Math.abs(one[0].share - 1) < 1e-9);

const twoColors = rgba([
  ...Array.from({ length: 70 }, () => [0, 0, 0, 255]),
  ...Array.from({ length: 30 }, () => [255, 255, 255, 255]),
]);
const two = dominantColors(twoColors, 4);
report("two flat colours return two swatches", two.length === 2);
report("the more common colour sorts first", two[0].count > two[1].count);
report("shares add up to one", Math.abs(two.reduce((s, c) => s + c.share, 0) - 1) < 1e-9);

const transparent = rgba([
  ...Array.from({ length: 50 }, () => [10, 10, 10, 0]),
  ...Array.from({ length: 50 }, () => [255, 101, 0, 255]),
]);
const opaqueOnly = dominantColors(transparent, 4);
report("fully transparent pixels are not counted as a colour", opaqueOnly.length === 1);
report("the opaque colour is the one reported", opaqueOnly[0].r === 255 && opaqueOnly[0].b === 0);

const noisy = rgba(Array.from({ length: 200 }, (_, i) => [
  250 + (i % 5), 100 + (i % 5), (i % 5), 255,
]));
const limited = dominantColors(noisy, 4, 3);
report("the result never exceeds the requested limit", limited.length <= 3);

const allTransparent = rgba(Array.from({ length: 20 }, () => [0, 0, 0, 0]));
report("a fully transparent image returns no colours", dominantColors(allTransparent, 4).length === 0);

report("an empty buffer returns no colours", dominantColors(new Uint8Array(0), 4).length === 0);

const rgbOnly = new Uint8Array([255, 101, 0, 255, 101, 0]);
report("a 3-channel buffer with no alpha is read as fully opaque", dominantColors(rgbOnly, 3).length === 1);

console.log(failures === 0 ? "\nAll brand-kit checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
