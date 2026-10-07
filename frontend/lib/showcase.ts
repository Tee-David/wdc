/**
 * What each service section SHOWS, as opposed to what it says.
 *
 * This is the drop-in point for real material. Every stage on /services reads
 * its categories, tabs and sample rows from here, so replacing placeholders
 * with real flyers, screenshots, stacks and case studies is an edit to this
 * file — no component changes, no layout retuning.
 *
 * Two rules the data has to keep:
 *  1. Nothing here states a result WDC has not published. The numbers are
 *     shaped like a case study so the layout is right, and every stage that
 *     shows one captions it as illustrative until a real one replaces it.
 *  2. `note` is the human sentence, not a keyword. These read as copy.
 */

/* ---------------------------------------------------------------- branding */
/**
 * The kinds of work the branding wall filters by. These are REAL WDC pieces,
 * exported from the studio Drive and resized for the web (originals are 2400px+
 * camera-sized files; the wall shows tiles a few hundred pixels wide).
 *
 * Every tile is square. The wall is a diagonal grid of equal cells, so a mixed
 * bag of aspect ratios would break its rhythm; `object-fit: cover` centres the
 * artwork inside the square.
 */
export type BrandKind = {
  id: string;
  label: string;
  note: string;
  items: { id: string; title: string; src: string; thumb: string }[];
};

/**
 * One piece of artwork, in two sizes.
 *
 * `src` is the full-resolution file, for a lightbox or a case study where the
 * work is the subject. `thumb` is a 560px derivative for the walls and grids.
 *
 * WHY BOTH. Measured on /services: the branding wall renders its tiles at
 * 282px and was being handed 900px originals, which is roughly ten times the
 * pixels it can show, 102 times over. The page pulled 3.7MB of images before
 * it had drawn anything. 560px is twice the rendered size, so it stays sharp
 * on a retina screen and nowhere near the original's weight.
 *
 * Generated with Pillow at quality 78, progressive, into public/brand-work/sm.
 * To regenerate after adding artwork, resize the long edge to 560 and write it
 * to that folder under the same filename.
 */
const asset = (slug: string, title: string) => ({
  id: slug,
  title,
  src: `/brand-work/${slug}.jpg`,
  thumb: `/brand-work/sm/${slug}.jpg`,
});

