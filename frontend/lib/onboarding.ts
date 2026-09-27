import type { ServiceSlug } from "@/lib/services";

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

export type FieldKind =
  | "text" | "email" | "tel" | "url" | "textarea"
  | "cards" | "multi" | "select" | "yesno" | "upload"
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
export const UNSURE = "I'm not sure; please advise me";
export const PROJECT_UPDATE_PORTAL = "Your client portal";

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
  /** Only shown when another field holds one of these values. */
  showIf?: { key: string; equals: string[] };
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
};

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
export type PhaseId = "you" | "work" | "final";

export const PHASES: { id: PhaseId; title: string; blurb: string }[] = [
  { id: "you", title: "About you", blurb: "Quick ones. Mostly confirming what we already have." },
  { id: "work", title: "The work", blurb: "The brief itself. This is the part that shapes what we build." },
  { id: "final", title: "Finishing up", blurb: "Assets, approvals, and anything we have not thought to ask." },
];

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

const AUDIENCE = ["Children", "Teenagers", "Men", "Women", "Businesses", "Other"];
const AGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65 or above", "Prefer not to say"];

export const CORE_STEPS: Step[] = [
  {
    phase: "you", id: "you",
    title: "Your details",
    blurb: "Confirm what we already have, and add the bits billing will need.",
    fields: [
      { key: "first_name", label: "First name", kind: "text", placeholder: "e.g. Tobi", required: true },
      { key: "last_name", label: "Last name", kind: "text", placeholder: "e.g. Adeyemi", required: true },
      {
        key: "phone", label: "Mobile number", kind: "tel", required: true,
        tip: "WhatsApp preferred, since that is usually the fastest way to reach you.",
        placeholder: "+234 802 123 4567",
      },
      { key: "email", label: "Email", kind: "email", placeholder: "you@business.com", required: true },
      { key: "company", label: "Business name", kind: "text", placeholder: "e.g. Moore Designs", required: true },
      {
        key: "address", label: "Business address", kind: "textarea",
        hint: "We need this for invoicing.",
        placeholder: "Street, city, state",
      },
    ],
  },
  {
    phase: "you", id: "business",
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
        key: "industry_other", label: "Which industry?", kind: "text",
        placeholder: "Tell us in a few words",
        showIf: { key: "industry", equals: ["Other"] },
      },
      {
        key: "usp", assist: true, label: "What makes you the one they should pick?", kind: "textarea",
        tip: "The honest answer, not the polished one. It is what the work has to carry.",
      },
    ],
  },
  {
    phase: "you", id: "audience",
    title: "Your audience",
    blurb: "Who the work has to reach.",
    fields: [
      { key: "audience", assist: true, label: "Who is your primary audience?", kind: "multi", options: AUDIENCE, required: true },
      { key: "audience_other", label: "Tell us who else you need to reach", kind: "text", showIf: { key: "audience", equals: ["Other"] } },
      { key: "age_range", assist: true, label: "Age range", kind: "multi", options: AGES },
    ],
  },
];

