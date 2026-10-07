/**
 * THE VOICE OF THE FORM, as small pure functions (plans/onboarding-voice-guide.md).
 *
 * Nothing here invents anything. Every line is built from an answer the client
 * gave, or from the form's own structure, and falls back to a neutral phrase
 * when the answer is missing, so a half filled brief never reads "{company}".
 */
type Answers = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "").trim();
const list = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : []).map((x) => x.trim()).filter(Boolean);

/** "a, b and c". */
export function joinNames(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Fills {first_name}, {company} and any other answer key into copy. A fallback
 * follows a bar: "{company|your business}". With no fallback, a missing answer
 * leaves nothing behind but tidy spacing.
 */
export function fill(text: string, answers: Answers): string {
  return text
    .replace(/\{([a-z_]+)(?:\|([^}]*))?\}/g, (_m, key: string, fallback?: string) => first(answers[key]) || fallback || "")
    .replace(/\s+([,.?!:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ---------------------------------------------------------------- examples */

type Example = { job: string; terms: string; goal: string; success: string; pains: string };

/** The example inside a text box, from the client's industry. */
const BY_INDUSTRY: Record<string, Example> = {
  "Fashion and apparel": { job: "Lets customers browse outfits and order", terms: "custom tailoring near me", goal: "Sell our new collection online", success: "20 orders a month", pains: "Orders arrive on WhatsApp and get lost" },
  "Food and drink": { job: "Lets customers order cakes and pay", terms: "birthday cake delivery near me", goal: "Take cake orders without chasing on WhatsApp", success: "30 orders a week", pains: "Every order is typed out by hand" },
  "Retail and e-commerce": { job: "Lets customers shop and track their order", terms: "buy phone accessories online", goal: "Sell online as well as in the shop", success: "50 online orders a month", pains: "Stock counts never match" },
  "Health and wellness": { job: "Lets patients book a visit", terms: "dentist near me", goal: "Fill our appointment diary", success: "40 bookings a month", pains: "Appointments are booked by phone and double booked" },
  "Education": { job: "Lets parents see fees and pay", terms: "best primary school near me", goal: "Get more enquiries from parents", success: "15 enquiries a term", pains: "Results and fees are tracked on paper" },
  "Property and construction": { job: "Lets buyers see listings and enquire", terms: "land for sale near me", goal: "Get more serious enquiries", success: "10 enquiries a month", pains: "Listings are scattered across chats" },
  "Financial services": { job: "Lets customers check their account and request help", terms: "small business loan", goal: "Win more applications", success: "25 applications a month", pains: "Forms are filled in on paper and re typed" },
  "Technology": { job: "Lets teams do the task in one place", terms: "project management software for small teams", goal: "Get more demo requests", success: "20 demo requests a month", pains: "We copy data between tools" },
  "Travel and hospitality": { job: "Lets guests book a stay and pay", terms: "weekend getaway near me", goal: "Take more direct bookings", success: "30 direct bookings a month", pains: "Bookings come from five places" },
  "Non-profit": { job: "Lets supporters donate and see what it did", terms: "donate to education charity", goal: "Raise more from small donors", success: "100 donors a quarter", pains: "Donations are tracked in a spreadsheet" },
  "Professional services": { job: "Lets clients request a quote and book a call", terms: "accountant for small business", goal: "Get more quote requests", success: "15 quote requests a month", pains: "Enquiries come from everywhere and get missed" },
};
const GENERIC: Example = {
  job: "Lets customers do the main thing and pay",
  terms: "the thing you sell, near me",
  goal: "Get more of the right customers",
  success: "20 enquiries a month",
  pains: "Work is repeated by hand",
};

export function exampleFor(kind: keyof Example, answers: Answers): string {
  const industry = first(answers.industry);
  return (BY_INDUSTRY[industry] ?? GENERIC)[kind];
}

/* -------------------------------------------------------- reflect back */

/**
 * One plain line after a screen, built only from what was picked. Returns
 * null when there is nothing honest to say, so a screen that was skipped gets
 * no line rather than a made up one.
 */
export function echoFor(stepId: string, answers: Answers): string | null {
  const name = first(answers.first_name);
  if (stepId === "you" && name) return `Good to meet you, ${name}.`;
  if (stepId === "branding") {
    const picked = list(answers.deliverables).filter((d) => d !== "Other");
    if (picked.length) return `${joinNames(picked.slice(0, 3).map((d) => d.toLowerCase()))}${picked.length > 3 ? " and more" : ""}. A good place to start.`;
  }
  if (stepId === "web") {
    const jobs = list(answers.site_jobs).filter((j) => j !== "Something else");
    if (jobs.length) return `A site to ${joinNames(jobs.slice(0, 3).map((j) => j.toLowerCase()))}. Clear.`;
  }
  if (stepId === "apps") {
    const where = list(answers.platforms);
    if (where.length) return `An app for ${joinNames(where.map((w) => w.toLowerCase()))}. Noted.`;
  }
  if (stepId === "social") {
    const packs = list(answers.social_packages);
    if (packs.length) return `${joinNames(packs.map((p) => p.toLowerCase()))}. We have it.`;
  }
  return null;
}

/* ------------------------------------------------------------- progress */

/** A short line at the halfway mark and near the end, and nothing the rest of the time. */
export function milestone(screenIndex: number, screenCount: number): string | null {
  if (screenCount < 4) return null;
  const done = (screenIndex + 1) / screenCount;
  if (screenIndex + 1 === screenCount) return "Last one. Then you review and send.";
  if (done >= 0.5 && done < 0.5 + 1 / screenCount) return "Halfway. The hard part is done.";
  if (screenIndex + 2 === screenCount) return "Nearly there.";
  return null;
}

/** The button names the screen it leads to. */
export function nextLabel(nextTitle: string | undefined): string {
  return nextTitle ? `Next: ${nextTitle.charAt(0).toLowerCase()}${nextTitle.slice(1)}` : "Review and send";
}
