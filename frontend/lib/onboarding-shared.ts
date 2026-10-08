import type { ServiceSlug } from "./services";

/**
 * The shapes and the few constants every part of the onboarding form shares.
 *
 * ITS OWN FILE so the per-service step files (./onboarding-services/*.ts) can
 * import them without importing ./onboarding.ts, which imports them: a circle
 * that would leave `UNSURE` undefined at the moment a service file reads it.
 * ./onboarding.ts re-exports everything here, so no other import changes.
 */

export type FieldKind =
  | "text" | "email" | "tel" | "url" | "textarea"
  | "cards" | "multi" | "select" | "yesno" | "upload" | "date" | "profiles" | "fonts"
  /* Read-only text shown between questions: an early notice (what we do not
     build) or a note. It asks nothing, stores nothing, is never validated and
     is not counted as a question. `label` is its title and `hint` its text. */
  | "notice"
  /* The colour flow: a feeling, a ready made palette, "Yes, use these", with
     deeper paths for a logo, codes or words. Stored in the existing readable
     `Name | #HEX | Role` lines (lib/brand-colours.ts); the extra answers it
     collects (brand_vibe, brand_colour_source, brand_colours_words) are saved
     under their own keys. */
  | "colours"
  /* Up to three names with an explicit availability check against the
     registry. Stored newline separated, so the answer is a plain string like
     every other field and no draft or submission needed migrating. */
  | "domains";

/**
 * What a client says when they do not know, and it is recorded as the answer.
 *
 * The welcome screen promises that "not sure yet" is a real answer and will
 * not hold anything up. That promise was only kept on the six `cards` fields
 * that happened to carry a "Not sure" option; every required text field broke
 * it, and a client who did not know was simply stuck. This is the general
 * version of it.
 *
 * It is stored as a sentence rather than a sentinel because it is REAL
 * INFORMATION, not a gap: "the client wants our recommendation on their search
 * terms" is a finding that shapes the work and the first call. A blank field
 * says nothing; this says something.
 */
export const UNSURE = "I'm not sure, please advise me";
/** The wording stored before 7 October 2026 (a semicolon). Old drafts and
    submissions still hold it, so it still reads as "not sure". */
export const UNSURE_LEGACY = "I'm not sure; please advise me";
export const isUnsure = (v: unknown) => v === UNSURE || v === UNSURE_LEGACY;
export const PROJECT_UPDATE_PORTAL = "Client portal";

/** One test on an earlier answer. `equals`: it holds one of these. `filled`: it
    has any answer at all. Both given means both must hold. */
export type Leaf = { key: string; equals?: string[]; filled?: boolean };

/**
 * A condition. A plain test on one answer, or:
 * - `{ any: [...] }`: at least one of the listed conditions holds. This is how
 *   a LATER PICK RAISES THE TIER: a small job that ticks Brand guidelines still
 *   reaches the colour question, because "size is medium or more, OR the
 *   deliverables include guidelines".
 * - `{ tier: 2 }`: the job size the client gave is at least this tier. See
 *   `tierOf`. Tier 1 is always asked, so only 2 and 3 are ever written.
 */
export type Cond = Leaf | { any: Cond[] } | { tier: 2 | 3 };

/**
 * The opening "how big is the job" question of each service, and what each
 * answer means. The client answers in plain words and the studio's own label
 * is never shown to them. An answer of "not sure" counts as tier 2, so a
 * client who cannot say is asked the middle set rather than the smallest.
 */
export const SIZE_TIER: Record<string, 1 | 2 | 3> = {
  /* branding */
  "One piece or a small set": 1, "Several pieces": 2, "A full brand": 3,
  /* web */
  "A simple site": 1, "A bigger site": 2, "A large site": 3,
  /* seo */
  "One site, one place": 1, "A growing site": 2, "A big site or many places": 3,
  /* apps, software and social */
  "Small": 1, "Medium": 2, "Large": 3,
};
export const SIZE_KEYS = ["job_size", "site_size", "seo_size", "app_size", "sw_size", "social_size"] as const;

