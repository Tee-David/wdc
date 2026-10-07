import { UNSURE, type Cond, type Step } from "../onboarding-shared";

/**
 * The web form's steps, Size first, after the UX research (plans/onboarding-ux-research.md, E2). One file per
 * service so two people can work on two services without touching the same
 * lines. Composed by `stepsFor` in ../onboarding.ts.
 *
 * HOW THE SIZE QUESTION WORKS. The client answers in their own words. That
 * answer is the only thing stored, and the studio's Small, Medium or Large
 * label is never shown to them. Questions of the second tier are asked of a
 * bigger site or a large site, or of a client who is not sure. Nothing is
 * asked of a simple site that a simple site does not need.
 *
 * WHAT IS NOT HERE, AND WHY.
 * - The deadline and any fixed date are on the shared closing screen, once, for
 *   every service. They were asked twice here before.
 * - "How should people get in touch" is cut: a contact form and a WhatsApp
 *   button are the standard, and the review screen says so.
 * - Search optimisation is not sold here. A notice says it is its own service.
 * - The "I already know what I want" reveal is a plain question for a large
 *   site only (a platform the client already has in mind).
 * - Maintenance is not asked on this path (decision 10), and the old keys
 *   wants_maintenance, maintenance_after_reading and wants_blogging are not
 *   defined here. Their stored values stay in old answers.
 */

/** The stored key of the opening question. Read by ../onboarding-aliases.ts. */
export const SIZE_KEY = "site_size";

const SIMPLE = "A simple site";
const BIGGER = "A bigger site";
const LARGE = "A large site";


const SELL = "Sell online";
const BOOK = "Take bookings";
const SHOW = "Show our work";
const ENQUIRE = "Get enquiries";
const MEMBERS = "A members only area";
const OTHER_JOB = "Something else";

const IMPROVING = "Improving an existing site";

const sellOnline: Cond = { key: "site_jobs", equals: [SELL] };
const takesBookings: Cond = { key: "site_jobs", equals: [BOOK] };
const showsWork: Cond = { key: "site_jobs", equals: [SHOW] };
const hasMembers: Cond = { key: "site_jobs", equals: [MEMBERS] };
const TIER_3: Cond = { tier: 3 };
const existing: Cond = { key: "site_new_or_existing", equals: [IMPROVING] };
const needsHelp = "I need help";

