import { UNSURE, type Cond, type Step } from "../onboarding-shared";

/**
 * The web form's steps, Size first (plan 14.3, artifact web.js). One file per
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
 * - `fixed_dates` and `inspiration` are in the shared closing step for every
 *   service but Branding (decision 4), so they are not repeated here.
 * - The "I already know what I want" reveal needs a kind this form does not
 *   have yet (a hidden section). It is left out until that kind exists.
 * - Maintenance is not asked on this path (decision 10), and the old keys
 *   wants_maintenance, maintenance_after_reading and wants_blogging are not
 *   defined here. Their stored values stay in old answers.
 */

/** The stored key of the opening question. Read by ../onboarding-aliases.ts. */
export const SIZE_KEY = "site_size";

const SIMPLE = "A simple site";
const BIGGER = "A bigger site";
const LARGE = "A large site";

/** A bigger site, a large site, or a client who is not sure (tier 2). */
const TIER_2: Cond = { key: SIZE_KEY, equals: [BIGGER, LARGE, UNSURE] };

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
const getsEnquiries: Cond = { key: "site_jobs", equals: [ENQUIRE] };
const hasMembers: Cond = { key: "site_jobs", equals: [MEMBERS] };

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
      { key: "current_url", label: "Your current site", kind: "url", required: true, placeholder: "https://", showIf: { key: "site_new_or_existing", equals: [IMPROVING] } },
      { key: "current_problem", label: "What do you like and dislike about it?", kind: "textarea", showIf: { key: "site_new_or_existing", equals: [IMPROVING] } },
      {
        key: "free_review", label: "Would you like a free review of your current site?", kind: "yesno",
        showIf: { key: "site_new_or_existing", equals: [IMPROVING] },
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
        key: "book_what", assist: true, label: "What will people book?", kind: "text",
        placeholder: "For example fitting sessions or table reservations",
        showIf: takesBookings,
      },
      { key: "book_pay", label: "Do people pay when they book?", kind: "yesno", showIf: takesBookings },
      {
        key: "work_count", assist: true, label: "About how many pieces of work will you show?", kind: "cards",
        options: ["Up to 10", "10 to 50", "More than 50"],
        showIf: showsWork,
      },
      {
        key: "enquiry_ways", label: "How should people get in touch?", kind: "multi",
        options: ["A contact form", "A call button", "A WhatsApp button", "A quote request form"],
        showIf: getsEnquiries,
      },
      { key: "member_what", assist: true, label: "What do members get?", kind: "textarea", showIf: hasMembers },
      {
        key: "member_join", assist: true, label: "How do people join?", kind: "cards",
        options: ["They sign up themselves", "We invite them", "They pay to join"],
        showIf: hasMembers,
      },
      {
        key: "page_count", assist: true, label: "About how many pages do you expect?", kind: "select",
        options: ["1 to 5", "6 to 15", "16 to 40", "More than 40"],
      },
    ],
  },
  {
    phase: "work", id: "web_content", service: "web", title: "Words and pictures",
    blurb: "Who writes the words and takes the pictures.",
    fields: [
      { key: "content_ready", label: "Do you have the words and pictures?", kind: "cards", required: true, options: ["They are ready", "I have some of them", "I need WDC to produce them"] },
      {
        key: "content_needed", label: "Which of them do you need from us?", kind: "multi",
        options: ["Words", "Photography", "Both"],
        showIf: { key: "content_ready", equals: ["I have some of them", "I need WDC to produce them"] },
        scope: "Writing and photography are extra to building the site, and quoted separately once we know how many pages there are.",
        tip: "A site cannot launch with placeholder text in it, so this is the thing that most often holds a launch date. Saying it now is what keeps the date.",
      },
    ],
  },
  {
    phase: "work", id: "web_tech", service: "web", title: "Timing, extras and domain",
    blurb: "When it is needed, what else it has to do, and where it will live.",
    fields: [
      {
        key: "deadline_kind", label: "When do you need it?", kind: "cards", required: true,
        options: ["No fixed date", "Within a month", "Within two weeks", "A set date"],
      },
      {
        key: "features", assist: true, label: "Anything else the site must do?", kind: "multi",
        hint: "Pick what you need. Skip it if nothing comes to mind.",
        options: ["Blog", "Gallery", "Multi-language", "Newsletter sign up", "Live chat", "Map", "Site search", "Other", "None yet"],
        showIf: TIER_2,
      },
      {
        key: "features_other", label: "What other feature do you need?", kind: "text",
        showIf: [TIER_2, { key: "features", equals: ["Other"] }],
      },
      {
        key: "has_hosting", label: "Do you already have hosting and a domain?", kind: "cards", required: true,
        hint: "A domain is your web address. Hosting is where your website runs.",
        options: ["Both", "Domain only", "Neither", UNSURE],
        showIf: TIER_2,
      },
      {
        key: "hosting_details",
        label: "Who is it with, and whose name is the account in?",
        kind: "textarea",
        placeholder: "For example domain with Namecheap, hosting with Whogohost, both in Tobi's name",
        /* Naming the provider is all we need. The login is never asked for in
           this form, and the hint says so where the client is typing. */
        hint: "Just the provider and the account holder. Please do not put passwords in this form. We will set access up properly with you when we get there.",
        showIf: [TIER_2, { key: "has_hosting", equals: ["Both", "Domain only", UNSURE] }],
      },
      {
        /* The checker is offered inside the control, so the step count and
           validation are the same with or without it. See components/onboarding. */
        key: "domain_ideas", assist: true, label: "Domain names you would like, best first", kind: "domains",
        tip: "Include the ending you want, like .com or .com.ng. Torn between a few? Put them all in and the field will offer to check them.",
        showIf: [TIER_2, { key: "has_hosting", equals: ["Neither"] }],
      },
      {
        key: "hosting_wanted", label: "Would you like us to buy and set them up for you?", kind: "yesno",
        scope: "The domain and the hosting are paid to the registrar and the host, not to us. Our time to set them up is extra to the build, and you will see both figures before anything is bought.",
        tip: "Whatever is bought is registered in YOUR name, not ours. Losing control of a domain is the single most expensive thing that happens to a small business online, and it is entirely preventable at the start.",
        showIf: [TIER_2, { key: "has_hosting", equals: ["Neither"] }],
      },
      {
        key: "wants_seo", label: "Should we optimise it for search?", kind: "yesno",
        hint: "Search optimisation makes a site easier to find on Google. It is its own service, quoted separately.",
        showIf: TIER_2,
      },
    ],
  },
];
