/**
 * The free half of the business name checker.
 *
 * WHAT THIS IS FOR. Asking a paid register lookup whether "Federal Holdings
 * Enterprises" is taken is spending money to answer the wrong question: that
 * name needs the Commission's consent twice over and carries a suffix its
 * entity type may not use, and none of that depends on who else is registered.
 * Those rules are law, they are public, and checking them costs nothing, so
 * they are checked FIRST and the meter is never touched for a name that was
 * never going to fly.
 *
 * IT IS ALSO THE FALLBACK. When the day's lookup budget is spent, or a
 * provider is down, or no provider is configured at all, this still answers.
 * That is the design rule the whole tools programme rests on: no tool may exist
 * that can only answer by spending money. See docs/tools-programme.md.
 *
 * WHAT IT IS NOT. It is not a verdict and it does not say "available". The
 * Commission's discretion is wider than any list: section 852(1) turns on
 * names that are "calculated to deceive", that mislead as to the nature of the
 * business or the nationality, race or religion of the people behind it, or
 * that are otherwise objectionable, and no function can decide any of that.
 * Everything here is reported as something to KNOW, never as a refusal, and
 * the tool that renders it has to keep that distinction.
 *
 * SOURCE. Companies and Allied Matters Act 2020, section 852. The restricted
 * words in `CONSENT_WORDS` are the ones section 852(2) names explicitly and
 * that two independent readings of the section agree on. The list is
 * deliberately CONSERVATIVE: a word we are not sure about is left out, because
 * a false alarm on somebody's name teaches them to ignore the real ones.
 */

export type NameFinding = {
  /** Machine-readable so the UI picks the icon and wording, not the copy. */
  kind: "consent" | "suffix" | "form" | "note";
  /** What we found, in the visitor's words. No legalese, no section numbers. */
  title: string;
  /** Why it matters and what to do about it. Still not a verdict. */
  detail: string;
  /** The exact bit of their name this is about, when there is one. */
  match?: string;
};

/** What is being registered. It changes which suffix rules apply, and it is
    the only question the tool has to ask beyond the name itself. */
export type EntityKind = "business" | "company";

export type NameReading = {
  /** Cleaned up, and what any register lookup should be keyed on. */
  normalised: string;
  /** The suffix we recognised and stripped, if any, e.g. "ltd". */
  suffix: string | null;
  findings: NameFinding[];
  /** True when nothing at all came back. Still not "available". */
  clear: boolean;
};

/**
 * Words section 852(2) says a name may not carry without the Commission's
 * consent. Consent is a process, not a refusal, and the copy has to say so:
 * plenty of registered Nigerian companies carry these words.
 */
const CONSENT_WORDS: { word: string; why: string }[] = [
  { word: "federal", why: "it suggests a connection to the Federal Government" },
  { word: "national", why: "it suggests a connection to government" },
  { word: "regional", why: "it suggests a connection to government" },
  { word: "state", why: "it suggests a connection to a State Government" },
  { word: "government", why: "it suggests government patronage" },
  { word: "municipal", why: "it suggests a connection to a local authority" },
  { word: "chartered", why: "it suggests a connection to a chartered body" },
  { word: "cooperative", why: "cooperatives are registered under their own rules" },
  { word: "co-operative", why: "cooperatives are registered under their own rules" },
  { word: "group", why: "it implies a group of companies" },
  { word: "holding", why: "it implies a holding company" },
  { word: "holdings", why: "it implies a holding company" },
  { word: "building society", why: "it is a regulated description" },
];

/**
 * Endings that mean "this is an incorporated company". The map is to the
 * canonical spelling so "LTD.", "Ltd" and "Limited" are one thing.
 *
 * ORDER MATTERS: the longest form is tried first, or "ltd" would match inside
 * nothing useful and "limited" would never be reached.
 */
const SUFFIXES: { pattern: RegExp; canonical: string; incorporated: boolean }[] = [
  { pattern: /\b(limited|ltd\.?)$/i, canonical: "Limited", incorporated: true },
  { pattern: /\b(plc\.?|public limited company)$/i, canonical: "Plc", incorporated: true },
  { pattern: /\b(unlimited|ultd\.?)$/i, canonical: "Unlimited", incorporated: true },
  { pattern: /\b(incorporated|inc\.?)$/i, canonical: "Incorporated", incorporated: true },
];

/**
 * Trimmed, case-folded, and with runs of whitespace and stray punctuation
 * flattened.
 *
 * THIS IS THE CACHE KEY as much as it is a tidy-up. "Wendi Loveee  Ltd." and
 * "wendi loveee limited" are the same question, and a cache that cannot see
 * that pays twice for one answer. Punctuation is dropped rather than kept
 * because the register does not meaningfully distinguish on it and a visitor's
 * apostrophe should not cost us a lookup.
 */
