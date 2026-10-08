import { colourProblem } from "@/lib/brand-colours";
import type { ServiceSlug } from "@/lib/services";
import { PROJECT_UPDATE_PORTAL, SIZE_KEYS, SIZE_TIER, isUnsure, type Cond, type Field, type FieldKind, type PhaseId, type Step } from "./onboarding-shared";
import { BRANDING_STEPS } from "./onboarding-services/branding";
import { SEO_STEPS } from "./onboarding-services/seo";
import { WEB_STEPS } from "./onboarding-services/web";
import { APPS_STEPS } from "./onboarding-services/apps";
import { SOFTWARE_STEPS } from "./onboarding-services/software";
import { SOCIAL_STEPS } from "./onboarding-services/social";

export * from "./onboarding-shared";

/**
 * The onboarding form's questions.
 *
 * DATA, NOT MARKUP. Every question lives here and the form renders whatever it
 * finds, so adding a field is one entry rather than a component change, and
 * the inventory in the plan and the thing on screen cannot drift apart.
 *
 * WHAT IS DELIBERATELY NOT ASKED. No prices, and no request for money.
 * Onboarding opens after payment, so fees were agreed by a person before this
 * link was ever sent. The one money question that remains is `ad_spend`, and
 * that is media spend paid to a platform rather than a fee paid to us, which is
 * why its label says so.
 *
 * WHAT IS SAID, THOUGH, IS WHEN AN ANSWER TAKES THE WORK OUTSIDE WHAT WAS
 * BOUGHT. A client buying a website who answers "no" to "do you have a logo"
 * has just told us there is no identity to build the site out of, and the form
 * used to simply move on -- which leaves them stuck and leaves us discovering
 * it in week two. Those answers now carry an offer, and every offer carries a
 * `scope` line saying plainly that it is extra and will be quoted first. That
 * is not a price and it is not a charge; it is the difference between a form
 * that collects answers and one that tells you where you stand.
 *
 * Answers are validated in the browser for immediate feedback and again by
 * the server before CockroachDB accepts a completed submission. Drafts use the
 * same field inventory so the saved state, review screen, and submitted record
 * cannot drift apart.
 */

/**
 * THE THREE PARTS OF THE FORM, and the reason they exist.
 *
 * A client who bought three services used to be met with "Step 1 of 11". That
 * number is the first thing they read and the only thing they remember, and it
 * reads as a warning rather than as information -- the honest reaction to it
 * is "not now". The form was not too long; the COUNTER was too loud, and it
 * was counting the wrong unit.
 *
 * So the unit changed. Eleven steps is daunting, three parts is not, and "the
 * second of three questions about your business" is a shape a person can hold
 * in their head. The exact position is still available to anyone who wants it,
 * in the rail; it is simply no longer the headline.
 *
 * The parts are also honest about what they hold: the first is quick and
 * mostly confirmation, the middle is the real brief and varies with what was
 * bought, and the last is short. Saying that is worth more than hiding the
 * length, because a client who knows the shape of a task does not have to
 * fear it.
 */

export const PHASES: { id: PhaseId; title: string; blurb: string }[] = [
  { id: "you", title: "About you", blurb: "Quick ones. Mostly confirming what we already have." },
  { id: "work", title: "The work", blurb: "The brief itself. This is the part that shapes what we build." },
  { id: "final", title: "Finishing up", blurb: "Assets, approvals, and anything we have not thought to ask." },
];


const AUDIENCE = ["Children", "Teenagers", "Men", "Women", "Businesses", "Other"];
const AGES = ["Under 18", "18 to 34", "35 to 54", "55 or above"];
const REGISTRARS = ["CAC business name (BN)", "CAC company (RC)", "CAC incorporated trustees (IT)", "SMEDAN", "A professional body", "Another registrar"];
const COMPANY_AGES = ["Under 5 years", "5 to 10 years", "10 to 15 years", "15 to 20 years", "Over 20 years"];

