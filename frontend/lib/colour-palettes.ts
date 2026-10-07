/**
 * The colour flow's ready palettes, the eleven named chips and the plain name
 * for any hex.
 *
 * ONE RULE FOR THIS FILE: no imports. scripts/check-brand-colours.mjs loads it
 * straight under Node, which cannot resolve the extensionless imports the app
 * uses, so anything shared with lib/brand-colours.ts lives on that side and
 * the dependency points one way only.
 *
 * Each feeling card shows its FIRST palette as the illustration, so that
 * palette is the research table from plans/onboarding-ux-research.md section
 * D2. The other two are the studio's own, so "Show me another" has something
 * to show. The first colour of every palette is the main colour.
 */

export type PaletteColour = { name: string; hex: string };
export type Palette = [PaletteColour, PaletteColour, PaletteColour, PaletteColour];
export type Feeling = { id: string; name: string; line: string; palettes: [Palette, Palette, Palette] };

const c = (name: string, hex: string): PaletteColour => ({ name, hex });

export const FEELINGS: Feeling[] = [
  {
    id: "warm", name: "Warm and friendly", line: "Welcoming, like a good neighbour.",
    palettes: [
      [c("Sunset orange", "#E8741E"), c("Sand", "#F4E3C8"), c("Cocoa", "#5A3A27"), c("Cream", "#FFF8EC")],
      [c("Terracotta", "#C8553D"), c("Honey", "#F2A541"), c("Oat", "#F5EBDD"), c("Espresso", "#3B2418")],
      [c("Apricot", "#F9B872"), c("Rose clay", "#C76B5A"), c("Deep brown", "#4A2C2A"), c("Milk", "#FFFBF2")],
    ],
  },
  {
    id: "calm", name: "Calm and trusted", line: "Steady, clear, reliable.",
    palettes: [
      [c("Deep navy", "#14284B"), c("Sky blue", "#5B9BD5"), c("Mist", "#E6EEF7"), c("Slate", "#3E4C59")],
      [c("Ocean blue", "#1D5C8A"), c("Sea green", "#4FA3A5"), c("Pale sky", "#DCEBF5"), c("Charcoal", "#2E3440")],
      [c("Forest", "#2F5D50"), c("Sage", "#9CB8A4"), c("Stone", "#D9D4C7"), c("Midnight", "#1B2633")],
    ],
  },
  {
    id: "bold", name: "Bold and energetic", line: "Loud, quick, hard to miss.",
    palettes: [
      [c("Strong red", "#D62828"), c("Black", "#111111"), c("Sun yellow", "#F7B500"), c("White", "#FFFFFF")],
      [c("Royal blue", "#1F4FD8"), c("Sunny yellow", "#FFD23F"), c("Charcoal", "#222222"), c("Off white", "#F8F8F2")],
      [c("Magenta", "#C2185B"), c("Orange", "#F57C00"), c("Ink", "#1D1D1D"), c("White", "#FFFFFF")],
    ],
  },
  {
    id: "fresh", name: "Fresh and natural", line: "Clean, healthy, growing.",
    palettes: [
      [c("Leaf green", "#2E7D4F"), c("Lime", "#A7C957"), c("Cream", "#F6F1E1"), c("Bark", "#4A3B2A")],
      [c("Mint", "#9ED9B8"), c("Moss", "#5E7D3A"), c("Oat", "#F3EEDC"), c("Soil", "#3D2E22")],
      [c("Sprout", "#7CB342"), c("Pine", "#1B4D3E"), c("Sky mist", "#BFE3F0"), c("Stone", "#EFE9DC")],
    ],
  },
  {
    id: "premium", name: "Rich and premium", line: "Smart, polished, high end.",
    palettes: [
      [c("Black", "#0F0F0F"), c("Gold", "#C9A227"), c("Ivory", "#F7F1E3"), c("Wine", "#5E1A2B")],
      [c("Charcoal", "#1C1C1E"), c("Champagne", "#E9DCBB"), c("Emerald", "#0F5B4C"), c("Antique gold", "#A88A3D")],
      [c("Night blue", "#0B1321"), c("Silver", "#C9CED6"), c("Plum", "#4B1F3A"), c("Ivory", "#F7F1E3")],
    ],
  },
  {
    id: "playful", name: "Bright and playful", line: "Fun, young, full of life.",
    palettes: [
      [c("Hot pink", "#FF3E9A"), c("Purple", "#6F42C1"), c("Teal", "#1FB5A8"), c("Lemon", "#FFE066")],
      [c("Sunshine", "#FFC93C"), c("Sky", "#3EC1F3"), c("Coral", "#FF6B6B"), c("Deep plum", "#3D1A4F")],
      [c("Grape", "#7B2CBF"), c("Lime pop", "#B9E769"), c("Bubblegum", "#FFB3D9"), c("Ink", "#1D1D1D")],
    ],
  },
];

