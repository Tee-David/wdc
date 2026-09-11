/**
 * Generates lib/dial-codes.ts from libphonenumber-js.
 *
 * WHY GENERATE RATHER THAN IMPORT AT RUNTIME. The country list has to be there
 * the instant the field renders -- it is the control, not an enhancement --
 * but libphonenumber-js is ~30KB gzipped and almost all of that is the
 * validation metadata, which is not needed until somebody has typed a number.
 * So the list is baked in as a few hundred bytes of ISO/dial pairs and the
 * library is dynamically imported later, for validating and formatting only.
 *
 * WHY NOT HAND-WRITE IT. 245 dialling codes written from memory is 245
 * chances to be quietly wrong in a form that collects the number a client is
 * reached on. This is mechanical output from the same source Google maintains
 * for Android.
 *
 * Country NAMES are deliberately not generated: `Intl.DisplayNames` is in
 * every browser this site supports and gives correctly spelled, correctly
 * localised names for free.
 *
 * Regenerate with:  node scripts/gen-dial-codes.mjs
 */
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { writeFileSync } from "node:fs";

const pairs = getCountries()
  .map((iso) => `${iso}${getCountryCallingCode(iso)}`)
  .sort();

const out = `/* GENERATED FILE -- DO NOT EDIT BY HAND.
   Produced by scripts/gen-dial-codes.mjs from libphonenumber-js.
   Regenerate with: node scripts/gen-dial-codes.mjs */

/**
 * Every dialling country, as "<ISO2><dial code>" with no separator -- the code
 * is always the first two characters and the digits are always the rest. One
 * string rather than ${pairs.length} objects keeps this under a kilobyte in the
 * bundle; it is split once, at module load, into the array below.
 */
const PACKED =
  "${pairs.join(" ")}";

export type Dial = { iso: string; code: string };

export const DIAL_CODES: Dial[] = PACKED.split(" ").map((s) => ({
  iso: s.slice(0, 2),
  code: s.slice(2),
}));

/** Lookup by ISO 3166-1 alpha-2, e.g. "NG". */
export const DIAL_BY_ISO = new Map(DIAL_CODES.map((d) => [d.iso, d]));
`;

writeFileSync(new URL("../lib/dial-codes.ts", import.meta.url), out);
console.log(`wrote lib/dial-codes.ts with ${pairs.length} countries`);