export const BRAND_KINDS: BrandKind[] = [
  {
    id: "print",
    label: "Flyers & posters",
    note: "Campaign and product artwork, built to hold up in print and on a feed.",
    items: [
      asset("bay-accessories-flyer", "Social media poster"),
      asset("mariamah-flyer", "Product range flyer"),
      asset("abebi-treats-flyer", "Menu flyer"),
      asset("samrich-flyer", "Campaign poster"),
      asset("tife-luxe-flyer", "Seasonal campaign"),
      asset("teefeh-val-flyer", "Offer & pricing flyer"),
      asset("orisun-flyer", "Announcement flyer"),
      asset("dhiol-stores", "Retail promo"),
      asset("aliyat-glamour-flyer", "Product catalogue post"),
      asset("beejay-flyer", "Gadget store promo"),
      asset("harbaby-anticipate", "Grand opening flyer"),
      asset("olanike-flyer", "Manifesto poster"),
      asset("kempes-flyer", "Tribute poster"),
      asset("sug-awards-banner", "Awards night banner"),
      asset("etf-outreach", "Outreach campaign poster"),
      asset("food-bank", "Campaign poster"),
      asset("childrens-day", "Event flyer"),
      asset("eye-screening", "Health campaign flyer"),
      asset("teachers-conference", "Conference flyer"),
      asset("hair-sale", "Sale flyer"),
      asset("delivery-promo", "Service promo"),
      asset("five-aside-cup", "Fixture graphic"),
      asset("span-fest-ticket", "Ticket design"),
      asset("deuces-illustration", "Illustrated poster"),
      asset("eid-greeting", "Seasonal greeting"),
      asset("easter-greeting", "Holiday greeting"),
      asset("christmas-greeting", "Christmas greeting"),
      asset("ramadan-greeting", "Ramadan greeting"),
      asset("tailoring-promo", "Tailoring promo"),
      asset("fashion-catalogue", "Fashion catalogue"),
      asset("gadget-poster", "Gadget store poster"),
      asset("education-campaign", "Education campaign"),
      asset("service-flyer", "Service flyer"),
      asset("eye-screening-2", "Health screening flyer"),
      asset("kappos-jotter", "Convocation flyer"),
      asset("staycation-flyer", "Travel package flyer"),
      asset("medical-checkup", "Medical outreach flyer"),
      asset("celebration-post", "Celebration post"),
      asset("womens-day", "Awareness day post"),
      asset("classroom-post", "Back-to-school post"),
      asset("fragrance-promo", "Fragrance promo"),
      asset("artdoor-staycation", "Event package flyer"),
      asset("timis-jewels-milestone", "Jewellery sale campaign"),
      asset("moore-dress-like-you-mean-it", "Apparel campaign post"),
      asset("sparkle-childrens-day", "Charity appeal flyer"),
      asset("fash-footies-caps", "Product launch post"),
      asset("ogreen-new-week", "Solar energy promo"),
      asset("everything-men-catalogue", "Menswear catalogue"),
      asset("dhiol-tech-new-year", "Seasonal retail post"),
      /* A step-and-repeat backdrop is a print piece rather than a post: it is
         the identity at two metres, which is a different job to the same mark
         at 400px, and it is the one asset here that has to survive being stood
         in front of. */
      asset("teaching-with-purpose-backdrop", "Conference backdrop"),
    ],
  },
  {
    id: "logos",
    label: "Logos & marks",
    note: "Identity systems, lockups and the rules that hold them together.",
    items: [
      asset("krypt-dao-logo", "Wordmark & symbol"),
      asset("marvs-pastries-logo", "Logo lockup"),
      asset("habby-logo", "Brand mark"),
      asset("pc-wordmark", "Wordmark"),
      asset("thinkers-diary-logo", "Logo colourways"),
      asset("moore-divider", "Mark on navy"),
      asset("moore-logo-variants", "Logo variants"),
      asset("moore-logo-usage", "Usage rules"),
      asset("marfaa-divider", "Mark on product"),
      asset("marfaa-logo-variants", "Mono variants"),
      asset("marfaa-logo-usage", "Correct usage"),
      asset("benedict-ogbogu-logo", "Personal brand colourways"),
      asset("vickygold-logo", "Fashion mark, four grounds"),
      asset("direct-link-logo", "Logistics mark & lockups"),
    ],
  },
  {
    /* Mockups earn their own tab rather than sitting among the flyers: a bag or
       a jotter is the identity applied to an object, which is a different thing
       to sell than a poster. */
    id: "merch",
    label: "Mockups & merch",
    note: "The identity off the screen: packaging, print and the things people hold.",
    items: [
      asset("diamond-empire-mockup", "Product mockup"),
      asset("diamond-empire-mockup-2", "Packaging mockup"),
      asset("fash-shopping-bag", "Carrier bag"),
      asset("habby-mockup", "Storefront signage"),
      asset("business-cards", "Business cards"),
      asset("stationery-set", "Stationery set"),
      asset("staff-id-card", "Staff ID card"),
      asset("merch-range", "Merch range"),
      asset("mayrols-signage", "Signage mockup"),
      asset("moore-storefront", "Storefront"),
      asset("moore-signage", "Signage and cap"),
      asset("marfaa-apparel", "Apparel"),
      /* An identity applied to the things a person actually touches: an app
         icon on a home screen, a browser tab, a sign-in screen. It sits here
         rather than under Brand guides because it is the mark in use, not the
         rules about it. */
      asset("benedict-ogbogu-applied", "Identity on screen"),
      asset("moore-letterhead", "Letterhead and stamp"),
    ],
  },
  {
    /* Presentation design: the same identity carried through a deck. Slides
       taken from the client's own decks, cover and structure pages only, so
       what is shown is what they were handed and nothing in it is commercially
       sensitive. */
    id: "decks",
    label: "Pitch decks",
    note: "Presentations built from the identity, so the story and the brand arrive together.",
    items: [
      asset("realtors-deck-cover", "Deck cover"),
      asset("realtors-deck-how-it-works", "Process slide"),
      asset("realtors-deck-evolution", "Section opener"),
      asset("realtors-deck-organising", "Principle slide"),
      asset("realtors-deck-built", "System overview"),
    ],
  },
  {
    id: "guides",
    label: "Brand guides",
    note: "A few pages from the documents themselves: voice, palette, logo rules.",
    items: [
      asset("dhiol-brand-guide-1", "Tech brand cover"),
      asset("dhiol-brand-guide-5", "Positioning statement"),
      asset("dhiol-brand-guide-6", "Brand voice"),
      asset("tab-guide-1", "Fashion brand cover"),
      asset("tab-guide-4", "Brand personality"),
      asset("tab-guide-6", "Primary logo"),
      asset("tab-guide-7", "Logo variations"),
      asset("moore-cover", "Apparel guide cover"),
      asset("moore-palette", "Secondary palette"),
      asset("moore-mockups", "Applied to product"),
      asset("moore-stationery", "Stationery system"),
      asset("marfaa-cover", "Streetwear guide cover"),
      asset("marfaa-palette", "Core palette"),
      asset("marfaa-mockups", "Retail application"),
      asset("marfaa-packaging", "Packaging and labels"),
      asset("millcon-cover", "Corporate profile cover"),
      asset("millcon-services", "Services spread"),
      asset("millcon-partners", "Partners page"),
      /* Skinish: a personal-care guide that runs from purpose and voice to
         the logo system, the don'ts and the packaging. Pages taken from the
         document itself rather than remade, so what is shown is what the
         client was handed. */
      asset("skinish-cover", "Personal-care guide cover"),
      asset("skinish-voice", "Brand voice"),
      asset("skinish-logo-variations", "Logo system"),
      asset("skinish-donts", "What not to do with the mark"),
      asset("skinish-typography", "Typography"),
      asset("skinish-mockups", "Applied to merch"),
      /* Thinkers Diary: a podcast identity, where most of the work is how the
         mark behaves on a dark studio photograph. */
      asset("thinkers-cover", "Podcast guide cover"),
      asset("thinkers-logo-dark", "Mark on dark"),
      asset("thinkers-logo-variants", "Alternative lockups"),
      asset("thinkers-palette", "Core palette"),
      asset("thinkers-mockups", "Applied to merch"),
    ],
  },
];

