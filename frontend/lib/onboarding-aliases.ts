import { isFilled, isVisible } from "./onboarding";
import { SIZE_KEY as SEO_SIZE_KEY } from "./onboarding-services/seo";
import { SIZE_KEY as WEB_SIZE_KEY } from "./onboarding-services/web";
import { UNSURE, UNSURE_LEGACY, type Field } from "./onboarding-shared";
import type { ServiceSlug } from "./services";

/**
 * Old stored answers, read as the current questions would show them.
 *
 * NOTHING IS MIGRATED. Every function here returns a new object for display
 * (the review screen, the admin entry page and the answered count). The stored
 * answers are never written back, so an old brief reads the same in the
 * database as the day it was sent. When a value changed, the old one is
 * mapped on read.
 *
 * ADDING A SERVICE. Add a `read` function to `VIEWS` for the old values that
 * changed, and its size key to `SIZE_KEY_BY_SERVICE` if it has an opening
 * size question. Keep the step files as the only place a new value is
 * defined.
 */

type Answers = Record<string, string | string[]>;

/** The value under a key, typed the way the form stores it. */
const at = (a: Answers, key: string): string | string[] | undefined => a[key];

/** A list-shaped answer as a list. Older single-value answers become one item. */
const asList = (v: string | string[] | undefined): string[] | undefined =>
  Array.isArray(v) ? v : typeof v === "string" && v ? [v] : undefined;

/* ---------------------------------------------------------- shared */

/** The semicolon "not sure" stored before 7 October 2026. Shown in the current wording. */
const unsureNow = (v: string) => (v === UNSURE_LEGACY ? UNSURE : v);

function sharedRead(a: Answers): Answers {
  const out: Answers = {};
  for (const [key, v] of Object.entries(a)) {
    out[key] = Array.isArray(v) ? v.map(unsureNow) : unsureNow(v);
  }
  return out;
}

/* ------------------------------------------------------------ web */

/* The en dash ranges stored before the redesign, in the escaped form so this
   file holds no dash in copy. The new options say "1 to 5". */
const PAGE_COUNT_NOW = new Map<string, string>([
  ["1–5", "1 to 5"],
  ["6–15", "6 to 15"],
  ["16–40", "16 to 40"],
]);

/* The three "features" that were really jobs the site must do. They moved to
   "What should the site do for you?" and are removed from the features list. */
const JOB_FOR_FEATURE = new Map<string, string>([
  ["Online store", "Sell online"],
  ["Bookings", "Take bookings"],
  ["Members area", "A members only area"],
]);

function webRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const pages = at(a, "page_count");
  if (typeof pages === "string" && PAGE_COUNT_NOW.has(pages)) out.page_count = PAGE_COUNT_NOW.get(pages)!;

  /* Only when the new question is still empty. An answer given to the new
     question always wins over an old one. */
  const features = asList(at(a, "features"));
  if (features && !isFilled(at(a, "site_jobs"))) {
    const jobs = features.filter((v) => JOB_FOR_FEATURE.has(v)).map((v) => JOB_FOR_FEATURE.get(v)!);
    if (jobs.length) {
      out.site_jobs = [...new Set(jobs)];
      out.features = features.filter((v) => !JOB_FOR_FEATURE.has(v));
    }
  }
  return out;
}

/* ------------------------------------------------------------ seo */

/** Search Console, Analytics and Google Business Profile were ticks in one list. */
const TOOL_KEYS: [string, string][] = [
  ["has_search_console", "Search Console"],
  ["has_analytics", "Analytics"],
  ["has_gbp", "Google Business Profile"],
];

function seoRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const tools = asList(at(a, "tools_access"));
  if (!tools) return out;
  for (const [key, tool] of TOOL_KEYS) {
    /* A newer answer to the new question always wins. */
    if (isFilled(at(a, key))) continue;
    /* A tool that was not ticked reads as "No". The old question asked what
       the client already has, so an unticked box is the answer no. */
    out[key] = tools.includes(tool) ? "Yes" : "No";
  }
  return out;
}

/* ---------------------------------------------------------- the table */

const VIEWS: Partial<Record<ServiceSlug, (a: Answers) => Answers>> = {
  web: webRead,
  seo: seoRead,
};

/** The opening size question of each service that has one. */
const SIZE_KEY_BY_SERVICE: Partial<Record<ServiceSlug, string>> = {
  web: WEB_SIZE_KEY,
  seo: SEO_SIZE_KEY,
};

/**
 * The answers as the current form would describe them. Use this wherever a
 * stored brief is read for display; never to save anything.
 */
export function displayAnswers(service: ServiceSlug, answers: Answers): Answers {
  const read = sharedRead(answers);
  return VIEWS[service]?.(read) ?? read;
}

/**
 * Is this question shown for a stored brief? The form's own rule (isVisible)
 * decides for every brief sent since the size question existed. A brief with
 * no size answer predates it, and the old form asked every question, so any
 * question with an answer is shown. Without this a legacy brief would hide
 * its tier 2 answers, which is the one thing the admin must not do.
 */
export function shownInBrief(service: ServiceSlug, field: Pick<Field, "key" | "showIf">, answers: Answers): boolean {
  if (isVisible(field, answers)) return true;
  const size = SIZE_KEY_BY_SERVICE[service];
  return size !== undefined && !isFilled(at(answers, size)) && isFilled(at(answers, field.key));
}
