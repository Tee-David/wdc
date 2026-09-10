/**
 * The work catalogue behind /work, /work/[category] and /work/[category]/[slug].
 *
 * Three tiers, one source. The hub lists CATEGORIES, a category lists the
 * PIECES tagged to it, and a piece with a written case study gets a detail
 * page. Everything below is derived from what the studio has already shipped
 * and captured — lib/projects.ts for the sites, lib/showcase.ts for the
 * artwork — rather than being a second, hand-maintained copy that drifts from
 * them.
 *
 * TWO RULES THIS FILE KEEPS.
 *
 * 1. NO INVENTED RESULTS. The reference layout has a strip of figures under
 *    the hero — "3x faster", "+40% conversions", "99.99% uptime". Those are
 *    the client's numbers to publish, not ours to estimate, so `metrics` is
 *    optional and the strip does not render without it. Nothing here has one
 *    yet. When a client signs off on real figures, adding them lights the
 *    strip with no component change. What every case study DOES carry is what
 *    can be evidenced from the delivered product: what it is, what was built,
 *    and what it runs on.
 *
 * 2. ONE CANONICAL URL PER PIECE. A project can be tagged to several services
 *    — TraxStaff is web, apps and software — so it appears in three category
 *    listings. Its link always points at `/work/<canonical>/<slug>`, so the
 *    same case study is never served from three addresses.
 */
import { PROJECTS } from "./projects";
import { SERVICES, type ServiceSlug } from "./services";
import { BRAND_KINDS, SOCIAL_POSTS } from "./showcase";

/* ------------------------------------------------------------------ types */

/** A figure a CLIENT has published. Never our estimate — see rule 1 above. */
export type WorkMetric = { v: string; l: string };

export type CaseStudy = {
  slug: string;
  /** The category whose URL owns this piece. */
  category: ServiceSlug;
  /** Every category that lists it, canonical included. */
  categories: ServiceSlug[];
  title: string;
  client: string;
  sector: string;
  /** Where the client operates. Shown in the detail page's meta line. */
  location: string;
  url?: string;
  cover?: string;
  /** One line, on the card. */
  summary: string;
  about: string;
  /** What the engagement covered. Deliberately "the brief" and not "the
      problem": we can evidence what we were asked to build, and we are not
      going to narrate a client's internal difficulties on their behalf. */
  brief: string;
  approach: string;
  did: string[];
  stack: string[];
  /** Captures of the delivered product. */
  gallery?: string[];
  /** Only when the client has published them. */
  metrics?: WorkMetric[];
};

/** A single piece of artwork. No case study — a flyer has no narrative, and
    writing one for each of a hundred would be a hundred inventions. */
export type GalleryPiece = {
  id: string;
  title: string;
  src: string;
  /** Which family it belongs to, shown on the card. */
  kind: string;
};

export type WorkCategory = {
  slug: ServiceSlug;
  /** Short label, for the hub card and the breadcrumb. */
  label: string;
  /** Full service name, for the category page's heading. */
  name: string;
  lede: string;
  /** How this category presents: written case studies, or a gallery wall. */
  shape: "case" | "gallery";
  /** The hub card's artwork. */
  cover: string;
};