export function normaliseName(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[.,'"`’]/g, "")
    .replace(/[^a-z0-9&\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A shape check, not a judgement. Rules out the paste accident. */
export function looksLikeName(raw: string) {
  const value = normaliseName(raw);
  return value.length >= 2 && value.length <= 100 && /[a-z]/.test(value);
}

/** "building society" -> "Building Society". For display only; every match and
    every comparison is done on the normalised lower-case form. */
function titleCase(value: string) {
  return value.replace(/(^|[\s-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase());
}

function findSuffix(normalised: string) {
  for (const entry of SUFFIXES) {
    if (entry.pattern.test(normalised)) {
      return { ...entry, base: normalised.replace(entry.pattern, "").trim() };
    }
  }
  return null;
}

/**
 * Reads a proposed name against the rules, without touching the network.
 *
 * Synchronous and pure on purpose: it is cheap enough to run on every
 * keystroke if a caller wants to, it is trivial to test, and it cannot fail in
 * a way that needs handling.
 */
export function readName(raw: string, entity: EntityKind): NameReading {
  const normalised = normaliseName(raw);
  const findings: NameFinding[] = [];
  const suffix = findSuffix(normalised);

  /* THE SUFFIX RULE, AND IT CUTS BOTH WAYS.

     A business name (an enterprise, registered under Part E) is NOT an
     incorporated company and may not dress as one, so "Ltd" on the end of a
     business name is a rejection rather than a quibble. The other direction is
     the commoner mistake and is not a rejection at all: a company must END in
     Limited or Plc, and somebody filing "Wendi Loveee" as a company simply has
     it added. Saying so before they file saves the confusion, not the
     application. */
  if (entity === "business" && suffix?.incorporated) {
    findings.push({
      kind: "suffix",
      match: suffix.canonical,
      title: `A business name cannot end in ${suffix.canonical}`,
      detail:
        `Only a registered company may end in ${suffix.canonical}. Drop it, or ` +
        "register a company instead.",
    });
  }
  if (entity === "company" && !suffix) {
    findings.push({
      kind: "form",
      title: "Add Limited, Plc or Unlimited to the end",
      detail: "Nothing is wrong with the name. It just needs the ending. Most people use Limited.",
    });
  }

  /* THE CONSENT WORDS. Matched on whole words against the normalised form, so
     "Stateside" and "Grouper" do not trip it, and "Federal" at any position
     does. Reported once per word even if it appears twice. */
  const words = new Set(normalised.split(" "));
  for (const entry of CONSENT_WORDS) {
    const hit = entry.word.includes(" ")
      ? normalised.includes(entry.word)
      : words.has(entry.word);
    if (!hit) continue;
    findings.push({
      kind: "consent",
      match: entry.word,
      /* Title-cased and in real typographic quotes, so it reads back as the
         word sitting in THEIR name rather than as a row from a lookup table.
         A straight " renders as a slanted glyph in Outfit and made the opening
         quote look like a closing one. */
      title: `\u201C${titleCase(entry.word)}\u201D needs the Commission\u2019s consent`,
      /* SHORT. This used to run to 46 words and read like a letter from a
         solicitor. The reader needs three facts: it is allowed, it is slower,
         here is why. Everything else was us explaining ourselves. */
      detail: `Allowed, but ${entry.why}, so CAC checks it by hand and it takes longer.`,
    });
  }

  /* A NOTE, NOT A FINDING, and it is ours rather than the Commission's, which
     the copy has to say. A name made only of the words that describe the trade
     has nothing distinctive in it to tell it apart from the next one, and
     "calculated to deceive" under section 852(1) is measured against names
     that already exist. This is the one thing here we are not quoting law for,
     so it is the one thing phrased as an observation. */
  const base = suffix?.base ?? normalised;
  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 1 && parts[0].length <= 4 && parts[0].length > 0) {
    findings.push({
      kind: "note",
      title: "That is a very short name",
      detail: "Short names get taken first. Worth having a second choice ready.",
    });
  }

  return {
    normalised,
    suffix: suffix?.canonical ?? null,
    findings,
    clear: findings.length === 0,
  };
}

/**
 * What the register lookup should be asked, once there is one to ask.
 *
 * The suffix is stripped because the register is searched on the distinctive
 * part: "Wendi Loveee Limited" and "Wendi Loveee Enterprises" are the collision
 * worth knowing about, and searching the full string with its ending would miss
 * it. Exported here rather than written inline at the call site so the free
 * layer and the paid layer cannot drift apart about what the name IS.
 */
export function lookupKey(raw: string) {
  const normalised = normaliseName(raw);
  return findSuffix(normalised)?.base || normalised;
}
