import type { ServiceSlug } from "@/lib/services";

/**
 * The onboarding form's questions.
 *
 * DATA, NOT MARKUP. Every question lives here and the form renders whatever it
 * finds, so adding a field is one entry rather than a component change, and
 * the inventory in the plan and the thing on screen cannot drift apart.
 *
 * WHAT IS DELIBERATELY NOT ASKED. Nothing commercial. Onboarding opens after
 * payment, so budget and fees were agreed by a person before this link was
 * ever sent; the one money question that remains is `ad_spend`, and that is
 * media spend paid to a platform rather than a fee paid to us, which is why
 * its label says so.
 *
 * DEMO STATE. There is no submit endpoint yet. The form validates, branches,
 * remembers itself and reads every answer back, and the final step says
 * plainly that nothing is being sent. Wiring it to CockroachDB and R2 is the
 * next piece of work, and none of the below has to change for it.
 */

export type FieldKind =
  | "text" | "email" | "tel" | "url" | "textarea"
  | "cards" | "multi" | "select" | "yesno" | "upload";

export type Field = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Shown under the label, always visible. Never a tooltip. */
  hint?: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  /** Only shown when another field holds one of these values. */
  showIf?: { key: string; equals: string[] };
};

export type Step = {
  id: string;
  title: string;
  /** One line under the step title, and the same line in the rail. */
  blurb: string;
  /** Absent means the step is part of the common core. */
  service?: ServiceSlug;
  fields: Field[];
};

const AUDIENCE = ["Children", "Teenagers", "Men", "Women", "Businesses"];
const AGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65 or above", "Prefer not to say"];

export const CORE_STEPS: Step[] = [
  {
    id: "you",
    title: "Your details",
    blurb: "Confirm what we already have, and add the bits billing will need.",
    fields: [
      { key: "first_name", label: "First name", kind: "text", placeholder: "e.g. Tobi", required: true },
      { key: "last_name", label: "Last name", kind: "text", placeholder: "e.g. Adeyemi", required: true },
      {
        key: "phone", label: "Mobile number", kind: "tel", required: true,
        hint: "WhatsApp preferred, since that is usually the fastest way to reach you.",
        placeholder: "+234 802 123 4567",
      },
      { key: "email", label: "Email", kind: "email", placeholder: "you@business.com", required: true },
      { key: "company", label: "Business name", kind: "text", placeholder: "e.g. Moore Designs", required: true },
      {
        key: "address", label: "Business address", kind: "textarea", required: true,
        hint: "We need this for invoicing.",
        placeholder: "Street, city, state",
      },
    ],
  },
  {
    id: "business",
    title: "Your business",
    blurb: "So the work is built around what you actually sell.",
    fields: [
      {
        key: "about", label: "Briefly describe your company and what it exists to do", kind: "textarea",
        required: true, placeholder: "What you do, who for, and how long you have been doing it.",
      },
      {
        key: "industry", label: "Industry", kind: "select", required: true,
        options: [
          "Fashion and apparel", "Food and drink", "Retail and e-commerce", "Health and wellness",
          "Education", "Property and construction", "Financial services", "Technology",
          "Travel and hospitality", "Non-profit", "Professional services", "Other",
        ],
      },
      {
        key: "usp", label: "What makes you the one they should pick?", kind: "textarea",
        required: true, hint: "The honest answer, not the polished one. It is what the work has to carry.",
      },
    ],
  },
  {
    id: "audience",
    title: "Your audience",
    blurb: "Who the work has to reach.",
    fields: [
      { key: "audience", label: "Who is your primary audience?", kind: "multi", options: AUDIENCE, required: true },
      { key: "age_range", label: "Age range", kind: "multi", options: AGES },
    ],
  },
];