/* --------------------------------------------------------------------- web */
/**
 * Build variants: the frame's tabs, the stack behind each, and the SCREENS
 * each one shows.
 *
 * Custom build leads because it is the work we most want seen and the one with
 * a full set of real captures behind it.
 *
 * `shots` is per stack, because "we build on four different stacks" is only a
 * claim until each tab shows that stack. `scroll` says whether those captures
 * are long enough to move: a marketing site is a tall page and scrolls, a
 * dashboard is one screen and holds still. Scrolling a screenshot that already
 * fits just jitters it.
 *
 * A stack with no `shots` renders an explicit awaiting state rather than
 * borrowing another stack's screens. Showing a Next.js build under the
 * WordPress tab would be a lie told in pictures, which is worse than an empty
 * frame that says what it is waiting for.
 */
export type WebStack = {
  id: string;
  label: string;
  note: string;
  chips: readonly string[];
  /* True for a FULL-PAGE capture, which is taller than the frame and so runs
     as a loop; false for a single screen, which is held still and filled to
     the frame. The flag decides both the motion and the fit, because those two
     answers always follow from the same fact about the asset. */
  scroll: boolean;
  /* Each width is optional on its own. A stack can have a desktop capture and
     no tablet or phone — the stage renders only the frames it has assets for,
     rather than stretching one screenshot across three device shapes. */
  shots?: { desktop?: string; tablet?: string; phone?: string };
  /** What goes in the mock address bar. A path, because that is what a browser
      shows there — the client's name in a URL slot read as a label stuck on a
      screenshot. */
  url: string;
  /** The caption under the frame. It describes what this build TYPE gives you,
      not whose screen this is: crediting a client under a screenshot is a
      claim about them, and naming a platform's own admin ("the Shopify admin")
      captions the vendor's product rather than our work. */
  cap: string;
  /** Alt text subject. Not rendered visually. */
  shotOf?: string;
};

