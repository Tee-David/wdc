/**
 * A small, honest palette out of a raw RGBA buffer, for the brand asset pack
 * at /tools/brand-kit.
 *
 * WHY NOT A LIBRARY. Pulling a handful of representative colours out of a
 * few thousand pixels is bucket counting, not clustering: round each channel
 * to a coarse step, count how often each rounded triple appears, and average
 * the real pixels that landed in the most popular buckets. A dependency
 * built for photographic quality reduction (median-cut, k-means, octrees) is
 * solving a harder problem than a logo -- usually a handful of flat colours
 * already -- has.
 *
 * PURE: a flat pixel buffer in, colours out. `scripts/check-brand-kit.mjs`
 * builds buffers by hand rather than decoding an image, so it runs without
 * sharp, a browser or a network. Decoding the upload and rendering the
 * favicon set is `lib/brand-kit.ts`, because that half needs sharp.
 */

export type Swatch = {
  r: number;
  g: number;
  b: number;
  /** How many sampled pixels landed in this colour's bucket. */
  count: number;
  /** `count` as a fraction of every opaque pixel sampled. */
  share: number;
};

/** Bucket width per channel. 24 gives roughly ten buckets a side, coarse
 *  enough that anti-aliased edges collapse into the flat colour they are
 *  aliasing rather than each earning their own bucket. */
const STEP = 24;

/** A pixel this transparent is background showing through, not a colour the
 *  logo is using. */
const ALPHA_FLOOR = 32;

export function dominantColors(
  pixels: Uint8Array | Uint8ClampedArray,
  channels: number,
  limit = 6,
): Swatch[] {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  let total = 0;

  for (let i = 0; i + channels <= pixels.length; i += channels) {
    const a = channels >= 4 ? pixels[i + 3] : 255;
    if (a < ALPHA_FLOOR) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = `${Math.round(r / STEP)}:${Math.round(g / STEP)}:${Math.round(b / STEP)}`;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r; bucket.g += g; bucket.b += b; bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
    total += 1;
  }

  if (total === 0) return [];

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
      share: bucket.count / total,
    }));
}
