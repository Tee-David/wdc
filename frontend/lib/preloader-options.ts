/* The preloaders the site can play, and the names the settings page uses.
   Plain data, safe in the browser; the reader that consults the database is
   lib/preloader.ts. */
export const PRELOADERS = [
  { id: "ink", name: "Ink", line: "The cursor draws the mark out of the hand and types the name. Paper and navy; lifts away on a curved edge." },
  { id: "blueprint", name: "Blueprint", line: "The mark is built on guide lines and turns into place. Navy; parts down the middle." },
] as const;

export type PreloaderId = (typeof PRELOADERS)[number]["id"];
export const PRELOADER_KEY = "site.preloader";
export const DEFAULT_PRELOADER: PreloaderId = "ink";
/* Read by the pre-paint script, so not httpOnly; it carries nothing private. */
export const PRELOADER_COOKIE = "wdc-loader-site";

export const isPreloader = (v: unknown): v is PreloaderId => PRELOADERS.some((p) => p.id === v);
