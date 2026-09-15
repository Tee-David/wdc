/**
 * The AI running-cost arithmetic, and the properties that have to hold however
 * the price table is edited.
 *
 * WHY A SCRIPT. `lib/ai-cost.ts` is pure: a volume and two word counts in,
 * eight monthly figures out. The browser half -- does the table appear, does
 * the reader's own volume drive it -- is `tests/ai-cost.spec.ts`.
 *
 * THE FIGURES ARE NOT PINNED, the RELATIONSHIPS are. Prices move; a test that
 * asserts "Haiku is ₦4,182 a month" is a test somebody updates without reading
 * on the day a provider changes a rate. What must stay true: output costs more
 * than input on every model, doubling the volume doubles the bill, the cheapest
 * model is cheaper than the dearest, and a shape that writes more than it reads
 * costs more than one that reads more than it writes.
 *
 *   npm run check:ai-cost
 */
import {
  JOBS, MODELS, TOKENS_PER_WORD, naira, perRunLabel, priceAll, reading, tokensFor,
} from "../lib/ai-cost.ts";
/* The site's one dollar rate, imported here and handed to `priceAll` exactly as
   the page does -- so this asserts the arithmetic the reader actually sees. */
import { RATE_CARD } from "../lib/estimate.ts";
const FX = RATE_CARD.nairaPerUsd;

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

/* ------------------------------------------------------------ the table */

console.log("-- the price table --");
report("every model names its maker and what it is for",
  MODELS.every((m) => m.maker && m.note && m.name));
report("no two models share a key",
  new Set(MODELS.map((m) => m.key)).size === MODELS.length);
/* Output tokens cost several times input tokens on every model anyone sells.
   A row where they are equal is a typo, and it would quietly halve a bill. */
report("output costs more than input on every model",
  MODELS.every((m) => m.outUsd > m.inUsd));
report("three makers are represented",
  new Set(MODELS.map((m) => m.maker)).size >= 3);
report("the cheapest and dearest are an order of magnitude apart",
  Math.max(...MODELS.map((m) => m.outUsd)) / Math.min(...MODELS.map((m) => m.outUsd)) >= 10);

console.log("-- the four shapes --");
report("every job says what it is and what it means", JOBS.every((j) => j.label && j.hint));
report("a summariser reads more than it writes",
  JOBS.find((j) => j.key === "summarise").inWords > JOBS.find((j) => j.key === "summarise").outWords);
report("a drafter writes more than it reads",
  JOBS.find((j) => j.key === "write").outWords > JOBS.find((j) => j.key === "write").inWords);
report("classifying is the cheapest shape on both halves",
  JOBS.every((j) => j.key === "classify"
    || (j.inWords >= JOBS.find((c) => c.key === "classify").inWords
      && j.outWords >= JOBS.find((c) => c.key === "classify").outWords)));

/* ------------------------------------------------------------- the sums */

console.log("-- the arithmetic --");
const usage = { runs: 5_000, inWords: 600, outWords: 150 };
const lines = priceAll(usage, FX);

report("one line per model", lines.length === MODELS.length);
report("cheapest first", lines.every((l, i) => i === 0 || l.naira >= lines[i - 1].naira));
report("nothing is free", lines.every((l) => l.naira > 0));

const tokens = tokensFor(usage);
report("tokens come from words at the published ratio",
  Math.abs(tokens.input - 5_000 * 600 * TOKENS_PER_WORD) < 1e-6);

/* Priced by hand against the table, so a change to the formula cannot pass
   unnoticed: 4.05M input tokens and 1.0125M output on Sonnet at $2/$10. */
const sonnet = lines.find((l) => l.model.key === "sonnet");
const expectedUsd = (4_050_000 / 1e6) * 2 + (1_012_500 / 1e6) * 10;
report("a model's dollars match the table",
  Math.abs(sonnet.usd - expectedUsd) < 1e-6, `${sonnet.usd} vs ${expectedUsd}`);
report("naira follows dollars through the site's one FX rate",
  Math.abs(sonnet.naira - sonnet.usd * FX) < 1e-6);
report("the per-request figure is the month divided by the runs",
  Math.abs(sonnet.perRun - sonnet.naira / 5_000) < 1e-9);

console.log("-- it scales the way a bill scales --");
const double = priceAll({ ...usage, runs: 10_000 }, FX);
report("twice the volume is twice the bill",
  Math.abs(double.find((l) => l.model.key === "sonnet").naira - sonnet.naira * 2) < 1e-6);
report("no volume is no bill",
  priceAll({ ...usage, runs: 0 }, FX).every((l) => l.naira === 0));
report("the per-request figure survives a zero volume",
  priceAll({ ...usage, runs: 0 }, FX).every((l) => l.perRun === 0));

/* THE POINT THE TOOL EXISTS TO MAKE: the shape of the work moves the bill more
   than the length of the input does, because output is dearer. */
const reads = priceAll({ runs: 1_000, inWords: 2_000, outWords: 200 }, FX);
const writes = priceAll({ runs: 1_000, inWords: 300, outWords: 700 }, FX);
const pick = (rows) => rows.find((l) => l.model.key === "sonnet").naira;
report("writing costs more than reading, even reading far more words",
  pick(writes) > pick(reads), `${pick(writes)} vs ${pick(reads)}`);

/* ------------------------------------------------------------ the words */

console.log("-- what it says --");
report("a tiny volume is told the bill is not the problem",
  /not the thing to think about/.test(reading({ runs: 20, inWords: 200, outWords: 50 },
    priceAll({ runs: 20, inWords: 200, outWords: 50 }, FX))));
report("a real volume is told the spread between models",
  /between the cheapest model and the dearest/.test(reading(usage, lines)));
report("no volume asks for one",
  /Put a volume in/.test(reading({ runs: 0, inWords: 600, outWords: 150 }, priceAll({ runs: 0, inWords: 600, outWords: 150 }, FX))));

report("millions read as millions", naira(2_400_000) === "₦2.4m");
report("thousands are grouped", naira(42_500) === "₦42,500");
report("under a naira reads in kobo", naira(0.4) === "40 kobo");
report("a fraction of a naira per request reads in kobo", perRunLabel(0.085) === "8.5 kobo");
report("a dear request reads in naira", perRunLabel(23) === "₦23");

console.log(failures === 0 ? "\nAll AI cost checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
