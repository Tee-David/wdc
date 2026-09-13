import type { ServiceSlug } from "@/lib/services";

/**
 * The blog.
 *
 * ONE SOURCE, like the work catalogue. The index, the individual posts, the
 * sitemap and the structured data are all derived from this array, so a post
 * cannot ship with a live page the sitemap has never heard of, and a slug
 * cannot drift between the link that points at it and the page it lands on.
 *
 * BODIES ARE STRUCTURED, NOT HTML STRINGS. Each post is a list of blocks the
 * page renders. That is deliberately less flexible than markdown or raw HTML:
 * a block cannot carry a stray inline colour, an unclosed tag, or a heading
 * level that breaks the document outline, and the renderer can guarantee one
 * h1 per page with the rest nested underneath it. When the admin content
 * editor arrives it writes THIS shape, so nothing about the pages changes.
 *
 * EVERY POST CARRIES ITS OWN SEO. Title and description are written for the
 * result page rather than generated from the first paragraph, because the
 * first paragraph is written for a reader who has already clicked.
 */

export type BlogBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; who?: string }
  /** A short, checkable claim. Never a number we cannot evidence. */
  | { kind: "callout"; title: string; text: string };

export type BlogPost = {
  slug: string;
  /** The on-page h1. */
  title: string;
  /** The <title>. Written for a search result, so it can differ from the h1. */
  seoTitle: string;
  /** The meta description. 120-155 characters. */
  description: string;
  /** One sentence, shown on the index card. */
  excerpt: string;
  /** ISO date. Used for both display and `datePublished`. */
  date: string;
  /** ISO date, when the post was last meaningfully revised. */
  updated?: string;
  /** Which service this belongs to, so a post can be shown beside that work. */
  topic: ServiceSlug;
  /** Plain words a reader would use, for the on-page tag row. */
  tags: string[];
  /** Card and article cover. One of the site's own hero photographs, so the
      blog introduces no new licensing and no new visual vocabulary. */
  cover: string;
  body: BlogBlock[];
};