/** The eleven chips on the deeper path. One good standard shade each. */
export const CHIPS: PaletteColour[] = [
  c("Red", "#D62828"), c("Orange", "#F57C00"), c("Yellow", "#FFD93B"), c("Green", "#2E8B57"),
  c("Blue", "#1F5FBF"), c("Purple", "#6F42C1"), c("Pink", "#E83E8C"), c("Brown", "#7B4A2D"),
  c("Grey", "#808080"), c("Black", "#111111"), c("White", "#FFFFFF"),
];

/** About forty plain names, used only to name a hex. Never shown as a choice.
    The chips come first, so a chip's own hex always gives back the chip's name. */
export const NAMED_COLOURS: PaletteColour[] = [
  ...CHIPS,
  c("White", "#FFFFFF"), c("Off white", "#F4F2EC"), c("Cream", "#F6EFD9"), c("Ivory", "#F7F1E3"),
  c("Light grey", "#D0D0D0"), c("Silver", "#B8BEC6"), c("Grey", "#808080"), c("Slate", "#5C6B7A"),
  c("Charcoal", "#2E2E33"), c("Black", "#111111"), c("Beige", "#D9C7A7"), c("Sand", "#E8D3AA"),
  c("Tan", "#C49A6C"), c("Brown", "#7B4A2D"), c("Dark brown", "#4A2C1A"), c("Red", "#D62828"),
  c("Dark red", "#8E1B1B"), c("Wine", "#5E1A2B"), c("Coral", "#FF7F6E"), c("Peach", "#FFB38A"),
  c("Orange", "#F57C00"), c("Terracotta", "#C8553D"), c("Yellow", "#FFD93B"), c("Lemon", "#FFF07A"),
  c("Gold", "#C9A227"), c("Lime", "#A7C957"), c("Green", "#2E8B57"), c("Dark green", "#1E4D2B"),
  c("Olive", "#6B7A2B"), c("Mint", "#9ED9B8"), c("Teal", "#1FA49A"), c("Aqua", "#5FC4C0"),
  c("Sky blue", "#5B9BD5"), c("Blue", "#1F5FBF"), c("Navy", "#14284B"), c("Royal blue", "#1F4FD8"),
  c("Purple", "#6F42C1"), c("Plum", "#4B1F3A"), c("Lilac", "#C8A2E0"), c("Pink", "#F28CB1"),
  c("Hot pink", "#FF3E9A"), c("Magenta", "#C2185B"), c("Blush", "#F4C2C2"),
];

/* CIE Lab, so "nearest" means nearest to the eye and not nearest in RGB. A
   plain RGB distance calls a dull green grey and a dark blue black. */
function lab(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const lin = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const NAMED_LAB = NAMED_COLOURS.map((colour) => ({ name: colour.name, at: lab(colour.hex) }));

/** The plain name of the nearest named colour. Accepts a hex with or without
    the `#`, six or three digits. Anything that is not a hex gets "Colour". */
export function nameColour(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  const six = /^[0-9a-f]{3}$/i.test(clean) ? clean.split("").map((ch) => ch + ch).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(six)) return "Colour";
  const at = lab(`#${six.toUpperCase()}`);
  let best = NAMED_LAB[0];
  let bestGap = Infinity;
  for (const named of NAMED_LAB) {
    const gap = (named.at[0] - at[0]) ** 2 + (named.at[1] - at[1]) ** 2 + (named.at[2] - at[2]) ** 2;
    if (gap < bestGap) { bestGap = gap; best = named; }
  }
  return best.name;
}
