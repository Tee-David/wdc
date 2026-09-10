/**
 * The six WDC services, in the detail the /services page needs.
 *
 * Every step, deliverable and claim below is drawn from what the company has
 * already published about itself — docs/PRD.md section 2 and public/llms.txt —
 * rather than invented for the page. Nothing here promises a price, a
 * turnaround or a result that WDC has not already put in writing, because this
 * data also feeds the Service JSON-LD.
 *
 * `tools` names LogoCategory keys from lib/logos.ts, so each service shows the
 * real toolbox entries already registered for it instead of a generic strip.
 */
import type { LogoCategory } from "./logos";

export type ServiceSlug =
  | "branding"
  | "seo"
  | "web"
  | "apps"
  | "software"
  | "social";

export type Service = {
  slug: ServiceSlug;
  /** Full name, as used in headings and the JSON-LD. */
  name: string;
  /** Short label for filter chips and the in-page nav. */
  short: string;
  /** lucide-react export name for the section header. */
  icon: string;
  /** One line under the section heading. */
  lede: string;
  /** The long-form paragraph that makes this a detail page, not a card. */
  body: string;
  /** Six stages, mirroring the reference layout's six-card grid.
      `i` is a lucide-react export name (PascalCase — lucide ships no lowercase
      exports, and an unknown name renders nothing at all). */
  steps: { t: string; d: string; i: string }[];
  /** What a client actually receives. */
  deliverables: string[];
  /** Which toolbox categories to draw the logo row from. */
  tools: LogoCategory[];
};