/**
 * THE SHARED SCREENS, TRIMMED FOR A CLIENT WHO HAS ALREADY PAID AND SPOKEN TO
 * THE TEAM (plans/onboarding-ux-research.md, E0).
 *
 * By this file's own time weights the old "About you" and "Finishing up" cost
 * about six of the roughly seven minutes a small job took, before any question
 * about the service. Now: who you are and how to reach you, then your business
 * in three taps, and nothing that only matters on a large job is asked of a
 * small one. Every question left either decides the quote or the first week.
 *
 * Questions that were cut or moved keep their stored keys in old answers, and
 * the admin lists any answer whose question no longer exists under "Earlier
 * questions", so nothing a client typed is lost from view.
 */
export const CORE_STEPS: Step[] = [
  {
    phase: "you", id: "you",
    title: "Let's start with you",
    blurb: "Four quick things, so we know who to talk to. A star means we need it.",
    fields: [
      { key: "first_name", label: "First name", kind: "text", placeholder: "e.g. Tobi", required: true },
      { key: "last_name", label: "Last name", kind: "text", placeholder: "e.g. Adeyemi", required: true },
      {
        key: "phone", label: "Your number", kind: "tel", required: true,
        hint: "WhatsApp is fine. It is the fastest way to reach you.",
        placeholder: "+234 802 123 4567",
      },
      { key: "email", label: "Email", kind: "email", placeholder: "you@business.com", required: true },
    ],
  },
  {
    phase: "you", id: "business",
    title: "Now, about your business",
    blurb: "Thanks, {first_name}. A few taps, so the work fits what you do.",
    fields: [
      { key: "company", label: "Business name", kind: "text", placeholder: "e.g. Moore Designs", required: true },
      {
        key: "industry", label: "Industry", kind: "select",
        options: [
          "Fashion and apparel", "Food and drink", "Retail and e-commerce", "Health and wellness",
          "Education", "Property and construction", "Financial services", "Technology",
          "Travel and hospitality", "Non-profit", "Professional services", "Other",
        ],
      },
      {
        key: "industry_other", label: "Which industry?", kind: "text",
        placeholder: "Tell us in a few words",
        showIf: { key: "industry", equals: ["Other"] },
      },
      { key: "audience", assist: true, label: "Who do you sell to?", kind: "multi", options: AUDIENCE },
      { key: "audience_other", label: "Tell us who else you need to reach", kind: "text", showIf: { key: "audience", equals: ["Other"] } },
      /* Asked here, with the rest of the business, from a bigger job up: a
         small job rarely needs it, and a client who has just said who they sell
         to is already in the middle of describing the company. */
      { key: "company_age", label: "How long has the business been running?", kind: "select", options: COMPANY_AGES, showIf: { tier: 2 } },
      {
        key: "about", label: "Tell us about your company", kind: "textarea",
        placeholder: "What you do, who for, and what you are proud of. A few lines is plenty.",
        showIf: { tier: 2 },
      },
      { key: "age_range", assist: true, label: "How old are your customers?", kind: "multi", options: AGES, showIf: { tier: 2 } },
      /* The details a brand guide prints on its first pages. From a bigger job
         up, and always for an identity or a guide, whatever the size. */
      {
        key: "registered", label: "Is your business registered?", kind: "yesno",
        showIf: { any: [{ tier: 2 }, { key: "deliverables", equals: ["Full identity system", "Brand guidelines"] }] },
      },
      {
        key: "registration_body", label: "Registered with", kind: "select", options: REGISTRARS,
        showIf: { key: "registered", equals: ["Yes"] },
      },
      {
        key: "registration_body_other", label: "Which body?", kind: "text", placeholder: "For example, a trade or professional association",
        showIf: [{ key: "registered", equals: ["Yes"] }, { key: "registration_body", equals: ["A professional body", "Another registrar"] }],
      },
      {
        key: "registration_number", label: "Registration number", kind: "text", placeholder: "For example BN 1234567 or RC 1234567",
        hint: "Optional. It goes on your documents and guide, and we check it before we use it.",
        showIf: { key: "registered", equals: ["Yes"] },
      },
      {
        key: "online_presence", label: "Where can people find you online?", kind: "profiles",
        hint: "Your website and social pages, if you have them. We can put them on flyers and cards. Optional.",
        notFor: ["social"],
        showIf: { any: [{ tier: 2 }, { key: "deliverables", equals: ["Full identity system", "Brand guidelines", "Flyers", "Social templates", "Promotional branding", "Stationery and cards", "Signage", "Packaging", "Pitch deck"] }] },
      },
    ],
  },
];

