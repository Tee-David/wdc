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
 * The asset kinds the dome filters by. These are REAL WDC pieces, exported from
 * the studio Drive and resized for the web (originals are 2400px+ camera-sized
 * files; the dome shows tiles a few hundred pixels wide).
 *
 * `shape` follows the artwork, not a preference: the flyers are square because
 * they are built square for social, and the tile geometry is derived from it —
 * a square poster forced into a portrait crop loses its own composition.
 */
export type BrandKind = {
  id: string;
  label: string;
  note: string;
  shape: "portrait" | "landscape" | "square";
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
    shape: "square",
    items: [
      asset("bay-accessories-flyer", "BAY Accessories"),
      asset("mariamah-flyer", "Mariamah"),
      asset("abebi-treats-flyer", "Abebi Treats"),
      asset("samrich-flyer", "Samrich"),
      asset("tife-luxe-flyer", "Tife Sensual Luxe"),
      asset("teefeh-val-flyer", "Teefeh"),
      asset("orisun-flyer", "Orisun"),
      asset("dhiol-stores", "Dhiol Stores"),
      asset("diamond-empire-mockup", "Diamond Empire"),
      asset("fash-shopping-bag", "Fash"),
    ],
  },
  {
    id: "logos",
    label: "Logos & marks",
    note: "Identity systems, lockups and the rules that hold them together.",
    shape: "square",
    items: [
      asset("krypt-dao-logo", "Krypt DAO"),
      asset("marvs-pastries-logo", "Marv's Pastries"),
      asset("habby-logo", "Habby"),
      asset("pc-wordmark", "PC wordmark"),
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
    note: "A product with accounts, data and state — not a brochure.",
    chips: ["Node", "Postgres", "Redis", "Cloud"],
  },
] as const;

/* -------------------------------------------------------------------- apps */
/** Product shapes we build, rather than "we make apps". */
export const APP_KINDS = [
  {
    id: "saas",
    label: "SaaS",
    note: "Multi-tenant products with billing, roles and an onboarding path.",
    screens: ["Dashboard", "Billing", "Team", "Settings"],
  },
  {
    id: "erp",
    label: "ERP",
    note: "Operations, inventory and finance running off one source of truth.",
    screens: ["Orders", "Stock", "Invoices", "Reports"],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    note: "Two sides, payments in the middle, and trust built into both.",
    screens: ["Browse", "Listing", "Checkout", "Payouts"],
  },
  {
    id: "internal",
    label: "Internal tools",
    note: "The unglamorous software a team actually runs on all day.",
    screens: ["Queue", "Records", "Approvals", "Audit"],
  },
] as const;

/* ---------------------------------------------------------------- software */
/** Where AI actually lands in the products we build. */
export const AI_USES = [
  { id: "extract", label: "Extraction", note: "Documents and forms into structured data." },
  { id: "classify", label: "Classification", note: "Routing enquiries to the right queue." },
  { id: "assist", label: "Assistants", note: "Answering from your own content, not the open web." },
  { id: "summarise", label: "Summarising", note: "Long threads and records into a usable brief." },
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
  { src: "/brand-work/bamssa-social-night.jpg", tag: "Event", t: "BAMSSA Social Night" },
  { src: "/brand-work/bamssa-business-summit.jpg", tag: "Campaign", t: "BAMSSA Business Summit" },
  { src: "/brand-work/bamssa-debate.jpg", tag: "Post", t: "BAMSSA Debate" },
  { src: "/brand-work/nipsa-social-night.jpg", tag: "Event", t: "NIPSA Social Night" },
  { src: "/brand-work/nipsa-efootball.jpg", tag: "Campaign", t: "NIPSA E-Football" },
  { src: "/brand-work/nipsa-movie-night.jpg", tag: "Post", t: "NIPSA Movie Night" },
  { src: "/brand-work/dhiol-world-may.jpg", tag: "Monthly", t: "Dhiol World" },
  { src: "/brand-work/dhiol-stores-new-week.jpg", tag: "Post", t: "Dhiol Stores" },
] as const;

/** A fortnight of a content calendar. `kind` drives the cell's colour. */
export type SlotKind = "organic" | "paid" | "story" | "none";
export const CALENDAR: SlotKind[] = [
  "organic", "none", "paid", "organic", "story", "none", "none",
  "organic", "paid", "none", "organic", "organic", "story", "paid",
];