export const WEB_STACKS: WebStack[] = [
  {
    id: "custom",
    label: "Custom build",
    note: "Engineered from zero when a template would cost more than it saves.",
    chips: ["Next.js", "React", "TypeScript", "Tailwind"],
    scroll: true,
    url: "/careers",
    cap: "One build, laid out for the width it is given.",
    shotOf: "A custom build",
    shots: {
      desktop: "/work/long/trax-desktop.jpg",
      tablet: "/work/long/trax-tablet.jpg",
      phone: "/work/long/trax-phone.jpg",
    },
  },
  {
    id: "webapp",
    label: "Web app",
    note: "A product with accounts, data and state, not a brochure.",
    chips: ["Node", "Postgres", "Redis", "Cloud"],
    /* These are FULL-PAGE captures of the same dashboard taken at three real
       widths, so they scroll rather than being contained. The earlier set was
       one screen per device and held still; a full page has more to show than
       fits, and the whole claim of this stage is what the layout does with the
       width it is given. */
    scroll: true,
    url: "/dashboard",
    cap: "A signed-in product, at three real widths.",
    shotOf: "A web app dashboard",
    shots: {
      desktop: "/work/app/litch-dashboard.jpg",
      tablet: "/work/app/litch-tablet.jpg",
      phone: "/work/app/litch-mobile.jpg",
    },
  },
  {
    id: "wordpress",
    label: "WordPress",
    note: "CMS-driven, so your team edits it without calling us.",
    chips: ["WordPress", "PHP", "Custom theme", "WooCommerce"],
    /* A single screen, not a full page: 1400x758 is barely taller than the
       frame, so looping it drifted the same view past itself. Held still and
       filled instead. */
    scroll: false,
    /* Desktop only. These are the PLATFORM's own admin, and the tablet and
       phone captures do not exist yet; the stage renders just the laptop
       rather than stretching this one across all three frames, which would
       present a desktop screenshot as a tablet and a phone layout. */
    url: "/wp-admin",
    cap: "The editor your team uses, not one they have to learn.",
    shotOf: "A WordPress editing screen",
    shots: { desktop: "/work/app/wp-admin.jpg" },
  },
  {
    id: "shopify",
    label: "Shopify",
    note: "Commerce on a managed checkout, themed rather than fought.",
    chips: ["Shopify", "Liquid", "Apps", "Payments"],
    /* A single screen, not a full page — see the WordPress note above. */
    scroll: false,
    /* Desktop only. These are the PLATFORM's own admin, and the tablet and
       phone captures do not exist yet; the stage renders just the laptop
       rather than stretching this one across all three frames, which would
       present a desktop screenshot as a tablet and a phone layout. */
    url: "/admin/orders",
    cap: "Products, orders and a checkout you do not maintain.",
    shotOf: "A store admin screen",
    shots: { desktop: "/work/app/shopify-admin.jpg" },
  },
];

