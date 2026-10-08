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

/**
 * ONE HUNDRED PAIRINGS, AS PLAIN ROWS. [headline font, reading font, headline
 * weight, title]. Rows are tiny on purpose: nothing here is loaded until a
 * pairing is on screen, and then only those two families, cut down to the
 * letters the preview uses (see fontsHref), so a shuffle costs a few kilobytes
 * and never the whole list.
 */
const ROWS: [string, string, number, string][] = [
  ["Playfair Display", "Source Sans 3", 700, "Elegant and classic"], ["DM Serif Display", "DM Sans", 400, "Warm and refined"],
  ["Lora", "Inter", 700, "Friendly editorial"], ["Montserrat", "Merriweather", 700, "Modern with a sturdy serif"],
  ["Poppins", "Lora", 600, "Bright and easy"], ["Raleway", "Lato", 700, "Light and clean"],
  ["Oswald", "Open Sans", 600, "Strong and direct"], ["Abril Fatface", "Poppins", 400, "Loud and fashionable"],
  ["Space Grotesk", "Inter", 700, "Sharp and techy"], ["Fraunces", "Work Sans", 700, "Soft and characterful"],
  ["Cormorant Garamond", "Montserrat", 700, "Luxe and airy"], ["Bebas Neue", "Lato", 400, "Bold and sporty"],
  ["Libre Baskerville", "Nunito", 700, "Trusted and warm"], ["Josefin Sans", "Crimson Text", 700, "Quiet and stylish"],
  ["Syne", "Manrope", 700, "Creative studio"], ["Bitter", "Open Sans", 700, "Sturdy and honest"],
  ["Archivo Black", "Archivo", 400, "Heavy and tidy"], ["Quicksand", "Nunito", 700, "Round and young"],
  ["Playfair Display", "Montserrat", 700, "Boutique and bright"], ["Merriweather", "Open Sans", 700, "Newsroom calm"],
  ["Lora", "Montserrat", 700, "Gentle and modern"], ["Cormorant Garamond", "Lato", 700, "Wedding stationery"],
  ["Poppins", "Inter", 700, "Clean startup"], ["Montserrat", "Lato", 700, "Everyday modern"],
  ["Raleway", "Merriweather", 700, "Airy with a serif"], ["Roboto Slab", "Roboto", 700, "Practical and friendly"],
  ["Rubik", "Karla", 700, "Playful and tidy"], ["Work Sans", "Lora", 700, "Office with warmth"],
  ["Manrope", "Inter", 700, "Calm product"], ["Outfit", "Inter", 700, "Fresh and geometric"],
  ["Sora", "Inter", 700, "Future facing"], ["Urbanist", "Nunito Sans", 700, "Soft and modern"],
  ["Plus Jakarta Sans", "Inter", 700, "Friendly fintech"], ["Lexend", "Source Sans 3", 600, "Easy to read"],
  ["Jost", "Libre Baskerville", 600, "Bauhaus and book"], ["League Spartan", "Open Sans", 700, "Confident and plain"],
  ["Red Hat Display", "Red Hat Text", 700, "One family, two sizes"], ["IBM Plex Serif", "IBM Plex Sans", 600, "Engineered and calm"],
  ["Noto Serif", "Noto Sans", 700, "Neutral and global"], ["Source Serif 4", "Source Sans 3", 700, "Quiet and clear"],
  ["PT Serif", "PT Sans", 700, "Plain and dependable"], ["Merriweather", "Merriweather Sans", 700, "Matching pair"],
  ["Alegreya", "Alegreya Sans", 700, "Literary and light"], ["Crimson Pro", "Work Sans", 600, "Bookish and modern"],
  ["EB Garamond", "Lato", 600, "Old style, new screen"], ["Spectral", "Karla", 600, "Refined and relaxed"],
  ["Vollkorn", "Source Sans 3", 700, "Rustic and readable"], ["Libre Franklin", "Libre Baskerville", 700, "Heritage press"],
  ["Zilla Slab", "Inter", 600, "Warm slab"], ["Bitter", "Lato", 700, "Sturdy and soft"],
  ["Anton", "Roboto", 400, "Poster and plain"], ["Fjalla One", "Open Sans", 400, "Compact and punchy"],
  ["Barlow Condensed", "Barlow", 700, "Sporty family"], ["Teko", "Roboto", 600, "Digital and sharp"],
  ["Kanit", "Mulish", 700, "Modern Thai-inspired"], ["Titillium Web", "Open Sans", 700, "Technical and neat"],
  ["Exo 2", "Roboto", 700, "Sci-fi but sensible"], ["Ubuntu", "Source Sans 3", 700, "Friendly and open"],
  ["Cabin", "Merriweather", 700, "Humanist pair"], ["Asap", "Lora", 700, "Compact and warm"],
  ["Overpass", "Source Serif 4", 700, "Highway with a book"], ["Heebo", "Roboto Slab", 700, "Simple and sturdy"],
  ["Fira Sans", "Fira Sans", 700, "One family, all weights"], ["Hind", "Merriweather", 600, "Soft and bookish"],
  ["Mukta", "Lora", 700, "Gentle and bookish"], ["Karla", "Space Mono", 700, "Notebook"],
  ["Space Mono", "Work Sans", 700, "Typewriter and plain"], ["IBM Plex Mono", "IBM Plex Sans", 600, "Code and clarity"],
  ["Roboto Mono", "Roboto", 700, "Developer tidy"], ["Cinzel", "Lato", 700, "Classical and calm"],
  ["Comfortaa", "Nunito", 700, "Rounded and kind"], ["Lilita One", "Nunito", 400, "Chunky and cheerful"],
  ["Lobster", "Open Sans", 400, "Retro menu"], ["Pacifico", "Lato", 400, "Surf and sun"],
  ["Dancing Script", "Montserrat", 700, "Handwritten charm"], ["Great Vibes", "Lora", 400, "Invitation"],
  ["Indie Flower", "Open Sans", 400, "Hand drawn notes"], ["Yanone Kaffeesatz", "Open Sans", 700, "Cafe sign"],
  ["Prata", "Inter", 400, "High fashion"], ["Bodoni Moda", "Jost", 700, "Magazine cover"],
  ["Gloock", "Inter", 400, "Bold serif, plain body"], ["Young Serif", "Work Sans", 400, "Friendly and bold"],
  ["Instrument Serif", "Inter", 400, "Gallery"], ["Newsreader", "Inter", 600, "Long reads"],
  ["Marcellus", "Lato", 400, "Roman and refined"], ["Libre Caslon Text", "Montserrat", 700, "Law and design"],
  ["Noto Serif Display", "Noto Sans", 700, "Display with a global body"], ["Unbounded", "Inter", 700, "Wide and bold"],
  ["Bricolage Grotesque", "Inter", 700, "Characterful grotesque"], ["Epilogue", "Source Serif 4", 700, "Editorial and sharp"],
  ["Be Vietnam Pro", "Lora", 700, "Neat and warm"], ["Albert Sans", "Merriweather", 700, "Quiet with a serif"],
  ["Onest", "Inter", 700, "Calm and neutral"], ["Schibsted Grotesk", "Source Serif 4", 700, "News and neat"],
  ["Hanken Grotesk", "Lora", 700, "Soft grotesque"], ["Figtree", "Figtree", 700, "One friendly family"],
  ["Public Sans", "Merriweather", 700, "Civic and clear"], ["Mulish", "Playfair Display", 400, "Sans body, serif accents"],
  ["Archivo", "Lora", 700, "Grotesque and book"], ["Nunito Sans", "Lora", 800, "Easy and warm"],
  ["Oxygen", "Merriweather", 700, "Screen first"], ["Arimo", "Libre Baskerville", 700, "Familiar and formal"],
  ["Cairo", "Open Sans", 700, "Arabic friendly"], ["Barlow", "Libre Baskerville", 700, "Industrial and bookish"],
];

