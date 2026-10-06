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