/* ------------------------------------------------------------ case studies */

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "traxstaff",
    category: "web",
    categories: ["web", "apps", "software"],
    title: "One time-tracking product across web, desktop and mobile",
    client: "TraxStaff",
    sector: "Time tracking for teams",
    location: "Nigeria",
    url: "https://traxstaff.com/",
    cover: "/work/traxstaff.jpg",
    summary: "A dashboard, a desktop client and a mobile app on one API.",
    about:
      "TraxStaff is a time-tracking product for teams. Time is recorded against a project and a task as the work happens, and the record is organised by day, week and project rather than dropped into one long list.",
    brief:
      "Build the product on every surface a team actually works on — a browser, a desktop machine and a phone — without three separate codebases drifting apart, and with roles and permissions that hold the same in all three.",
    approach:
      "One API behind three clients. The dashboard is a Next.js application, the desktop client is Tauri so it ships as a native binary rather than a bundled browser, and the mobile client is Expo. The server is Fastify over Prisma and Postgres, so every client reads the same data through the same rules.",
    did: [
      "Next.js dashboard with day, week and project views",
      "Fastify and Prisma API over Postgres",
      "Tauri desktop client for tracking while you work",
      "Expo mobile client for iOS and Android",
      "Owner, admin and member roles, enforced at the API",
      "Manual entries flagged for review and approval",
      "Insights across people, projects and categories",
    ],
    stack: ["Next.js", "TypeScript", "Fastify", "Prisma", "PostgreSQL", "Tauri", "Expo"],
    gallery: [
      "/work/long/trax-desktop.jpg",
      "/work/app/trax-app-desktop.jpg",
      "/work/app/trax-app-tablet.jpg",
      "/work/app/trax-app-phone.jpg",
    ],
  },
  {
    slug: "realtors-practice",
    category: "apps",
    categories: ["apps", "web", "software", "branding"],
    title: "A property platform with listings, agents and a CRM behind one login",
    client: "Realtors' Practice",
    sector: "Property data and listings",
    location: "Nigeria",
    url: "https://realtorspractice.ng/",
    cover: "/work/realtorspractice.jpg",
    summary: "Listings, agent records and a CRM in a single signed-in product.",
    about:
      "Realtors' Practice is a property data and listings platform. Agents work inside it daily, so the product is a signed-in workspace rather than a catalogue with a contact form bolted on.",
    brief:
      "Put listings, the agents who manage them and the client pipeline into one product, with the same views usable on a phone in the field as at a desk.",
    approach:
      "A multi-tenant application: accounts, roles and a dashboard that opens on what the signed-in user is responsible for. The layout is built mobile-first, because an agent standing in a property is the primary reader, not an afterthought.",
    did: [
      "Dashboard opening on the signed-in agent's own work",
      "Listings management with media and status",
      "Agent records and verification",
      "CRM for the client pipeline",
      "Responsive throughout, phone to desktop",
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: ["/work/app/realtors-dashboard.jpg", "/work/app/realtors-mobile.jpg"],
  },
  {
    slug: "litch-consulting",
    category: "software",
    categories: ["software", "web", "branding"],
    title: "Operations, requests and reporting on one source of truth",
    client: "Litch Consulting",
    sector: "Modelling and data analytics",
    location: "Nigeria",
    url: "https://litchconsulting.com/",
    cover: "/work/litchconsulting.jpg",
    summary: "An internal console for requests, invoices and reporting.",
    about:
      "Litch Consulting works in modelling and data analytics. The engagement covered both the public site and the console the team runs on internally.",
    brief:
      "Replace work tracked across separate documents with one console — requests raised, invoices against them, and reporting drawn from the same records rather than re-keyed.",
    approach:
      "A single data model underneath the whole console, so a request, the invoice raised against it and the figure that appears in a report are the same record read three ways. The interface is laid out around that rather than around a set of unrelated screens.",
    did: [
      "Public site build",
      "Internal dashboard with requests and invoices",
      "Reporting drawn from live records",
      "Responsive layouts at desktop, tablet and phone widths",
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: [
      "/work/app/litch-dashboard.jpg",
      "/work/app/litch-tablet.jpg",
      "/work/app/litch-mobile.jpg",
    ],
  },
  {
    slug: "nomarc-projects",
    category: "software",
    categories: ["software", "web"],
    title: "A two-sided hiring platform for construction",
    client: "Nomarc Projects",
    sector: "Construction hiring platform",
    location: "Nigeria",
    url: "https://nomarcprojects.com/",
    cover: "/work/nomarcprojects.jpg",
    summary: "Professionals on one side, exhibitors on the other, verification in between.",
    about:
      "Nomarc Projects connects construction professionals with the companies hiring them. Two sides of a marketplace, each needing to trust the other before anything useful happens.",
    brief:
      "Build both sides of the platform and the verification that sits between them, with a console the operator can actually run the marketplace from.",
    approach:
      "Professionals and exhibitors get their own flows rather than one shared form with fields hidden by role, because the two are doing genuinely different things. Verification is an operator step in the console, not an automatic pass.",
    did: [
      "Professional profiles and registration",
      "Exhibitor accounts and listings",
      "Job board across both sides",
      "Verification queue in the operator console",
      "Responsive layouts, phone to desktop",
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: [
      "/work/app/nomarc-admin.jpg",
      "/work/app/nomarc-tablet.jpg",
      "/work/app/nomarc-mobile.jpg",
    ],
  },
  {
    slug: "jomo-resource-center",
    category: "seo",
    categories: ["seo", "web", "branding"],
    title: "A training centre's site, built to be found",
    client: "Jomo Resource Center",
    sector: "Education and training",
    location: "Nigeria",
    url: "https://jomorc.com/",
    cover: "/work/jomorc.jpg",
    summary: "A course site with the technical groundwork search engines need.",
    about:
      "Jomo Resource Center runs education and training programmes. People find that kind of provider by searching for the course, not the company, so the site had to answer the search rather than the brand.",
    brief:
      "Build the site and the search groundwork together: structure, metadata and performance handled during the build instead of retrofitted afterwards.",
    approach:
      "Pages are structured around what people actually search for, with the technical layer — crawlable markup, metadata, structured data and page speed — treated as part of the build rather than a later pass.",
    did: [
      "Site build with a page per programme",
      "Technical SEO groundwork during the build",
      "Metadata and structured data",
      "Performance and Core Web Vitals work",
      "Brand assets carried through the site",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
  },
  {
    slug: "speak-up-for-a-change",
    category: "social",
    categories: ["social", "web", "branding"],
    title: "A non-profit's site and the campaign artwork that feeds it",
    client: "Speak Up For A Change",
    sector: "Non-profit",
    location: "Nigeria",
    url: "https://speakupforachange.org/",
    cover: "/work/speakupforachange.jpg",
    summary: "One identity across the site and the social campaigns.",
    about:
      "Speak Up For A Change is a non-profit whose reach depends on being shared. The site and the social artwork are the same piece of work, because a campaign post that looks nothing like the site it links to loses the visitor at the click.",
    brief:
      "Build the site and design the campaign artwork as one system, so a post, a flyer and the page they lead to read as the same organisation.",
    approach:
      "The identity is set once and applied across both: the same type, the same colour and the same layout rules on the site and on every campaign piece, so nothing has to be redesigned from scratch each time a campaign runs.",
    did: [
      "Site build",
      "Campaign and outreach artwork",
      "Social templates for recurring posts",
      "Identity applied consistently across both",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
  },
  {
    slug: "exambeta-travels",
    category: "web",
    categories: ["web", "branding"],
    title: "Education and mobility, in one place people trust",
    client: "Exambeta Travels & Tours",
    sector: "Education and mobility",
    location: "Nigeria",
    url: "https://exambeta.com.ng/",
    cover: "/work/exambeta.jpg",
    summary: "A services site for a business people are trusting with a big decision.",
    about:
      "Exambeta Travels & Tours works across education and mobility — the kind of service someone commits to well before they can see a result, which puts the burden on the site to be clear about what is actually offered.",
    brief:
      "Set out the services plainly, make the enquiry route obvious from any page, and carry the brand consistently across the whole site.",
    approach:
      "Structure before decoration: each service gets a page that says what it is and what it involves, with one enquiry route repeated rather than a different call to action per section.",
    did: [
      "Site build with a page per service",
      "One enquiry route, repeated throughout",
      "Brand applied across the site",
      "Responsive layouts, phone to desktop",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
  },
];

/* --------------------------------------------------------------- galleries */

/**
 * Branding and social are shown as WALLS, not as case studies.
 *
 * A flyer is a finished piece of work, not a project with a brief and an
 * approach behind it, and inventing that narrative a hundred times over would
 * be exactly the padding the rest of this site avoids. So these categories
 * list the artwork itself, at a size where it can be read.
 */
export const BRANDING_GALLERY: GalleryPiece[] = BRAND_KINDS.flatMap((k) =>
  k.items.map((it) => ({ ...it, kind: k.label })),
);

export const SOCIAL_GALLERY: GalleryPiece[] = SOCIAL_POSTS.map((p, i) => ({
  id: `social-${i}`,
  title: p.t,
  src: p.src,
  kind: p.tag,
}));

export const galleryFor = (slug: ServiceSlug): GalleryPiece[] =>
  slug === "branding" ? BRANDING_GALLERY : slug === "social" ? SOCIAL_GALLERY : [];

/* -------------------------------------------------------------- categories */

/** Covers are real pieces of the work in that category, not stock. */
const COVERS: Record<ServiceSlug, string> = {
  branding: "/brand-work/bay-accessories-flyer.jpg",
  seo: "/work/jomorc.jpg",
  web: "/work/traxstaff.jpg",
  apps: "/work/app/realtors-dashboard.jpg",
  software: "/work/app/litch-dashboard.jpg",
  social: "/brand-work/bamssa-business-summit.jpg",
};

/** Branding and social are walls of artwork; the other four are case studies. */
const SHAPES: Record<ServiceSlug, "case" | "gallery"> = {
  branding: "gallery",
  seo: "case",
  web: "case",
  apps: "case",
  software: "case",
  social: "gallery",
};

/* Derived from SERVICES so the six here cannot drift from the six on
   /services — a category that exists in one place and not the other is how a
   nav link ends up pointing at a 404. */
export const WORK_CATEGORIES: WorkCategory[] = SERVICES.map((s) => ({
  slug: s.slug,
  label: s.short,
  name: s.name,
  lede: s.lede,
  shape: SHAPES[s.slug],
  cover: COVERS[s.slug],
}));

/* ------------------------------------------------------------------ lookup */

export const categoryBySlug = (slug: string): WorkCategory | undefined =>
  WORK_CATEGORIES.find((c) => c.slug === slug);

export const caseBySlug = (slug: string): CaseStudy | undefined =>
  CASE_STUDIES.find((c) => c.slug === slug);

/** Every case study listed under a category, canonical or not. */
export const casesFor = (slug: ServiceSlug): CaseStudy[] =>
  CASE_STUDIES.filter((c) => c.categories.includes(slug));

/** What the hub card counts. A gallery counts pieces; a case category counts
    case studies. Counting the wrong one is how "Branding · 4" ends up on a
    card that opens a wall of a hundred. */
export const countFor = (c: WorkCategory): number =>
  c.shape === "gallery" ? galleryFor(c.slug).length : casesFor(c.slug).length;

/** The live sites, for the "also built" strip. Kept in projects.ts so the
    homepage rail and this page cannot disagree about what shipped. */
export const LIVE_SITES = PROJECTS;