/**
 * What the work rail shows when the Branding filter is on.
 *
 * The rail's other filters list PROJECTS -- a client, a sector, a live URL --
 * and branding work has none of those shapes. A logo is not a website, so
 * answering "show me the branding" with seven websites that happen to have had
 * branding done was the wrong list, not a short one.
 *
 * Built from BRAND_KINDS rather than duplicated from it, so a piece added to
 * the wall is a piece the rail can show. Four from each kind, in the order the
 * tabs run, which is what keeps the rail from being forty flyers and one logo.
 */
export type BrandPiece = { id: string; title: string; src: string; kind: string };

export const BRAND_RAIL: BrandPiece[] = BRAND_KINDS.flatMap((k) =>
  k.items.slice(0, 4).map((it) => ({ ...it, kind: k.label })),
);

/* -------------------------------------------------------------------- apps */
/**
 * Product shapes we build, rather than "we make apps".
 *
 * `ui` is what the phone actually renders for that kind. A SaaS dashboard, an
 * ERP table, a marketplace grid and an internal queue do not look alike, and
 * showing the same grey card stack under all four tabs is what made this stage
 * read as a template. Block types are deliberately few (`kpi`, `chart`, `row`,
 * `tile`, `task`) so the phone stays a sketch of an interface rather than a
 * pixel claim about a product we have not shipped.
 */
/** A block in a sketched phone screen. Few types on purpose — see above. */
export type AppBlock = { t: string; a?: string; b?: string };

export type AppKind = {
  id: string;
  label: string;
  note: string;
  screens: readonly string[];
  ui: readonly AppBlock[];
  /** A real capture of the shipped product, which replaces `ui` when present. */
  shot?: string;
  shotOf?: string;
};

/* Annotated rather than inferred: without the type, `shot` exists only on the
   member that has it and reading it off the union fails to compile. */
