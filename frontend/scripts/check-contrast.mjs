/**
 * The contrast arithmetic, checked against WCAG's own published examples
 * rather than against numbers this codebase invented.
 *
 * WHY A SCRIPT. `lib/contrast.ts` is pure -- parsing a colour string and
 * applying the published relative-luminance formula -- and the browser half,
 * that the tool answers live and shows a real preview, is `tests/contrast.spec.ts`.
 *
 * BLACK ON WHITE IS 21:1, EXACTLY, is the one figure worth pinning to the
 * decimal: it is the maximum the formula can ever produce and the number
 * every WCAG reference uses to sanity-check an implementation.
 *
 *   node --experimental-strip-types scripts/check-contrast.mjs
 */
import {
  contrastRatio, formatRatio, parseColor, THRESHOLDS, toHex, verdicts,
} from "../lib/contrast.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

console.log("-- parsing --");
report("a 6-digit hex with a hash", JSON.stringify(parseColor("#ff6500")) === JSON.stringify([255, 101, 0]));
report("a 6-digit hex without a hash", JSON.stringify(parseColor("ff6500")) === JSON.stringify([255, 101, 0]));
report("a 3-digit hex expands each digit", JSON.stringify(parseColor("#0f0")) === JSON.stringify([0, 255, 0]));
report("rgb()", JSON.stringify(parseColor("rgb(255, 101, 0)")) === JSON.stringify([255, 101, 0]));
report("rgba() ignores the alpha channel", JSON.stringify(parseColor("rgba(255, 101, 0, 0.4)")) === JSON.stringify([255, 101, 0]));
report("whitespace around the value is trimmed", JSON.stringify(parseColor("  #ff6500  ")) === JSON.stringify([255, 101, 0]));
report("a half-typed hex parses to nothing", parseColor("#ff65") === null);
report("plain nonsense parses to nothing", parseColor("chartreuse") === null);
report("an out-of-range rgb() parses to nothing", parseColor("rgb(300, 0, 0)") === null);
report("toHex round-trips a parsed colour", toHex(parseColor("#a1b2c3")) === "#a1b2c3");

console.log("-- the ratio itself --");
report("black on white is 21:1, the formula's own maximum",
  Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.001);
report("a colour against itself is 1:1",
  Math.abs(contrastRatio([100, 150, 200], [100, 150, 200]) - 1) < 0.001);
report("the ratio does not care which colour is passed first",
  contrastRatio([20, 20, 20], [230, 230, 230]) === contrastRatio([230, 230, 230], [20, 20, 20]));
report("the brand orange on white is below 3:1, which is why it is never a button fill",
  contrastRatio(parseColor("#ff6500"), parseColor("#ffffff")) < 3);
/* This is the exact pairing globals.css cites for the site's own primary
   button: black label on white fill, 21:1. If this ever reads otherwise the
   formula has drifted, not the brand. */
report("the site's own primary pair (black on white) reads as the formula's maximum",
  Math.abs(contrastRatio(parseColor("#000"), parseColor("#fff")) - 21) < 0.001);

console.log("-- the thresholds --");
report("normal text always needs more contrast than large text, at both tiers",
  THRESHOLDS.find((t) => t.key === "aa-normal").minRatio > THRESHOLDS.find((t) => t.key === "aa-large").minRatio
  && THRESHOLDS.find((t) => t.key === "aaa-normal").minRatio > THRESHOLDS.find((t) => t.key === "aaa-large").minRatio);
report("AAA is always stricter than AA, at both text sizes",
  THRESHOLDS.find((t) => t.key === "aaa-normal").minRatio > THRESHOLDS.find((t) => t.key === "aa-normal").minRatio
  && THRESHOLDS.find((t) => t.key === "aaa-large").minRatio > THRESHOLDS.find((t) => t.key === "aa-large").minRatio);
report("no two thresholds share a key", new Set(THRESHOLDS.map((t) => t.key)).size === THRESHOLDS.length);

const blackOnWhite = verdicts(21);
report("black on white clears every threshold there is", blackOnWhite.every((v) => v.pass));
const barelyThere = verdicts(1.1);
report("near-identical colours fail every threshold there is", barelyThere.every((v) => !v.pass));
/* The exact case the tool exists to show: a ratio that clears the large-text
   bar and misses the normal-text one, which is a real and common outcome. */
const middling = verdicts(3.5);
report("a mid-range ratio can pass large text and fail normal text in the same breath",
  middling.find((v) => v.key === "aa-large").pass && !middling.find((v) => v.key === "aa-normal").pass);

console.log("-- what is shown --");
report("the ratio prints to two decimal places with the :1", formatRatio(4.5) === "4.50:1");
report("formatRatio rounds rather than truncates", formatRatio(4.999) === "5.00:1");

console.log(failures === 0 ? "\nAll contrast checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
