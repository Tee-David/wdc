/**
 * WCAG contrast, for two colours somebody is about to put together.
 *
 * WHY THIS IS ITS OWN TOOL. The brand asset pack this was meant to be the
 * cheap subset of is not built yet, and a reader asking "can I put this grey
 * on that navy" should not wait on it. The two things WCAG actually asks --
 * a ratio, and which of six thresholds it clears -- are a page of arithmetic,
 * not a feature.
 *
 * PURE, CLASS A, no network and no key: parsing a colour string and applying
 * the published relative-luminance formula. `scripts/check-contrast.mjs`
 * calls this directly, which is why nothing here is server-only.
 */

export type Rgb = [number, number, number];

/**
 * Reads a hex or `rgb()`/`rgba()` string. Returns null for anything else,
 * because a half-typed colour is not this function's problem to guess at --
 * the caller decides what an invalid colour means for the page.
 */
export function parseColor(raw: string): Rgb | null {
  const value = raw.trim();

  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map((n) => Math.round(Number(n)));
    if ([r, g, b].every((n) => n >= 0 && n <= 255)) return [r, g, b];
  }

  return null;
}

/** `#rrggbb`, for feeding back into a colour input or printing beside a swatch. */
export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * WCAG 2.x relative luminance (§1.4.3), the input every contrast figure on
 * the web is built from. The gamma step is exact, not approximated: values
 * at or below 0.03928 take the linear branch and everything else takes the
 * power curve, per the published formula.
 */
export function relativeLuminance([r, g, b]: Rgb): number {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** `(L1 + 0.05) / (L2 + 0.05)`, lighter over darker, so the ratio is never
    below 1 regardless of which colour the caller passes first. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export type Threshold = {
  key: string;
  /** The WCAG success criterion this reads as, in the client's own words. */
  label: string;
  /** What "large text" means for this row: 18pt (24px), or 14pt (18.66px) bold. */
  scope: string;
  minRatio: number;
};

/**
 * SIX ROWS, NOT ONE PASS/FAIL. A ratio that clears AA for large text and
 * misses it for body copy is a real, common outcome -- a headline in a pale
 * tint often works where a paragraph in the same tint does not -- and
 * collapsing that into one verdict would tell the reader to throw away a
 * pairing that is fine for half of what they wanted it for.
 */
export const THRESHOLDS: Threshold[] = [
  { key: "aa-normal", label: "AA, normal text", scope: "Under 18pt (24px), or under 14pt (18.66px) bold", minRatio: 4.5 },
  { key: "aa-large", label: "AA, large text", scope: "18pt (24px) and up, or 14pt (18.66px) bold and up", minRatio: 3 },
  { key: "aaa-normal", label: "AAA, normal text", scope: "Under 18pt (24px), or under 14pt (18.66px) bold", minRatio: 7 },
  { key: "aaa-large", label: "AAA, large text", scope: "18pt (24px) and up, or 14pt (18.66px) bold and up", minRatio: 4.5 },
  { key: "aa-ui", label: "AA, UI components & graphics", scope: "Icons, borders and the parts of a control that carry meaning", minRatio: 3 },
];

export function verdicts(ratio: number): Array<Threshold & { pass: boolean }> {
  return THRESHOLDS.map((t) => ({ ...t, pass: ratio >= t.minRatio }));
}

/** Rounded to two places, which is as much precision as a colour typed by
    hand ever earns -- a ratio of 4.503 read as "passes AA" off a hex code
    nobody measured to the third decimal is false confidence either way. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