export const APP_KINDS: AppKind[] = [
  {
    id: "saas",
    label: "SaaS",
    note: "Multi-tenant products with billing, roles and an onboarding path.",
    screens: ["Dashboard", "Listings", "Agents", "CRM"],
    shot: "/work/app/realtors-mobile.jpg",
    shotOf: "the Realtors' Practice dashboard",
    /* A REAL capture of a product we shipped. Where one exists it replaces the
       sketch below — a screenshot of the actual thing beats an illustration of
       it every time. The other kinds keep their sketches until captures exist,
       rather than borrowing this one, which would claim a product we have not
       built for that category. */
    ui: [
      { t: "kpi", a: "MRR", b: "Churn" },
      { t: "chart" },
      { t: "row", a: "Acme Ltd", b: "Active" },
      { t: "row", a: "Northwind", b: "Trial" },
      { t: "row", a: "Vantage Co", b: "Active" },
    ],
  },
  {
    id: "erp",
    label: "ERP",
    note: "Operations, inventory and finance running off one source of truth.",
    screens: ["Dashboard", "Requests", "Invoices", "Reports"],
    shot: "/work/app/litch-mobile.jpg",
    shotOf: "the Litch Consulting dashboard",
    ui: [
      { t: "row", a: "PO-4417", b: "Received" },
      { t: "row", a: "PO-4418", b: "Partial" },
      { t: "row", a: "PO-4419", b: "Pending" },
      { t: "row", a: "PO-4420", b: "Received" },
      { t: "row", a: "PO-4421", b: "Pending" },
      { t: "kpi", a: "On hand", b: "Backorder" },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    note: "Two sides, payments in the middle, and trust built into both.",
    screens: ["Professionals", "Exhibitors", "Job board", "Verifications"],
    shot: "/work/app/nomarc-mobile.jpg",
    shotOf: "the Nomarc Projects console",
    ui: [
      { t: "tile", a: "Headphones", b: "24,500" },
      { t: "tile", a: "Keyboard", b: "18,900" },
      { t: "tile", a: "Monitor", b: "96,000" },
      { t: "tile", a: "Webcam", b: "31,200" },
      { t: "row", a: "Seller payout", b: "Weekly" },
    ],
  },
  {
    id: "internal",
    label: "Internal tools",
    note: "The unglamorous software a team actually runs on all day.",
    screens: ["Dashboard", "Sources", "Records", "Categories"],
    shot: "/work/app/rp-mobile.jpg",
    shotOf: "the RP data explorer",
    ui: [
      { t: "task", a: "Approve refund", b: "done" },
      { t: "task", a: "Verify KYC", b: "done" },
      { t: "task", a: "Escalate ticket", b: "open" },
      { t: "task", a: "Close period", b: "open" },
      { t: "task", a: "Reconcile", b: "open" },
      { t: "kpi", a: "In queue", b: "Cleared" },
    ],
  },
] as const;

/* ---------------------------------------------------------------- software */
/**
 * Where AI actually lands in the products we build.
 *
 * Each use carries its OWN request path and its own trace, because the four are
 * genuinely different architectures: extraction is a parse-and-validate
 * pipeline, an assistant is retrieval-then-generate. A tab that only swaps a
 * sentence while the diagram underneath stays put is a tab that is lying about
 * what changes.
 *
 * `nodes` is the chain drawn across the graph; `trace` is what the terminal
 * types. Both are illustrative of a build we would do, not a capture of a
 * client's system, which is what the stage caption says.
 */
export const AI_USES = [
  {
    id: "extract",
    label: "Extraction",
    note: "Documents and forms into structured data.",
    nodes: ["Upload", "OCR", "Extract", "Validate", "Store"],
    trace: [
      "POST /v1/documents  invoice-4417.pdf",
      "to  queued  job_8f21  size 412kb",
      "to  OCR: 3 pages, 1 table detected",
      "to  model: extract line items + totals",
      'from { "total": 184200, "currency": "NGN" }',
      'from { "lines": 12, "vendor": "Adeoye Ltd" }',
      "to  validate against invoice.schema.json",
      "from schema valid, 0 fields dropped",
      "to  match vendor to ledger account",
      "from matched: 6100 Subcontractors",
      "from written to ledger, 1.4s",
    ],
  },
  {
    id: "classify",
    label: "Classification",
    note: "Routing enquiries to the right queue.",
    nodes: ["Request", "API", "Classify", "Route", "Queue"],
    trace: [
      "POST /v1/enquiry  form-web-contact",
      "to  validate, dedupe against 30d window",
      "to  enrich: domain, region, first seen",
      "to  model: intent + urgency",
      'from { "intent": "quote", "confidence": 0.94 }',
      'from { "urgency": "high", "budget_hint": true }',
      "to  route: rules over model, sales owns quote",
      "from queued for a human, sla 4h",
      "to  notify owner, log to crm",
      "from crm record 41822 created",
      "from acknowledged in 120ms",
    ],
  },
  {
    id: "assist",
    label: "Assistants",
    note: "Answering from your own content, not the open web.",
    nodes: ["Question", "Search", "Retrieve", "Ground", "Answer"],
    trace: [
      'POST /v1/ask  "what is our refund window?"',
      "to  embed question, 1 vector",
      "to  search index over 2,140 docs",
      "to  retrieve: 4 passages, policy handbook",
      "to  model: answer FROM passages only",
      'from { "answer": "14 days from delivery" }',
      'from { "citations": 2, "unsupported": 0 }',
      "to  guard: refuse if no passage supports it",
      "from guard passed, nothing withheld",
      "to  log question, answer and sources",
      "from answered in 840ms",
    ],
  },
  {
    id: "summarise",
    label: "Summarising",
    note: "Long threads and records into a usable brief.",
    nodes: ["Thread", "Chunk", "Summarise", "Merge", "Brief"],
    trace: [
      "GET  /v1/threads/8821  61 messages",
      "to  strip quotes, signatures, duplicates",
      "to  chunk: 9 windows, overlap 200 tokens",
      "to  model: summarise each window",
      "from 9 partials returned",
      "to  merge: dedupe, order by decision",
      'from { "decisions": 5, "open_questions": 3 }',
      'from { "owners": 4, "dates_found": 2 }',
      "to  attach source message to each line",
      "from every line traceable to a message",
      "from brief ready, 2.1s",
    ],
  },
] as const;

/* --------------------------------------------------------------------- seo */
/**
 * Shape of an SEO case-study strip. PLACEHOLDER FIGURES — the layout is real,
 * the numbers are not, and the stage captions them as such until a published
 * case study replaces them.
 */
export const SEO_METRICS = [
  { id: "impressions", label: "Impressions", to: 184, suffix: "k", hint: "over six months" },
  { id: "clicks", label: "Clicks", to: 12.4, suffix: "k", hint: "from organic search" },
  { id: "position", label: "Avg. position", to: 3.2, suffix: "", hint: "for tracked terms" },
  { id: "pages", label: "Ranking pages", to: 61, suffix: "", hint: "on page one" },
] as const;

/* ------------------------------------------------------------------ social */
/** Channels we actually run, paid and organic. */
export const SOCIAL_CHANNELS = [
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "google", label: "Google Ads" },
] as const;