export const SERVICE_STEPS: Step[] = [
  {
    phase: "work", id: "branding", service: "branding", title: "Branding & Design",
    blurb: "What we are making, and everywhere it has to survive.",
    fields: [
      {
        key: "brand_state", label: "What exists today?", kind: "cards", required: true,
        options: ["Nothing yet", "A logo only", "A full identity needing a refresh"],
      },
      {
        key: "deliverables", assist: true, label: "What are we making?", kind: "multi",
        options: ["Logo", "Full identity system", "Brand guidelines", "Packaging", "Signage", "Social templates", "Pitch deck", "Other"],
      },
      { key: "deliverables_other", label: "What else would you like us to create?", kind: "text", showIf: { key: "deliverables", equals: ["Other"] } },
      {
        key: "surfaces", assist: true, label: "Where does the mark have to work?", kind: "multi",
        tip: "This one matters more than it looks. A mark that survives 12mm of embroidery is drawn differently from one that only ever appears on a screen.",
        options: ["Embroidery", "Signage", "Print", "Screen", "Packaging", "Vehicle", "Stamp or seal", "Other"],
      },
      { key: "surfaces_other", label: "Where else must the brand work?", kind: "text", showIf: { key: "surfaces", equals: ["Other"] } },
      {
        key: "untouchable", assist: true, label: "Anything that must not change?", kind: "textarea",
        tip: "A name, a colour, a mark people already know you by.",
        /* Asked only when something exists to preserve. Putting this to a
           client who has just said "nothing yet" reads as a form that is not
           listening, and a form that is not listening is one people stop
           filling in. */
        showIf: { key: "brand_state", equals: ["A logo only", "A full identity needing a refresh"] },
      },
      { key: "avoid", assist: true, label: "Anything we should steer well clear of?", kind: "textarea" },
    ],
  },
  {
    phase: "work", id: "seo", service: "seo", title: "SEO",
    blurb: "What you want to be found for, and what we need access to.",
    fields: [
      { key: "site_url", label: "Your website", kind: "url", placeholder: "https://", required: true },
      { key: "target_terms", assist: true, label: "What should someone be typing into Google when they find you?", kind: "textarea", required: true },
      { key: "geo", assist: true, label: "Where are your customers?", kind: "text", placeholder: "e.g. one city, or nationwide", required: true },
      { key: "competitors", assist: true, label: "Three competitors who currently outrank you", kind: "textarea" },
      {
        key: "tools_access", label: "Do you have these, and can you share access?", kind: "multi", required: true,
        options: ["Search Console", "Analytics", "Google Business Profile", "CMS admin", "None of these"],
      },
      { key: "content_owner", label: "Who writes your content?", kind: "cards", required: true, options: ["Nobody yet", "My team", "An agency", "I would like WDC to"] },
      /* "Nobody yet" is the answer that quietly decides whether the search work
         can do anything at all: pages have to exist before they can rank. */
      {
        key: "content_writer_wanted", label: "Would you like us to write it?", kind: "yesno",
        showIf: { key: "content_owner", equals: ["Nobody yet"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Search work needs pages to work on. If nobody is writing them, we can. Or we can give your team the outlines and the search terms to write from, which costs less.",
      },
    ],
  },
  {
    /* SPLIT INTO THREE, and the sections are the client's own. The Fluent
       Forms website export divides this exact ground into "Website Goals and
       Features", "Design and Branding", "Content and Maintenance" and
       "Technical Information" -- so the shape was already there in how the
       studio thinks about a website job, and eleven questions on one screen
       was the thing that did not match it.

       Shorter screens are also what makes the progress bar honest: a step that
       holds eleven questions takes four minutes and moves the bar once. */
    phase: "work", id: "web", service: "web", title: "What the site is for",
    blurb: "The job it has to do, before we talk about how it looks.",
    fields: [
      { key: "site_new_or_existing", label: "Is this a new website, or improving one you have?", kind: "cards", required: true, options: ["Brand new", "Improving an existing site"] },
      { key: "current_url", label: "Your current site", kind: "url", placeholder: "https://", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "current_problem", label: "What do you like and dislike about it?", kind: "textarea", showIf: { key: "site_new_or_existing", equals: ["Improving an existing site"] } },
      { key: "site_goal", assist: true, label: "What is the site's main job?", kind: "textarea", placeholder: "e.g. take bookings, sell online, show the portfolio" },
      { key: "features", assist: true, label: "Which features would you like on the website?", kind: "multi", options: ["Online store", "Bookings", "Blog", "Gallery", "Members area", "Multi-language", "Other", "None yet"] },
      { key: "features_other", label: "What other feature do you need?", kind: "text", showIf: { key: "features", equals: ["Other"] } },
      { key: "page_count", assist: true, label: "About how many pages do you expect?", kind: "select", options: ["1–5", "6–15", "16–40", "More than 40"] },
    ],
  },
  {
    phase: "work", id: "web_content", service: "web", title: "Content and care",
    blurb: "Who writes it, and who looks after it after launch.",
    fields: [
      { key: "content_ready", label: "Do you have the words and pictures?", kind: "cards", required: true, options: ["They are ready", "I have some of them", "I need WDC to produce them"] },
      {
        key: "content_needed", label: "Which of them do you need from us?", kind: "multi",
        options: ["Words", "Photography", "Both"],
        showIf: { key: "content_ready", equals: ["I have some of them", "I need WDC to produce them"] },
        scope: "Writing and photography are extra to building the site, and quoted separately once we know how many pages there are.",
        tip: "A site cannot launch with placeholder text in it, so this is the thing that most often holds a launch date. Saying it now is what keeps the date.",
      },
      { key: "wants_seo", label: "Should we optimise it for search?", kind: "yesno", required: true, tip: "Search optimisation is the work that makes a site findable on Google: the right words, a clean technical build, and pages that load fast." },
      /* From the client's own website form, which asks both and is right to:
         a site nobody maintains is a site that rots, and it is far cheaper to
         agree that now than to discover it in month four. */
      { key: "wants_maintenance", label: "Will you want ongoing updates and maintenance?", kind: "cards", required: true, options: ["Yes", "No", "Please explain what this includes"] },
      /* THE CLIENT ASKED US SOMETHING AND THE FORM SAID NOTHING BACK. Picking
         "please explain what this includes" is a question, and it led nowhere
         at all -- the one answer on the step that was guaranteed to leave
         somebody waiting. It is answered where it is asked now, and the answer
         ends with the question it was standing in for. */
      {
        key: "maintenance_after_reading", label: "Now you know what it covers, would you like it?", kind: "yesno",
        showIf: { key: "wants_maintenance", equals: ["Please explain what this includes"] },
        hint: "Software and plugin updates, security patches, backups you can actually restore from, uptime monitoring, and somebody who answers when something breaks.",
        scope: "It is a monthly arrangement, separate from building the site, and quoted once we know the size of what we would be looking after. Saying no changes nothing about the build.",
      },
      { key: "wants_blogging", label: "Will you want help with blogging or content marketing?", kind: "cards", options: ["Yes", "No", UNSURE] },
    ],
  },
  {
    phase: "work", id: "web_tech", service: "web", title: "Domain and hosting",
    blurb: "Where the site will live. Nothing technical is expected of you here.",
    fields: [
      { key: "has_hosting", label: "Do you already have hosting and a domain?", kind: "cards", required: true, options: ["Both", "Domain only", "Neither", UNSURE] },
      {
        key: "hosting_details",
        label: "Who is it with, and whose name is the account in?",
        kind: "textarea",
        placeholder: "e.g. domain with Namecheap, hosting with Whogohost, both in Tobi's name",
        /* WE DO NOT ASK FOR THE LOGIN, and the client's own form does -- three
           times, for the website, the domain and the hosting. It is the
           obvious next question and it is the wrong one: a password typed into
           a web form is a password sitting in a database, in a draft in
           someone's browser, and in whatever inbox a notification lands in --
           and it would be OUR fault when it leaked, not the client's. Naming
           the provider is all we need to know what we are dealing with; the
           access itself is handed over later through the provider's own
           delegated access, or a one-time secret link, at the point it is
           actually needed. Saying so here is also reassuring: a form that asks
           for a hosting password tells a client something about how the rest
           of their data will be treated. */
        hint: "Just the provider and the account holder. Please do not put passwords in this form. We will set access up properly with you when we get there.",
        showIf: { key: "has_hosting", equals: ["Both", "Domain only", UNSURE] },
      },
      {
        /* A TEXTAREA HERE PROMISED SOMETHING IT COULD NOT DO. It said "we will
           check what is free" and then took a paragraph somebody had to read,
           unpick and check by hand days later. The client can check now, and
           the honest three-state answer is the whole reason this is a control
           rather than a box: `.ng` has an RDAP service that does not respond,
           and `.io` and `.co` publish none at all, so "we will check this one
           by hand" is a real outcome and is said plainly. See lib/rdap.ts.

           THE CHECKER ITSELF IS OFFERED, NOT IMPOSED, and the offer lives
           inside the control rather than as a question of its own, so the step
           count, the validation and the review screen are all unchanged by it.
           Picking a favourite is one tap on a result for the same reason:
           "which of these do you actually want" is what the first call opens
           with, and it did not deserve a fourth question. */
        key: "domain_ideas", assist: true, label: "Domain names you would like, best first", kind: "domains",
        tip: "Include the ending you want, like .com or .com.ng. Torn between a few? Put them all in and the field will offer to check them.",
        showIf: { key: "has_hosting", equals: ["Neither"] },
      },
      {
        key: "hosting_wanted", label: "Would you like us to buy and set them up for you?", kind: "yesno",
        showIf: { key: "has_hosting", equals: ["Neither"] },
        scope: "The domain and the hosting are paid to the registrar and the host, not to us. Our time to set them up is extra to the build, and you will see both figures before anything is bought.",
        tip: "Whatever is bought is registered in YOUR name, not ours. Losing control of a domain is the single most expensive thing that happens to a small business online, and it is entirely preventable at the start.",
      },
    ],
  },
  {
    phase: "work", id: "apps", service: "apps", title: "Apps",
    blurb: "What the app does, and what it has to talk to.",
    fields: [
      { key: "platforms", label: "iOS, Android, or both?", kind: "multi", required: true, options: ["iOS", "Android"] },
      { key: "one_job", assist: true, label: "In one sentence, what does the app do for the person holding the phone?", kind: "text", required: true },
      { key: "accounts", assist: true, label: "Do users log in? Are there different roles?", kind: "textarea", required: true },
      { key: "offline", assist: true, label: "Must it work without a connection?", kind: "cards", options: ["Yes", "No", UNSURE] },
      { key: "payments", assist: true, label: "Will customers pay through the app?", kind: "cards", options: ["No", "One-off payments", "Subscriptions", "Other"] },
      { key: "payments_other", label: "How else should payments work?", kind: "text", showIf: { key: "payments", equals: ["Other"] } },
      {
        key: "store_accounts", label: "Do you have developer accounts for the stores?", kind: "cards",
        required: true, options: ["Both", "One of them", "Neither", UNSURE],
        tip: "Apple and Google both require a paid developer account in YOUR name to publish. If you have neither, we will walk you through it. It is not a blocker.",
      },
      {
        key: "store_accounts_wanted", label: "Would you like us to set up the ones you are missing?", kind: "yesno",
        showIf: { key: "store_accounts", equals: ["One of them", "Neither", UNSURE] },
        scope: "Apple and Google charge their own developer fees, paid to them and in your name. Our time to open the accounts and get the app through review is extra to the build, and quoted before we start.",
      },
      { key: "backend", assist: true, label: "Is there a backend already, or are we building it?", kind: "cards", options: ["One exists", "Build it", UNSURE] },
    ],
  },
  {
    phase: "work", id: "software", service: "software", title: "Software & AI",
    blurb: "What it replaces, and how we will know it worked.",
    fields: [
      { key: "process", assist: true, label: "What are people doing by hand today that this should take over?", kind: "textarea", required: true },
      { key: "users_count", assist: true, label: "How many people will use it, and who are they?", kind: "text", required: true },
      { key: "data_home", assist: true, label: "Where does that information live now?", kind: "cards", options: ["Spreadsheets", "WhatsApp", "Paper", "An existing system", "Nowhere yet", "Other"] },
      { key: "data_home_other", label: "Where else is the information kept?", kind: "text", showIf: { key: "data_home", equals: ["Other"] } },
      { key: "systems", assist: true, label: "What must it talk to?", kind: "textarea", tip: "Accounting software, a payment provider, an existing database." },
      { key: "compliance", assist: true, label: "Any regulation or data rule we must design around?", kind: "textarea" },
      { key: "success_metric", assist: true, label: "What number tells us this worked?", kind: "text", placeholder: "e.g. hours saved a week, orders processed a day" },
    ],
  },
  {
    /* SPLIT IN TWO, and the handles are now one field per platform.

       A single "your handles" box was asking the client to invent a format,
       and what comes back is a paragraph somebody then has to read and unpick.
       The client's own social form does this properly -- nine separate handle
       fields, each revealed only by ticking its platform -- so a client on two
       platforms answers two questions and never sees the other seven. Copied
       because it is right, not because it was there. */
    phase: "work", id: "social", service: "social", title: "Where you are",
    blurb: "The accounts we would be running, and who runs them today.",
    fields: [
      { key: "channels", label: "Which platforms are you on?", kind: "multi", required: true, options: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "YouTube", "Pinterest", "Snapchat", "WhatsApp", "Somewhere else", "None yet"] },
      { key: "handle_instagram", label: "Your Instagram handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Instagram"] } },
      { key: "handle_facebook", label: "Your Facebook handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Facebook"] } },
      { key: "handle_x", label: "Your X handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["X"] } },
      { key: "handle_tiktok", label: "Your TikTok handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["TikTok"] } },
      { key: "handle_linkedin", label: "Your LinkedIn handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["LinkedIn"] } },
      { key: "handle_youtube", label: "Your YouTube handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["YouTube"] } },
      { key: "handle_pinterest", label: "Your Pinterest handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Pinterest"] } },
      { key: "handle_snapchat", label: "Your Snapchat handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Snapchat"] } },
      { key: "handle_whatsapp", label: "Your WhatsApp handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["WhatsApp"] } },
      { key: "handle_other", label: "Anywhere else? Give us the handle", kind: "text", showIf: { key: "channels", equals: ["Somewhere else"] } },
      { key: "content_source", label: "Who creates your content today?", kind: "cards", required: true, options: ["Nobody yet", "My team", "A freelancer", "I would like WDC to"] },
      {
        key: "content_creator_wanted", label: "Would you like us to create it?", kind: "yesno",
        showIf: { key: "content_source", equals: ["Nobody yet"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Accounts without a supply of content go quiet within a month. If making it yourself is not realistic, it is better to say so now than to find out in week three.",
      },
      { key: "access_ok", label: "How should we handle account access?", kind: "cards", required: true, options: ["I can give WDC access", "Please work through me"] },
    ],
  },
  {
    phase: "work", id: "social_content", service: "social", title: "What we post",
    blurb: "What it is for, what works, and what to stay away from.",
    fields: [
      { key: "social_goal", assist: true, label: "What do you most want social media to achieve?", kind: "cards", options: ["Awareness", "Sales", "Bookings", "Community", "Recruitment", "Other"] },
      { key: "social_goal_other", label: "What other result matters to you?", kind: "text", showIf: { key: "social_goal", equals: ["Other"] } },
      { key: "content_types", assist: true, label: "Which kinds of content tend to connect with your audience?", kind: "multi", options: ["Short video", "Photos", "Carousels", "Stories", "Live", "Written posts", "Memes and humour", "Behind the scenes", "Other", UNSURE] },
      { key: "content_types_other", label: "What other kind of content should we consider?", kind: "text", showIf: { key: "content_types", equals: ["Other"] } },
      { key: "themes_yes", assist: true, label: "Anything you want us to keep coming back to?", kind: "textarea" },
      { key: "themes_no", assist: true, label: "Anything we should stay away from?", kind: "textarea", tip: "Topics, competitors, a tone that is not you." },
      { key: "competitors_admired", assist: true, label: "Any competitor accounts you admire?", kind: "textarea", tip: "Handles are enough." },
      { key: "upcoming", label: "Any launches, promotions or events coming up we should plan around?", kind: "textarea" },
      {
        key: "ad_spend", assist: true, label: "What monthly media budget have you set aside?", kind: "select",
        tip: "This is media spend, paid to Meta or Google. It is separate from our fee.",
        options: ["Under ₦100k", "₦100k–₦500k", "₦500k–₦2m", "Over ₦2m", UNSURE],
      },
    ],
  },
];

