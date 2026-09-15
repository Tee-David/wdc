/**
 * The estimator's arithmetic, checked against the cases that would embarrass
 * us in front of a client.
 *
 * WHY A SCRIPT AND NOT A PLAYWRIGHT SPEC, the same reason as the CAC rules:
 * `lib/estimate.ts` is pure and synchronous, and booting Chromium to call a
 * function is slower to run and slower to read than calling the function. The
 * browser half of this tool -- can you answer eight questions, does the figure
 * appear, does it stay out of the way until it is earned -- is where a spec
 * earns its keep, and that is `tests/scope-estimator.spec.ts`.
 *
 * WHAT IS ASSERTED IS THE PROPERTIES, NOT THE FIGURES. Pinning "a five-screen
 * website is ₦1.6m" would mean editing this file every time the studio edits
 * its day rate, which is a test that trains you to update it without reading
 * it. What must hold whatever the rate card says: the range brackets the
 * middle, a bigger project costs more than a smaller one, the phases add up to
 * the whole, a rush costs more than an open date, and an incomplete set of
 * answers produces nothing at all.
 *
 *   npm run check:estimate
 */
import {
  QUESTIONS, PHASES, RATE_CARD, estimate, isComplete, describe, shortNaira, shortDollars,
} from "../lib/estimate.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

/** The cheapest answer to every question, as the floor to build cases on. */
const FLOOR = Object.fromEntries(QUESTIONS.map((q) => [q.key, q.options[0].key]));
const answer = (overrides) => ({ ...FLOOR, ...overrides });

/* ------------------------------------------------------- the questions set */

console.log("-- the question set --");
report("six to eight questions, as the checklist asks",
  QUESTIONS.length >= 6 && QUESTIONS.length <= 8, `got ${QUESTIONS.length}`);
report("every question has at least two answers",
  QUESTIONS.every((q) => q.options.length >= 2));
report("no two questions share a key",
  new Set(QUESTIONS.map((q) => q.key)).size === QUESTIONS.length);
report("no question has two options with the same key",
  QUESTIONS.every((q) => new Set(q.options.map((o) => o.key)).size === q.options.length));
/* Every answer has to move the number or it is thirty seconds of a stranger's
   time spent on nothing. The first option of each question is the zero case. */
report("every question changes the answer",
  QUESTIONS.every((q) => q.options.some((o) => (o.days ?? 0) !== (q.options[0].days ?? 0)
    || (o.multiplier ?? 1) !== (q.options[0].multiplier ?? 1))));

/* ----------------------------------------------------------- completeness */

console.log("-- an unfinished form produces no number --");
report("nothing from an empty set", estimate({}) === null);
report("nothing from a set missing one answer",
  estimate({ ...FLOOR, [QUESTIONS.at(-1).key]: undefined }) === null);
report("a full set is complete", isComplete(FLOOR) === true);
report("a full set produces an estimate", estimate(FLOOR) !== null);
/* A value the form could never produce must not be read as an answer. */
report("an invented answer does not count as answered",
  estimate({ ...FLOOR, [QUESTIONS[0].key]: "whatever" }) === null);

/* ------------------------------------------------------------- the range */

console.log("-- the range --");
const floor = estimate(FLOOR);
report("the low end is below the high end", floor.ngn.low < floor.ngn.high);
report("the range brackets days times the rate",
  floor.ngn.low <= floor.days * RATE_CARD.dayRateNgn
    && floor.ngn.high >= floor.days * RATE_CARD.dayRateNgn);
/* Under-scoping is the failure mode, so the high end sits further out. */
const middle = floor.days * RATE_CARD.dayRateNgn;
report("the high end is further from the middle than the low end",
  floor.ngn.high - middle > middle - floor.ngn.low);
report("dollars follow naira through the published rate",
  Math.abs(floor.usd.low - floor.ngn.low / RATE_CARD.nairaPerUsd) <= 50);

/* --------------------------------------------------------------- ordering */