export const SERVICE_STEPS: Step[] = [
  {
    id: "branding", service: "branding", title: "Branding & Design",
    blurb: "What we are making, and everywhere it has to survive.",
    fields: [
      {
        key: "brand_state", label: "What exists today?", kind: "cards", required: true,
        options: ["Nothing yet", "A logo only", "A full identity needing a refresh"],
      },
      {
        key: "deliverables", label: "What are we making?", kind: "multi", required: true,
        options: ["Logo", "Full identity system", "Brand guidelines", "Packaging", "Signage", "Social templates", "Pitch deck"],
      },
      {
        key: "surfaces", label: "Where does the mark have to work?", kind: "multi", required: true,
        hint: "This one matters more than it looks. A mark that survives 12mm of embroidery is drawn differently from one that only ever appears on a screen.",
        options: ["Embroidery", "Signage", "Print", "Screen", "Packaging", "Vehicle", "Stamp or seal"],
      },
      { key: "untouchable", label: "Anything that must not change?", kind: "textarea", hint: "A name, a colour, a mark people already know you by." },
      { key: "avoid", label: "Anything we should steer well clear of?", kind: "textarea" },
    ],
  },
  {
    id: "seo", service: "seo", title: "SEO",
    blurb: "What you want to be found for, and what we need access to.",
    fields: [
      { key: "site_url", label: "Your website", kind: "url", placeholder: "https://", required: true },
      { key: "target_terms", label: "What should someone be typing into Google when they find you?", kind: "textarea", required: true },
      { key: "geo", label: "Where are your customers?", kind: "text", placeholder: "e.g. Lagos, or nationwide", required: true },
      { key: "competitors", label: "Three competitors who currently outrank you", kind: "textarea" },
      {
        key: "tools_access", label: "Do you have these, and can you share access?", kind: "multi", required: true,
        options: ["Search Console", "Analytics", "Google Business Profile", "CMS admin", "None of these"],
      },
      { key: "content_owner", label: "Who writes your content?", kind: "cards", required: true, options: ["Nobody yet", "In-house", "An agency", "We would like you to"] },
    ],
  },
  {
    id: "web", service: "web", title: "Web development",
    blurb: "What the site has to do, and who looks after it after launch.",
    fields: [
      { key: "site_new_or_existing", label: "Is this a new website, or improving one you have?", kind: "cards", required: true, options: ["Brand new", "Improving an existing site"] },
      { key: "current_url", label: "Your current site", kind: "url", placeholder: "https://", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "current_problem", label: "What is wrong with it?", kind: "textarea", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "site_goal", label: "What is the site's main job?", kind: "textarea", required: true, placeholder: "e.g. take bookings, sell online, show the portfolio" },
      { key: "features", label: "Features you have in mind", kind: "multi", options: ["Online store", "Bookings", "Blog", "Gallery", "Members area", "Multi-language", "None yet"] },
      { key: "page_count", label: "Roughly how many pages?", kind: "cards", required: true, options: ["1–5", "6–15", "16–40", "More than 40"] },
      { key: "content_ready", label: "Do you have the words and pictures?", kind: "cards", required: true, options: ["Ready to go", "Partly", "We need you to produce them"] },
      { key: "wants_seo", label: "Should we optimise it for search?", kind: "yesno", required: true, hint: "Search optimisation is the work that makes a site findable on Google: the right words, a clean technical build, and pages that load fast." },
      { key: "has_hosting", label: "Do you already have hosting and a domain?", kind: "cards", required: true, options: ["Both", "Domain only", "Neither", "Not sure"] },
      { key: "hosting_details", label: "Where, and who controls the account?", kind: "textarea", showIf: { key: "has_hosting", equals: ["Both", "Domain only", "Not sure"] } },
    ],
  },
  {
    id: "apps", service: "apps", title: "Apps",
    blurb: "What the app does, and what it has to talk to.",
    fields: [
      { key: "platforms", label: "iOS, Android, or both?", kind: "multi", required: true, options: ["iOS", "Android"] },
      { key: "one_job", label: "In one sentence, what does the app do for the person holding the phone?", kind: "text", required: true },
      { key: "accounts", label: "Do users log in? Are there different roles?", kind: "textarea", required: true },
      { key: "offline", label: "Must it work without a connection?", kind: "cards", required: true, options: ["Yes", "No", "Not sure"] },
      { key: "payments", label: "Does money change hands in the app?", kind: "cards", required: true, options: ["No", "One-off payments", "Subscriptions"] },
      { key: "store_accounts", label: "Do you have Apple and Google developer accounts?", kind: "cards", required: true, options: ["Both", "One of them", "Neither"] },
      { key: "backend", label: "Is there a backend already, or are we building it?", kind: "cards", required: true, options: ["One exists", "Build it", "Not sure"] },
    ],
  },
  {
    id: "software", service: "software", title: "Software & AI",
    blurb: "What it replaces, and how we will know it worked.",
    fields: [
      { key: "process", label: "What are people doing by hand today that this should take over?", kind: "textarea", required: true },
      { key: "users_count", label: "How many people will use it, and who are they?", kind: "text", required: true },
      { key: "data_home", label: "Where does that information live now?", kind: "cards", required: true, options: ["Spreadsheets", "WhatsApp", "Paper", "An existing system", "Nowhere yet"] },
      { key: "systems", label: "What must it talk to?", kind: "textarea", hint: "Accounting software, a payment provider, an existing database." },
      { key: "compliance", label: "Any regulation or data rule we must design around?", kind: "textarea" },
      { key: "success_metric", label: "What number tells us this worked?", kind: "text", required: true, placeholder: "e.g. hours saved a week, orders processed a day" },
    ],
  },
  {
    id: "social", service: "social", title: "Social & PPC",
    blurb: "Where you post, who runs it, and what you are spending with the platforms.",
    fields: [
      { key: "channels", label: "Which platforms are you on?", kind: "multi", required: true, options: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "WhatsApp", "None yet"] },
      { key: "handles", label: "Your handles", kind: "textarea", placeholder: "@yourbusiness on each", showIf: { key: "channels", equals: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "WhatsApp"] } },
      { key: "social_goal", label: "What is social for, for you?", kind: "cards", required: true, options: ["Awareness", "Sales", "Bookings", "Community", "Recruitment"] },
      { key: "content_source", label: "Who shoots and writes today?", kind: "cards", required: true, options: ["Nobody", "In-house", "A freelancer", "We would like you to"] },
      { key: "access_ok", label: "Can you give us access, or should we work through you?", kind: "cards", required: true, options: ["We will give access", "Work through us"] },
      { key: "competitors_admired", label: "Any competitor accounts you admire?", kind: "textarea", hint: "Handles are enough." },
      { key: "upcoming", label: "Any launches, promotions or events coming up we should plan around?", kind: "textarea" },
      {
        key: "ad_spend", label: "Monthly advertising budget", kind: "cards", required: true,
        hint: "This is media spend, paid to Meta or Google. It is separate from our fee.",
        options: ["Under ₦100k", "₦100k–₦500k", "₦500k–₦2m", "Over ₦2m", "Not sure yet"],
      },
    ],
  },
];