export const SERVICE_STEPS: Step[] = [
  ...BRANDING_STEPS, ...SEO_STEPS, ...WEB_STEPS, ...APPS_STEPS, ...SOFTWARE_STEPS, ...SOCIAL_STEPS,
];

const FIXED_DATE_ANSWERS = ["A set date"];

export const CLOSING_STEPS: Step[] = [
  {
    phase: "final", id: "working",
    title: "When, and who gives the final yes",
    blurb: "So we plan around your dates and one clear decision maker.",
    fields: [
      {
        key: "deadline_kind", label: "When do you need it?", kind: "cards",
        hint: "Small jobs can be quick: a flyer in as little as two days, a logo in three or four. We confirm a real date with you.",
        options: ["No fixed date", "In a few days", "Within a week", "Within two weeks", "Within a month", "In one to three months", "A set date"],
      },
      {
        key: "fixed_dates", label: "Which date?", kind: "date",
        placeholder: "Pick the date", hint: "A launch, an event or a print deadline.",
        showIf: { key: "deadline_kind", equals: FIXED_DATE_ANSWERS },
      },
      { key: "approver", label: "Who gives the final yes?", kind: "text", required: true, hint: "One person, so feedback has one door.", tip: "Projects slow down most when feedback arrives from several directions and disagrees with itself." },
      { key: "channel", label: "Where should we send project updates?", kind: "multi", required: true,
        hint: "Pick as many as you like. The client portal is ticked for you.",
        tip: "Client portal: your home for the project. Files, approvals, invoices and every update in one place. WhatsApp: we can set up a WhatsApp group with you for the project, so you hear from us day to day, and we may place calls there to talk things through. Email: written updates and summaries you can keep. Phone call: if you would rather talk, we will do our best to keep most things to the number you gave us. Google Meet: for some projects we include a video call to walk through work together. Other: tell us what suits you.",
        options: [PROJECT_UPDATE_PORTAL, "WhatsApp", "Email", "Phone call", "Google Meet", "Other"] },
      { key: "channel_other", label: "Which other channel would you prefer?", kind: "text", showIf: { key: "channel", equals: ["Other"] } },
    ],
  },
  {
    phase: "final", id: "brand",
    title: "Anything you can send us now",
    blurb: "Skip what you do not have. None of it holds you up.",
    fields: [
      { key: "has_logo", label: "Do you have a logo?", kind: "yesno", notFor: ["branding"] },
      { key: "logo_files", label: "Upload your logo files", kind: "upload", notFor: ["branding"], showIf: { key: "has_logo", equals: ["Yes"] } },
      /* "No" WAS A DEAD END and is the most consequential answer here: a client
         with no logo has no identity for the work to be built out of. */
      {
        key: "logo_wanted", label: "Would you like us to design one?", kind: "yesno",
        notFor: ["branding"],
        showIf: { key: "has_logo", equals: ["No"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Saying no stops nothing. We will work with what you have and keep the design plain enough that a logo drops into it later without a rebuild.",
      },
      /* The colour flow, offered to the five services that are not branding
         only when there is no logo to read colours from. */
      { key: "brand_colours", label: "Your colours", kind: "colours", notFor: ["branding"], showIf: { key: "has_logo", equals: ["No"] } },
      {
        key: "has_brandbook", label: "Do you have a brand guide?", kind: "cards", notFor: ["branding"],
        options: ["Yes", "No", "I'm not sure what that is"],
        tip: "A brand guide is a document setting out your colours, fonts, logo rules and tone of voice, so everything a business makes looks like it came from the same place. Plenty of businesses do not have one, and that is a normal answer.",
        showIf: { tier: 2 },
      },
      { key: "brandbook_file", label: "Upload it", kind: "upload", notFor: ["branding"], showIf: [{ tier: 2 }, { key: "has_brandbook", equals: ["Yes"] }] },
      {
        key: "brandbook_wanted", label: "Would you like us to put one together?", kind: "yesno",
        notFor: ["branding"],
        showIf: [{ tier: 2 }, { key: "has_brandbook", equals: ["No", "I'm not sure what that is"] }],
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "It is what stops everything made afterwards looking like it came from somewhere else: colours, fonts, logo rules and tone of voice, written down once so the next person does not have to guess.",
      },
      { key: "inspiration", assist: true, label: "Two or three examples you like", kind: "textarea", notFor: ["branding", "web"], showIf: { tier: 3 }, placeholder: "Links, or names of brands, and what you like about them" },
      {
        key: "assets", label: "Anything else we should have", kind: "upload",
        hint: "Pictures, logos, documents, references. Add a note under the file if it needs one.",
      },
    ],
  },
  {
    phase: "final", id: "last",
    title: "Last bits",
    blurb: "Nothing here is needed. Say what is useful, then send.",
    fields: [
      {
        key: "usp", assist: true, label: "What makes you the one they should pick?", kind: "textarea",
        tip: "The honest answer, not the polished one. It is what the work has to carry.",
        showIf: { tier: 3 },
      },
      { key: "others", label: "Anyone else who needs to see things?", kind: "textarea", showIf: { tier: 3 } },
      { key: "anything_else", label: "Anything we haven't asked that we should know?", kind: "textarea", tip: "This is the most useful box on the form. It is where the thing that would otherwise surface in week three usually comes out." },
    ],
  },
];

/**
 * The one-line answer to "which of the six is this form about", shown on the
 * picker card the client chooses from.
 *
 * SEPARATE FROM `SERVICES[].blurb`, which is marketing copy written to sell the
 * service to somebody who has not bought it. This reader HAS bought it, and
 * they are looking for their own purchase in a list of six. What they need is
 * recognition, in as few words as will do it, not persuasion.
 */
export const PICKER_LINE: Record<ServiceSlug, string> = {
  branding: "Logo, identity, and the pieces that carry it.",
  seo: "Getting found on Google for what you actually sell.",
  web: "A website, new or rebuilt.",
  apps: "An app for iOS, Android, or both.",
  software: "Custom software, and AI where it earns its place.",
  social: "Social accounts, content, and paid ads.",
};

/**
 * Answers for the service now chosen. Somebody who changes their mind about the
 * service keeps everything that belongs to every run (the "About you" page) and
 * anything the new service asks too; what only another service asked is dropped,
 * because it would otherwise travel into the brief for a service that never
 * asked it. Keys that belong to no service's steps (uploads, the honeypot, a
 * resumed draft's extras) are never touched.
 */
export function answersForService<T extends Record<string, unknown>>(answers: T, service: ServiceSlug): T {
  const own = new Set(stepsFor(service).flatMap((step) => step.fields.map((field) => field.key)));
  const foreign = new Set(
    SERVICE_STEPS.filter((step) => step.service !== service).flatMap((step) => step.fields.map((field) => field.key)),
  );
  const kept = { ...answers };
  for (const key of Object.keys(kept)) {
    if (foreign.has(key) && !own.has(key)) delete kept[key];
  }
  return kept;
}

/**
 * The steps for ONE service.
 *
 * ONE FORM, ONE SERVICE, and that is the whole reason this signature takes a
 * slug rather than an array. It used to take a list and stitch every purchased
 * service into a single run, which is how a client who bought three ended up
 * facing eleven steps -- the thing that made the form feel like a tax return.
 *
 * A client buying three services fills this three times, which sounds worse
 * and is not. Each run is short, each is about one thing, and each finishes.
 * Three six-step forms completed beats one fifteen-step form abandoned on step
 * nine, and it matches how the studio already works: the two Fluent Forms
 * exports this was checked against are a website form and a social form, each
 * standalone, each repeating its own basic-information section.
 *
 * The repetition across runs is a real cost and it is a SERVER problem, not a
 * form problem: the second link a client opens should arrive with their name,
 * number, email, company and audience already filled in from the first, so
 * "About you" is a page of confirming rather than typing. That is a note for
 * the backend, and nothing here has to change for it.
 */
export function stepsFor(service: ServiceSlug): Step[] {
  const serviceParts = SERVICE_STEPS.filter((step) => step.service === service);
  /* A service that defines two or more steps of its own is shown as written:
     the step breaks are part of its design (a size question first, then what
     that size unlocks). Only a service still defined as one block is cut in
     half, which is how every service worked before the redesign. */
  const own: Step[] = serviceParts.length > 1 ? serviceParts : halve(service, serviceParts);

  /* The shared screens are used as written. `notFor` is applied here, not in
     the renderer, because the question should not exist for this form rather
     than be hidden in it: a field that is filtered out cannot be required,
     cannot be validated and cannot turn up in the review screen or the
     submitted record. Offering a branding client a logo they have just bought
     is the case it exists for. A screen left with no questions is dropped. */
  const closing = CLOSING_STEPS
    .map((step) => ({ ...step, fields: step.fields.filter((f) => !f.notFor?.includes(service)) }))
    .filter((step) => step.fields.length > 0);
  return [...CORE_STEPS, ...own, ...closing];
}

/** The pre-redesign shape: one block of questions cut into goals and details. */
function halve(service: ServiceSlug, parts: Step[]): Step[] {
  const fields = parts.flatMap((step) => step.fields);
  const cut = Math.ceil(fields.length / 2);
  const names: Record<ServiceSlug, [string, string]> = {
    branding: ["Brand direction", "Brand deliverables"],
    seo: ["Search goals", "Search setup"],
    web: ["Website goals", "Website setup"],
    apps: ["App goals", "App setup"],
    software: ["Software goals", "Software requirements"],
    social: ["Social goals", "Content and campaigns"],
  };
  const [goalsTitle, detailsTitle] = names[service];
  return [
    { phase: "work", id: `${service}-goals`, service, title: goalsTitle, blurb: "What the project needs to achieve for you.", fields: fields.slice(0, cut) },
    { phase: "work", id: `${service}-details`, service, title: detailsTitle, blurb: "The practical choices and context that help us begin well.", fields: fields.slice(cut) },
  ];
}

/* ==========================================================================
   VALIDATION

   Kept here beside the questions rather than inside the form component, for
   the same reason the questions are: the rules are data about a field, and a
   field is defined in one place.

   THE STANCE: BE STRICT ABOUT WHAT WE CANNOT RECOVER, AND RELAXED ABOUT THE
   REST. A misspelled email address means the brief goes nowhere and nobody
   finds out for a week, so it is checked. A business address typed in an
   unusual shape is still a business address, so it is not. Every rule below
   exists because getting that field wrong actually costs somebody something;
   rules that exist only to make a form feel rigorous are how you get clients
   fighting a validator over a perfectly good answer.
   ========================================================================== */

/** Filled in, in the sense the form cares about. */
export function isFilled(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.length > 0 : Boolean(v && v.trim());
}

type Answered = Record<string, string | string[] | undefined>;

/** 1 when the size question has not been answered, otherwise the tier it names. */
export function tierOf(answers: Answered): 1 | 2 | 3 {
  let tier: 1 | 2 | 3 = 1;
  for (const key of SIZE_KEYS) {
    const v = answers[key];
    if (typeof v !== "string") continue;
    const t = isUnsure(v) ? 2 : SIZE_TIER[v];
    if (t && t > tier) tier = t;
  }
  return tier;
}

const condHolds = (c: Cond, answers: Answered): boolean => {
  if ("any" in c) return c.any.some((x) => condHolds(x, answers));
  if ("tier" in c) return tierOf(answers) >= c.tier;
  const v = answers[c.key];
  if (c.filled !== undefined && isFilled(v) !== c.filled) return false;
  if (!c.equals) return true;
  return Array.isArray(v) ? v.some((x) => c.equals!.includes(x)) : typeof v === "string" && c.equals.includes(v);
};

/**
 * Is this question asked, given the answers so far? The one place the answer
 * is decided: the form, the server's check, the admin entry views and the
 * answered count all call it, so a question the client never saw is never
 * reported as one they skipped.
 */
export function isVisible(f: Pick<Field, "showIf">, answers: Answered) {
  if (!f.showIf) return true;
  return (Array.isArray(f.showIf) ? f.showIf : [f.showIf]).every((c) => condHolds(c, answers));
}

/** A notice asks nothing, so it is never counted, validated or stored. */
export const isQuestion = (f: Pick<Field, "kind">) => f.kind !== "notice";

/**
 * DELIBERATELY NOT THE RFC 5322 PATTERN. That expression is a page long,
 * accepts things no mail server will, and rejects nothing anyone actually
 * types. What goes wrong in practice is a missing @, a missing dot, a trailing
 * comma, or a space in the middle -- so that is what this catches. The real
 * test of an address is whether mail arrives at it, which is a job for the
 * confirmation email, not for a regular expression.
 */
const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,.]{2,}$/;

export type Problem = { key: string; message: string };

/**
 * What is wrong with this answer, said the way a person would say it.
 *
 * Returns null when the answer is fine. `extra` carries verdicts the form
 * knows and the schema cannot -- today that is the phone field, which is
 * judged by libphonenumber against the chosen country rather than by anything
 * expressible here.
 */
export function problemWith(
  f: Field,
  value: string | string[] | undefined,
  extra?: { phoneOk?: boolean },
): string | null {
  if (f.kind === "notice") return null;

  if (f.key === "brand_colours" && value !== undefined) {
    if (typeof value !== "string") return "Enter colours as readable text.";
    const problem = colourProblem(value);
    if (problem) return problem;
  }

  const filled = isFilled(value);

  if (!filled) {
    /* The message names the FIELD, because the summary at the bottom of a step
       lists several of these out of context and "This is required" repeated
       four times tells nobody which four. */
    return f.required ? `${f.label} still needs an answer.` : null;
  }

  /* An answer of "I don't know" is an answer. It cannot fail a format check,
     because it is not trying to be an email address. */
  if (isUnsure(value)) return null;

  const v = typeof value === "string" ? value.trim() : "";

  if (f.kind === "email" && !EMAIL.test(v)) {
    return "That does not look like an email address. Check for a missing @ or a typo in the domain.";
  }

  if (f.kind === "url") {
    /* People type "mysite.com". Treating that as an error is pedantry; the
       form adds the scheme itself on the way out. What is worth catching is
       something that is not an address at all. */
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      if (!u.hostname.includes(".")) return "That does not look like a web address.";
    } catch {
      return "That does not look like a web address.";
    }
    return null;
  }

  if (f.kind === "tel" && extra?.phoneOk === false) {
    return "That number is not quite right for the country selected. Check the digits, or change the country.";
  }

  return null;
}