/* The short "why it works" line, from the kind of face each one is. Plain
   rules, not a claim about each pair: contrast in role, shared logic. */
const SERIF = new Set(["Playfair Display", "DM Serif Display", "Lora", "Merriweather", "Cormorant Garamond", "Libre Baskerville", "Crimson Text", "Crimson Pro", "Fraunces", "IBM Plex Serif", "Noto Serif", "Source Serif 4", "PT Serif", "Alegreya", "EB Garamond", "Spectral", "Vollkorn", "Cinzel", "Prata", "Bodoni Moda", "Gloock", "Young Serif", "Instrument Serif", "Newsreader", "Marcellus", "Libre Caslon Text", "Noto Serif Display"]);
const SLAB = new Set(["Bitter", "Roboto Slab", "Zilla Slab"]);
const DISPLAY = new Set(["Abril Fatface", "Bebas Neue", "Anton", "Fjalla One", "Archivo Black", "Lilita One", "Lobster", "Pacifico", "Dancing Script", "Great Vibes", "Indie Flower", "Yanone Kaffeesatz", "Unbounded", "Comfortaa", "Teko"]);
const SCRIPT = new Set(["Pacifico", "Dancing Script", "Great Vibes", "Lobster", "Indie Flower"]);
const MONO = new Set(["Space Mono", "IBM Plex Mono", "Roboto Mono", "Inconsolata", "Source Code Pro"]);
const kind = (f: string) => (SCRIPT.has(f) ? "script" : MONO.has(f) ? "mono" : SLAB.has(f) ? "slab" : SERIF.has(f) ? "serif" : DISPLAY.has(f) ? "display" : "sans");
const family = (f: string) => f.split(" ")[0];

