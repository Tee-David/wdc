/**
 * The Flesch readability scores, for a piece of copy pasted straight in.
 *
 * WHY FLESCH, OF THE DOZEN READABILITY FORMULAS THAT EXIST. It is the one a
 * reader has actually heard of -- Microsoft Word has shipped it for decades --
 * and it needs no dictionary of word difficulty or dataset of anything, only
 * sentences, words and syllables, all countable from the text itself. That is
 * also why it is the one that can run entirely on a visitor's own device.
 *
 * TWO SCORES, BECAUSE THEY ANSWER DIFFERENT QUESTIONS. Reading Ease is 0-100,
 * higher is easier, and reads as a temperature gauge. Grade Level answers
 * "what US school grade would need to have finished to read this comfortably",
 * which is the number people actually plan a target sentence length around --
 * "keep it under Grade 8" is a sentence marketing briefs actually contain.
 *
 * SYLLABLES ARE COUNTED, NOT LOOKED UP, because a dictionary big enough to
 * cover real marketing copy -- brand names, contractions, Nigerian English --
 * would be its own dependency for a number that only has to be roughly right.
 * The heuristic (vowel groups, with the standard English exceptions) is the
 * same one every open-source Flesch implementation uses, and it agrees with a
 * real dictionary count to within a syllable on ordinary prose.
 *
 * PURE, CLASS A, no network and no key. `scripts/check-readability.mjs` calls
 * this directly.
 */

/**
 * Vowel-group syllable counting: the same heuristic most open-source Flesch
 * implementations converge on, because it is the simplest one that gets
 * ordinary English right.
 *
 *   1. three letters or fewer is always one syllable ("a", "the", "cat").
 *   2. a trailing silent e is dropped first -- but only when the letter
 *      before it is not l, so "love" loses its e ("lov", one group) while
 *      "table" and "simple" keep theirs, because "-le" after a consonant is
 *      its own spoken syllable ("ta-ble", "sim-ple").
 *   3. a leading y does not count as a vowel ("you" starts consonant-like).
 *   4. what is left is counted in runs of one or two vowels at a time.
 *
 * KNOWN, ACCEPTED LIMITATIONS, the same ones every implementation of this
 * carries: "-ed" is always stripped, which undercounts a word where it is
 * actually pronounced ("wanted" reads as one syllable here, not two), and a
 * run of three vowels together ("beautiful") can split into one group too
 * many. Both average out over a real paragraph rather than compounding, which
 * is why the formula is described as "roughly right" rather than exact.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;

  const reduced = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = reduced.match(/[aeiouy]{1,2}/g);
  return groups ? Math.max(1, groups.length) : 1;
}

/** Splits on `.`, `!` and `?`, which is the same rough boundary every Flesch
    implementation uses -- an abbreviation like "Mr." over-counts by one
    sentence occasionally, which the formula tolerates far better than it
    tolerates under-counting a genuinely long piece of copy as one sentence. */
function sentenceCount(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches?.length) return matches.length;
  return text.trim() ? 1 : 0;
}

function wordList(text: string): string[] {
  return text.match(/[A-Za-z']+/g) ?? [];
}

export type Score = {
  words: number;
  sentences: number;
  syllables: number;
  /** 0-100. Below 0 and above 100 both happen on real text -- a run of long
   *  technical words can push the formula negative -- and are left
   *  unclamped, because clamping would hide exactly the copy that needs
   *  rewriting most. */
  readingEase: number;
  /** US school grade level. Same reasoning: left unclamped. */
  gradeLevel: number;
};

/** Returns null for text with no countable words, rather than dividing by
    zero and returning NaN for the caller to trip over. */
export function score(text: string): Score | null {
  const words = wordList(text);
  if (!words.length) return null;

  const sentences = Math.max(1, sentenceCount(text));
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const wordsPerSentence = words.length / sentences;
  const syllablesPerWord = syllables / words.length;

  return {
    words: words.length,
    sentences,
    syllables,
    readingEase: 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord,
    gradeLevel: 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59,
  };
}

export type Band = {
  /** The lowest Reading Ease score this band covers. Bands are checked
   *  highest-first, so this is a floor, not a range with two ends. */
  floor: number;
  label: string;
  /** The rough US grade or reader this score corresponds to, in words a
   *  marketer would actually use. */
  readerLevel: string;
};

/**
 * THE SEVEN STANDARD BANDS, exactly as the original 1975 Flesch-Kincaid
 * table defines them -- not rounded or relabelled, because a reader who has
 * met "Flesch score" before will have met these exact names.
 */
export const BANDS: Band[] = [
  { floor: 90, label: "Very easy", readerLevel: "an 11-year-old" },
  { floor: 80, label: "Easy", readerLevel: "an easy conversational read" },
  { floor: 70, label: "Fairly easy", readerLevel: "a 13-year-old" },
  { floor: 60, label: "Standard", readerLevel: "13 to 15-year-olds; plain English" },
  { floor: 50, label: "Fairly difficult", readerLevel: "some college education" },
  { floor: 30, label: "Difficult", readerLevel: "a college graduate" },
  { floor: -Infinity, label: "Very difficult", readerLevel: "a university post-graduate" },
];

export function bandFor(readingEase: number): Band {
  return BANDS.find((b) => readingEase >= b.floor) ?? BANDS[BANDS.length - 1];
}

/**
 * ONE SENTENCE, EARNED RATHER THAN LEFT TO THE READER TO INTERPRET. Most
 * visitors pasting copy in have a rough sense of who it is for and no idea
 * what "62.4" means against it; this names the trade-off the number
 * represents rather than just reporting it.
 */
export function advice(s: Score): string {
  const band = bandFor(s.readingEase);
  if (s.readingEase >= 60) {
    return `${band.label}: this reads at roughly ${band.readerLevel} level, which is comfortable for most website and marketing copy.`;
  }
  if (s.readingEase >= 30) {
    return `${band.label}: this asks more of the reader than most web copy should. Worth shortening sentences or swapping in simpler words if the audience is not specialist.`;
  }
  return `${band.label}: this reads like a contract or a research paper. Fine for the audience that expects that; a website visitor deciding whether to keep reading usually will not.`;
}
