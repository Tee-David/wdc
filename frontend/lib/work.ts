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
  /** THE PROBLEM the client brought (shown as "The problem"). Written from
      what the client told us or what the work itself shows, never invented,
      and never blaming the client. The field keeps its old name, "brief", so
      the case studies saved in the admin still read. */
  brief: string;
  /** "What we decided": the two or three calls we made, each with its reason. */
  approach: string;
  /** "What we delivered". A line ending in a colon ("Experience:") starts a
      group, so deliverables read by the service's own domains. Lists with no
      group lines show as one list, as before. */
  did: string[];
  /** "What changed": what the client can do now that they could not before.
      Figures only when the client gave them or we measured them ourselves. */
  outcome?: string;
  stack: string[];
  /** Heading over `stack`. Engineering work is "Built with"; a brand system is
      not built with anything, so it says what it actually is. */
  stackLabel?: string;
  /** The identity's colours, straight off the brand guide. Swatches say more
      about a brand system in one row than a paragraph describing them. */
  palette?: { hex: string; name: string }[];
  /** A line the CLIENT wrote, carried in the delivered artwork — a positioning
      statement off a guide page, a tagline off a lockup. Quoted, never
      paraphrased into something they did not say. */
  quote?: { text: string; from: string };
  /** Captures of the delivered work. */
  gallery?: string[];
  /** Motion pieces to show beside the images, by id from lib/motion-work.ts.
      Muted loops with a pause button, loaded only when on screen. */
  motion?: string[];
  /** Descriptions for people who cannot see them: the cover's, and one per
      gallery picture in the same order. Written in the admin editor; the
      case studies in this file fall back to "client: title". */
  coverAlt?: string;
  galleryAlt?: string[];
  /** Only when the client has published them. */
  metrics?: WorkMetric[];
  /** A product we built: its screens in the frames of the devices they were
      captured on, the live public site, and how the system fits together. */
  app?: AppCase;
};

/** One screen of a build. Captured by the scripts in design/case-study, with
    sample data, so no client record appears. */
export type AppShot = {
  src: string; w: number; h: number;
  device: "laptop" | "window" | "panel" | "tablet" | "phone";
  title: string; caption: string;
};
export type AppCase = {
  shots: AppShot[];
  /** Which shots stand in the opening stage: laptop, tablet, phone. */
  stage: [number, number, number];
  /** The public site captured top to bottom (design/case-study/scripts/fullcap.js). */
  site?: { src: string; w: number; h: number };
  tiers: { label: string; boxes: { name: string; detail: string }[] }[];
};