export const SERVICES: Service[] = [
  {
    slug: "branding",
    icon: "Palette",
    name: "Branding & Design",
    short: "Branding",
    lede: "One consistent identity across everything a customer touches.",
    body:
      "Everything visual a company needs, built as a system rather than a set of one-off files. We work out what the brand has to say before we draw anything, then design the identity, the motion and the assets that carry it, so the logo, the deck, the storefront banner and the app icon all read as the same company.",
    steps: [
      { t: "Discovery", d: "We learn the business, the customer and the market before a single mark is drawn.", i: "Search" },
      { t: "Brand strategy", d: "Positioning and message, agreed in writing, so the design has something to serve.", i: "Compass" },
      { t: "Identity design", d: "Logo, type, colour and layout built as a system, not a single lockup.", i: "Palette" },
      { t: "Motion & micro-animation", d: "How the brand moves: transitions, micro-animations and motion design.", i: "Sparkles" },
      { t: "Brand guide", d: "The rules written down, so anyone can apply the identity without guessing.", i: "BookOpen" },
      { t: "Asset rollout", d: "Profiles, flyers, posters, banners, printables and physical brand stands.", i: "Package" },
    ],
    deliverables: [
      "Logo and identity system",
      "Brand guide",
      "Company profile",
      "Motion design and micro-animations",
      "Flyers, posters and banners",
      "Printables and mementos",
      "Physical brand stands",
    ],
    tools: ["design"],
  },
  {
    slug: "seo",
    icon: "Search",
    name: "Search Engine Optimization",
    short: "SEO",
    lede: "Visibility end to end, including being found by the AI tools people now ask.",
    body:
      "Getting found is a technical problem and an editorial one, so we treat it as both. We fix what stops search engines reading the site, then build the keyword and content work that earns the rankings. We extend the same thinking to AI visibility, optimising brands to be found and cited by LLMs, not only listed on a results page.",
    steps: [
      { t: "Audit", d: "PageSpeed and Lighthouse performance audits, plus a full technical crawl.", i: "Gauge" },
      { t: "Keyword research", d: "The terms your customers actually search, mapped to pages that can win them.", i: "SearchCheck" },
      { t: "Competitor analysis", d: "What the people already ranking are doing, and where the gap is.", i: "Crosshair" },
      { t: "Technical SEO", d: "Crawlability, structure, speed and markup fixed at the source.", i: "Wrench" },
      { t: "Content strategy", d: "Pages written to rank, earn the click and then convert it.", i: "FileText" },
      { t: "AI visibility", d: "Optimising to be found and cited by ChatGPT, Claude and Gemini.", i: "Bot" },
    ],
    deliverables: [
      "Technical SEO audit and fixes",
      "Keyword research and mapping",
      "Competitor analysis",
      "Content strategy",
      "Google Business Profile setup and optimisation",
      "Search Console management",
      "PageSpeed and Lighthouse audits",
      "AI and LLM visibility optimisation",
    ],
    tools: ["seo"],
  },
  {
    slug: "web",
    icon: "Code2",
    name: "Full-Stack Web Development",
    short: "Web",
    lede: "Every kind of website, engineered to perform and to last.",
    body:
      "Personal sites and blogs, business and company sites, complex builds like e-commerce, and CMS-driven WordPress. Custom or CMS, whichever actually fits the job. We build for speed, accessibility and maintainability, then stay on afterwards, because a site that is never touched again quietly stops earning.",
    steps: [
      { t: "Scope", d: "What the site has to achieve, agreed before anyone opens an editor.", i: "ClipboardList" },
      { t: "Architecture", d: "Custom or CMS, decided on the work in front of us rather than habit.", i: "Layers" },
      { t: "Design", d: "Interfaces built around your customer, not dropped into a template.", i: "PenTool" },
      { t: "Engineering", d: "Fast, accessible, maintainable code that another developer can pick up.", i: "Code" },
      { t: "Launch", d: "Shipped properly, with you included at every step rather than at the reveal.", i: "Rocket" },
      { t: "Maintenance", d: "Ongoing care, continuous SEO optimisation and performance work.", i: "RefreshCw" },
    ],
    deliverables: [
      "Business and company websites",
      "Personal sites and blogs",
      "E-commerce builds",
      "WordPress and CMS builds",
      "Fully custom builds",
      "Ongoing maintenance",
      "Continuous SEO and performance optimisation",
    ],
    tools: ["web", "database", "cloud"],
  },
  {
    slug: "apps",
    icon: "Smartphone",
    name: "Cross-Platform App Development",
    short: "Apps",
    lede: "One codebase, every device, native-quality on both stores.",
    body:
      "Web apps and mobile apps for iOS and Android from a single codebase, using Flutter, React Native, Swift, Kotlin or C# depending on what the product needs. We handle the engineering and the delivery, including the parts teams underestimate, like store review and the update cadence after launch.",
    steps: [
      { t: "Product definition", d: "What the app is for, and what it does not need to do in version one.", i: "Target" },
      { t: "UX flows", d: "The paths a user takes, mapped before any screen is designed.", i: "GitBranch" },
      { t: "One codebase", d: "Flutter, React Native, Swift, Kotlin or C#, chosen for the product.", i: "Boxes" },
      { t: "Engineered systems", d: "The backend, data and integrations the app leans on.", i: "Server" },
      { t: "Store delivery", d: "App Store and Play Store submission, handled properly.", i: "Store" },
      { t: "Continuous updates", d: "Shipping improvements after launch, not walking away at 1.0.", i: "RefreshCcw" },
    ],
    deliverables: [
      "iOS and Android apps",
      "Web apps",
      "Single cross-platform codebase",
      "App Store delivery",
      "Play Store delivery",
      "Continuous updates",
    ],
    /* mobile only: the "web" category carries WordPress, PHP and Tailwind,
       which belong to the web service rather than to app development */
    tools: ["mobile"],
  },
  {
    slug: "software",
    icon: "BrainCircuit",
    name: "Software Engineering & AI",
    short: "Software & AI",
    lede: "Custom software and AI built around the outcome, not around the technology.",
    body:
      "Product builds from zero, scaling systems that have outgrown themselves, and AI or LLM features integrated into software that already exists. We are candid about where AI earns its place and where it does not. The engineering is built around a real business problem, and we say so plainly when a model is not the answer.",
    steps: [
      { t: "Problem framing", d: "The business problem first; the technology choice comes after it.", i: "Target" },
      { t: "Architecture", d: "Backends, APIs and services designed to be scaled and maintained.", i: "Network" },
      { t: "Data", d: "SQL and NoSQL databases modelled for how the product will actually be read.", i: "Database" },
      { t: "Cloud", d: "Google Cloud, Azure, Oracle Cloud or AWS, with Rust and Go services where they fit.", i: "Cloud" },
      { t: "AI & LLM integration", d: "Model features wired into new or existing software where they solve something.", i: "Cpu" },
      { t: "Scale", d: "Growing an existing product without rewriting it from scratch.", i: "TrendingUp" },
    ],
    deliverables: [
      "Product builds from zero",
      "AI and LLM integration",
      "Backends and APIs",
      "SQL and NoSQL databases",
      "Cloud infrastructure",
      "Rust and Go services",
      "Scaling existing products",
    ],
    tools: ["ai", "cloud", "database"],
  },
  {
    slug: "social",
    icon: "Megaphone",
    name: "Social Media Marketing & PPC",
    short: "Social & PPC",
    lede: "Turn attention into growth, with reporting that keeps you in the loop.",
    body:
      "Organic growth and paid campaigns run together, because they feed each other. We manage the day-to-day accounts, build the content calendar, set up the automations that catch enquiries out of hours, and report on what it did, so you are looking at outcomes rather than a screenshot of a follower count.",
    steps: [
      { t: "Channel audit", d: "Which platforms are worth your time, and which are quietly costing you.", i: "Activity" },
      { t: "Content calendar", d: "Planned properly, so posting is a schedule rather than a scramble.", i: "Calendar" },
      { t: "Organic growth", d: "Follower campaigns and content that earns attention without paying for it.", i: "Sprout" },
      { t: "Account management", d: "Facebook, Instagram, X, WhatsApp, TikTok and LinkedIn, run day to day.", i: "Users" },
      { t: "Paid ads", d: "PPC campaigns built to convert, not just to spend the budget.", i: "Megaphone" },
      { t: "Automations", d: "Auto-replies and workflows so enquiries are answered out of hours.", i: "Zap" },
    ],
    deliverables: [
      "Organic growth campaigns",
      "Account management across six platforms",
      "Content calendars",
      "Paid ads and PPC",
      "Automations and auto-replies",
      "Reporting",
    ],
    tools: ["social"],
  },
];

export const SERVICE_BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));
