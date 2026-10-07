import { UNSURE, type Cond, type Step } from "../onboarding-shared";

/**
 * The SEO form's steps, Size first, after the UX research (plans/onboarding-ux-research.md, E3). One file per
 * service so two people can work on two services without touching the same
 * lines. Composed by `stepsFor` in ../onboarding.ts.
 *
 * The client answers how big the job is in their own words. That answer is
 * the only thing stored; the studio's Focused, Standard or Broad label is
 * counted from the picks and never shown to the client. Tier 2 questions are
 * asked of a growing site, a big site, or a client who is not sure. Tier 3 is
 * asked of a big site only.
 *
 * There is no budget question. Access to Search Console and Analytics is
 * arranged after the form, through a secure route, never a password here.
 */

/** The stored key of the opening question. Read by ../onboarding-aliases.ts. */
export const SIZE_KEY = "seo_size";

const ONE_SITE = "One site, one place";
const GROWING = "A growing site";
const BIG = "A big site or many places";

const LOCAL = ["Near me", "A mix"];
const localCustomers: Cond = { key: "customers", equals: LOCAL };

export const SEO_STEPS: Step[] = [
  {
    phase: "work", id: "seo", service: "seo", title: "Your business and customers",
    blurb: "Where you are, and who you sell to.",
    fields: [
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How big is the job?",
        hint: "One site, one place is a small site or a single location. A growing site has more pages or a few locations. A big site or many places is a large site or many locations.",
        options: [ONE_SITE, GROWING, BIG],
      },
      /* One question, not two: the address, with a way to say there is none. */
      {
        key: "site_url", label: "What is your website address?", kind: "url",
        placeholder: "https://",
        hint: "If you do not have a website yet, tap the button below.",
      },
      {
        key: "has_site", kind: "cards", label: "No website yet?",
        options: ["I do not have one yet"],
      },
      {
        key: "customers", assist: true, label: "Where are your customers?", kind: "cards", required: true,
        options: ["Near me", "Online, anywhere", "Other businesses", "A mix"],
        tip: "Near me: people in my area. Online, anywhere: people across the country or the world. Other businesses: my customers are companies. A mix: more than one of these.",
      },
      {
        key: "geo", assist: true, label: "Which areas do you serve?", kind: "text",
        placeholder: "For example the three areas around the shop, or nationwide",
        showIf: localCustomers,
      },
      {
        key: "b2b_kind", assist: true, label: "What kind of businesses buy from you?", kind: "text",
        showIf: [{ tier: 3 }, { key: "customers", equals: ["Other businesses", "A mix"] }],
      },
    ],
  },
  {
    phase: "work", id: "seo_search", service: "seo", title: "What search should do",
    blurb: "What you want to be found for, and how long to run it.",
    fields: [
      {
        key: "seo_goals", assist: true, required: true, kind: "multi",
        label: "What do you want search to do for you?",
        hint: "Pick as many as you need. Show up in AI answers means appearing in answers from AI tools.",
        tip: "More calls: people phone you. More sales: people buy from you. More leads: people ask for a quote or leave details. More visibility: more people find your name.",
        options: ["More calls", "More sales", "More leads", "More visibility", "Show up in AI answers"],
      },
      {
        key: "seo_timeframe", label: "How long would you like to run this for?", kind: "cards", required: true,
        options: ["3 months", "6 months", "12 months", UNSURE],
      },
      {
        /* The minimum is stated where the time frame is chosen, and it is
           stated plainly: no promise of a ranking, no promise of a result. */
        key: "tf_note", kind: "notice", label: "Results take time",
        hint: "Our work starts at 3 months. We cannot promise rankings or results.",
      },
      {
        key: "target_terms", assist: true, label: "What should someone type into Google to find you?", kind: "textarea",
        placeholder: "For example: wedding photographer near me",
      },
    ],
  },
  {
    phase: "work", id: "seo_setup", service: "seo", title: "What you have set up",
    blurb: "Quick taps. Access comes later, never a password here.",
    fields: [
      /* Three jargon questions are one tap. Access is arranged later through a
         secure route, never asked for in this form. */
      {
        key: "seo_tools", kind: "multi", assist: true,
        label: "Which of these do you have?",
        hint: "Tap the ones you have. Access comes later, through a secure route. Never put a password in this form.",
        tip: "Google Business Profile is your business listing in maps and search. Google Search Console shows how people find you in search. Google Analytics shows visits to your website and what people do there.",
        options: ["Google Business Profile", "Google Search Console", "Google Analytics", "None of these"],
        showIf: { tier: 2 },
      },
      {
        key: "content_owner", label: "Who writes your content?", kind: "cards",
        options: ["Nobody yet", "My team", "An agency", "I would like WDC to"],
        scope: "If you pick WDC, writing is extra to what you have already paid for. We send you a quote first. Nothing is charged from this form.",
        showIf: { tier: 2 },
      },
      {
        key: "competitors", assist: true, label: "Which similar businesses show up when you search?", kind: "textarea",
        placeholder: "Up to three names or links. You do not need to know their rankings.",
        showIf: { tier: 3 },
      },
    ],
  },
];