const A = "/work/app-case/";
const shot = (file: string, w: number, h: number, device: AppShot["device"], title: string, caption: string): AppShot =>
  ({ src: A + file, w, h, device, title, caption });

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
    title: "Time tracking that tells one story on the web, the desktop and a phone",
    client: "TraxStaff",
    sector: "Time tracking for teams",
    location: "Nigeria",
    url: "https://traxstaff.com/",
    cover: "/work/traxstaff.jpg",
    summary: "Three apps, one set of rules, one timesheet a whole team trusts.",
    about:
      "TraxStaff is a time-tracking product for teams. Time is recorded against a project and a task as the work happens, and the record is organised by day, week and project rather than dropped into one long list.",
    brief:
      "A timesheet is only useful if everyone believes it. TraxStaff's teams work in a browser, on a desktop machine and on a phone, and three separate apps would mean three sets of rules: time approved on one screen that a member cannot see on another, and roles that hold in one app but not in the next.",
    approach:
      "One API holds every rule. Roles and approvals are checked there once, for all three apps, so the web dashboard, the desktop tracker and the phone can never disagree.\n\nThe desktop tracker is a native app built with Tauri, not a website in a box, so it stays light while it runs all day beside the work.\n\nManual entries are kept apart from tracked time and go to a manager for approval, because a hand-typed hour is where trust in a timesheet usually breaks.",
    did: [
      "Product:",
      "A web dashboard with day, week and project views",
      "A native desktop tracker that starts in one tap",
      "iOS and Android apps built with Expo",
      "Projects and tasks as small boards",
      "Rules and data:",
      "Owner, admin and member roles, checked once at the API",
      "Manual time kept apart and sent for approval",
      "One PostgreSQL database behind all three apps",
      "Insight:",
      "Reports by person, project and category",
      "Activity by the hour, for teams that switch monitoring on",
    ],
    outcome:
      "A team tracks time wherever it works, and a manager approves one timesheet that reads the same on every device. A fourth app later means building screens, not a second set of rules.",
    stack: ["Next.js", "TypeScript", "Fastify", "Prisma", "PostgreSQL", "Tauri", "Expo"],
    gallery: [
      "/work/long/trax-desktop.jpg",
      "/work/app/trax-app-desktop.jpg",
      "/work/app/trax-app-tablet.jpg",
      "/work/app/trax-app-phone.jpg",
    ],
    app: {
      shots: [
        shot("trax-dash.webp", 1600, 1028, "laptop", "Dashboard", "The running timer beside the week: hours worked, activity, active projects and work by hour."),
        shot("trax-tracker.webp", 700, 1190, "window", "Desktop tracker", "The native tracker: one tap to start, today and this week at a glance, and every project a click away."),
        shot("trax-timesheets.webp", 760, 1497, "panel", "Timesheets", "Each day as a timeline and a table of entries, with tracked and manual time kept apart for approval."),
        shot("trax-activity.webp", 760, 960, "panel", "Activity", "Screenshots, apps and sites by the hour, for teams that turn monitoring on."),
        shot("trax-reports.webp", 760, 668, "panel", "Reports", "Tracked against manual time by day, then grouped by project, person or category."),
        shot("trax-projects.webp", 760, 768, "panel", "Projects and tasks", "Every project as a small board of tasks: to do, in progress and done."),
        shot("trax-tablet.webp", 900, 629, "tablet", "Dashboard on a tablet", "The same dashboard with the sidebar, projects and the day timeline side by side."),
        shot("trax-phone.webp", 780, 1688, "phone", "Mobile timer", "Pick a project and a task, start the timer, and see today and this week at a glance."),
      ],
      stage: [0, 6, 7],
      site: { src: A + "trax-web-full.webp", w: 1200, h: 6598 },
      tiers: [
        { label: "Where people use it", boxes: [{ name: "Dashboard", detail: "Next.js, in the browser" }, { name: "Desktop tracker", detail: "Tauri, a native app" }, { name: "Mobile app", detail: "Expo, iOS and Android" }] },
        { label: "What runs it", boxes: [{ name: "One API", detail: "Fastify and Prisma. Roles are enforced here, once, for all three clients." }] },
        { label: "Where the data lives", boxes: [{ name: "PostgreSQL", detail: "Every entry, project and role" }] },
      ],
    },
  },
  {
    slug: "realtors-practice",
    category: "apps",
    categories: ["apps", "web", "software", "branding"],
    title: "A property firm whose listings collect themselves",
    client: "Realtors' Practice",
    sector: "Property data and listings",
    location: "Nigeria",
    url: "https://realtorspractice.ng/",
    cover: "/work/realtorspractice.jpg",
    summary: "A scraper gathers the listings. Agents review and sell from a phone.",
    about:
      "Realtors' Practice is a property data and listings platform. Agents work inside it daily, so the product is a signed-in workspace rather than a catalogue with a contact form bolted on.",
    brief:
      "A property business lives on fresh listings, and fresh listings are spread across many other property sites. Collecting them by hand is slow and repetitive, and an agent spends the day at viewings, not at a desk, so a tool that only works on a desktop does not get used.",
    approach:
      "Collection is automatic. A scraper learns each property site, then gathers its listings on a schedule, so agents start each day from data, not from copy and paste. Every listing keeps its source, a quality score and a review status, so nothing reaches a client unchecked.\n\nThe workspace is built for a phone first, because an agent standing in a property is the main user. The same screens open at a desk.\n\nListings, agents and the client pipeline share one login and one record, and a plain-words assistant answers market questions with tables drawn from the listings.",
    did: [
      "Data collection:",
      "A scheduled scraper that learns each source site",
      "Source settings that show which sites need attention",
      "A quality score and review status on every listing",
      "Workspace:",
      "Listings in table, grid, map and board views",
      "Saved searches beside a live map",
      "A market assistant that answers in plain words",
      "People and pipeline:",
      "Agent records and verification",
      "A CRM for the client pipeline",
      "Team roles and last-active times",
      "Public site:",
      "Search across the listings",
      "Book a consultation",
    ],
    outcome:
      "Listings arrive by themselves, already sorted and scored, and agents work them from wherever they are. Clients search the same data on the public site and book a consultation in one step.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: ["/work/app/realtors-dashboard.jpg", "/work/app/realtors-mobile.jpg"],
    motion: ["realtors-story", "realtors-post"],
    app: {
      shots: [
        shot("rp-listings.webp", 1440, 836, "laptop", "Listings", "Every collected listing in one table: source, type, price, area, quality and review status, with grid, map and board views."),
        shot("rp-browse.webp", 1440, 836, "laptop", "Browse with the map", "Listings as cards beside a live map, with filters and a saved search."),
        shot("rp-assistant.webp", 1440, 836, "laptop", "Ask about the market", "Questions in plain words, answered as tables drawn from the listings."),
        shot("rp-team.webp", 1440, 836, "laptop", "Team and roles", "Who can sign in, their role, and when they were last active."),
        shot("rp-system.webp", 1440, 836, "laptop", "Scraper settings", "When the scraper runs and how it learns each site before collecting from it."),
        shot("rp-home-p.webp", 390, 844, "phone", "Home on a phone", "Search by area, price and size, or explore on the map, from a phone."),
        shot("rp-sources-p.webp", 390, 844, "phone", "Sources on a phone", "Every property site the scraper reads: enabled, learned, and the ones that need attention."),
        shot("rp-web-t.webp", 1600, 2134, "tablet", "Public site on a tablet", "The public site: search across the listings or book a consultation."),
      ],
      stage: [0, 7, 5],
      site: { src: A + "rp-web-full.webp", w: 1200, h: 5513 },
      tiers: [
        { label: "Where people use it", boxes: [{ name: "Workspace", detail: "Listings, agents and the CRM, phone to desktop" }, { name: "Public site", detail: "Search, listings and consultations" }] },
        { label: "What runs it", boxes: [{ name: "Next.js platform", detail: "Accounts, roles and the agent dashboard" }, { name: "Scraper app", detail: "Collects listings from property sites on a schedule" }] },
        { label: "Where the data lives", boxes: [{ name: "PostgreSQL", detail: "Listings, agents and the pipeline" }] },
      ],
    },
  },
  {
    slug: "litch-consulting",
    category: "software",
    categories: ["software", "web", "branding"],
    title: "A consultancy that stopped re-typing its own numbers",
    client: "Litch Consulting",
    sector: "Modelling and data analytics",
    location: "Nigeria",
    url: "https://litchconsulting.com/",
    cover: "/work/litchconsulting.jpg",
    summary: "Requests, invoices and reports now come from one record.",
    about:
      "Litch Consulting works in modelling and data analytics. The engagement covered both the public site and the console the team runs on internally.",
    brief:
      "Litch tracked its work in separate documents: requests in one, invoices in another, and reports made by copying figures between them. Every copy was a chance for a number to drift, and a modelling and analytics firm cannot have its own figures disagree.",
    approach:
      "One data model under the whole console. A service request, the invoice raised against it and the figure in a report are the same record read three ways, so a number is typed once and is right everywhere.\n\nThe console opens on what needs action: open requests, invoiced against paid, and what is still outstanding. Lists stay real tables at every width, so the team can work from a tablet or a phone without losing the columns that matter.",
    did: [
      "Public site:",
      "A site for prospective clients, built on the Litch identity",
      "Console:",
      "A request pipeline with client, service, amount and status",
      "Invoices with paid and outstanding, filtered by time and status, with export",
      "A dashboard of billed against collected",
      "Data:",
      "One record behind requests, invoices and reports",
      "Tables that stay usable at desktop, tablet and phone widths",
    ],
    outcome:
      "A figure is entered once and appears correctly in the request, the invoice and the report. The team sees what is owed and what needs action the moment they sign in.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: [
      "/work/app/litch-dashboard.jpg",
      "/work/app/litch-tablet.jpg",
      "/work/app/litch-mobile.jpg",
    ],
    motion: ["litch-film", "litch-reel"],
    app: {
      shots: [
        shot("li-dash-d.webp", 1600, 1000, "laptop", "Dashboard", "Open requests, invoiced, paid and outstanding, what needs action, the request pipeline, and billed against collected."),
        shot("li-req-d.webp", 1600, 1000, "laptop", "Requests", "Every service request with its client, service, amount and status, searchable and sortable."),
        shot("li-fin-d.webp", 1600, 1000, "laptop", "Invoices", "Invoices with totals, paid and outstanding, filtered by time and status, and exported."),
        shot("li-dash-t.webp", 1600, 2134, "tablet", "Dashboard on a tablet", "The same dashboard with the sidebar kept beside it."),
        shot("li-fin-t.webp", 1600, 2134, "tablet", "Invoices on a tablet", "The invoice list at tablet width, still a table."),
        shot("li-dash-p.webp", 780, 1688, "phone", "Dashboard on a phone", "One figure per row, with New invoice at the top."),
        shot("li-req-p.webp", 780, 1688, "phone", "Requests on a phone", "Request figures first, then the list."),
      ],
      stage: [0, 4, 5],
      site: { src: A + "li-web-full.webp", w: 1200, h: 10880 },
      tiers: [
        { label: "Where people use it", boxes: [{ name: "Public site", detail: "For prospective clients" }, { name: "Internal console", detail: "Requests, invoices and reports" }] },
        { label: "What runs it", boxes: [{ name: "Next.js app", detail: "One data model: a request, its invoice and its report figure are one record" }] },
        { label: "Where the data lives", boxes: [{ name: "PostgreSQL", detail: "Requests, invoices and clients" }] },
      ],
    },
  },
  {
    slug: "nomarc-projects",
    category: "software",
    categories: ["software", "web"],
    title: "A construction hiring platform where both sides can trust each other",
    client: "Nomarc Projects",
    sector: "Construction hiring platform",
    location: "Nigeria",
    url: "https://nomarcprojects.com/",
    cover: "/work/nomarcprojects.jpg",
    summary: "Professionals and employers meet only after a person checks them.",
    about:
      "Nomarc Projects connects construction professionals with the companies hiring them. Two sides of a marketplace, each needing to trust the other before anything useful happens.",
    brief:
      "In construction hiring, a bad match is expensive on both sides. A company needs to know a professional is qualified, and a professional needs to know the company is real. Nomarc needed a marketplace for both, with an operator able to vouch for every account before it does business.",
    approach:
      "Each side gets its own flow. Professionals and hiring companies do different things, so they register and work through different screens, not one form with fields hidden by role.\n\nVerification is a person, not a checkbox. New accounts wait in a queue in the operator console until someone reviews them, because automatic approval is exactly what a fake account relies on.\n\nThe operator runs the whole marketplace from one console: sign-ups, verifications, disputes and campaigns.",
    did: [
      "For professionals:",
      "Profiles and registration",
      "A job board",
      "Projects with tasks by discipline",
      "For hiring companies:",
      "Company accounts and listings",
      "Posting work to the job board",
      "For the operator:",
      "A verification queue",
      "Sign-ups, disputes and campaigns in one console",
      "Layouts that work from phone to desktop",
    ],
    outcome:
      "Every account on Nomarc has been seen by a person before it can hire or be hired, and the operator runs the marketplace from one screen.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    gallery: [
      "/work/app/nomarc-admin.jpg",
      "/work/app/nomarc-tablet.jpg",
      "/work/app/nomarc-mobile.jpg",
    ],
    app: {
      shots: [
        shot("no-dash-d.webp", 1600, 1000, "laptop", "Operator console", "Sign-ups, pending verifications, disputes and the network at a glance."),
        shot("no-pm-d.webp", 1600, 1000, "laptop", "Project management", "Every project with its owner, progress, due date and status, plus tasks by discipline."),
        shot("no-pm-t.webp", 1600, 2134, "tablet", "Projects on a tablet", "The same overview at tablet width."),
        shot("no-dash-t.webp", 1600, 2134, "tablet", "Console on a tablet", "The operator console with the sidebar kept in view."),
        shot("no-dash-p.webp", 780, 1688, "phone", "Console on a phone", "The operator console, stacked for a phone."),
        shot("no-pm-p.webp", 780, 1688, "phone", "Projects on a phone", "Project figures first, then each project."),
      ],
      stage: [1, 2, 4],
      site: { src: A + "no-web-full.webp", w: 1200, h: 5841 },
      tiers: [
        { label: "Where people use it", boxes: [{ name: "Professionals", detail: "Profiles, jobs and projects" }, { name: "Exhibitors", detail: "Accounts and listings" }, { name: "Operator console", detail: "Verification, users and campaigns" }] },
        { label: "What runs it", boxes: [{ name: "Next.js app", detail: "A separate flow for each side, verification as an operator step" }] },
        { label: "Where the data lives", boxes: [{ name: "PostgreSQL", detail: "Both sides, listings and checks" }] },
      ],
    },
  },
  {
    slug: "meridian-global-trainings",
    category: "web",
    categories: ["web", "software"],
    title: "A training company that sells in six countries, run from one place",
    client: "Meridian Global Trainings",
    sector: "Professional training",
    location: "Nigeria, Ghana, Rwanda, Qatar, the UK and the US",
    url: "https://www.meridianglobaltrainings.com/",
    cover: "/work/meridianglobaltrainings.jpg",
    summary: "Each country sees its own fee. One dashboard runs the business.",
    about:
      "Meridian Global Trainings runs practical courses for professionals and their teams, in class, online or at the client's office, across six countries. The catalogue is large and every course runs on many dates, so the website and the work behind it are one product.",
    brief:
      "Meridian sells hundreds of courses in six countries, and the fee depends on where the training happens. A visitor in the UK and a visitor in Nigeria must each see their own price, and the team behind the site has to answer registrations, schedule sessions, invoice and certify across all of it without losing track.",
    approach:
      "The visitor's own country sets the fee, worked out from their connection, and the server works the fee out again, so nobody can change a price in the browser. Naira shows only to people in Nigeria.\n\nThe course synopsis is printed for the visitor's country and arrives attached to their registration email, so the fee they read and the fee they are invoiced always match.\n\nThe back office is built around the team's daily jobs (reply, schedule, invoice, certify) rather than around settings, so the daily work stays a few clicks away.",
    did: [
      "Experience:",
      "Course search with filters by category, dates and language",
      "Registration in three steps: in class, online or in-house",
      "Prices that follow the visitor's country",
      "Course and calendar PDFs printed for one country",
      "Operations:",
      "One dashboard for enquiries, courses and a year planner",
      "Proforma invoices, payments and receipts in naira and dollars",
      "Certificates with a public check page",
      "Admin and Staff roles with guided tours",
      "Data and security:",
      "Courses, categories and sessions in one database",
      "An activity log of every change",
      "Security headers and fees checked on the server",
    ],
    outcome:
      "A registration now arrives with the right fee, the right dates and the synopsis attached, and the team replies, invoices and later certifies from that same record. Categories, prices and dates change in the dashboard and reach the website without a developer.",
    stack: ["Next.js", "TypeScript", "CockroachDB", "Tailwind CSS"],
    gallery: [
      "/work/app/mgt-dashboard.jpg",
      "/work/app/mgt-tablet.jpg",
      "/work/app/mgt-mobile.jpg",
    ],
    coverAlt: "The Meridian Global Trainings home page: the headline \"Build the skills your business needs next\" over a blue and red background, with the six countries it trains in.",
    galleryAlt: [
      "The training admin's overview: enquiries waiting, sessions in the next 14 days, certificates to issue and this week's plan.",
      "The course list on a tablet, with status, field, fee and the next session for each course.",
      "The training admin's overview on a phone, with the day's figures first.",
    ],
    app: {
      shots: [
        shot("mgt-overview-d.webp", 1600, 1000, "laptop", "Overview", "Enquiries waiting, sessions starting in the next 14 days, certificates to issue and this week's plan."),
        shot("mgt-courses-d.webp", 1600, 1000, "laptop", "Courses", "Every course with its status, field, fee and next session, with filters and bulk changes."),
        shot("mgt-calendars-d.webp", 1600, 1000, "laptop", "Calendars", "The year planner by month and week, with the sessions starting in the chosen week beside it."),
        shot("mgt-certificates-d.webp", 1600, 1000, "laptop", "Certificates", "Pick who completed the course, check the names, choose a design, then send."),
        shot("mgt-money-d.webp", 1600, 1000, "laptop", "Money", "Invoices, quotes and payments in naira and dollars, with what is late and what is still to pay."),
        shot("mgt-courses-t.webp", 1600, 2134, "tablet", "Courses on a tablet", "The course list at tablet width, with the menu kept in view."),
        shot("mgt-enquiries-p.webp", 780, 1688, "phone", "Enquiries on a phone", "The inbox on a phone, with a call logged in one tap from the top."),
        shot("mgt-overview-p.webp", 780, 1688, "phone", "Overview on a phone", "The day's figures first, then what needs a reply."),
        shot("mgt-web-t.webp", 1600, 2134, "tablet", "Public site on a tablet", "The public site: search the courses or download the calendar."),
      ],
      stage: [0, 5, 6],
      site: { src: A + "mgt-web-full.webp", w: 1200, h: 9583 },
      tiers: [
        { label: "Where people use it", boxes: [{ name: "Public site", detail: "Courses, prices by location and enquiries" }, { name: "Training admin", detail: "Enquiries, courses, calendars, certificates and money" }] },
        { label: "What runs it", boxes: [{ name: "Next.js app", detail: "Admin and Staff roles, checked on the server for every page and action" }, { name: "PDF builder", detail: "Syllabus and calendar files for each location" }] },
        { label: "Where the data lives", boxes: [{ name: "CockroachDB", detail: "Enquiries, people, quotes, invoices and payments" }] },
      ],
    },
  },
  {
    slug: "harize-global",
    category: "web",
    categories: ["web", "branding"],
    title: "A woven globe and a site for a company that builds with data",
    client: "Harize Global",
    sector: "Venture building and business architecture",
    location: "Lagos and London",
    url: "https://harize.vercel.app/",
    cover: "/work/harize.jpg",
    summary: "A new identity and the website it launched on.",
    about:
      "Harize Global builds ventures and business systems for companies, governments and founders across Nigeria, West Africa and the UK, with data analytics and AI at the centre. It works in two models, business to business and business to business to consumer, and the brand had to say all of that without a paragraph.",
    brief:
      "Harize Global works with companies, governments and founders, in two business models, with data and AI at the centre. That is a lot to say, and a new company has seconds to say it. It needed a mark that carries the idea without a paragraph, and a website that gives each of the three audiences its own way in.",
    approach:
      "The mark is a globe crossed by two orbits that weave over and under it and each other: the globe for reach across markets, the two orbits for the two business models, and the weave for ventures built from parts that interlock. The brand guide sets the lockups, clear space, minimum sizes, colour with measured contrast and type, and the site is built on exactly those rules, with solid purple sections, Space Grotesk headings and the globe and its orbits carried into the hero.",
    did: [
      "Identity:",
      "The Woven Globe mark, with a simplified version for small sizes",
      "Stacked and horizontal lockups, app icons and a social card",
      "Guidelines:",
      "Clear space, minimum sizes, colour with measured contrast, and type",
      "Website:",
      "Built on the new identity",
      "A path for businesses, governments and founders",
      "Book a consultation from the header and the hero",
      "Light and dark, phone to desktop",
    ],
    outcome:
      "Harize launched with one identity across its mark, its guide and its website, and each of its three audiences has its own path to a consultation.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
    palette: [
      { hex: "#271942", name: "Harize Purple" },
      { hex: "#120A20", name: "Ink" },
      { hex: "#CBC1EA", name: "Lilac" },
      { hex: "#DAD8DC", name: "Mist" },
      { hex: "#F3F1F6", name: "Paper" },
    ],
    quote: { text: "Building Empires, Igniting Innovation", from: "Harize Global brand guide" },
    gallery: [
      "/work/harize/brand-board.jpg",
      "/work/harize/site-desktop.jpg",
      "/work/harize/site-phone.jpg",
      "/work/harize/social-card.jpg",
    ],
    coverAlt: "The Harize Global home page: the headline \"Scaling and unlocking value with data\" on deep purple, beside a large globe crossed by two orbits.",
    galleryAlt: [
      "The Harize Global brand board: the Woven Globe logo with its app icon, versions on dark and silver, an edge detail, the construction grid and a scale test.",
      "The Harize Global website on a desktop: the hero with the headline, two buttons and the globe.",
      "The Harize Global website on a phone: the centred headline and buttons above the globe.",
      "The Harize Global social card with the logo.",
    ],
  },
  {
    slug: "speak-up-for-a-change",
    category: "social",
    categories: ["social", "web", "branding"],
    title: "One look for a non-profit's posts and the site they lead to",
    client: "Speak Up For A Change",
    sector: "Non-profit",
    location: "Nigeria",
    url: "https://speakupforachange.org/",
    cover: "/work/speakupforachange.jpg",
    summary: "Every campaign post leads to a page that clearly belongs to it.",
    about:
      "Speak Up For A Change is a non-profit whose reach depends on being shared. The site and the social artwork are the same piece of work, because a campaign post that looks nothing like the site it links to loses the visitor at the click.",
    brief:
      "A non-profit's reach depends on being shared. When a campaign post looks nothing like the site it links to, the person who clicked doubts they are in the right place and leaves before they read why the cause matters.",
    approach:
      "The identity is set once and applied to both: the same type, colour and layout rules on the site and on every campaign piece. The click from a post to the page then feels like one step inside the same organisation.\n\nRecurring posts are templates, so a new campaign starts from a finished frame, not from a blank canvas.",
    did: [
      "Website:",
      "A site built on the shared identity",
      "Campaigns:",
      "Campaign and outreach artwork",
      "Templates for recurring posts",
      "System:",
      "One set of type, colour and layout rules for the site and the posts",
    ],
    outcome:
      "A campaign can go out without a designer starting from scratch, and every post leads to a page that clearly belongs to the same organisation.",
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
      "Exambeta Travels & Tours works across education and mobility, the kind of service someone commits to well before they can see a result, which puts the burden on the site to be clear about what is actually offered.",
    brief:
      "Exambeta helps people with education and travel, a decision they commit to long before they can see a result. People only enquire about a service like that when they understand exactly what is offered and trust who is offering it.",
    approach:
      "Structure before decoration. Each service gets its own page that says what it is and what it involves, so a reader never has to guess.\n\nThere is one enquiry route, repeated on every page, rather than a different call to action in each section, so the next step is always the same and always in reach.",
    did: [
      "Structure:",
      "A page per service that says what it is and what it involves",
      "One enquiry route, repeated on every page",
      "Brand and build:",
      "The brand applied across the whole site",
      "Layouts that work from phone to desktop",
    ],
    outcome:
      "Every service is explained on its own page, and an enquiry is one tap away from anywhere on the site.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
  },

  /* ---------------------------------------------------------------- branding
     These are written from the delivered artwork, page by page. Where a case
     study quotes the client, the words are lifted off a guide page they signed
     off — never paraphrased into something they did not say. */
  {
    slug: "moore-designs",
    category: "branding",
    categories: ["branding"],
    title: "A bowtie hidden in an arrow, for a tailor who makes both",
    client: "Moore Designs",
    sector: "Bespoke tailoring and menswear",
    location: "Nigeria",
    cover: "/brand-work/moore-cover.jpg",
    summary: "A full identity system for a menswear house, from the mark to the shopfront.",
    about:
      "Moore Designs is a bespoke tailoring and menswear house. The work a tailor sells is measured, cut and finished by hand for one person, and the brand had to carry that idea before anyone reads a word of copy.",
    brief:
      "One identity, built as a system rather than a logo file. It had to survive a 12mm embroidery on a cap, a five-metre illuminated sign over a shopfront, a woven label inside a collar, and a business card: four wildly different sizes with nothing in common but the mark.",
    approach:
      "The mark is two triangles set nose to nose. Read one way it is a play arrow pointing forward; read the other it is a bowtie, which is the object a menswear house is most identified by. Neither reading is decorative. The shape is a single geometric form with no fine detail, which is exactly what survives being stitched into a cap at thumbnail size and blown up onto a shopfront.\n\nColour does the separating. Navy carries the garments, the packaging and the storefront; gold picks out the second triangle and nothing else, so the mark keeps one accent instead of two competing ones. A triangle pattern derived from the same form gives the system a fill for linings, tissue and backgrounds without introducing a new element to learn.",
    did: [
      "Identity:",
      "Primary lockup, horizontal lockup and standalone symbol",
      "Black and reversed white versions for single-colour printing",
      "Written usage rules covering placement over photography and on neutral grounds",
      "Colour and pattern:",
      "Primary and secondary colour system with CMYK, RGB and HEX for every swatch",
      "Triangle pattern derived from the mark, for linings and packaging fills",
      "Applications:",
      "Stationery: business cards, letterhead, compliment slips",
      "Woven garment labels and swing tags",
      "Apparel: t-shirts, polos, caps, beanies, socks, long sleeves",
      "Retail: shopping bags, tissue, boxes",
      "Illuminated shopfront signage and window treatment",
    ],
    outcome:
      "One mark now carries Moore Designs from a 12mm embroidered cap to an illuminated shopfront, with no version redrawn for its size.",
    stackLabel: "The system includes",
    stack: [
      "Logo suite", "Usage rules", "Colour system", "Pattern",
      "Stationery", "Garment labelling", "Apparel", "Packaging", "Signage",
    ],
    palette: [
      { hex: "#0E2A47", name: "Navy" },
      { hex: "#F4B400", name: "Gold" },
      { hex: "#663399", name: "Rebecca Purple" },
      { hex: "#CE8933", name: "Gamboge" },
      { hex: "#FF0000", name: "Red" },
    ],
    quote: {
      text: "Custom craftsmanship and cultural pride.",
      from: "Moore Designs, on what the secondary palette exists to carry",
    },
    gallery: [
      "/brand-work/moore-logo-variants.jpg",
      "/brand-work/moore-palette.jpg",
      "/brand-work/moore-logo-usage.jpg",
      "/brand-work/moore-stationery.jpg",
      "/brand-work/moore-mockups.jpg",
      "/brand-work/moore-signage.jpg",
      "/brand-work/moore-storefront.jpg",
    ],
  },
  {
    slug: "skinish",
    category: "branding",
    categories: ["branding"],
    title: "Softness without noise, written down so it survives the tenth post",
    client: "Skinish",
    sector: "Skincare and haircare",
    location: "Nigeria",
    cover: "/brand-work/skinish-cover.jpg",
    summary:
      "A full identity and brand guideline system for a personal-care brand, from purpose and voice to packaging.",
    about:
      "Skinish is a personal-care brand selling skincare and haircare. It is registered with the Corporate Affairs Commission of Nigeria under the business name Skinish Ventures. We built the identity and wrote the guideline document that governs it.",
    brief:
      "A brand that has to read as calm in a category that shouts. Personal care is sold with superlatives, neon and retouching, and Skinish sells the opposite, so the system had to make restraint repeatable by somebody who was not in the room when it was decided.",
    approach:
      "The mark carries three things at once: a hibiscus flower for natural elegance, a regal motif for sophistication, and a droplet for purity. One shape, three readings, and none of them needs explaining before it works.\n\nMost of the effort went into the document rather than the mark, because the mark was never going to be the thing that broke. A brand like this fails one caption at a time: a buzzword here, an exaggerated promise there. So the guide states the voice as three pairs a writer can actually check against: warmth not flair, clarity not cleverness, care not control. The photography rules do the same job in pictures: natural light, no over-retouching, diverse skin tones and textures, props kept organic. They are written as instructions to a photographer, not as adjectives.",
    did: [
      "Identity:",
      "Logo system with horizontal and vertical lockups, icon-only and wordmark-only variants",
      "Clear space and minimum size rules, specified for print and for screen",
      "Approved background set, with the four grounds the mark is allowed on",
      "A don'ts page showing the specific misuses to refuse",
      "Colour and type:",
      "Colour system: a primary, two secondaries and two supporting neutrals, with HEX and RGB",
      "Typography: Bricolage Grotesque for headlines, Outfit for everything else",
      "Voice and direction:",
      "Brand voice, personality traits, audience profile and positioning statement",
      "Photography direction covering light, retouching, casting and props",
      "Packaging guidance: recyclable or refillable containers, matte or paper-based labels",
      "Social, email, website and retail display guidance",
    ],
    outcome:
      "Anyone writing a caption or briefing a photographer can now check the work against written rules, so the brand reads as calm on the tenth post as on the first.",
    stackLabel: "The system includes",
    stack: [
      "Logo suite", "Clear space rules", "Colour system", "Typography",
      "Brand voice", "Photography direction", "Packaging", "Retail display",
    ],
    /* Straight off the colour system page, not sampled from a screenshot. */
    palette: [
      { hex: "#663333", name: "Skinish Brown" },
      { hex: "#FFE1F0", name: "Petal Pink" },
      { hex: "#FF99CC", name: "Soft Pink" },
      { hex: "#454ADE", name: "Vibrant Violet" },
      { hex: "#CCCCFF", name: "Lavender Blue" },
    ],
    quote: {
      text: "Skinish is the feel-good brand for modern personal care. We offer clean, minimalist skincare and haircare that delivers softness without noise and quality without pressure.",
      from: "Skinish, positioning statement from the brand guide",
    },
    gallery: [
      "/brand-work/skinish-logo-system.jpg",
      "/brand-work/skinish-logo-variations.jpg",
      "/brand-work/skinish-colour-system.jpg",
      "/brand-work/skinish-typography.jpg",
      "/brand-work/skinish-voice.jpg",
      "/brand-work/skinish-donts.jpg",
      "/brand-work/skinish-mockups.jpg",
    ],
  },
  {
    slug: "thinkers-diary",
    category: "branding",
    categories: ["branding"],
    title: "An identity for a podcast, where the mark spends its life on a dark photograph",
    client: "Thinkers Diary",
    sector: "Podcast and media",
    location: "Nigeria",
    cover: "/brand-work/thinkers-cover.jpg",
    summary:
      "Identity and brand guidelines for a conversation podcast, built around a mark that has to hold on studio photography.",
    about:
      "Thinkers Diary is a podcast about deep conversations, honest reflection and perspective-driven dialogue. We designed the identity and wrote the guide that keeps it consistent across episode art, social, merchandise and the studio itself.",
    brief:
      "A podcast identity lives almost entirely on photographs of a dark studio: a condenser mic, low light, a lot of black. A mark that only works on white is useless here, and most of the places it appears are not designed by us: an episode tile, a guest's repost, a cap.",
    approach:
      "The mark is a microphone drawn as a diary, a capsule mic whose body reads as a bound notebook, so the two things the show is about are one object rather than a symbol beside a word.\n\nBecause it lives on dark photography, the guide leads with the reversed version rather than treating it as an afterthought. There is a black version for single-colour work, a white version for dark grounds, and a page of correct placements over images beside a page of incorrect ones, because on a podcast the person laying out an episode tile at midnight is usually not a designer.\n\nThe palette is deliberately narrow: a near-black, a muted brown and a platinum, which is the range a studio photograph already contains. A secondary set of purple, silver and goldenrod exists for promotional material, where the core three would be too quiet.",
    did: [
      "Identity:",
      "Primary logo, alternative lockups and a standalone symbol",
      "Black and reversed white versions for single-colour and dark-ground use",
      "Correct and incorrect usage pages, worked over real photography",
      "Colour and type:",
      "Core palette and a secondary palette, with CMYK, RGB and HEX for every swatch",
      "Typography: Bigbesty as the primary face, Poppins as the secondary",
      "Voice and applications:",
      "Brand voice, positioning and personality",
      "Episode artwork, social and merchandise application",
      "Studio backdrop and set signage",
    ],
    outcome:
      "The mark holds on dark studio photography, and whoever lays out an episode tile has a page of right and wrong placements to follow.",
    stackLabel: "The system includes",
    stack: [
      "Logo suite", "Reversed versions", "Usage rules", "Core palette",
      "Secondary palette", "Typography", "Episode artwork", "Merch", "Set signage",
    ],
    palette: [
      { hex: "#2D2D2D", name: "Dark Gray" },
      { hex: "#8A5B3A", name: "Muted Brown" },
      { hex: "#E6E6E6", name: "Platinum" },
      { hex: "#663399", name: "Rebecca Purple" },
      { hex: "#CC9933", name: "Goldenrod" },
    ],
    quote: {
      text: "It is not just about talking, it is about thinking out loud, questioning perspectives, and turning discussions into insight.",
      from: "Thinkers Diary, on what makes the show different, from the brand guide",
    },
    gallery: [
      "/brand-work/thinkers-logo-dark.jpg",
      "/brand-work/thinkers-logo-variants.jpg",
      "/brand-work/thinkers-palette.jpg",
      "/brand-work/thinkers-typeface.jpg",
      "/brand-work/thinkers-applied.jpg",
      "/brand-work/thinkers-studio-wall.jpg",
      "/brand-work/thinkers-mockups.jpg",
    ],
  },
  {
    slug: "marfaa-authentic",
    category: "branding",
    categories: ["branding"],
    title: "Freedom from Limits, drawn as a creature inside a world",
    client: "MARFAA Authentic",
    sector: "Apparel and streetwear",
    location: "Nigeria",
    cover: "/brand-work/marfaa-cover.jpg",
    summary: "An apparel identity built to read on black fabric first.",
    about:
      "MARFAA Authentic is an apparel label. Its tagline, Freedom from Limits, is the whole brief in three words, and the identity had to earn it rather than sit above it in small type.",
    brief:
      "Build an identity for a clothing brand whose product is mostly dark. Most of what the mark would ever appear on is black or charcoal fabric, so the system had to be designed from the reversed state outward instead of being designed on white and checked against black afterwards.",
    approach:
      "The symbol is a winged figure held inside a globe. It carries the tagline literally, wings against a boundary, and it is drawn as one weight of line with no gradients and no fills that depend on a light ground, so the same artwork embroiders, prints and etches without a second version being drawn for each.\n\nDeep saffron is the only chromatic colour in the system. Against black it clears contrast comfortably; against platinum it still holds. Everything else is neutral, which means the orange is never competing with a second brand colour for attention on a garment that already has its own texture and drape. The wordmark pairs a high-contrast display serif with a script for Authentic, so the two words are told apart by shape rather than by size.",
    did: [
      "Identity:",
      "Symbol, full lockup and wordmark-only variants",
      "Black and reversed white versions",
      "Usage grid marking approved combinations on light, dark and neutral grounds",
      "Colour:",
      "Core palette with CMYK, RGB and HEX",
      "Applications:",
      "Woven labels and sewn-in garment tags",
      "Apparel application across knitwear, outerwear and footwear",
      "Retail packaging: bags and boxes",
    ],
    outcome:
      "One drawing of the mark embroiders, prints and etches on dark fabric, with no second version needed.",
    stackLabel: "The system includes",
    stack: [
      "Logo suite", "Usage grid", "Colour system",
      "Garment labelling", "Apparel", "Packaging",
    ],
    palette: [
      { hex: "#FF9933", name: "Deep Saffron" },
      { hex: "#E6E6E6", name: "Platinum" },
      { hex: "#000000", name: "Black" },
    ],
    quote: { text: "Freedom from Limits.", from: "MARFAA Authentic, brand tagline" },
    gallery: [
      "/brand-work/marfaa-logo-variants.jpg",
      "/brand-work/marfaa-palette.jpg",
      "/brand-work/marfaa-logo-usage.jpg",
      "/brand-work/marfaa-packaging.jpg",
      "/brand-work/marfaa-apparel.jpg",
      "/brand-work/marfaa-mockups.jpg",
    ],
  },
  {
    slug: "dhiol-world",
    category: "branding",
    categories: ["branding", "social"],
    title: "One parent, four divisions, and a system that still runs every month",
    client: "Dhiol World",
    sector: "Technology retail, repair, consulting and payments",
    location: "Nigeria",
    cover: "/brand-work/dhiol-brand-guide-1.jpg",
    summary: "A brand architecture for four businesses, and the content engine that keeps it alive.",
    about:
      "Dhiol World is a technology group operating several distinct businesses under one name: Tech Hub for devices and repair, Stores for buying, selling, swapping and top-ups, Consult for company registration and compliance, and Pay. Four businesses that share a customer but not a service.",
    brief:
      "Give the group one identity without flattening the divisions into each other. A customer bringing a cracked screen to Tech Hub and a founder registering a company with Consult should recognise the same company, and should still be able to tell instantly which desk they are at.",
    approach:
      "The architecture does the work. Every division keeps the identical monogram and the identical lockup geometry, and changes exactly two things: the division word beneath the name, and the colour it is set in. Tech Hub and Stores hold the blues; Consult takes green because compliance work sits beside government marks and needs to read as its own discipline. Nothing else moves. The mark is never redrawn per division, so five lockups cost one drawing.\n\nThe guide is not only visual. It fixes a written voice in five words (reliable, connected, premium yet accessible, innovative, comfortable) and a positioning statement the divisions all write from, so a caption produced by whoever is at the desk that morning still sounds like the same company.\n\nThe part that proves it is the run of campaign artwork underneath. February, April, May, August, November; new week, weekend, website launch, registration drive. Every one is a different photograph, a different product and a different headline treatment, and every one is unmistakably Dhiol: the same monogram, the same contact strip locked to the base of the frame, the same QR placement. That is what a system is for: not the guide, the eleven months of posts that came after it.",
    did: [
      "Brand architecture:",
      "Parent brand identity and 2024 brand guideline",
      "Positioning statement and a five-word written voice",
      "Division lockups for Tech Hub, Stores, Consult and Pay",
      "Colour assignment separating the divisions within one family",
      "Content system:",
      "Contact and social strip locked as a reusable frame element",
      "Monthly campaign artwork across the calendar year",
      "Recurring formats: new month, new week, weekend, launches",
      "Campaigns:",
      "Website launch campaign for dhiolstores.ng",
      "Service artwork for Consult: trademark, SCUML, TIN, CAC registration",
    ],
    outcome:
      "Four divisions read as one company, and a year of monthly posts stayed on brand because the frame, not the designer of the day, holds them together.",
    stackLabel: "The system includes",
    stack: [
      "Brand architecture", "Brand guideline", "Written voice",
      "Division lockups", "Colour system", "Campaign templates", "Monthly artwork",
    ],
    palette: [
      { hex: "#0B1B3A", name: "World Navy" },
      { hex: "#1F6FEB", name: "Tech Hub Blue" },
      { hex: "#2FA84F", name: "Consult Green" },
      { hex: "#F5A524", name: "Signal Amber" },
    ],
    quote: {
      text:
        "Breaking down barriers between high-end technology and everyday users, making extraordinary digital experiences an achievable reality for everyone.",
      from: "Dhiol World, positioning statement",
    },
    gallery: [
      "/brand-work/dhiol-brand-guide-5.jpg",
      "/brand-work/dhiol-brand-guide-6.jpg",
      "/brand-work/dhiol-stores.jpg",
      "/brand-work/dhiol-world-february.jpg",
      "/brand-work/dhiol-world-april.jpg",
      "/brand-work/dhiol-august.jpg",
      "/brand-work/dhiol-november.jpg",
      "/brand-work/dhiol-consult.jpg",
    ],
  },
  {
    slug: "the-ajoks-brand",
    category: "branding",
    categories: ["branding"],
    title: "A needle and thread, written as a signature",
    client: "TAB The Ajoks Brand",
    sector: "Womenswear and bespoke tailoring",
    location: "Nigeria",
    cover: "/brand-work/tab-guide-1.jpg",
    summary: "An identity for a womenswear label, with three lockups and a rule for each.",
    about:
      "The Ajoks Brand is a womenswear house working in bespoke tailoring. Its stated promise is effortless sophistication in every tailored piece. That is a claim about finish, and finish is a difficult thing for a logo to carry.",
    brief:
      "Draw an identity that reads as couture rather than as retail, and give it enough variants that it can sit on a garment label, a storefront and a social avatar without being redrawn or cropped badly each time.",
    approach:
      "The mark is the name written as a signature, with the ascender of the b drawn out into a needle trailing thread. It is one continuous gesture, which is the point: a signature is what a maker puts on finished work, and the tailoring reference is carried inside the letterform instead of parked next to it as a separate icon.\n\nBecause a script that fine falls apart at small sizes, the system ships three lockups with written rules for when each applies: the primary for maximum recognition, the symbol alone for avatars and small placements, and a wordmark-only version for layouts where the flourish would be too detailed to survive. The brand personality is fixed in four written cards, so the tone that goes with the mark is documented rather than left to whoever writes the next caption.",
    did: [
      "Identity:",
      "Signature mark with integrated needle-and-thread flourish",
      "Three lockups: primary, symbol only, wordmark only",
      "Written rules governing which lockup applies where",
      "Black and reversed white versions",
      "Personality and colour:",
      "Brand personality documented across four written pillars",
      "Colour system and type pairing",
    ],
    outcome:
      "The signature works on a garment label, a storefront and a social avatar, and written rules say which version goes where.",
    stackLabel: "The system includes",
    stack: ["Logo suite", "Lockup rules", "Brand personality", "Colour system", "Type pairing"],
    palette: [
      { hex: "#0E5C58", name: "Deep Teal" },
      { hex: "#F6D3CB", name: "Blush" },
      { hex: "#FFFFFF", name: "White" },
      { hex: "#111111", name: "Ink" },
    ],
    quote: {
      text: "Effortless sophistication in every tailored piece.",
      from: "The Ajoks Brand, brand promise",
    },
    gallery: [
      "/brand-work/tab-guide-4.jpg",
      "/brand-work/tab-guide-6.jpg",
      "/brand-work/tab-guide-7.jpg",
    ],
  },
  {
    slug: "millcon-corporate-profile",
    category: "branding",
    categories: ["branding"],
    title: "A corporate profile that had to survive being printed badly",
    client: "Millcon & Millcon Consult Limited",
    sector: "Management consulting and advisory",
    location: "Nigeria",
    cover: "/brand-work/millcon-cover.jpg",
    summary: "A multi-page profile document for a consultancy that bids for work.",
    about:
      "Millcon & Millcon Consult Limited is a management consultancy working across project management, business consultancy, executive training, trade facilitation and ICT. Its clients and affiliates include organisations that procure formally, which means the profile document is not marketing collateral. It is part of a bid.",
    brief:
      "Design a corporate profile that works as a screen PDF and as a document someone prints on an office machine, reads in a meeting, and photocopies. It had to hold up in greyscale, at low resolution, and stapled.",
    approach:
      "Every service is a numbered band with a single-line benefit statement above the detail, so a reader who only skims the numbers still leaves knowing what the firm does. The bands are separated by shape and number rather than by colour alone, which is what keeps the page legible when it comes out of a black-and-white printer.\n\nThe partners page is the one that does the persuading, so it gets the space: a clean grid of affiliate marks at a consistent optical size rather than at their native ones, which is the difference between a wall of logos that reads as credentials and one that reads as clutter. The green gradient and leaf mark carry through every page as the only decorative element, so nothing competes with the content for a reader who is comparing three bids at once.",
    did: [
      "Document system:",
      "Cover and section system for a multi-page profile",
      "Numbered service bands with a benefit line on each",
      "Partners and affiliates grid, optically sized",
      "Print and screen:",
      "Greyscale-safe hierarchy for office printing",
      "Print and screen PDF masters",
    ],
    outcome:
      "The profile reads the same on screen, out of an office printer in greyscale, and stapled into a bid.",
    stackLabel: "The document includes",
    stack: ["Cover system", "Service bands", "Partner grid", "Print master", "Screen PDF"],
    palette: [
      { hex: "#3FAE29", name: "Millcon Green" },
      { hex: "#8DC63F", name: "Leaf" },
      { hex: "#1B4D2E", name: "Deep Green" },
      { hex: "#F4F7F2", name: "Paper" },
    ],
    quote: {
      text: "Helping organizations reach their full potential.",
      from: "Millcon & Millcon Consult Limited, strapline",
    },
    gallery: [
      "/brand-work/millcon-services.jpg",
      "/brand-work/millcon-partners.jpg",
    ],
  },

  /* ------------------------------------------------------------------ social
     Student associations run a full calendar on a volunteer rota, and the
     artwork below is a season each. Written from the flyers themselves; no
     individual named on a flyer is named here. */
  {
    slug: "bamssa-oou",
    category: "social",
    categories: ["social", "branding"],
    title: "A medical students' association, given a whole season's identity",
    client: "BAMSSA OOU",
    sector: "Student association, basic medical sciences",
    location: "Olabisi Onabanjo University, Nigeria",
    cover: "/brand-work/bamssa-business-summit.jpg",
    summary: "One administration's calendar, designed as a set rather than a stack of flyers.",
    about:
      "The Basic Medical Science Students' Association at Olabisi Onabanjo University runs a full programme across an administration's term: an entrepreneurship summit, an inter-faculty games and trade fair, health seminars, a live audio series and recurring community posts.",
    brief:
      "Design a term's worth of events for an association whose audience is a single campus, whose channel is Instagram and X, and whose brief arrives event by event rather than all at once. Every piece has to be readable at thumbnail size in a feed, and carry dense logistics (dates, venues, entry fees, account numbers, QR codes) without becoming a poster nobody reads.",
    approach:
      "The events are genuinely different in tone, so the system holds them together with structure rather than with a template. Every piece keeps the association crest and administration line in the same place at the top, and a fixed information strip at the base carrying handle, phone and QR. Between those two anchors, each event is free to look like itself: the business summit is corporate and grid-led with speaker portraits in colour blocks, the games fair is a sports poster with the athletes shot on campus, the health seminar is clinical and blue with the guest clinicians framed like a lecture bill.\n\nThe logistics are the hard part and they get treated as content, not as small print. Field events, track events and indoor events are set as three labelled columns rather than one run-on list, so a student can find the one they want to enter without reading the whole thing. Entry tiers, account details and the QR sit together in a single block at the base, which is the part someone screenshots.",
    did: [
      "Campaigns:",
      "Business Summit campaign: key art, speaker cards, programme layout",
      "Inter-faculty games and trade fair: poster and event schedule",
      "Health seminar: campaign artwork and activity breakdown",
      "Live audio series artwork with host cards",
      "Recurring posts and system:",
      "Recurring community and new-month posts",
      "A fixed crest, administration line and contact strip across the set",
      "Logistics blocks: entry tiers, payment details and QR codes",
    ],
    outcome:
      "A whole term of events reads as one association, and the details students need (dates, fees, accounts and a QR code) sit in the same place on every piece.",
    stackLabel: "The season included",
    stack: [
      "Campaign key art", "Speaker cards", "Event schedules",
      "Live audio artwork", "Recurring posts", "Logistics blocks",
    ],
    gallery: [
      "/brand-work/bamssa-olympics.jpg",
      "/brand-work/bamssa-health-seminar.jpg",
      "/brand-work/bamssa-twitter-space.jpg",
      "/brand-work/bamssa-debate.jpg",
      "/brand-work/bamssa-social-night.jpg",
      "/brand-work/bamssa-new-month.jpg",
    ],
  },
  {
    slug: "nipsa-oou",
    category: "social",
    categories: ["social"],
    title: "Two directorates, two visual languages, one association",
    client: "NIPSA OOU",
    sector: "Student association, pharmacology",
    location: "Olabisi Onabanjo University, Nigeria",
    cover: "/brand-work/nipsa-efootball.jpg",
    summary: "Esports and social events for a pharmacology association, split by directorate.",
    about:
      "The Nigerian Pharmacology Students' Association at Olabisi Onabanjo University publishes through two separate offices, a Sports Director and a Social Director, each running its own programme under the same administration.",
    brief:
      "Give both directorates artwork that reads as the same association while making it obvious at a glance which office is speaking, because the two audiences overlap but the events do not.",
    approach:
      "The offices are separated by genre, not by badge. Sports gets the visual language of a tournament: the esports pieces are built like game key art, dark and high-contrast with the title set heavy across the middle and the entry fee and date pinned into corner tabs the way a fixture card does it. Social gets the language of a night out: the movie night is a lit cinema interior with the price on a ticket stub, the hangout is neon-lit portraiture with the door time and cover charge on chips.\n\nWhat holds them together is a shared frame: the association crest and the originating office line sit in the same position on every piece, and the administration credit runs along the base in the same weight. So the set reads as one association with two very different jobs, rather than as two associations.",
    did: [
      "Sports directorate:",
      "Esports tournament artwork for two competitions",
      "Social directorate:",
      "Movie night campaign with ticketing detail",
      "Social hangout artwork with venue, door time and cover",
      "Shared frame:",
      "Recurring new-week and anticipation posts",
      "A shared crest, office line and administration credit across both directorates",
    ],
    outcome:
      "Students can tell at a glance which office is speaking, and still see one association behind both.",
    stackLabel: "The season included",
    stack: [
      "Tournament key art", "Event campaigns", "Ticketing artwork",
      "Recurring posts", "Shared frame system",
    ],
    gallery: [
      "/brand-work/nipsa-codm.jpg",
      "/brand-work/nipsa-movie-night.jpg",
      "/brand-work/nipsa-social-night.jpg",
      "/brand-work/nipsa-new-week.jpg",
      "/brand-work/nipsa-week-anticipate.jpg",
    ],
  },
  {
    slug: "span-oou",
    category: "social",
    categories: ["social"],
    title: "A festival, a health week and an outreach, across two administrations",
    client: "SPAN OOU",
    sector: "Student association, physiology",
    location: "Olabisi Onabanjo University, Nigeria",
    cover: "/brand-work/span-fest-artist.jpg",
    summary: "Campaign artwork spanning a festival, a health week and a community outreach.",
    about:
      "The Students' Physiological Association of Nigeria, Olabisi Onabanjo University chapter, runs a programme that swings from a ticketed campus festival with a booked artist to a medical outreach in the surrounding community, and the work spans two successive administrations.",
    brief:
      "Cover a range that runs from entertainment to public health without the association appearing to be two different bodies, and produce the pieces a ticketed event actually needs rather than a single announcement graphic.",
    approach:
      "SPAN FEST is treated as a festival brand in its own right, sitting inside the association rather than replacing it: hazard-tape diagonals, a booked artist shot as the headline act, and the full activity list (charades, bottle flip, raffle, arm-wrestling, pageants, trade fair, table tennis, VR, PS4, dance, pick-up line battle) set as three tight columns at the base so a fourteen-item programme still fits above the fold in a feed. The ticket piece is a separate artwork with its own job: price, what it admits, and three named sellers with numbers, because a ticket graphic that does not tell you who to call has failed.\n\nThe health work turns the volume down deliberately. The outreach piece leads with a photograph of the screening itself and states the community and the date plainly; Health Week takes a single verb, RE-ACTIVATE, and lets last year's photographs carry the rest. Same crest, same administration credit, completely different register, which is the honest way to move between a party and a blood pressure check.",
    did: [
      "SPAN FEST:",
      "SPAN FEST key art with headline artist treatment",
      "Festival ticket artwork with pricing and named sellers",
      "Full activity programme laid out as scannable columns",
      "Health:",
      "Medical outreach campaign artwork",
      "Health Week identity and photographic recap",
      "Handover:",
      "Excos and welcome-back templates for the incoming administration",
    ],
    outcome:
      "The association moves from a ticketed festival to a community health check without looking like two different bodies, and the next administration inherits templates rather than a blank page.",
    stackLabel: "The season included",
    stack: [
      "Festival key art", "Ticket artwork", "Programme layout",
      "Outreach campaign", "Health week identity", "Exco templates",
    ],
    gallery: [
      "/brand-work/span-fest-ticket.jpg",
      "/brand-work/span-medical-outreach.jpg",
      "/brand-work/span-health-week.jpg",
      "/brand-work/span-excursion.jpg",
      "/brand-work/span-welcome-back.jpg",
      "/brand-work/span-excos-template-1.jpg",
    ],
  },
];