export const WEB_STEPS: Step[] = [
  {
    phase: "work", id: "web", service: "web", title: "What the site is for",
    blurb: "The job it has to do, before we talk about how it looks.",
    fields: [
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How big is the site?",
        hint: "A simple site is up to about 5 pages. A bigger site is about 6 to 15 pages. A large site is more than 15 pages, or has special features.",
        options: [SIMPLE, BIGGER, LARGE],
      },
      { key: "site_new_or_existing", label: "Is this a new website, or improving one you have?", kind: "cards", required: true, options: ["Brand new", IMPROVING] },
      { key: "current_url", label: "Your current site", kind: "url", required: true, placeholder: "https://", showIf: existing },
      { key: "current_problem", label: "What do you like and dislike about it?", kind: "textarea", showIf: [existing, TIER_3] },
      {
        key: "free_review", label: "Would you like a free review of your current site?", kind: "yesno",
        showIf: existing,
        scope: "A free review is advice. It is not a promise of results.",
      },
      {
        key: "site_jobs", assist: true, required: true, kind: "multi",
        label: "What should the site do for you?",
        hint: "Pick as many as you need. Each one opens only the questions it needs.",
        tip: "Sell online: a shop with a basket and payments. Take bookings: people pick a time or a date. Show our work: a gallery or a set of projects. Get enquiries: people send you a message or ask for a quote. Share information: pages that explain who you are and what you do. A members only area: some pages are for people who sign in. Something else: tell us what you have in mind.",
        options: [SELL, BOOK, SHOW, ENQUIRE, "Share information", MEMBERS, OTHER_JOB],
      },
      { key: "site_jobs_other", label: "What else should the site do?", kind: "text", showIf: { key: "site_jobs", equals: [OTHER_JOB] } },
      {
        key: "store_items", assist: true, label: "About how many things will you sell?", kind: "cards",
        options: ["A handful, under 20", "Some, 20 to 200", "A lot, more than 200"],
        showIf: sellOnline,
      },
      {
        key: "pay_note", kind: "notice", label: "Taking payments",
        hint: "Local payments: Paystack and Flutterwave. International payments: Stripe, PayPal and Square. You can also bring your own provider. Some setups are limited by the type of site. We will tell you which.",
        showIf: sellOnline,
      },
      {
        key: "pay_providers", label: "Which payment provider would you like?", kind: "multi",
        options: ["Paystack", "Flutterwave", "Stripe", "PayPal", "Square", "I will bring my own", UNSURE],
        showIf: sellOnline,
      },
      {
        key: "pay_own", label: "Which provider will you bring?", kind: "text",
        showIf: [sellOnline, { key: "pay_providers", equals: ["I will bring my own"] }],
      },
      {
        key: "book_what", label: "What will people book?", kind: "multi",
        options: ["Appointments", "Tables", "Classes", "Rentals", "Other"],
        showIf: takesBookings,
      },
      { key: "book_pay", label: "Do people pay when they book?", kind: "yesno", showIf: takesBookings },
      {
        key: "work_count", assist: true, label: "About how many pieces of work will you show?", kind: "cards",
        options: ["Up to 10", "10 to 50", "More than 50"],
        showIf: [showsWork, { tier: 2 }],
      },
      { key: "member_what", assist: true, label: "What do members get?", kind: "textarea", showIf: [hasMembers, TIER_3] },
      {
        key: "member_join", assist: true, label: "How do people join?", kind: "cards",
        options: ["They sign up themselves", "We invite them", "They pay to join"],
        showIf: [hasMembers, TIER_3],
      },
      {
        key: "page_count", assist: true, label: "About how many pages do you expect?", kind: "select",
        options: ["1 to 5", "6 to 15", "16 to 40", "More than 40"],
        showIf: TIER_3,
      },
      {
        key: "site_platform", kind: "cards", label: "If you already know which platform you want, tell us",
        hint: "Optional. If you do not know, leave it. We choose the one that fits what the site must do.",
        options: ["WordPress", "Shopify", "Custom build", UNSURE],
        showIf: TIER_3,
      },
    ],
  },
  {
    phase: "work", id: "web_content", service: "web", title: "Words and pictures",
    blurb: "Who writes the words and takes the pictures.",
    fields: [
      { key: "words_ready", label: "The words for the site", kind: "cards", required: true, options: ["I have them", needsHelp] },
      { key: "pictures_ready", label: "The pictures for the site", kind: "cards", options: ["I have them", needsHelp] },
      {
        key: "content_scope", kind: "notice", label: "Words and pictures from us",
        hint: "Writing and photography are extra to building the site, and quoted separately once we know how many pages there are. A site cannot launch with placeholder text, so saying this now is what keeps your launch date.",
        showIf: { any: [{ key: "words_ready", equals: [needsHelp] }, { key: "pictures_ready", equals: [needsHelp] }] },
      },
    ],
  },
  {
    phase: "work", id: "web_tech", service: "web", title: "Extras and your web address",
    blurb: "What else it has to do, and where it will live.",
    fields: [
      {
        key: "features", assist: true, label: "Anything else the site must do?", kind: "multi",
        hint: "Pick what you need. Skip it if nothing comes to mind.",
        options: ["Blog", "Multi-language", "Newsletter sign up", "Live chat", "Map", "Site search", "Other", "None yet"],
        showIf: { tier: 2 },
      },
      {
        key: "features_other", label: "What other feature do you need?", kind: "text",
        showIf: [{ tier: 2 }, { key: "features", equals: ["Other"] }],
      },
      {
        key: "has_domain", label: "Do you have a website address (a domain)?", kind: "cards",
        hint: "A domain is your web address, like yourbusiness.com.",
        options: ["Yes", "No", "Not sure"],
      },
      {
        key: "hosting_details",
        label: "Who is it with, and whose name is the account in?",
        kind: "textarea",
        placeholder: "For example domain with Namecheap, hosting with Whogohost, both in Tobi's name",
        /* Naming the provider is all we need. The login is never asked for in
           this form, and the hint says so where the client is typing. */
        hint: "Just the provider and the account holder. Please do not put passwords in this form. We will set access up properly with you when we get there.",
        showIf: { key: "has_domain", equals: ["Yes", "Not sure"] },
      },
      {
        /* The checker is offered inside the control, so the step count and
           validation are the same with or without it. See components/onboarding. */
        key: "domain_ideas", assist: true, label: "Domain names you would like, best first", kind: "domains",
        tip: "Include the ending you want, like .com or .com.ng. Torn between a few? Put them all in and the field will offer to check them.",
        showIf: { key: "has_domain", equals: ["No"] },
      },
      {
        key: "hosting_wanted", label: "Would you like us to buy and set them up for you?", kind: "yesno",
        scope: "The domain and the hosting are paid to the registrar and the host, not to us. Our time to set them up is extra to the build, and you will see both figures before anything is bought.",
        tip: "Whatever is bought is registered in YOUR name, not ours. Losing control of a domain is the single most expensive thing that happens to a small business online, and it is entirely preventable at the start.",
        showIf: { key: "has_domain", equals: ["No"] },
      },
      {
        key: "search_note", kind: "notice", label: "Search work is its own service",
        hint: "We can quote it separately if you want it.",
        showIf: { tier: 2 },
      },
    ],
  },
];