function why(heading: string, body: string) {
  if (heading === body || family(heading) === family(body)) return "One family doing two jobs, so the proportions match by design.";
  const h = kind(heading), b = kind(body);
  if (h === "script") return "A script for a personal touch, used only for headlines, over a very plain body.";
  if (h === "display") return "A bold face for impact over a quiet one, so the words stay easy to read.";
  if (h === "serif" && b === "sans") return "A serif headline gives character, and a plain sans keeps reading easy.";
  if (h === "sans" && b === "serif") return "A clean sans headline over a serif body reads warm and bookish.";
  if (h === "serif" && b === "serif") return "Two serifs from the same tradition: one for display, one set for reading.";
  if (h === "slab") return "A sturdy slab for headlines and a friendly body that never competes.";
  if (h === "mono" || b === "mono") return "A mono accent for a notebook feel, with a plain face for the long reading.";
  return "Two sans faces that differ in weight and width: strong headlines, calm body.";
}

export const FONT_PAIRINGS: FontPairing[] = ROWS.map(([heading, body, hw, title], i) => ({
  id: `p${i}`, title, line: why(heading, body), heading, body, hw,
}));

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
  "Albert Sans", "Be Vietnam Pro", "Bodoni Moda", "Bricolage Grotesque", "Epilogue", "Gloock", "Hanken Grotesk", "Instrument Serif", "Libre Caslon Text", "Marcellus", "Newsreader", "Noto Serif Display", "Onest", "Prata", "Red Hat Text", "Schibsted Grotesk", "Unbounded", "Young Serif",
];

/**
 * The Google Fonts stylesheet for some families. Each family is listed once,
 * with the union of the weights asked for (a family asked for only Regular is
 * left plain, which every family supports).
 */
export function fontsHref(families: { name: string; weight?: number }[], text = "") {
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
  /* `text` cuts each file down to just those letters: a preview needs a few
     dozen glyphs, not a whole alphabet in every script. */
  const subset = text ? `&text=${encodeURIComponent([...new Set(text)].join(""))}` : "";
  return parts.length ? `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap${subset}` : "";
}