/**
 * Engagement tiles. PLACEHOLDER FIGURES, captioned as such by the stage — real
 * campaign numbers replace them without touching the component.
 */
export const SOCIAL_ENGAGEMENT = [
  { id: "reach", label: "Reach", to: 428, suffix: "k" },
  { id: "eng", label: "Engagements", to: 36.2, suffix: "k" },
  { id: "followers", label: "New followers", to: 9.4, suffix: "k" },
] as const;

/**
 * Real campaign artwork for the social wall — the same studio Drive, the sets
 * we actually ran. `tag` is the format, kept short so a card stays a card.
 */
export const SOCIAL_POSTS = [
  { src: "/brand-work/bamssa-social-night.jpg", tag: "Event", t: "Social night promo" },
  { src: "/brand-work/bamssa-business-summit.jpg", tag: "Campaign", t: "Business summit" },
  { src: "/brand-work/bamssa-debate.jpg", tag: "Post", t: "Debate competition" },
  { src: "/brand-work/bamssa-olympics.jpg", tag: "Event", t: "Inter-faculty games" },
  { src: "/brand-work/bamssa-health-seminar.jpg", tag: "Campaign", t: "Health seminar" },
  { src: "/brand-work/bamssa-new-month.jpg", tag: "Monthly", t: "New month greeting" },
  { src: "/brand-work/bamssa-twitter-space.jpg", tag: "Live", t: "Live audio promo" },
  { src: "/brand-work/nipsa-social-night.jpg", tag: "Event", t: "Social night" },
  { src: "/brand-work/nipsa-efootball.jpg", tag: "Campaign", t: "E-football tournament" },
  { src: "/brand-work/nipsa-movie-night.jpg", tag: "Post", t: "Movie night" },
  { src: "/brand-work/nipsa-codm.jpg", tag: "Campaign", t: "Gaming tournament" },
  { src: "/brand-work/nipsa-new-week.jpg", tag: "Schedule", t: "Week schedule" },
  { src: "/brand-work/dhiol-world-may.jpg", tag: "Monthly", t: "New month, tech retail" },
  { src: "/brand-work/dhiol-world-april.jpg", tag: "Monthly", t: "Product launch post" },
  { src: "/brand-work/dhiol-world-february.jpg", tag: "Monthly", t: "Handset promo" },
  { src: "/brand-work/dhiol-world-anticipate.jpg", tag: "Teaser", t: "Announcement teaser" },
  { src: "/brand-work/dhiol-stores-new-week.jpg", tag: "Post", t: "New week post" },
  { src: "/brand-work/dhiol-stores-weekend.jpg", tag: "Post", t: "Weekend post" },
  { src: "/brand-work/dhiol-stores-multivendor.jpg", tag: "Launch", t: "Marketplace launch" },
  { src: "/brand-work/span-health-week.jpg", tag: "Campaign", t: "Health week campaign" },
  { src: "/brand-work/span-medical-outreach.jpg", tag: "Campaign", t: "Medical outreach" },
  { src: "/brand-work/span-excursion.jpg", tag: "Event", t: "Excursion promo" },
  { src: "/brand-work/span-welcome-back.jpg", tag: "Schedule", t: "Back-to-school campaign" },
  { src: "/brand-work/span-excos-template-1.jpg", tag: "Series", t: "Exec roster series" },
  { src: "/brand-work/party-of-the-year.jpg", tag: "Event", t: "Party flyer" },
  { src: "/brand-work/fash-footies-new-week.jpg", tag: "Post", t: "Footwear promo" },
  { src: "/brand-work/dhiol-start-again.jpg", tag: "Post", t: "Handset trade-in" },
  { src: "/brand-work/dhiol-consult.jpg", tag: "Campaign", t: "Business registration" },
  { src: "/brand-work/nipsa-week-anticipate.jpg", tag: "Teaser", t: "Week teaser" },
  { src: "/brand-work/express-september.jpg", tag: "Monthly", t: "New month, logistics" },
  { src: "/brand-work/express-guess-location.jpg", tag: "Post", t: "Engagement post" },
  { src: "/brand-work/span-fest-artist.jpg", tag: "Event", t: "Guest artist reveal" },
  { src: "/brand-work/dhiol-august.jpg", tag: "Monthly", t: "August refresh" },
  { src: "/brand-work/dhiol-november.jpg", tag: "Monthly", t: "November refresh" },
] as const;

