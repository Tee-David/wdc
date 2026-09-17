import "server-only";

import sharp from "sharp";
import { dominantColors, type Swatch } from "./color-quantize";
import { contrastRatio, formatRatio, toHex, verdicts } from "./contrast";

/**
 * The brand asset pack at /tools/brand-kit: an uploaded logo in, a palette,
 * a WCAG contrast grid and a favicon set out.
 *
 * CLASS A, and cheaper than most of this section: `sharp` is already a
 * dependency of `next/image`'s own optimizer, so this is not a new library,
 * just a first-party use of one already in the tree. Everything runs in one
 * serverless invocation with no network call and nothing to meter.
 *
 * NOTHING IS STORED. The upload is decoded, measured and resized entirely in
 * memory for the length of one request; no file lands in R2 or anywhere
 * else, because a marketing tool a stranger uses once is not a place to keep
 * their logo. `lib/r2.ts` stays for what it already does: onboarding and
 * admin uploads, which are ours to keep.
 *
 * THE PALETTE IS READ, NOT DESIGNED. It reports the colours that are
 * actually in the file, in the order they actually appear most, including a
 * white or black background if the upload has a flat one -- the honest
 * answer to "what colours does this image use", not a stylist's edit of it.
 */

export const FAVICON_SIZES = [
  { size: 16, label: "Browser tab" },
  { size: 32, label: "Browser tab, retina" },
  { size: 48, label: "Windows shortcut" },
  { size: 180, label: "Apple touch icon" },
  { size: 192, label: "Android home screen" },
  { size: 512, label: "PWA splash & store listing" },
] as const;

/** Comfortably more than a logo needs, and read from the upload's own
 *  header, not decoded at full size first. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp", "gif", "svg", "avif"]);

export type BrandKitFailure = "too-large" | "bad-image" | "too-big" | "unsupported-format";

export type ContrastRow = {
  hex: string;
  onWhite: { ratio: number; formatted: string; passesAA: boolean };
  onBlack: { ratio: number; formatted: string; passesAA: boolean };
};

export type BrandKitResult = {
  source: { width: number; height: number; format: string };
  palette: (Swatch & { hex: string })[];
  contrast: ContrastRow[];
  favicons: { size: number; label: string; dataUrl: string }[];
};

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

function contrastRow(swatch: Swatch): ContrastRow {
  const rgb: [number, number, number] = [swatch.r, swatch.g, swatch.b];
  const onWhite = contrastRatio(rgb, WHITE);
  const onBlack = contrastRatio(rgb, BLACK);
  /* AA, normal text -- the first and strictest of the everyday thresholds --
     is what the headline pass/fail reads off; the full six-row breakdown a
     reader might want is one visit to /tools/contrast away. */
  return {
    hex: toHex(rgb),
    onWhite: { ratio: onWhite, formatted: formatRatio(onWhite), passesAA: verdicts(onWhite)[0].pass },
    onBlack: { ratio: onBlack, formatted: formatRatio(onBlack), passesAA: verdicts(onBlack)[0].pass },
  };
}

export async function buildBrandKit(
  buffer: Buffer,
): Promise<{ ok: true; result: BrandKitResult } | { ok: false; reason: BrandKitFailure }> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return { ok: false, reason: "bad-image" };
  }

  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) return { ok: false, reason: "unsupported-format" };
  if (!meta.width || !meta.height) return { ok: false, reason: "bad-image" };
  if (meta.width * meta.height > MAX_PIXELS) return { ok: false, reason: "too-big" };

  let palette: Swatch[];
  let favicons: BrandKitResult["favicons"];
  try {
    const { data, info } = await sharp(buffer)
      .resize(96, 96, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    palette = dominantColors(data, info.channels, 6);

    favicons = await Promise.all(
      FAVICON_SIZES.map(async ({ size, label }) => {
        const png = await sharp(buffer)
          .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        return { size, label, dataUrl: `data:image/png;base64,${png.toString("base64")}` };
      }),
    );
  } catch {
    return { ok: false, reason: "bad-image" };
  }

  if (palette.length === 0) return { ok: false, reason: "bad-image" };

  return {
    ok: true,
    result: {
      source: { width: meta.width, height: meta.height, format: meta.format },
      palette: palette.map((s) => ({ ...s, hex: toHex([s.r, s.g, s.b]) })),
      contrast: palette.map(contrastRow),
      favicons,
    },
  };
}
