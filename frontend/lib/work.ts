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
      "Build the product on every surface a team actually works on (a browser, a desktop machine and a phone) without three separate codebases drifting apart, and with roles and permissions that hold the same in all three.",
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
      "Replace work tracked across separate documents with one console: requests raised, invoices against them, and reporting drawn from the same records rather than re-keyed.",
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
      "Pages are structured around what people actually search for, with the technical layer (crawlable markup, metadata, structured data and page speed) treated as part of the build rather than a later pass.",
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
      "Exambeta Travels & Tours works across education and mobility, the kind of service someone commits to well before they can see a result, which puts the burden on the site to be clear about what is actually offered.",
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
      "Primary lockup, horizontal lockup and standalone symbol",
      "Black and reversed white versions for single-colour printing",
      "Written usage rules covering placement over photography and on neutral grounds",
      "Primary and secondary colour system with CMYK, RGB and HEX for every swatch",
      "Triangle pattern derived from the mark, for linings and packaging fills",
      "Stationery: business cards, letterhead, compliment slips",
      "Woven garment labels and swing tags",
      "Apparel: t-shirts, polos, caps, beanies, socks, long sleeves",
      "Retail: shopping bags, tissue, boxes",
      "Illuminated shopfront signage and window treatment",
    ],
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
      "A brand that has to read as calm in a category that shouts. Personal care is sold with superlatives, neon and retouching, and Skinish sells the opposite — so the system had to make restraint repeatable by somebody who was not in the room when it was decided.",
    approach:
      "The mark carries three things at once: a hibiscus flower for natural elegance, a regal motif for sophistication, and a droplet for purity. One shape, three readings, and none of them needs explaining before it works.\n\nMost of the effort went into the document rather than the mark, because the mark was never going to be the thing that broke. A brand like this fails one caption at a time — a buzzword here, an exaggerated promise there — so the guide states the voice as three pairs a writer can actually check against: warmth not flair, clarity not cleverness, care not control. The photography rules do the same job in pictures: natural light, no over-retouching, diverse skin tones and textures, props kept organic. They are written as instructions to a photographer, not as adjectives.",
    did: [
      "Logo system with horizontal and vertical lockups, icon-only and wordmark-only variants",
      "Clear space and minimum size rules, specified for print and for screen",
      "Approved background set, with the four grounds the mark is allowed on",
      "A don'ts page showing the specific misuses to refuse",
      "Colour system: a primary, two secondaries and two supporting neutrals, with HEX and RGB",
      "Typography: Bricolage Grotesque for headlines, Outfit for everything else",
      "Brand voice, personality traits, audience profile and positioning statement",
      "Photography direction covering light, retouching, casting and props",
      "Packaging guidance: recyclable or refillable containers, matte or paper-based labels",
      "Social, email, website and retail display guidance",
    ],
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
      "A podcast identity lives almost entirely on photographs of a dark studio: a condenser mic, low light, a lot of black. A mark that only works on white is useless here, and most of the places it appears are not designed by us — an episode tile, a guest's repost, a cap.",
    approach:
      "The mark is a microphone drawn as a diary — a capsule mic whose body reads as a bound notebook — so the two things the show is about are one object rather than a symbol beside a word.\n\nBecause it lives on dark photography, the guide leads with the reversed version rather than treating it as an afterthought. There is a black version for single-colour work, a white version for dark grounds, and a page of correct placements over images beside a page of incorrect ones, because on a podcast the person laying out an episode tile at midnight is usually not a designer.\n\nThe palette is deliberately narrow: a near-black, a muted brown and a platinum, which is the range a studio photograph already contains. A secondary set of purple, silver and goldenrod exists for promotional material, where the core three would be too quiet.",
    did: [
      "Primary logo, alternative lockups and a standalone symbol",
      "Black and reversed white versions for single-colour and dark-ground use",
      "Correct and incorrect usage pages, worked over real photography",
      "Core palette and a secondary palette, with CMYK, RGB and HEX for every swatch",
      "Typography: Bigbesty as the primary face, Poppins as the secondary",
      "Brand voice, positioning and personality",
      "Episode artwork, social and merchandise application",
      "Studio backdrop and set signage",
    ],
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
      "Symbol, full lockup and wordmark-only variants",
      "Black and reversed white versions",
      "Usage grid marking approved combinations on light, dark and neutral grounds",
      "Core palette with CMYK, RGB and HEX",
      "Woven labels and sewn-in garment tags",
      "Apparel application across knitwear, outerwear and footwear",
      "Retail packaging: bags and boxes",
    ],
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
      "Parent brand identity and 2024 brand guideline",
      "Positioning statement and a five-word written voice",
      "Division lockups for Tech Hub, Stores, Consult and Pay",
      "Colour assignment separating the divisions within one family",
      "Contact and social strip locked as a reusable frame element",
      "Monthly campaign artwork across the calendar year",
      "Recurring formats: new month, new week, weekend, launches",
      "Website launch campaign for dhiolstores.ng",
      "Service artwork for Consult: trademark, SCUML, TIN, CAC registration",
    ],
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
      "Signature mark with integrated needle-and-thread flourish",
      "Three lockups: primary, symbol only, wordmark only",
      "Written rules governing which lockup applies where",
      "Black and reversed white versions",
      "Brand personality documented across four written pillars",
      "Colour system and type pairing",
    ],
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
      "Cover and section system for a multi-page profile",
      "Numbered service bands with a benefit line on each",
      "Partners and affiliates grid, optically sized",
      "Greyscale-safe hierarchy for office printing",
      "Print and screen PDF masters",
    ],
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
      "Business Summit campaign: key art, speaker cards, programme layout",
      "Inter-faculty games and trade fair: poster and event schedule",
      "Health seminar: campaign artwork and activity breakdown",
      "Live audio series artwork with host cards",
      "Recurring community and new-month posts",
      "A fixed crest, administration line and contact strip across the set",
      "Logistics blocks: entry tiers, payment details and QR codes",
    ],
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
      "Esports tournament artwork for two competitions",
      "Movie night campaign with ticketing detail",
      "Social hangout artwork with venue, door time and cover",
      "Recurring new-week and anticipation posts",
      "A shared crest, office line and administration credit across both directorates",
    ],
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
      "SPAN FEST key art with headline artist treatment",
      "Festival ticket artwork with pricing and named sellers",
      "Full activity programme laid out as scannable columns",
      "Medical outreach campaign artwork",
      "Health Week identity and photographic recap",
      "Excos and welcome-back templates for the incoming administration",
    ],
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
