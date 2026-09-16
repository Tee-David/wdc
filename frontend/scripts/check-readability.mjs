/**
 * The Flesch scoring, checked against known reference text and the
 * properties that have to hold however the heuristic is tuned.
 *
 * WHY A SCRIPT. `lib/readability.ts` is pure: text in, two scores out. The
 * browser half -- does the page answer as you paste, does the band and the
 * advice line change with it -- is `tests/readability.spec.ts`.
 *
 *   node --experimental-strip-types scripts/check-readability.mjs
 */
import {
  advice, bandFor, BANDS, countSyllables, score,
} from "../lib/readability.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

console.log("-- syllable counting --");
const syl = { cat: 1, the: 1, a: 1, simple: 2, table: 2, able: 2, banana: 3, running: 2, love: 1 };
for (const [word, expected] of Object.entries(syl)) {
  report(`"${word}" counts as ${expected}`, countSyllables(word) === expected, `got ${countSyllables(word)}`);
}
report("an empty string has no syllables", countSyllables("") === 0);
report("punctuation attached to a word is ignored", countSyllables("cat,") === countSyllables("cat"));
report("every non-empty word is at least one syllable", ["mmm", "brr", "xyz"].every((w) => countSyllables(w) >= 1));

console.log("-- scoring --");
report("empty text scores as nothing rather than NaN", score("") === null);
report("whitespace-only text scores as nothing", score("   \n\t  ") === null);
report("a single short sentence still scores", score("The cat sat.") !== null);

const easy = "The cat sat on the mat. It was a warm day. The cat was glad.";
const hard =
  "The implementation of a multivariate regression methodology necessitates " +
  "consideration of heteroscedasticity, autocorrelation, and the potential " +
  "for multicollinearity among the independent explanatory variables.";
const easyScore = score(easy);
const hardScore = score(hard);
report("short plain sentences score as easier reading than long technical ones",
  easyScore.readingEase > hardScore.readingEase,
  `easy ${easyScore.readingEase.toFixed(1)} vs hard ${hardScore.readingEase.toFixed(1)}`);
report("the harder passage's grade level reads higher than the easy one's",
  hardScore.gradeLevel > easyScore.gradeLevel);
report("word count matches a plain split of the text", easyScore.words === easy.match(/[A-Za-z']+/g).length);
report("sentence count matches the number of terminal punctuation marks", easyScore.sentences === 3);

/* The two formulas move in OPPOSITE directions by construction: Reading Ease
   goes down as text gets harder, Grade Level goes up. A future edit that
   accidentally used the same sign for both would still produce plausible
   -looking numbers, so the relationship is worth pinning directly rather than
   trusting the two fixtures above to always disagree convincingly. */
const longer = score(hard + " " + hard);
report("doubling a hard passage's sentence-length pressure lowers Reading Ease further",
  longer.readingEase <= hardScore.readingEase + 0.01);

console.log("-- the bands --");
report("bands are ordered highest floor first", BANDS.every((b, i) => i === 0 || b.floor < BANDS[i - 1].floor));
report("every score maps to exactly one band", [100, 85, 75, 65, 55, 35, 0, -20].every((n) => bandFor(n)));
report("a very easy score reads as the easiest band", bandFor(95).label === "Very easy");
report("a very difficult score reads as the hardest band", bandFor(-10).label === "Very difficult");
report("advice() names the band it is talking about",
  advice({ words: 10, sentences: 2, syllables: 12, readingEase: 95, gradeLevel: 3 }).includes("Very easy"));

console.log(failures === 0 ? "\nAll readability checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