/* ------------------------------------------------------------------ posts */

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-a-website-actually-costs-in-nigeria",
    title: "What a website actually costs in Nigeria, and what changes the price",
    seoTitle: "What a Website Costs in Nigeria (and What Changes the Price)",
    description:
      "A plain explanation of what drives website pricing in Nigeria: scope, content, integrations and who maintains it after launch.",
    excerpt:
      "Nobody publishes a real answer, so here is how the price is actually built, and which decisions move it most.",
    date: "2026-07-14",
    topic: "web",
    tags: ["pricing", "websites", "planning"],
    cover: "/hero/web-design.jpg",
    body: [
      { kind: "p", text: "Every agency answers this with \"it depends\", which is true and useless. What follows is what it depends ON, so you can work out roughly where your own project sits before you talk to anyone." },
      { kind: "h2", text: "The four things that move the price" },
      { kind: "p", text: "Almost every quote you will be given is some combination of these. If a quote surprises you, one of them is bigger than you assumed." },
      { kind: "list", items: [
        "How many genuinely different pages there are. Twelve pages built from three templates is a small job. Five pages that each look and behave differently is a larger one.",
        "Whether the content exists. Writing, photography and product data are usually the longest pole, and the one most often left out of a quote.",
        "What it has to talk to. A brochure site talks to nothing. A site that takes payments, syncs stock, books appointments or feeds a CRM is a piece of software.",
        "Who looks after it afterwards. A site nobody maintains is cheaper on the day and more expensive within a year.",
      ] },
      { kind: "h2", text: "Where the money usually goes wrong" },
      { kind: "p", text: "The two most common expensive mistakes are paying for a design that cannot be built as drawn, and paying twice because the first build could not be edited by anyone but its author. Both are avoidable by asking one question early: who will change this in six months, and with what?" },
      { kind: "callout", title: "Ask for the maintenance answer up front", text: "Before you compare two quotes, ask each one what it costs to change a page, add a product and renew hosting a year from now. The cheaper build is often the one that answers this clearly." },
      { kind: "h2", text: "A reasonable way to scope it" },
      { kind: "p", text: "Write down the three things a visitor must be able to do. Then write down what you will have to send us: logos, copy, photographs, product lists. That second list is usually where a timeline is really decided." },
      { kind: "p", text: "If you want, send us both lists and we will tell you plainly which parts are small and which are not." },
    ],
  },
  {
    slug: "seo-when-people-ask-ai-instead-of-google",
    title: "SEO when your customers ask an AI instead of Google",
    seoTitle: "SEO for AI Search: Being Found by ChatGPT, Claude and Gemini",
    description:
      "Search is splitting in two. What actually changes when people ask an assistant instead of typing a query, and what to do about it.",
    excerpt:
      "Ranking and being cited are not the same job. Here is what differs, and what is still the same work you were already doing.",
    date: "2026-08-02",
    updated: "2026-09-01",
    topic: "seo",
    tags: ["SEO", "AI search", "content"],
    cover: "/hero/search-console.jpg",
    body: [
      { kind: "p", text: "A growing share of the questions that used to start on Google now start in an assistant, and the answer arrives as a paragraph rather than ten blue links. That changes what visibility means, but far less of the work than most people selling \"AI SEO\" would like you to believe." },
      { kind: "h2", text: "What genuinely changes" },
      { kind: "list", items: [
        "You are competing to be CITED inside an answer, not to occupy a position on a page. There is no position two.",
        "Assistants prefer sources that state things plainly and can be checked. Vague marketing copy is hard to quote.",
        "Structure matters more. A clear heading with a direct answer under it is easy to lift; the same fact buried in a paragraph of adjectives is not.",
        "Your own site is not the only input. What other people publish about you feeds the same models.",
      ] },
      { kind: "h2", text: "What does not change" },
      { kind: "p", text: "Everything boring and durable. A site that loads quickly, says clearly what it does, marks up its pages properly and earns links from real places does well in both worlds, because the assistants are reading the same web." },
      { kind: "quote", text: "If a page cannot answer the question on its own, it will not be quoted answering it.", who: "the short version" },
      { kind: "h2", text: "A practical starting point" },
      { kind: "p", text: "Take the ten questions your customers actually ask before they buy. Give each one a page, or a clearly headed section, that answers it in the first two sentences. Then make those facts checkable: name the service, the place, the price band if you can publish it, the constraint." },
      { kind: "callout", title: "Do not invent numbers for this", text: "Assistants and readers both punish figures that cannot be verified. A claim you would not want to be asked to evidence is a claim that costs you more than it earns." },
    ],
  },
  {
    slug: "brand-guidelines-small-business-actually-needs",
    title: "The brand guidelines a small business actually needs",
    seoTitle: "Brand Guidelines for Small Businesses: What You Actually Need",
    description:
      "Most brand guideline documents go unread. Here is the short version that people will actually use, and what to leave out.",
    excerpt:
      "A sixty-page brand book nobody opens is worth less than two pages somebody follows.",
    date: "2026-08-21",
    topic: "branding",
    tags: ["branding", "identity", "design"],
    cover: "/hero/design-desk.jpg",
    body: [
      { kind: "p", text: "Brand guidelines exist so that the tenth thing you publish still looks like the first. That is the whole purpose. Judged against it, most guideline documents fail, because they are written to be admired rather than used." },
      { kind: "h2", text: "What earns its place" },
      { kind: "list", items: [
        "The logo, and the two or three ways it is allowed to appear. Including the smallest size it still works at.",
        "Colours with their exact values, and which one is allowed to be the loudest thing on a page.",
        "Two typefaces at most, with a rule for headings and a rule for everything else.",
        "What the brand sounds like, shown as three sentences written right and three written wrong.",
        "One worked example. A social post, a flyer, a page header, built correctly.",
      ] },
      { kind: "h2", text: "What usually does not" },
      { kind: "p", text: "Mood boards, a page about the founder's philosophy, and elaborate rules for situations that will never occur. If a section has never once settled an argument, it is decoration." },
      { kind: "callout", title: "The test that matters", text: "Hand the document to somebody outside your company and ask them to make a social post. If they can, it works. If they ask you three questions first, those three answers are what the document is missing." },
      { kind: "h2", text: "Keeping it alive" },
      { kind: "p", text: "A guideline is only true while somebody maintains it. Put it somewhere editable, date it, and revise it the first time reality disagrees with it rather than the third." },
    ],
  },
  {
    slug: "why-your-site-is-slow-on-nigerian-mobile-data",
    title: "Why your site is slow on Nigerian mobile data, and what to do first",
    seoTitle: "Why Your Website Is Slow on Mobile Data, and How to Fix It",
    description:
      "Most sites are slow for three or four measurable reasons. How to find yours, and which fix gives the most back for the least work.",
    excerpt:
      "Speed complaints are usually one or two specific files. Measure before you redesign anything.",
    date: "2026-09-05",
    topic: "web",
    tags: ["performance", "Core Web Vitals", "mobile"],
    cover: "/hero/robotics.jpg",
    body: [
      { kind: "p", text: "A slow site is rarely slow everywhere. It is usually slow because of a small number of specific, findable things, and a redesign is the most expensive possible way to discover that." },
      { kind: "h2", text: "Measure first, and measure the right thing" },
      { kind: "p", text: "Run PageSpeed Insights on a page people actually land on, on mobile, and read the opportunities rather than the score. The score is a summary; the opportunities name files." },
      { kind: "h2", text: "The usual culprits, in the order they are usually worth fixing" },
      { kind: "list", items: [
        "One enormous image. A photograph exported at camera resolution and displayed at thumbnail size is the single most common cause, and the easiest to fix.",
        "A third-party widget. Chat, analytics, review badges and cookie banners all load code you did not write, and one of them is usually much heavier than the rest.",
        "Fonts that block the text from appearing. Text that waits for a font is text nobody is reading yet.",
        "Everything loading at once. Anything below the fold can wait, and most of it should.",
      ] },
      { kind: "callout", title: "A real example from this site", text: "Our own chat widget was fetching an avatar image of well over two megabytes for a button drawn at 56 pixels. Serving a correctly sized copy took it to a few kilobytes. Nothing about the design changed." },
      { kind: "h2", text: "What not to do" },
      { kind: "p", text: "Do not start by changing the framework, and do not accept \"it needs a rebuild\" without being shown which measurement says so. Rebuilds are sometimes right; they are almost never the FIRST answer." },
    ],
  },
  {
    slug: "should-you-build-an-app-or-a-website",
    title: "Should you build an app, or a website?",
    seoTitle: "App or Website? How to Decide, and What Each One Costs You",
    description:
      "A straightforward way to decide between a mobile app and a website, including the ongoing costs people forget about.",
    excerpt:
      "The honest answer is usually a website first. Here is how to tell when it genuinely is not.",
    date: "2026-09-10",
    topic: "apps",
    tags: ["apps", "planning", "product"],
    cover: "/hero/mobile-dev.jpg",
    body: [
      { kind: "p", text: "This question is usually asked the wrong way round. The useful version is not \"app or website\", it is \"what does this need to do that a website cannot?\"" },
      { kind: "h2", text: "Reasons that genuinely need an app" },
      { kind: "list", items: [
        "It must work with no connection, reliably, for long stretches.",
        "It needs hardware a browser cannot reach properly, or background access to it.",
        "Push notifications are the product, not a nice-to-have.",
        "People will use it several times a week, for months. An icon on a home screen is worth something then.",
      ] },
      { kind: "h2", text: "Reasons that usually do not" },
      { kind: "p", text: "Wanting to be in the app stores, wanting it to feel modern, or a competitor having one. Those are real motivations, but they are marketing goals and there are cheaper ways to meet them." },
      { kind: "callout", title: "The cost people forget", text: "An app is never finished. Both stores change their requirements every year, and a build left alone for eighteen months usually needs work before it can be updated at all. Budget for that or do not start." },
      { kind: "h2", text: "The middle path" },
      { kind: "p", text: "A well-built website can be installed to a home screen, work offline for the things that matter, and send notifications on most devices. For a lot of businesses that is the whole of what they wanted the app for, at a fraction of the cost and with one codebase to maintain." },
    ],
  },
  {
    slug: "what-to-send-your-designer-before-work-starts",
    title: "What to send your designer before the work starts",
    seoTitle: "What to Send Your Designer Before a Project Starts",
    description:
      "The handful of things that decide whether a design project runs to time. Most delays are traced back to one of them.",
    excerpt:
      "Almost every late project was late for the same small set of reasons. Here they are, in advance.",
    date: "2026-09-12",
    topic: "branding",
    tags: ["process", "working together", "planning"],
    cover: "/hero/ai-key.jpg",
    body: [
      { kind: "p", text: "Design projects rarely run late because the design is hard. They run late waiting for something only the client has. This is that list, so you can gather it before the clock starts." },
      { kind: "h2", text: "The list" },
      { kind: "list", items: [
        "Your logo in the original file it was made in, not a screenshot of it.",
        "The real words. Placeholder copy hides every layout problem until the worst possible moment.",
        "Photographs at full size, or a decision to buy or shoot them.",
        "Who signs it off. One name. Two is a negotiation, three is a delay.",
        "Anything that cannot change: a legal disclaimer, a tagline, a colour a parent company insists on.",
      ] },
      { kind: "h2", text: "The one that catches everyone" },
      { kind: "p", text: "The sign-off question. A project with an unclear approver does not get slower gradually; it stops at the first decision and waits. Deciding it in the first week costs nothing and saves the most." },
      { kind: "callout", title: "If you do not have the content yet", text: "Say so at the start rather than at the review. It is a normal thing to need help with, and it is a completely different project plan from one where the words already exist." },
    ],
  },
];

/* ----------------------------------------------------------------- lookup */

export const postBySlug = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((p) => p.slug === slug);

/** Newest first, which is the only order the index ever wants. */
export const postsNewestFirst = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

/**
 * Reading time, derived rather than typed in, so it cannot fall out of date
 * when a post is edited. 200 words a minute, rounded up, floor of one.
 */
export function readingMinutes(post: BlogPost): number {
  const words = post.body.reduce((n, block) => {
    if (block.kind === "list") return n + block.items.join(" ").split(/\s+/).length;
    if (block.kind === "callout") return n + (block.title + " " + block.text).split(/\s+/).length;
    return n + block.text.split(/\s+/).length;
  }, 0);
  return Math.max(1, Math.ceil(words / 200));
}

/** Long form, for display. Short form lives in the `datetime` attribute. */
export const formatDate = (iso: string): string =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

/** Other posts worth reading after this one: same topic first, then recent. */
export function relatedPosts(post: BlogPost, limit = 2): BlogPost[] {
  const others = postsNewestFirst().filter((p) => p.slug !== post.slug);
  const sameTopic = others.filter((p) => p.topic === post.topic);
  return [...sameTopic, ...others.filter((p) => p.topic !== post.topic)].slice(0, limit);
}
