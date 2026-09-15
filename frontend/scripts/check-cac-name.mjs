/**
 * The CAMA 2020 section 852 rules, checked against cases chosen to fail.
 *
 * WHY A SCRIPT AND NOT A PLAYWRIGHT SPEC. `lib/cac-name.ts` is pure and
 * synchronous and has no browser in it. Booting Chromium to call a function is
 * slower to run and slower to read than calling the function.
 *
 * THE CASES THAT MATTER ARE THE NEGATIVE ONES. A rules engine that flags
 * "Federal Holdings Limited" is easy; one that leaves "Stateside Kitchens"
 * alone is the hard half, because a false alarm on somebody's perfectly good
 * name teaches them to ignore the real warnings. Roughly half of what is below
 * asserts that nothing was reported.
 *
 *   npm run check:cac-name
 */
import { readName, normaliseName, lookupKey } from "../lib/cac-name.ts";

let failures = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${label}` +
      (ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        got      ${JSON.stringify(actual)}`),
  );
}

const kinds = (name, entity) => readName(name, entity).findings.map((f) => f.kind).sort();
const matches = (name, entity) =>
  readName(name, entity).findings.map((f) => f.match).filter(Boolean).sort();

/* ---------------------------------------------------- the consent words */

check("Federal trips consent", kinds("Federal Kitchens Limited", "company"), ["consent"]);
check("Holdings trips consent", kinds("Adeyemi Holdings Limited", "company"), ["consent"]);
check("two restricted words are both reported",
  matches("Federal Group Limited", "company"), ["federal", "group"]);
check("a multi-word restricted phrase is caught",
  matches("Lagos Building Society Limited", "company"), ["building society"]);

/* THE FALSE ALARMS. Whole-word matching, so a restricted word sitting inside
   an ordinary one must not trip. */
check("Stateside is not State", kinds("Stateside Kitchens Limited", "company"), []);
check("Grouper is not Group", kinds("Grouper Foods Limited", "company"), []);
check("Nationality is not National", kinds("Nationality Media Limited", "company"), []);
check("Cooperation is not Cooperative", kinds("Cooperation Films Limited", "company"), []);

/* ------------------------------------------------------- the suffix rules */

check("a business name may not wear Ltd", kinds("Wendi Loveee Ltd", "business"), ["suffix"]);
check("a business name may not wear Limited", kinds("Wendi Loveee Limited", "business"), ["suffix"]);
check("a plain business name is fine", kinds("Wendi Loveee Ventures", "business"), []);
check("a company without an ending is told", kinds("Wendi Loveee", "company"), ["form"]);
check("a company with Limited is fine", kinds("Wendi Loveee Limited", "company"), []);
check("Plc counts as an ending", kinds("Wendi Loveee Plc", "company"), []);
check("a trailing full stop still counts", kinds("Wendi Loveee Ltd.", "company"), []);

/* "Enterprises" is the ordinary business-name ending and is NOT incorporated,
   so it must not be treated as one in either direction. */
check("Enterprises is not an incorporated ending, for a business",
  kinds("Wendi Loveee Enterprises", "business"), []);
check("Enterprises does not satisfy a company ending",
  kinds("Wendi Loveee Enterprises", "company"), ["form"]);

/* ------------------------------------------------------------- the notes */

check("a very short name gets a note", kinds("WDC", "business"), ["note"]);
check("a short name plus an ending still gets the note",
  kinds("WDC Limited", "company"), ["note"]);
check("a normal two-word name gets nothing", kinds("Wendi Loveee", "business"), []);

/* -------------------------------------------- normalising and the cache key */

check("case, spacing and punctuation collapse",
  normaliseName("  Wendi   Loveee,  Ltd. "), "wendi loveee ltd");
check("the same question normalises to the same string",
  normaliseName("WENDI LOVEEE LTD") === normaliseName("Wendi Loveee, Ltd."), true);
check("the lookup key drops the ending",
  lookupKey("Wendi Loveee Limited"), "wendi loveee");
check("both endings give one lookup key",
  lookupKey("Wendi Loveee Ltd") === lookupKey("Wendi Loveee Limited"), true);
check("a name with no ending is its own key", lookupKey("Wendi Loveee"), "wendi loveee");
check("an ampersand survives, because the register uses them",
  normaliseName("Bola & Sons"), "bola & sons");

/* ------------------------------------------------- clear is not available */

const clean = readName("Wendi Loveee Limited", "company");
check("a clean name reports clear", clean.clear, true);
check("and reports no findings at all", clean.findings.length, 0);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