/** Splits "What we delivered" into its groups. A line ending in a colon is a group heading;
    a list with no headings comes back as one unnamed group. */
export function groupDid(did: string[]): { domain?: string; items: string[] }[] {
  const out: { domain?: string; items: string[] }[] = [];
  for (const line of did) {
    if (line.trim().endsWith(":")) out.push({ domain: line.trim().slice(0, -1), items: [] });
    else if (out.length) out[out.length - 1].items.push(line);
    else out.push({ items: [line] });
  }
  return out.filter((g) => g.items.length);
}

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
  seo: "/work/meridianglobaltrainings.jpg",
  web: "/work/traxstaff.jpg",
  apps: "/work/app/realtors-dashboard.jpg",
  software: "/work/app/litch-dashboard.jpg",
  social: "/brand-work/bamssa-business-summit.jpg",
};

/**
 * Every category leads with case studies now.
 *
 * Branding and social used to be walls of loose artwork, on the reasoning that
 * a flyer has no narrative behind it. That was true of a flyer and false of
 * the work: the artwork groups by CLIENT, and a client's set is a project —
 * Dhiol is a four-division architecture with a year of campaigns under it, a
 * student association's season is a term's programme designed as a set. The
 * wall did not stop existing; it moved below the case studies, so the pieces
 * that do not belong to a written story are still on the page.
 */
