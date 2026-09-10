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
  items: { id: string; title: string; src: string }[];
};

const asset = (slug: string, title: string) => ({
  id: slug,
  title,
  src: `/brand-work/${slug}.jpg`,
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
      asset("moore-divider", "Logo section"),
      asset("moore-palette", "Secondary palette"),
      asset("moore-mockups", "Applied to product"),
      asset("moore-stationery", "Stationery system"),
      asset("marfaa-cover", "Streetwear guide cover"),
      asset("marfaa-divider", "Mark on product"),
      asset("marfaa-palette", "Core palette"),
      asset("marfaa-mockups", "Retail application"),
      asset("marfaa-packaging", "Packaging and labels"),
      asset("millcon-cover", "Corporate profile cover"),
      asset("millcon-services", "Services spread"),
      asset("millcon-partners", "Partners page"),
    ],
  },
];

/* --------------------------------------------------------------------- web */
/** Build variants. The frame's tabs; `chips` is the stack behind each. */
export const WEB_STACKS = [
  {
    id: "wordpress",
    label: "WordPress",
    note: "CMS-driven, so your team edits it without calling us.",
    chips: ["WordPress", "PHP", "Custom theme", "WooCommerce"],
  },
  {
    id: "shopify",
    label: "Shopify",
    note: "Commerce on a managed checkout, themed rather than fought.",
    chips: ["Shopify", "Liquid", "Apps", "Payments"],
  },
  {
    id: "custom",
    label: "Custom build",
    note: "Engineered from zero when a template would cost more than it saves.",
    chips: ["Next.js", "React", "TypeScript", "Tailwind"],
  },
  {
    id: "webapp",
    label: "Web app",
    note: "A product with accounts, data and state, not a brochure.",
    chips: ["Node", "Postgres", "Redis", "Cloud"],
  },
] as const;

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
export const APP_KINDS = [
  {
    id: "saas",
    label: "SaaS",
    note: "Multi-tenant products with billing, roles and an onboarding path.",
    screens: ["Dashboard", "Billing", "Team", "Settings"],
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
    screens: ["Orders", "Stock", "Invoices", "Reports"],
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
    screens: ["Browse", "Listing", "Checkout", "Payouts"],
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
    screens: ["Queue", "Records", "Approvals", "Audit"],
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
      "to OCR: 3 pages, 1 table detected",
      "to model: extract line items + totals",
      'from { "total": 184200, "currency": "NGN", "lines": 12 }',
      "from schema valid, written to ledger, 1.4s",
    ],
  },
  {
    id: "classify",
    label: "Classification",
    note: "Routing enquiries to the right queue.",
    nodes: ["Request", "API", "Classify", "Route", "Queue"],
    trace: [
      "POST /v1/enquiry",
      "to validate, dedupe, enrich",
      "to model: intent + urgency",
      'from { "intent": "quote", "confidence": 0.94 }',
      "from routed to sales, queued for a human, 120ms",
    ],
  },
  {
    id: "assist",
    label: "Assistants",
    note: "Answering from your own content, not the open web.",
    nodes: ["Question", "Search", "Retrieve", "Ground", "Answer"],
    trace: [
      'POST /v1/ask  "what is our refund window?"',
      "to embed, search index over 2,140 docs",
      "to retrieve: 4 passages, policy handbook",
      "to model: answer FROM passages only",
      "from answered with 2 citations, 0 hallucinated, 840ms",
    ],
  },
  {
    id: "summarise",
    label: "Summarising",
    note: "Long threads and records into a usable brief.",
    nodes: ["Thread", "Chunk", "Summarise", "Merge", "Brief"],
    trace: [
      "GET /v1/threads/8821  61 messages",
      "to chunk: 9 windows, overlap 200 tokens",
      "to model: summarise each window",
      "to merge: dedupe, order by decision",
      "from brief: 5 decisions, 3 open questions, 2.1s",
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
