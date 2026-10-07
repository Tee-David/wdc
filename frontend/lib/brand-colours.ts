/** Readable string contract. The heading distinguishes new rows from untouched legacy prose. */
export const COLOUR_HEADING = "Colour preferences:";
export const COLOUR_ROLES = ["Not decided", "Main colour (primary)", "Supporting colour (secondary)", "Highlight (accent)", "Text", "Neutral / background"] as const;
export type ColourPreference = { name: string; hex: string; role: string };
export function shadeHex(hue: number, saturation: number, brightness: number): string {
  const s = saturation / 100, v = brightness / 100;
  const channel = (offset: number) => {
    const k = (offset + hue / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`.toUpperCase();
}
export function hexShade(value: string): [number, number, number] {
  const hex = normalizeHex(value);
  if (!hex) return [210, 50, 50];
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const high = Math.max(r, g, b), low = Math.min(r, g, b), gap = high - low;
  const hue = !gap ? 0 : 60 * (high === r ? ((g - b) / gap + 6) % 6 : high === g ? (b - r) / gap + 2 : (r - g) / gap + 4);
  return [Math.round(hue), Math.round(high ? gap / high * 100 : 0), Math.round(high * 100)];
}
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) return `#${hex.split("").map((letter) => letter + letter).join("").toUpperCase()}`;
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}
export function formatColours(rows: ColourPreference[]): string {
  const filled = rows.filter((row) => row.name.trim() || row.hex.trim());
  return filled.length ? `${COLOUR_HEADING}\n${filled.map((row) => `${row.name.trim() || "Colour"} | ${row.hex.trim() ? normalizeHex(row.hex) || row.hex.trim() : "No exact shade"} | ${row.role}`).join("\n")}` : "";
}
export function parseColours(value: string): ColourPreference[] | null {
  if (!value) return [];
  if (!value.startsWith(`${COLOUR_HEADING}\n`)) return null;
  const lines = value.slice(COLOUR_HEADING.length + 1).split("\n");
  return lines.map((line) => {
    const [name = "", hex = "", role = ""] = line.split(" | ");
    return { name, hex: hex === "No exact shade" ? "" : hex, role };
  });
}
export function colourProblem(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith(COLOUR_HEADING)) return null;
  const rows = parseColours(value);
  if (!rows || rows.length < 1 || rows.length > 5) return "Add up to five colour preferences.";
  if (value.slice(COLOUR_HEADING.length + 1).split("\n").some((line) => line.split(" | ").length !== 3)) return "Keep each colour on its own row.";
  for (const row of rows) {
    if (!row.name.trim() || row.name.length > 80 || /[|\r\n]/.test(row.name)) return "Give each colour a short name without line breaks or |.";
    if (row.hex && !normalizeHex(row.hex)) return "Use a three or six digit hex code, such as #336699, or leave it empty.";
    if (!(COLOUR_ROLES as readonly string[]).includes(row.role)) return "Choose one of the colour roles shown.";
  }
  return null;
}

/** The roles the colour flow writes. The lead colour is the main colour; the
    rest are `Not decided` until the studio sorts them (see suggestRoles). */
export const MAIN_COLOUR_ROLE = "Main colour (primary)";
export const OTHER_COLOUR_ROLE = "Not decided";

/** Red, green and blue from a hex, or null when it is not a colour. */
export function rgbOf(value: string): [number, number, number] | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminanceOf(value: string): number {
  const rgb = rgbOf(value);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* Chroma is the spread between the strongest and weakest channel, 0 to 1. It
   is used instead of HSL saturation because HSL calls a pale cream strongly
   saturated, and a cream is exactly the colour this has to call neutral. */
const chroma = (rgb: [number, number, number]) => (Math.max(...rgb) - Math.min(...rgb)) / 255;
const lightness = (rgb: [number, number, number]) => (Math.max(...rgb) + Math.min(...rgb)) / 510;
const gap = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export type ColourSuggestion = { name: string; hex: string; role: string };

/**
 * A suggested role for each colour, computed when it is read and never stored.
 *
 * The studio's sort, plan 6.2 item 7, in four rules and no more:
 * - The lead colour stays the main colour. The client chose it.
 * - A very dark or very light colour with almost no hue is text (dark) or
 *   neutral (light). These never compete for the lead.
 * - The next colour that is clearly different from the main colour is the
 *   supporting colour (secondary).
 * - The first strong, saturated colour left over is the highlight (accent).
 * Everything else stays `Not decided`. A colour without a valid hex is never
 * suggested for anything.
 */
export function suggestRoles(rows: { name: string; hex: string }[]): ColourSuggestion[] {
  const rgbs = rows.map((row) => rgbOf(row.hex));
  const roles = rows.map(() => OTHER_COLOUR_ROLE);
  if (rows.length) roles[0] = MAIN_COLOUR_ROLE;
  rgbs.forEach((rgb, index) => {
    if (index === 0 || !rgb || chroma(rgb) > 0.12) return;
    if (lightness(rgb) <= 0.2) roles[index] = "Text";
    else if (lightness(rgb) >= 0.9) roles[index] = "Neutral / background";
  });
  const lead = rgbs[0];
  const free = (index: number) => index > 0 && roles[index] === OTHER_COLOUR_ROLE && rgbs[index] !== null;
  if (lead) {
    const secondary = rgbs.findIndex((rgb, index) => free(index) && rgb !== null && gap(rgb, lead) >= 80);
    if (secondary > 0) roles[secondary] = "Supporting colour (secondary)";
  }
  const accent = rgbs.findIndex((rgb, index) => free(index) && rgb !== null && chroma(rgb) >= 0.3);
  if (accent > 0) roles[accent] = "Highlight (accent)";
  return rows.map((row, index) => ({ name: row.name, hex: normalizeHex(row.hex) ?? "", role: roles[index] }));
}
