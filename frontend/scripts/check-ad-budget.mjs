/**
 * The ad budget arithmetic, checked against the properties that have to hold
 * however the CPM ranges are edited.
 *
 * WHY A SCRIPT. `lib/ad-budget.ts` is pure: a naira figure and a published
 * CPM/CTR range in, an impressions-and-clicks range out. The browser half --
 * does the table appear, does the reader's own budget drive it -- is
 * `tests/ad-budget.spec.ts`.
 *
 *   node --experimental-strip-types scripts/check-ad-budget.mjs
 */
import { estimate, estimateAll, PLATFORMS, shortCount, shortNaira } from "../lib/ad-budget.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

console.log("-- the platform table --");
report("no two platforms share a key", new Set(PLATFORMS.map((p) => p.key)).size === PLATFORMS.length);
report("every platform's CPM range runs cheap to dear", PLATFORMS.every((p) => p.cpmNgn[0] < p.cpmNgn[1]));
report("every platform's click-through range runs low to high", PLATFORMS.every((p) => p.ctr[0] < p.ctr[1]));
report("every platform names what it is and says something about it", PLATFORMS.every((p) => p.name && p.note));
report("at least four platforms are offered", PLATFORMS.length >= 4);

console.log("-- the arithmetic --");
const meta = PLATFORMS.find((p) => p.key === "meta");
report("zero budget buys nothing", estimate(0, meta).impressions[1] === 0);
report("more budget always buys more impressions",
  estimate(200_000, meta).impressions[0] > estimate(100_000, meta).impressions[0]);
report("doubling the budget exactly doubles the impressions, both ends of the range",
  estimate(200_000, meta).impressions[0] === estimate(100_000, meta).impressions[0] * 2
  && estimate(200_000, meta).impressions[1] === estimate(100_000, meta).impressions[1] * 2);
report("the impressions range runs low to high", estimate(100_000, meta).impressions[0] <= estimate(100_000, meta).impressions[1]);
report("the clicks range runs low to high", estimate(100_000, meta).clicks[0] <= estimate(100_000, meta).clicks[1]);
report("clicks never exceed impressions, at either end of the range",
  estimate(500_000, meta).clicks[1] <= estimate(500_000, meta).impressions[1]);

/* A platform priced per click rather than per view -- Google Search -- should
   read as the most expensive way to reach the same number of eyeballs, which
   is the whole justification in the copy for why its CPM sits so much higher
   than the others. */
const search = PLATFORMS.find((p) => p.key === "google-search");
report("Google Search's CPM is the dearest of the five",
  search.cpmNgn[0] === Math.max(...PLATFORMS.map((p) => p.cpmNgn[0])));

console.log("-- estimateAll --");
report("one row per platform, in the platform table's own order",
  estimateAll(100_000).every((row, i) => row.platform.key === PLATFORMS[i].key));
report("every row is internally consistent with estimate() for the same platform",
  estimateAll(150_000).every((row) => {
    const solo = estimate(150_000, row.platform);
    return row.impressions[0] === solo.impressions[0] && row.impressions[1] === solo.impressions[1];
  }));

console.log("-- what is shown --");
report("millions read as millions", shortNaira(2_400_000) === "₦2.4m");
report("thousands read as thousands", shortNaira(85_000) === "₦85k");
report("small amounts stay whole", shortNaira(420) === "₦420");
report("counts shorten the same way as money, without the naira sign", shortCount(2_400_000) === "2.4m");
report("count thousands shorten without a sign", shortCount(85_000) === "85k");
report("small counts stay whole", shortCount(420) === "420");

console.log(failures === 0 ? "\nAll ad-budget checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