const SHAPES: Record<ServiceSlug, "case" | "gallery"> = {
  branding: "case",
  seo: "case",
  web: "case",
  apps: "case",
  software: "case",
  social: "case",
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

/**
 * Where a case study lives. A piece can be LISTED under several categories but
 * it is owned by exactly one, and that ownership is the address, so this is the
 * single place that decides it. Returns undefined for a slug with no case
 * study, so a caller has to decide rather than link to a 404.
 */
export const caseHref = (slug: string): string | undefined => {
  const study = caseBySlug(slug);
  return study ? `/work/${study.category}/${study.slug}` : undefined;
};

/**
 * Every case study listed under a category, with the ones this category OWNS
 * first.
 *
 * Ordering matters here and the naive filter got it backwards. A website whose
 * engagement happened to include branding is tagged `branding`, so /work/branding
 * opened on five websites before it reached a single brand system — the right
 * work, in an order that answered the wrong question. A piece whose canonical
 * category is the one being browsed is the direct answer; everything else is
 * related work and sorts after it.
 */
export const casesFor = (slug: ServiceSlug): CaseStudy[] =>
  CASE_STUDIES.filter((c) => c.categories.includes(slug)).sort(
    (a, b) => Number(b.category === slug) - Number(a.category === slug),
  );

/** What the hub card counts: written case studies, which is what the category
    page leads with. The loose artwork below them is counted separately by the
    wall's own heading, so a card saying 5 opens on five stories rather than on
    a hundred tiles. */
export const countFor = (c: WorkCategory): number => casesFor(c.slug).length;

/** The wall under a category's case studies: every piece of artwork in that
    family that is NOT already carried inside one of the stories above it, so
    the page never shows the same image twice. */
export const wallFor = (slug: ServiceSlug): GalleryPiece[] => {
  const used = new Set(
    casesFor(slug).flatMap((c) => [c.cover, ...(c.gallery ?? [])]).filter(Boolean) as string[],
  );
  return galleryFor(slug).filter((g) => !used.has(g.src));
};

/** The live sites, for the "also built" strip. Kept in projects.ts so the
    homepage rail and this page cannot disagree about what shipped. */
export const LIVE_SITES = PROJECTS;