export const CLOSING_STEPS: Step[] = [
  {
    phase: "final", id: "brand",
    title: "Brand and assets",
    blurb: "Anything you already have. Nothing here blocks you from finishing.",
    fields: [
      { key: "has_logo", label: "Do you have a logo ready?", kind: "yesno", required: true },
      { key: "logo_files", label: "Upload your logo files", kind: "upload", showIf: { key: "has_logo", equals: ["Yes"] } },
      /* "No" WAS A DEAD END, AND IT IS THE MOST CONSEQUENTIAL ANSWER HERE. A
         client with no logo has no identity for the work to be built out of,
         and everything downstream -- a site, an app, a month of posts -- has to
         either invent one or wait for one. The form used to move straight past
         that, which left the client stuck and left us finding out in week two. */
      {
        key: "logo_wanted", label: "Would you like us to design one?", kind: "yesno",
        notFor: ["branding"],
        showIf: { key: "has_logo", equals: ["No"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Saying no stops nothing. We will work with what you have and keep the design plain enough that a logo drops into it later without a rebuild.",
      },
      {
        key: "has_brandbook", label: "Do you have a brand book or guide?", kind: "cards", required: true,
        options: ["Yes", "No", "I'm not sure what that is"],
        tip: "A brand book is a document setting out your colours, fonts, logo rules and tone of voice, so everything a business makes looks like it came from the same place. Plenty of businesses do not have one, and that is a normal answer.",
      },
      { key: "brandbook_file", label: "Upload it", kind: "upload", showIf: { key: "has_brandbook", equals: ["Yes"] } },
      { key: "brand_colours", label: "Your brand colours", kind: "text", placeholder: "e.g. Navy #000065, Orange #FF6500", tip: "Hex codes if you have them, names if you do not.", showIf: { key: "has_brandbook", equals: ["No", "I'm not sure what that is"] } },
      {
        key: "brandbook_wanted", label: "Would you like us to put one together?", kind: "yesno",
        notFor: ["branding"],
        showIf: { key: "has_brandbook", equals: ["No", "I'm not sure what that is"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "It is what stops everything made afterwards looking like it came from somewhere else: colours, fonts, logo rules and tone of voice, written down once so the next person does not have to guess.",
      },
      { key: "inspiration", assist: true, label: "Two or three examples you like, and what you like about them", kind: "textarea" },
      { key: "assets", label: "Anything else we should have", kind: "upload" },
    ],
  },
  {
    phase: "final", id: "working",
    title: "How we will work",
    blurb: "Who decides, and what we must not miss.",
    fields: [
      { key: "approver", label: "Who signs work off?", kind: "text", required: true, tip: "One person. Projects slow down most when feedback arrives from several directions and disagrees with itself." },
      { key: "others", label: "Anyone else who needs to see things?", kind: "textarea" },
      { key: "fixed_dates", label: "Any fixed dates we have to hit?", kind: "textarea", placeholder: "A launch, an event, a print deadline." },
      { key: "channel", label: "Which channels work best for project updates?", kind: "multi", required: true, options: [PROJECT_UPDATE_PORTAL, "Email", "WhatsApp", "Phone call", "Other"] },
      { key: "channel_other", label: "Which other channel would you prefer?", kind: "text", showIf: { key: "channel", equals: ["Other"] } },
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
  const serviceFields = serviceParts.flatMap((step) => step.fields);
  const cut = serviceParts.length > 1
    ? serviceParts[0].fields.length
    : Math.ceil(serviceFields.length / 2);
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
    {
      phase: "you",
      id: "about-you",
      title: "About you",
      blurb: "Your details, your business, and who the work needs to reach.",
      fields: CORE_STEPS.flatMap((step) => step.fields),
    },
    {
      phase: "work",
      id: `${service}-goals`,
      service,
      title: goalsTitle,
      blurb: "What the project needs to achieve for you.",
      fields: serviceFields.slice(0, cut),
    },
    {
      phase: "work",
      id: `${service}-details`,
      service,
      title: detailsTitle,
      blurb: "The practical choices and context that help us begin well.",
      fields: serviceFields.slice(cut),
    },
    {
      phase: "final",
      id: "finishing-up",
      title: "Finishing up",
      blurb: "Assets, approvals, communication, and anything we should not miss.",
      /* `notFor` IS APPLIED HERE, not in the renderer, because the question
         should not exist for this form rather than be hidden in it: a field
         that is filtered out cannot be required, cannot be validated, and
         cannot turn up in the review screen or the submitted record. Offering
         a branding client a logo they have just bought is the case it exists
         for. */
      fields: CLOSING_STEPS
        .flatMap((step) => step.fields)
        .filter((f) => !f.notFor?.includes(service)),
    },
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
  const filled = isFilled(value);

  if (!filled) {
    /* The message names the FIELD, because the summary at the bottom of a step
       lists several of these out of context and "This is required" repeated
       four times tells nobody which four. */
    return f.required ? `${f.label} still needs an answer.` : null;
  }

  /* An answer of "I don't know" is an answer. It cannot fail a format check,
     because it is not trying to be an email address. */
  if (value === UNSURE) return null;

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
  textarea: 32, upload: 10,
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
      if (!visibleNow(f)) continue;
      if (isFilled(answers[f.key])) continue;   // already done costs nothing
      s += SECONDS[f.kind] ?? 10;
    }
  }
  return Math.max(1, Math.round(s / 60));
}