console.log("-- a bigger project costs more --");
const small = estimate(answer({ kind: "site", screens: "xs" }));
const big = estimate(answer({ kind: "both", screens: "l" }));
report("web and mobile with 25+ screens beats a small site", big.ngn.low > small.ngn.low);
report("roles cost more than one kind of user",
  estimate(answer({ accounts: "roles" })).ngn.high > estimate(answer({ accounts: "simple" })).ngn.high);
report("subscriptions cost more than one-off payments",
  estimate(answer({ payments: "recurring" })).ngn.high > estimate(answer({ payments: "once" })).ngn.high);
report("a rush costs more than an open date",
  estimate(answer({ kind: "webapp", timeline: "rush" })).ngn.low
    > estimate(answer({ kind: "webapp", timeline: "open" })).ngn.low);
/* The multiplier has nothing to multiply when every answer is the floor, which
   is correct and is worth pinning: a timeline surcharge on a zero-day project
   must not invent days. */
report("the timeline multiplies the work rather than adding to it",
  estimate(answer({ timeline: "rush" })).days === estimate(answer({ timeline: "open" })).days
    || estimate(answer({ kind: "site", timeline: "rush" })).days
      > estimate(answer({ kind: "site", timeline: "open" })).days);

/* ---------------------------------------------------------------- phases */

console.log("-- the phased breakdown --");
const shown = estimate(answer({ kind: "webapp", screens: "m", accounts: "roles" }));
report("one row per phase", shown.phases.length === PHASES.length);
report("the shares add up to the whole",
  Math.abs(PHASES.reduce((sum, p) => sum + p.share, 0) - 1) < 1e-9);
/* Rounding to ₦50,000 means the parts cannot sum exactly to the whole. What
   must hold is that they are close enough that a reader adding them up does
   not think they have been overcharged: within one rounding step per phase. */
const phaseLow = shown.phases.reduce((sum, p) => sum + p.ngn.low, 0);
report("the phases add up to about the total",
  Math.abs(phaseLow - shown.ngn.low) <= 50_000 * PHASES.length,
  `phases ${phaseLow} vs total ${shown.ngn.low}`);
report("every phase says what happens in it",
  shown.phases.every((p) => p.label && p.blurb));

/* ----------------------------------------------------------- assumptions */

console.log("-- the assumptions --");
report("an AI-centred project says the model bill is not included",
  estimate(answer({ ai: "core" })).assumptions.some((a) => /model usage/i.test(a)));
report("a project with no AI does not mention model bills",
  estimate(answer({ ai: "none" })).assumptions.every((a) => !/model usage/i.test(a)));
report("a mobile project names the store fees",
  estimate(answer({ kind: "mobile" })).assumptions.some((a) => /Apple/i.test(a)));
report("care is always outside the figure",
  floor.assumptions.some((a) => /monthly and quoted separately/i.test(a)));

/* --------------------------------------------------------- what is shown */

console.log("-- the words on the screen --");
report("millions read as millions", shortNaira(2_400_000) === "₦2.4m");
report("ten million and up drops the decimal", shortNaira(24_300_000) === "₦24m");
report("thousands read as thousands", shortNaira(850_000) === "₦850k");
report("a round million has no trailing zero", shortNaira(3_000_000) === "₦3m");
report("dollars shorten the same way", shortDollars(18_400) === "$18k");
report("small dollar figures stay whole", shortDollars(600) === "$600");
/* The studio's copy of an estimate is read by somebody who was not in the
   browser when it was filled in, so it has to carry the words both sides saw.
   Asserted against the question set rather than by looking for a space: three
   of the answers are legitimately one word ("No", "Nothing"). */
report("the studio's copy carries the questions and answers, not keys",
  describe(FLOOR).length === QUESTIONS.length
    && describe(FLOOR).every((row, i) =>
      row.question === QUESTIONS[i].label
      && QUESTIONS[i].options.some((o) => o.label === row.answer)));

console.log(failures === 0 ? "\nAll estimate checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