export const CLOSING_STEPS: Step[] = [
  {
    id: "brand",
    title: "Brand and assets",
    blurb: "Anything you already have. Nothing here blocks you from finishing.",
    fields: [
      { key: "has_logo", label: "Do you have a logo ready?", kind: "yesno", required: true },
      { key: "logo_files", label: "Upload your logo files", kind: "upload", showIf: { key: "has_logo", equals: ["Yes"] } },
      { key: "has_brandbook", label: "Do you have a brand book or guide?", kind: "cards", required: true, options: ["Yes", "No", "Not sure what that is"] },
      { key: "brandbook_file", label: "Upload it", kind: "upload", showIf: { key: "has_brandbook", equals: ["Yes"] } },
      { key: "brand_colours", label: "Your brand colours", kind: "text", placeholder: "e.g. Navy #000065, Orange #FF6500", hint: "Hex codes if you have them, names if you do not.", showIf: { key: "has_brandbook", equals: ["No", "Not sure what that is"] } },
      { key: "inspiration", label: "Two or three examples you like, and what you like about them", kind: "textarea" },
      { key: "assets", label: "Anything else we should have", kind: "upload" },
    ],
  },
  {
    id: "working",
    title: "How we will work",
    blurb: "Who decides, and what we must not miss.",
    fields: [
      { key: "approver", label: "Who signs work off?", kind: "text", required: true, hint: "One person. Projects slow down most when feedback arrives from several directions and disagrees with itself." },
      { key: "others", label: "Anyone else who needs to see things?", kind: "textarea" },
      { key: "fixed_dates", label: "Any fixed dates we have to hit?", kind: "textarea", placeholder: "A launch, an event, a print deadline." },
      { key: "channel", label: "How would you like us to reach you?", kind: "cards", required: true, options: ["Email", "WhatsApp", "Phone call"] },
      { key: "anything_else", label: "Anything we haven't asked that we should know?", kind: "textarea", hint: "This is the most useful box on the form. It is where the thing that would otherwise surface in week three usually comes out." },
    ],
  },
];

/** The steps a client actually sees, given what they bought. */
export function stepsFor(services: ServiceSlug[]): Step[] {
  return [
    ...CORE_STEPS,
    ...SERVICE_STEPS.filter((s) => s.service && services.includes(s.service)),
    ...CLOSING_STEPS,
  ];
}