export type OptionInfo = {
  desc?: string;
  images?: string[];
  /** Hex colours for a palette card, shown as a strip of swatches. */
  swatches?: string[];
};

export type Field = {
  key: string;
  label: string;
  kind: FieldKind;
  /**
   * Offer the "not sure" escape on this question.
   *
   * Set on questions of JUDGEMENT -- the ones a client is often paying us to
   * answer -- and not on questions of FACT, where the client is the only
   * possible source and an escape would just lose us the answer. Nobody but
   * the client knows their phone number; plenty of clients have no idea what
   * their customers type into Google, and pretending otherwise produces a
   * made-up answer that is worse than an honest blank.
   */
  assist?: boolean;
  /**
   * Shown under the label, always visible.
   *
   * ONLY WHERE THE QUESTION CANNOT BE ANSWERED WITHOUT IT. A question that
   * needs an explanation to be understood is not a question with a hint, it is
   * a badly worded question, and the explanation is part of it. Everything
   * else that used to live here is background, and background belongs in
   * `tip`.
   */
  hint?: string;
  /**
   * Background, behind a question mark in a circle.
   *
   * Useful to the client who wants it and invisible to the client who does
   * not. Every hint used to be always-on, which on a phone turned a
   * six-question step into a page of prose the reader had to scroll past
   * whether or not they cared.
   */
  tip?: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  /**
   * Only shown when the condition holds. A list means ALL of them must hold
   * (an answer AND a job size, for example). Evaluate with `isVisible`, never
   * by hand: six places used to copy the same four lines.
   */
  showIf?: Cond | Cond[];
  /**
   * A line of explanation and a picture or two for an option, shown on its
   * card. Pictures are paths under /public. Keyed by the option text.
   */
  optionInfo?: Record<string, OptionInfo>;
  /** A long list of options, grouped under headings and searchable. */
  groups?: { name: string; options: string[] }[];
  /** Take the example inside this text box from the client's industry
      (lib/onboarding-voice.ts). The placeholder reads "For example: ...". */
  example?: "job" | "terms" | "goal" | "success" | "pains";
  /** For a grouped list: the few options shown first, with the rest behind
      "See all". Keeps a 30 item list from being a wall on a phone. */
  popular?: string[];
  /**
   * Says that answering this way takes the work outside what was paid for.
   *
   * ALWAYS VISIBLE, never behind the question mark, and that is the whole
   * point of it being its own property rather than a `tip`. A `tip` is
   * background for the client who wants it; this is a commercial fact the
   * client has to see BEFORE they answer, because answering yes is them asking
   * for something they have not bought. Hiding it would be the kind of quiet
   * upsell this studio does not do.
   *
   * It never carries a number. Nothing is charged from this form; the sentence
   * a `scope` line makes is always some version of "this is extra, and we will
   * quote it before anything starts".
   */
  scope?: string;
  /**
   * Services this question is NOT asked of.
   *
   * The closing steps are shared by all six, which is right for "who signs
   * work off" and wrong for "would you like us to design a logo" -- offering a
   * branding client the thing they have just bought reads as not having read
   * their own order.
   */
  notFor?: ServiceSlug[];
  /**
   * The same question worded for one service. A shared closing question has
   * to make sense under every service: "in a few days" is a fair answer for a
   * flyer and a silly one for an app, and "when do you need it" means nothing
   * to a search client whose work simply starts. Applied in stepsFor.
   */
  byService?: Partial<Record<ServiceSlug, Partial<Pick<Field, "label" | "hint" | "options">>>>;
};


export type PhaseId = "you" | "work" | "final";

export type Step = {
  id: string;
  title: string;
  /** One line under the step title, and the same line in the rail. */
  blurb: string;
  /** Which of the three parts above this step belongs to. */
  phase: PhaseId;
  /** Absent means the step is part of the common core. */
  service?: ServiceSlug;
  fields: Field[];
};
