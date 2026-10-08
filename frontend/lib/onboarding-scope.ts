import { isFilled, isUnsure, tierOf } from "./onboarding";
import type { ServiceSlug } from "./services";

/**
 * THE STUDIO'S NOTE ON A BRIEF (plan 6.4). Shown in the admin beside the
 * answers, never to the client.
 *
 * DERIVED, NEVER INVENTED. Every line below is read straight off an answer the
 * client gave: how big they said the job was, what they asked for, and the
 * answers that usually change how a job is run (a near date, a payment
 * provider, an app that holds personal data). There are no scores and no
 * estimates, because a number made up here would look like a measurement.
 * Computed when read, so it is always in step with the answers and nothing is
 * stored.
 */
type Answers = Record<string, string | string[]>;

export type ScopeNote = {
  /** The size, in the client's own words, and the tier it maps to. */
  size: { said: string; tier: 1 | 2 | 3 };
  /** Plain facts worth a glance before the first call. */
  signals: { label: string; value: string }[];
  /** Things that usually need attention early. */
  watch: string[];
};

const list = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []);
const text = (v: string | string[] | undefined) => list(v).join(", ");
const has = (a: Answers, key: string, ...values: string[]) => list(a[key]).some((x) => values.includes(x));

const SIZE_KEY: Record<ServiceSlug, string> = {
  branding: "job_size", web: "site_size", seo: "seo_size", apps: "app_size", software: "sw_size", social: "social_size",
};

export function scopeNote(service: ServiceSlug, a: Answers): ScopeNote {
  const signals: ScopeNote["signals"] = [];
  const watch: string[] = [];
  const add = (label: string, v: string | string[] | undefined) => { if (isFilled(v)) signals.push({ label, value: text(v) }); };

  /* Shared across every service. */
  if (has(a, "deadline_kind", "In a few days")) watch.push("Needs it in a few days.");
  if (has(a, "deadline_kind", "Within a week")) watch.push("Needs it within a week.");
  if (has(a, "deadline_kind", "Within two weeks")) watch.push("Needs it within two weeks.");
  if (has(a, "deadline_kind", "A set date")) watch.push(`Has a set date${isFilled(a.fixed_dates) ? `: ${text(a.fixed_dates)}` : ""}.`);
  add("Update channel", a.channel);

  switch (service) {
    case "branding": {
      add("Making", a.deliverables);
      add("Rhythm", a.job_rhythm);
      add("Batch size", a.batch_count);
      add("Has already", a.brand_have);
      add("Colour feeling", a.brand_vibe);
      add("Style route", a.style_help);
      if (has(a, "deliverables", "Motion design")) watch.push(`Motion design asked for${isFilled(a.motion_kinds) ? `: ${text(a.motion_kinds)}` : ""}.`);
      if (has(a, "brand_have", "Nothing yet") && has(a, "deliverables", "Flyers", "Social templates", "Promotional branding")) watch.push("No identity to build from, but asking for flyers or templates.");
      if (has(a, "job_rhythm", "Every month")) watch.push("A monthly service, not a one off.");
      if (has(a, "style_directions", "Yes")) watch.push("Wants to see directions before the work starts.");
      break;
    }
    case "web": {
      add("Doing", a.site_jobs);
      add("Pages", a.page_count);
      add("New or existing", a.site_new_or_existing);
      add("Payment providers", a.pay_providers);
      add("Domain", a.has_domain);
      if (has(a, "site_new_or_existing", "Improving an existing site")) watch.push("An existing site: check what has to move across.");
      if (has(a, "free_review", "Yes")) watch.push("Asked for the free review.");
      if (has(a, "site_jobs", "Sell online")) watch.push("Takes payments: confirm the provider and its limits for this kind of site.");
      if (has(a, "site_jobs", "A members only area")) watch.push("Has a members only area.");
      if (has(a, "words_ready", "I need help") || has(a, "pictures_ready", "I need help")) watch.push("Needs words or pictures from the studio.");
      if (has(a, "has_domain", "No") && has(a, "hosting_wanted", "Yes")) watch.push("Wants the domain and hosting bought for them, in their name.");
      break;
    }
    case "seo": {
      add("Customers", a.customers);
      add("Goals", a.seo_goals);
      add("Run for", a.seo_timeframe);
      add("Tools they have", a.seo_tools);
      add("Writes content", a.content_owner);
      if (has(a, "seo_goals", "Show up in AI answers")) watch.push("Wants to show up in AI answers.");
      if (has(a, "customers", "Near me", "A mix")) watch.push(`Local customers${isFilled(a.geo) ? `: ${text(a.geo)}` : ""}.`);
      if (has(a, "has_site", "I do not have one yet")) watch.push("No website yet.");
      if (has(a, "content_owner", "Nobody yet", "I would like WDC to")) watch.push("Nobody writes the content: pages may be needed first.");
      break;
    }
    case "apps": {
      add("Used on", a.platforms);
      add("Stage", a.app_stage);
      add("Main job", a.one_job);
      add("Features", a.app_features);
      add("Connects to", a.app_connects);
      if (list(a.platforms).length >= 3) watch.push(`${list(a.platforms).length} platforms: plan each store and each screen size.`);
      if (has(a, "app_stage", "An app to rebuild or extend")) watch.push("Rebuild or extend: look at the current app first.");
      if (has(a, "store_accounts", "Neither", "One of them")) watch.push("Missing store developer accounts.");
      if (isFilled(a.app_data) && !has(a, "app_data", "Other")) watch.push(`Holds personal information: ${text(a.app_data)}.`);
      if (has(a, "offline", "Yes", "Only some parts")) watch.push("Must work offline.");
      break;
    }
    case "software": {
      add("Kind of help", a.sw_kind);
      add("What slows them down", a.sw_pains);
      add("Connects to", a.sw_tools);
      add("Data rules", a.sw_ai_rules);
      add("Information lives in", a.data_home);
      if (has(a, "sw_kind", "An AI assistant or chatbot")) watch.push("An AI assistant: agree who checks what it says.");
      if (isFilled(a.sw_ai_rules) && !has(a, "sw_ai_rules", "No special rules")) watch.push(`Has data rules: ${text(a.sw_ai_rules)}.`);
      if (list(a.sw_tools).length >= 3) watch.push("Several systems to connect.");
      break;
    }
    case "social": {
      add("Packages", a.social_packages);
      add("Platforms", a.channels);
      add("Accounts", a.social_access);
      add("Ad budget", a.ad_spend);
      add("Approves posts", a.social_approval_speed);
      if (has(a, "social_packages", "Paid ads")) watch.push("Paid ads: ad spend is paid to the platform, separate from the fee.");
      if (has(a, "social_access", "I do not have them, please set them up", "I have some, please help with the rest")) watch.push("Accounts need setting up.");
      if (list(a.channels).length >= 4) watch.push(`${list(a.channels).length} platforms.`);
      break;
    }
  }

  /* How many answers were "not sure": each one is a topic for the first call. */
  const unsure = Object.values(a).filter((v) => (Array.isArray(v) ? v.some(isUnsure) : isUnsure(v))).length;
  if (unsure > 0) watch.push(`${unsure} ${unsure === 1 ? "answer was" : "answers were"} "not sure": the client wants a recommendation.`);

  const said = text(a[SIZE_KEY[service]]);
  return { size: { said, tier: tierOf(a) }, signals, watch };
}
