import { isFilled, isVisible, stepsFor } from "./onboarding";
import { SIZE_KEY as APPS_SIZE_KEY } from "./onboarding-services/apps";
import { SIZE_KEY as BRANDING_SIZE_KEY } from "./onboarding-services/branding";
import { SIZE_KEY as SEO_SIZE_KEY } from "./onboarding-services/seo";
import { SIZE_KEY as SOCIAL_SIZE_KEY } from "./onboarding-services/social";
import { SIZE_KEY as SOFTWARE_SIZE_KEY } from "./onboarding-services/software";
import { SIZE_KEY as WEB_SIZE_KEY } from "./onboarding-services/web";
import { UNSURE, UNSURE_LEGACY, isUnsure, type Field } from "./onboarding-shared";
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

  /* "Do you have hosting and a domain" became "Do you have a website address".
     Having the domain is what both old yes answers meant. */
  const hosting = at(a, "has_hosting");
  if (typeof hosting === "string" && !isFilled(at(a, "has_domain"))) {
    out.has_domain = hosting === "Neither" ? "No" : hosting === "Both" || hosting === "Domain only" ? "Yes" : "Not sure";
  }

  /* One question about words and pictures became two. */
  const ready = at(a, "content_ready");
  if (typeof ready === "string") {
    const needed = asList(at(a, "content_needed")) ?? [];
    const help = ready === "I need WDC to produce them";
    const some = ready === "I have some of them";
    const words = help || (some && (needed.includes("Words") || needed.includes("Both")));
    const pictures = help || (some && (needed.includes("Photography") || needed.includes("Both")));
    if (!isFilled(at(a, "words_ready"))) out.words_ready = words ? "I need help" : "I have them";
    if (!isFilled(at(a, "pictures_ready"))) out.pictures_ready = pictures ? "I need help" : "I have them";
  }
  return out;
}

/* ------------------------------------------------------------ seo */

/** The old tick list named the tools more shortly than the new one does. */
const SEO_TOOL_NOW = new Map<string, string>([
  ["Search Console", "Google Search Console"],
  ["Analytics", "Google Analytics"],
  ["Google Business Profile", "Google Business Profile"],
  ["None of these", "None of these"],
]);

function seoRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const tools = asList(at(a, "tools_access"));
  if (tools && !isFilled(at(a, "seo_tools"))) {
    out.seo_tools = tools.filter((v) => SEO_TOOL_NOW.has(v)).map((v) => SEO_TOOL_NOW.get(v)!);
  }
  return out;
}

/* ------------------------------------------------------- branding */

/** "What exists today" became a tick list of what the client has. */
const BRAND_HAVE_FOR_STATE = new Map<string, string[]>([
  ["Nothing yet", ["Nothing yet"]],
  ["A logo only", ["A logo"]],
  ["A full identity needing a refresh", ["A logo", "A brand guide"]],
]);

function brandingRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const state = at(a, "brand_state");
  if (typeof state === "string" && BRAND_HAVE_FOR_STATE.has(state) && !isFilled(at(a, "brand_have"))) {
    out.brand_have = BRAND_HAVE_FOR_STATE.get(state)!;
  }
  return out;
}

/* ----------------------------------------------------------- apps */

const PLATFORM_NOW = new Map<string, string>([["iOS", "iPhone"], ["Android", "Android phone"]]);

function appsRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const platforms = asList(at(a, "platforms"));
  if (platforms) out.platforms = platforms.map((v) => PLATFORM_NOW.get(v) ?? v);
  /* The payments question became two items in the feature list. */
  const pay = at(a, "payments");
  if (typeof pay === "string" && pay !== "No" && !isUnsure(pay) && !isFilled(at(a, "app_features"))) {
    out.app_features = [pay === "Subscriptions" ? "Subscriptions" : "Take payments"];
  }
  return out;
}

/* --------------------------------------------------------- social */

/* The ad budget bands used an en dash. The new ones say "to". */
const AD_SPEND_NOW = new Map<string, string>([
  ["\u20a6100k\u2013\u20a6500k", "\u20a6100k to \u20a6500k"],
  ["\u20a6500k\u2013\u20a62m", "\u20a6500k to \u20a62m"],
]);
const ACCESS_NOW = new Map<string, string>([
  ["I can give WDC access", "I have them and can add you"],
]);
const HANDLE_KEYS = [
  "handle_instagram", "handle_facebook", "handle_x", "handle_tiktok", "handle_linkedin",
  "handle_youtube", "handle_pinterest", "handle_snapchat", "handle_whatsapp", "handle_other",
];

function socialRead(a: Answers): Answers {
  const out: Answers = { ...a };
  const spend = at(a, "ad_spend");
  if (typeof spend === "string" && AD_SPEND_NOW.has(spend)) out.ad_spend = AD_SPEND_NOW.get(spend)!;
  const access = at(a, "access_ok");
  if (typeof access === "string" && !isFilled(at(a, "social_access"))) out.social_access = ACCESS_NOW.get(access) ?? access;
  /* One handle each became one box of links. */
  if (!isFilled(at(a, "social_links"))) {
    const lines = HANDLE_KEYS.map((k) => at(a, k)).filter((v): v is string => typeof v === "string" && v.trim() !== "");
    if (lines.length) out.social_links = lines.join("\n");
  }
  return out;
}

/* ---------------------------------------------------------- the table */

const VIEWS: Partial<Record<ServiceSlug, (a: Answers) => Answers>> = {
  branding: brandingRead,
  web: webRead,
  seo: seoRead,
  apps: appsRead,
  social: socialRead,
};

/** The opening size question of each service that has one. */
const SIZE_KEY_BY_SERVICE: Partial<Record<ServiceSlug, string>> = {
  branding: BRANDING_SIZE_KEY,
  web: WEB_SIZE_KEY,
  seo: SEO_SIZE_KEY,
  apps: APPS_SIZE_KEY,
  software: SOFTWARE_SIZE_KEY,
  social: SOCIAL_SIZE_KEY,
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

/** Answers stored by something other than a visible question, with a readable name. */
const OTHER_LABELS: Record<string, string> = {
  brand_vibe: "The feeling they chose for their colours",
  brand_colour_source: "Where their colours came from",
  brand_colours_words: "Their colours, in their own words",
};

/**
 * Answers a brief holds that no question in the form asks any more: questions
 * cut or reworded in the redesign, and the extras the colour screen stores.
 * The admin lists them under "Earlier questions" so nothing a client typed
 * drops out of view. Empty answers and internal keys are left out.
 */
export function earlierAnswers(service: ServiceSlug, answers: Answers): { key: string; label: string; value: string }[] {
  const known = new Set(stepsFor(service).flatMap((s) => s.fields.map((f) => f.key)));
  return Object.entries(answers)
    .filter(([key, v]) => !known.has(key) && !key.startsWith("_") && !/^(website|company_url|hp_)/.test(key) && isFilled(v))
    .map(([key, v]) => ({
      key,
      label: OTHER_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
      value: Array.isArray(v) ? v.join(", ") : String(v),
    }));
}