/** A fortnight of a content calendar. `kind` drives the cell's colour. */
export type SlotKind = "organic" | "paid" | "story" | "none";
export const CALENDAR: SlotKind[] = [
  "organic", "none", "paid", "organic", "story", "none", "none",
  "organic", "paid", "none", "organic", "organic", "story", "paid",
];

/* -------------------------------------------------- cross-platform source */
/**
 * The files behind the "one codebase, two stores" claim.
 *
 * Written to be READ, not to compile: short enough to take in at a glance and
 * shaped like the real thing, with the cross-platform argument visible in the
 * code itself rather than only in the caption — one screen component, one
 * shared client, one config that names both platforms.
 */
export const APP_SOURCE = [
  {
    id: "screen",
    dir: ["app", "(tabs)"],
    name: "index.tsx",
    code: `import { View, FlatList } from 'react-native';
import { useEntries } from '@/lib/api';
import { EntryCard } from '@/components/EntryCard';

export default function Today() {
  const { data = [] } = useEntries();
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EntryCard entry={item} />}
      />
    </View>
  );
}`,
  },
  {
    id: "card",
    dir: ["components"],
    name: "EntryCard.tsx",
    code: `import { Pressable, Text } from 'react-native';
import type { Entry } from '@/lib/api';

// One component. iOS and Android both render this.
export function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Pressable style={styles.card} onPress={entry.open}>
      <Text style={styles.title}>{entry.project}</Text>
      <Text style={styles.time}>{entry.elapsed}</Text>
    </Pressable>
  );
}`,
  },
  {
    id: "api",
    dir: ["lib"],
    name: "api.ts",
    code: `import useSWR from 'swr';

export type Entry = {
  id: string;
  project: string;
  elapsed: string;
  open: () => void;
};

export function useEntries() {
  return useSWR<Entry[]>('/v1/entries', (url) =>
    fetch(url).then((r) => r.json()),
  );
}`,
  },
  {
    id: "config",
    dir: [],
    name: "app.json",
    code: `{
  "expo": {
    "name": "TraxStaff",
    "slug": "traxstaff",
    "platforms": ["ios", "android"],
    "ios": { "bundleIdentifier": "com.wdc.traxstaff" },
    "android": { "package": "com.wdc.traxstaff" }
  }
}`,
  },
];