/**
 * Roughly how long the questions still ahead will take, in minutes.
 *
 * WHY TIME AND NOT STEPS. "Six steps left" means nothing -- a step can be one
 * yes/no or twelve boxes. "About four minutes left" is the thing the client
 * actually wants to know, and it is the number that decides whether they
 * finish now or close the tab.
 *
 * It counts only questions that are VISIBLE given the answers so far, so
 * answering "no" to a branching question makes the estimate genuinely drop
 * rather than staying put while hidden fields wait in the wings.
 *
 * The weights are seconds, and they are estimates, which is why the label says
 * "about". A card or yes/no is a tap; a text box is a sentence; a textarea is
 * a thought.
 */
const SECONDS: Record<FieldKind, number> = {
  yesno: 4, cards: 6, select: 7, multi: 10,
  text: 12, email: 12, tel: 14, url: 12,
  textarea: 32, upload: 10, notice: 0, colours: 20, date: 8, profiles: 15, fonts: 20,
  /* Three names to think of, not three boxes to fill: naming a business is the
     slowest question in the form, and the check afterwards is a wait the
     client chooses to take. Deliberately higher than `textarea`, which is what
     this field replaced and which under-estimated it. */
  domains: 45,
};

export function minutesLeft(
  steps: Step[],
  from: number,
  answers: Record<string, string | string[]>,
  visibleNow: (f: Field) => boolean,
): number {
  let s = 0;
  for (let n = Math.max(0, from); n < steps.length; n++) {
    for (const f of steps[n].fields) {
      if (!isQuestion(f) || !visibleNow(f)) continue;
      if (isFilled(answers[f.key])) continue;   // already done costs nothing
      s += SECONDS[f.kind] ?? 10;
    }
  }
  return Math.max(1, Math.round(s / 60));
}
