/**
 * The font screen's ready pairings and the list a client searches when they
 * know their own fonts. No imports, like lib/colour-palettes.ts.
 *
 * HOW THE PAIRINGS WERE CHOSEN (the usual rules from type guides): one face
 * does the headlines and one does the reading; they differ clearly in role
 * and weight but share something (a family, an era, proportions); the body
 * face is quiet and legible at small sizes; and nothing here asks for a third
 * family. Several pairs are two cuts of one family system on purpose (DM
 * Serif Display with DM Sans, Archivo Black with Archivo), because those match
 * their x-heights by design. Every family is on Google Fonts.
 *
 * `hw` is the heading weight to load: several display faces exist only in
 * Regular, and asking Google for a weight a family lacks fails the request.
 */
export type FontPairing = { id: string; title: string; line: string; heading: string; body: string; hw: number };

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "classic", title: "Elegant and classic", line: "Refined headlines over an easy, neutral body.", heading: "Playfair Display", body: "Source Sans 3", hw: 700 },
  { id: "warm-serif", title: "Warm and refined", line: "A friendly display serif with its own matching sans.", heading: "DM Serif Display", body: "DM Sans", hw: 400 },
  { id: "editorial", title: "Friendly editorial", line: "A soft serif and a clean sans, easy on long reads.", heading: "Lora", body: "Inter", hw: 700 },
  { id: "modern-serif", title: "Modern with a sturdy serif", line: "Geometric headlines, a solid serif for reading.", heading: "Montserrat", body: "Merriweather", hw: 700 },
  { id: "bright", title: "Bright and easy", line: "Round, upbeat headlines with a gentle serif.", heading: "Poppins", body: "Lora", hw: 600 },
  { id: "light-clean", title: "Light and clean", line: "Slim, airy headlines and a plain, friendly body.", heading: "Raleway", body: "Lato", hw: 700 },
  { id: "strong", title: "Strong and direct", line: "Tall condensed headlines, a very readable body.", heading: "Oswald", body: "Open Sans", hw: 600 },
  { id: "fashion", title: "Loud and fashionable", line: "A heavy display face with a modern geometric body.", heading: "Abril Fatface", body: "Poppins", hw: 400 },
  { id: "tech", title: "Sharp and techy", line: "Quirky, precise headlines, a neutral screen body.", heading: "Space Grotesk", body: "Inter", hw: 700 },
  { id: "soft-character", title: "Soft and characterful", line: "A wonky, warm serif with a calm sans.", heading: "Fraunces", body: "Work Sans", hw: 700 },
  { id: "luxe", title: "Luxe and airy", line: "Graceful, high-contrast headlines, a clear sans.", heading: "Cormorant Garamond", body: "Montserrat", hw: 700 },
  { id: "sporty", title: "Bold and sporty", line: "Big, blunt capitals over a friendly body.", heading: "Bebas Neue", body: "Lato", hw: 400 },
  { id: "trusted", title: "Trusted and warm", line: "A classic book serif with a rounded, kind sans.", heading: "Libre Baskerville", body: "Nunito", hw: 700 },
  { id: "quiet-style", title: "Quiet and stylish", line: "Geometric, art-deco headlines and a gentle serif.", heading: "Josefin Sans", body: "Crimson Text", hw: 700 },
  { id: "creative", title: "Creative studio", line: "Expressive headlines with a modern, open body.", heading: "Syne", body: "Manrope", hw: 700 },
  { id: "honest", title: "Sturdy and honest", line: "A slab serif that feels dependable, plain body.", heading: "Bitter", body: "Open Sans", hw: 700 },
  { id: "heavy-tidy", title: "Heavy and tidy", line: "One family, two cuts: a black headline and its text twin.", heading: "Archivo Black", body: "Archivo", hw: 400 },
  { id: "round-young", title: "Round and young", line: "Soft, rounded shapes all the way through.", heading: "Quicksand", body: "Nunito", hw: 700 },
];

/** Popular Google Fonts, for the "I know my fonts" search. Names are exactly as Google lists them. */
export const GOOGLE_FONTS: string[] = [
  "ABeeZee", "Abril Fatface", "Alegreya", "Alegreya Sans", "Anton", "Archivo", "Archivo Black", "Arimo", "Asap", "Barlow", "Barlow Condensed", "Bebas Neue",
  "Bitter", "Cabin", "Cairo", "Cinzel", "Comfortaa", "Cormorant Garamond", "Crimson Pro", "Crimson Text", "DM Sans", "DM Serif Display", "DM Serif Text",
  "Dancing Script", "EB Garamond", "Exo 2", "Figtree", "Fira Sans", "Fjalla One", "Fraunces", "Great Vibes", "Heebo", "Hind", "IBM Plex Mono", "IBM Plex Sans",
  "IBM Plex Serif", "Inconsolata", "Indie Flower", "Inter", "Josefin Sans", "Jost", "Kanit", "Karla", "Lato", "League Spartan", "Lexend", "Libre Baskerville",
  "Libre Franklin", "Lilita One", "Lobster", "Lora", "Manrope", "Merriweather", "Merriweather Sans", "Montserrat", "Mukta", "Mulish", "Noto Sans", "Noto Serif",
  "Nunito", "Nunito Sans", "Open Sans", "Oswald", "Outfit", "Overpass", "Oxygen", "Pacifico", "Playfair Display", "Plus Jakarta Sans", "Poppins", "PT Sans",
  "PT Serif", "Public Sans", "Quicksand", "Raleway", "Red Hat Display", "Roboto", "Roboto Condensed", "Roboto Mono", "Roboto Slab", "Rubik", "Sora",
  "Source Code Pro", "Source Sans 3", "Source Serif 4", "Space Grotesk", "Space Mono", "Spectral", "Syne", "Teko", "Titillium Web", "Ubuntu", "Urbanist",
  "Vollkorn", "Work Sans", "Yanone Kaffeesatz", "Zilla Slab",
];

/**
 * The Google Fonts stylesheet for some families. Each family is listed once,
 * with the union of the weights asked for (a family asked for only Regular is
 * left plain, which every family supports).
 */
export function fontsHref(families: { name: string; weight?: number }[]) {
  const weights = new Map<string, Set<number>>();
  for (const f of families) {
    if (!f.name) continue;
    const set = weights.get(f.name) ?? new Set<number>([400]);
    if (f.weight) set.add(f.weight);
    weights.set(f.name, set);
  }
  const parts = [...weights].map(([name, set]) => {
    const list = [...set].sort((x, y) => x - y);
    return `family=${encodeURIComponent(name).replace(/%20/g, "+")}${list.length > 1 ? `:wght@${list.join(";")}` : ""}`;
  });
  return parts.length ? `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap` : "";
}
