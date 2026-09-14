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
      { kind: "p", text: "Nobody wants to be the first to say a number. Agencies hedge because the honest answer depends on things they have not been told yet, and clients hedge because naming a budget feels like losing a negotiation. So both sides circle, and the quote arrives three weeks later attached to assumptions nobody agreed to." },
      { kind: "p", text: "Here is what actually drives the number, in the order it drives it. None of this is a price list. It is the set of questions that turn a vague brief into a figure that holds." },

      { kind: "h2", text: "What you are really buying" },
      { kind: "p", text: "A website is four separate things, and people usually only price the third one." },
      { kind: "list", items: [
        "The decisions. What the site is for, who it is talking to, what it has to make happen, and what it is allowed to leave out. This is the part that is skipped and the part that everything else is built on.",
        "The content. Words that persuade, photographs that are yours to use, and the discipline to write and shoot them before the layout is designed rather than after.",
        "The build. Design, front end, whatever has to run on a server, and the testing that stops it embarrassing you on a phone.",
        "The keeping. Hosting, a domain, updates, backups, and somebody who answers when it breaks.",
      ] },
      { kind: "p", text: "A quote that covers only the third is not cheaper. It has moved the other three onto you, and you will pay for them in time, in a second project six months later, or in a site that never quite launches." },

      { kind: "h2", text: "The questions that move the number most" },

      { kind: "h3", text: "How many pages, and how different are they?" },
      { kind: "p", text: "Page count is the wrong unit. Twelve pages built from three layouts is a small job. Five pages that are each designed from scratch is a bigger one. What costs money is the number of distinct things that have to be designed, built and tested, not the number of URLs." },

      { kind: "h3", text: "Does anything have to happen, or is it all reading?" },
      { kind: "p", text: "A site that presents information is one kind of project. A site where somebody logs in, pays, books, uploads, or gets an email is a different kind, because now there is a database, there is money or personal data involved, and there are failure states that have to be designed as carefully as the success ones. The gap between the two is the single largest step in cost, and it is often introduced late with the words \"and can users also…\"." },

      { kind: "h3", text: "Who writes it?" },
      { kind: "p", text: "Copy is the most commonly under-budgeted line in any website project. If the answer is \"we will send you the text\", ask internally who is actually going to sit down and write it, and by when. If nobody can name that person, the honest plan is to buy the writing, and the project is that much bigger. That is not an upsell; it is the difference between a site that launches and one that waits." },

      { kind: "h3", text: "Whose photographs are they?" },
      { kind: "p", text: "Images from a search engine are not yours. Stock is legitimate and often the right call, but it has a cost and a licence, and it makes a Nigerian business look like every other business using the same library. A short shoot of real people and real premises is frequently cheaper than a year of stock subscriptions and always more convincing." },

      { kind: "h3", text: "Who is going to change it afterwards?" },
      { kind: "p", text: "If somebody in your office needs to add a post, a product or a price without calling anyone, that is a content management system and it has to be planned for. If the site genuinely changes twice a year, a CMS can be an expensive way to solve a problem you do not have. Both answers are fine. Deciding after launch is what costs." },

      { kind: "h2", text: "Where the money goes that nobody mentions" },
      { kind: "list", items: [
        "A domain, annually. Small, but it must be registered to YOU, not to whoever built the site.",
        "Hosting, monthly or annually, and it varies enormously with what the site does.",
        "An email address on your own domain, which is not the same thing as hosting and is what makes you look like a company rather than a person with a free inbox.",
        "An SSL certificate, which should be included and free; if someone is billing you separately for one, ask why.",
        "Maintenance. Things that are connected to the internet need updating. A site nobody has touched in two years is not saving money, it is accruing a bill.",
      ] },

      { kind: "callout", title: "The one line to keep in your own name", text: "Your domain and your hosting account should be registered to your business, with your email as the owner. Agencies come and go. Losing control of a domain is the single most expensive thing that happens to small businesses online, and it is entirely preventable at the start." },

      { kind: "h2", text: "How to compare two quotes that look nothing alike" },
      { kind: "p", text: "Quotes are hard to compare because they describe different scopes in different language. Four questions make them comparable in about ten minutes." },
      { kind: "list", items: [
        "What is explicitly NOT included? The answer is more informative than the inclusions list.",
        "Who owns the finished work, the domain, the hosting account and the source files?",
        "What happens after launch, for how long, and at what price?",
        "How many rounds of changes are included, and what counts as a round?",
      ] },
      { kind: "p", text: "If one quote is dramatically lower, it is usually not the same job. Often it is a template with your logo placed on it, which is a legitimate product at a legitimate price. But you should know that is what you are buying, because it is a different thing from a site designed around what your business actually has to say." },

      { kind: "h2", text: "How to spend less without getting less" },
      { kind: "p", text: "There are real ways to reduce the number, and they are all about scope rather than about quality." },
      { kind: "list", items: [
        "Launch smaller. Four pages that are finished beat twelve that are nearly finished. The rest can follow once there is traffic telling you what people actually want.",
        "Have the content ready. This genuinely shortens projects, because most delay is waiting.",
        "Reuse layouts deliberately rather than designing each page.",
        "Defer the parts that only matter at scale. A booking system for four bookings a month is a form and a calendar invite.",
      ] },
      { kind: "p", text: "What does not work is cutting testing, cutting mobile, or cutting the writing. Those are the parts a visitor experiences directly." },

      { kind: "h2", text: "The honest version" },
      { kind: "p", text: "A serious quote should be boring to read: a list of what is being made, what is not, who does what, when, and what it costs to keep. If you cannot tell from a proposal what you will actually have on launch day, that is the problem to solve before the price is." },
      { kind: "p", text: "Tell us what the site has to achieve rather than how many pages you think it needs, and we will tell you what that takes, including when the answer is less than you expected." },
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
      { kind: "p", text: "A growing share of the questions that used to be typed into a search box are now put to an assistant instead. The person does not get ten blue links and choose one. They get an answer, sometimes with two or three sources beside it, and for most questions that is where it ends." },
      { kind: "p", text: "That changes what being findable means. Ranking is about being one of the options on a page. Being cited is about being the source an answer was built from. The good news is that the work overlaps more than the panic suggests." },

      { kind: "h2", text: "What has not changed" },
      { kind: "p", text: "Assistants that answer with current information are reading the live web, either through a search index or by fetching pages directly. So the foundations are the same foundations, and a site that fails them fails both audiences at once:" },
      { kind: "list", items: [
        "The page must be reachable. Not blocked in robots.txt, not behind a login, not noindexed by accident.",
        "The content must be in the HTML. Text that only appears after JavaScript runs is a gamble: some crawlers execute it, many fetchers do not.",
        "The page must be fast and must not fail. A fetcher that times out simply moves on to the next source.",
        "It must be clear what the page is about, from the title, the headings and the first paragraph.",
      ] },
      { kind: "p", text: "Most sites that worry about AI visibility have an ordinary technical problem, not a novel one." },

      { kind: "h2", text: "What is genuinely different" },

      { kind: "h3", text: "Answers are extracted, not summarised in your voice" },
      { kind: "p", text: "A model lifts the bit that answers the question. Content built as a slow argument that only pays off in the last paragraph gives it nothing to lift. Content that states the answer plainly and then explains it gives it something obvious to quote." },
      { kind: "p", text: "This is not a trick. It is the same structure that works for a human skimming on a phone, which is why it is safe to adopt even if you think the whole thing is overblown." },

      { kind: "h3", text: "Specificity is what gets cited" },
      { kind: "p", text: "Generic pages are interchangeable, and an assistant choosing between interchangeable sources has no reason to pick yours. What gets picked is the page with something the others do not have: a real constraint, a real number you can stand behind, an actual procedure, a named place, a caveat nobody else mentions." },
      { kind: "p", text: "\"We build fast, beautiful websites\" is present on ten thousand pages. \"On a prepaid mobile bundle in Lagos, a four megabyte homepage costs the visitor money before they have read a word\" is present on one, and it is the kind of sentence that ends up inside an answer." },

      { kind: "h3", text: "Entities matter more than keywords" },
      { kind: "p", text: "These systems reason about things (a company, a place, a service, a person) and about how confident they are that those things are real and consistent. Which means the boring consistency work pays off more than it used to: the same business name, address and phone number everywhere; structured data that truthfully describes what is visible on the page; an About page that states plainly who you are, where you are and what you do." },

      { kind: "h2", text: "Things that do not work" },
      { kind: "list", items: [
        "Stuffing pages with phrases you imagine a model wants. It reads badly to people, and the systems are trained on enough of the web to recognise it.",
        "Publishing volume for its own sake. Thin pages dilute the site that hosts them.",
        "Treating llms.txt as a ranking lever. It is an experimental proposal, not a standard, and no major product has committed to reading it. Publish one if you like; do not do it instead of the real work.",
        "Faking structured data. Marking up reviews or prices a page does not show is how a site loses rich results altogether.",
      ] },

      { kind: "h2", text: "A practical checklist" },
      { kind: "list", items: [
        "One clear question answered per page, stated near the top.",
        "Headings that are the questions people actually ask, phrased the way they ask them.",
        "A short, direct answer under each heading, before the reasoning.",
        "At least one thing on the page nobody else can say: your own data, your own constraint, your own method.",
        "Structured data that describes exactly what a reader can see, and nothing else.",
        "Consistent business details across the site and every listing you control.",
        "A dated page, updated when it stops being true.",
      ] },

      { kind: "callout", title: "You can decide who fetches you", text: "Search crawlers, AI training crawlers and user-directed fetchers are different agents with different names, and they can be allowed or blocked separately in robots.txt. Blocking one does not block the others. Look up the current names in each vendor's own documentation rather than copying a blocklist from a blog post. They change, and a stale rule can quietly remove you from somewhere you wanted to be." },

      { kind: "h2", text: "How to tell whether any of it is working" },
      { kind: "p", text: "Assistants do not send a referrer the way a search engine does, so traffic from them is harder to attribute and often lands in your analytics as direct. Two things are more reliable than guessing." },
      { kind: "list", items: [
        "Ask the assistants your customers use the questions your customers ask, on a schedule, and record whether you appear and what is said about you. It is manual, and it is the only direct measurement available.",
        "Watch for the shift in what people say when they arrive. Enquiries that open with a fact about you that was not on the page they landed on usually came through an answer somewhere else.",
      ] },
      { kind: "p", text: "The strategic point is simpler than the tactics. Being quotable and being useful have become the same project. A page written so a person gets their answer quickly is also the page a machine can lift from. And if the machines change again next year, you are still left with a page that serves the reader." },
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
      { kind: "p", text: "A sixty-page brand book is a beautiful thing to receive and a difficult thing to use. It arrives as a PDF, it gets saved somewhere, and six months later a staff member making a flyer at short notice opens PowerPoint instead and picks a blue that looks about right." },
      { kind: "p", text: "The point of guidelines is not to document the brand. It is to make the right choice the easy choice for somebody in a hurry who is not a designer. That is a much shorter document." },

      { kind: "h2", text: "What has to be in it" },

      { kind: "h3", text: "The logo, and the three things people get wrong" },
      { kind: "p", text: "Not a gallery of variations. The one primary mark, plus whichever alternates genuinely exist: usually a horizontal version, a stacked version, and an icon-only version for a profile picture. Then, explicitly:" },
      { kind: "list", items: [
        "How small it may go before it stops reading. Give a number in millimetres for print and pixels for screen.",
        "How much clear space must be around it, expressed as a proportion of the mark itself so it scales.",
        "Which versions to use on which backgrounds: light, dark, and busy photography.",
      ] },
      { kind: "p", text: "Then a short list of what not to do, with pictures: do not stretch it, do not recolour it, do not add a drop shadow, do not put the full-colour version on a photograph. People need to see the wrong version to recognise it." },

      { kind: "h3", text: "Colours, with the codes people actually paste" },
      { kind: "p", text: "Every colour needs its HEX for screens, its RGB, its CMYK for print and, if anything is ever printed on merchandise or signage, a Pantone reference. A guideline that gives only a swatch and a name guarantees that somebody eyedroppers it from a JPEG and gets it slightly wrong forever." },
      { kind: "p", text: "Say which colour is primary, which are secondary, and roughly in what proportion they should appear. \"These are our colours\" without a hierarchy produces documents where the accent is doing all the work." },
      { kind: "callout", title: "The line most guidelines miss", text: "Say which colour the text goes on each background, and check it. Bright colours are the trap: white type on a bright orange fill is a common default and usually fails accessibility outright, while black on the same orange passes comfortably. Decide it once, write it down, and nobody has to guess." },

      { kind: "h3", text: "Type, and what to do when it is not available" },
      { kind: "p", text: "Name the fonts, name the weights that are actually used, and say what each is for: headings, body, labels. Two families is usually plenty; three is a system somebody will break." },
      { kind: "p", text: "Then answer the question that always comes up: what do we use in Word, in Google Docs, in an email signature, on a phone, when the licensed font is not installed? A named fallback prevents a document going out in whatever the software defaulted to." },

      { kind: "h3", text: "How you sound" },
      { kind: "p", text: "Three or four lines is enough, and examples beat adjectives. \"Direct, warm, never salesy\" tells a person almost nothing. A short before-and-after (the sentence as somebody would naturally write it, and the same sentence in your voice) teaches it in one read." },
      { kind: "p", text: "Add the small mechanical decisions that otherwise get argued about repeatedly: how the company name is written, whether you use an ampersand, whether headings take a full stop, how prices and dates are formatted." },

      { kind: "h3", text: "What it looks like applied" },
      { kind: "p", text: "This is the part people actually copy from. Show the real things: a social post, a letterhead, an invoice, a business card, a profile picture, a vehicle or a shopfront if that is relevant. Applied examples do more to hold a brand together than any amount of rationale." },

      { kind: "h2", text: "What can wait" },
      { kind: "list", items: [
        "The story of how the logo was conceived. Interesting once, referenced never.",
        "Mood boards and territory exploration. That is presentation material from the project, not a working reference.",
        "Exhaustive rules for surfaces you do not have. Write the billboard guidance when there is a billboard.",
        "Anything expressed only in prose. If a rule cannot be shown as a picture or a code, it will not be followed.",
      ] },

      { kind: "h2", text: "The format matters as much as the contents" },
      { kind: "p", text: "A PDF is fine as a reference, but on its own it fails the moment somebody needs a file. What actually keeps a brand consistent is a shared folder that anyone who makes anything can reach, containing the logo in every format they will need (vector for print and scaling, PNG with transparency for screens, a square version for profile pictures), plus the fonts, plus editable templates for the two or three things your team makes most often." },
      { kind: "p", text: "If somebody can get the right logo and the right template in under a minute, they will. If they have to ask, they will improvise. Almost every inconsistency traces back to that minute." },

      { kind: "h2", text: "How long should it be?" },
      { kind: "p", text: "For most small and growing businesses, the useful document is a handful of pages: the logo and its rules, the colours with codes, the type with fallbacks, the voice with examples, and a page of applied work. Everything else is either project archive or a problem you have not got yet." },
      { kind: "p", text: "A short guideline that gets followed is worth more than a thorough one that gets saved." },
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
      { kind: "p", text: "A site that opens instantly on the laptop it was built on can be close to unusable on a phone on mobile data. Nothing is broken. The site is simply being judged by a different machine on a different connection, and it was never tested there." },
      { kind: "p", text: "This is what actually makes that difference, roughly in order of how much it matters." },

      { kind: "h2", text: "Images, and it is not close" },
      { kind: "p", text: "On most sites, images are the majority of what gets downloaded. A photograph straight off a phone or a camera can be several megabytes. Dropped into a page and displayed at a quarter of its size, every one of those bytes still travels down the wire first." },
      { kind: "p", text: "Three things fix nearly all of it:" },
      { kind: "list", items: [
        "Serve the size that is actually displayed. A picture drawn 400 pixels wide should not arrive 4,000 pixels wide.",
        "Serve a modern format. AVIF and WebP are typically far smaller than JPEG and PNG at the same visible quality, and browsers that cannot read them can be sent the old format automatically.",
        "Do not load what has not been reached. Images below the fold can wait until the reader scrolls toward them.",
      ] },
      { kind: "p", text: "The trap is that all of this is invisible on a fast connection. The page looks identical. Only the bill and the waiting change." },

      { kind: "h2", text: "What that weight costs a Nigerian visitor" },
      { kind: "p", text: "This is the part that rarely gets said out loud: on prepaid mobile data, page weight is money. A visitor on a metered bundle pays, in cash, for every megabyte a page decides to send them. A heavy homepage is not just slow. It is a page that charges people to look at it." },
      { kind: "p", text: "It is worth working out your own number once. Take your homepage's total weight, multiply by what a gigabyte costs on a common local bundle, and you have the price of a single visit. Most people are surprised, and most people fix their images that afternoon." },

      { kind: "h2", text: "Fonts" },
      { kind: "p", text: "Custom fonts are downloaded before text can be drawn in them. Loaded carelessly, they produce either a blank space where the words should be or a flash of one typeface replaced by another. Either way the reader is waiting on a decoration." },
      { kind: "list", items: [
        "Load only the weights you actually use. Four weights of one family is often three more than the design needs.",
        "Host them yourself rather than fetching from a third party, which removes a DNS lookup and a connection to somebody else's server.",
        "Tell the browser to show the text immediately in a fallback and swap when the font arrives, so words are never invisible.",
      ] },

      { kind: "h2", text: "Third-party scripts" },
      { kind: "p", text: "Chat widgets, analytics, heat maps, cookie banners, ad pixels, review badges. Each one is a request to a server you do not control, running code you did not write, on the same thread that is trying to draw your page. They are also the part of a site that grows quietly: nobody ever removes one." },
      { kind: "p", text: "Two habits help. Audit them once a year and delete what nobody reads. And where something is genuinely wanted but not urgent (a chat widget, for instance), load it when the visitor reaches for it rather than on arrival, so the people who never use it never pay for it." },

      { kind: "h2", text: "The thing that annoys people most is not slowness" },
      { kind: "p", text: "It is movement. You go to tap a link, an image finishes loading above it, the page jumps, and you tap an advert instead. That is a layout shift, and it happens whenever something arrives without its space being reserved in advance." },
      { kind: "p", text: "The fix is unglamorous: every image gets its dimensions declared so the gap exists before the picture does; anything that loads late (a banner, an embed, a font swap) is given its final height up front. It costs nothing and it is the single most noticeable improvement a slow site can make." },

      { kind: "h2", text: "How to measure it honestly" },
      { kind: "p", text: "Testing on your own laptop on office wifi tells you almost nothing about the visitor you are worried about. Three ways to get a real answer:" },
      { kind: "list", items: [
        "Run PageSpeed Insights on the live URL and read the MOBILE tab. The three numbers that matter are how long the largest thing takes to appear, how much the page moves while loading, and how long it is unresponsive to taps.",
        "In your browser's developer tools, throttle the network and the processor together. A phone is not just a slower connection, it is a slower computer, and testing only the network hides half the problem.",
        "Open the site on an actual mid-range Android phone on mobile data, away from the office. Nothing substitutes for this.",
      ] },
      { kind: "callout", title: "Field data beats lab data", text: "A score from a testing tool is one run on one simulated device. If your site has real traffic, the report will also show what actual visitors experienced over the past month. Where the two disagree, the real visitors are right." },

      { kind: "h2", text: "The order to fix things in" },
      { kind: "p", text: "Most sites do not need a rebuild. They need four afternoons, in this order:" },
      { kind: "list", items: [
        "Resize and re-encode every image, and lazy-load the ones below the fold.",
        "Declare dimensions on everything so the page stops moving.",
        "Cut the third-party scripts nobody looks at, and defer the ones that can wait.",
        "Trim the fonts to what is used.",
      ] },
      { kind: "p", text: "That sequence costs very little and usually accounts for most of the difference. If the site is still slow afterwards, the problem is architectural, and that is a genuinely different conversation. But it is worth being certain you are having it for the right reason." },
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
      { kind: "p", text: "The honest answer is usually a website first, and we say so often enough that it is worth writing down why, along with the cases where it is genuinely wrong." },
      { kind: "p", text: "The question is rarely about technology. It is about whether you have earned a place on somebody's home screen, because that is what an app is asking for." },

      { kind: "h2", text: "The thing people underestimate: getting it installed" },
      { kind: "p", text: "A website is a link. You put it in a bio, a message, an invoice, a poster, an advert, and the person is on it in a second. An app requires them to go to a store, search, choose the right one among similarly named results, wait for a download on their data, open it, and usually create an account before they see anything." },
      { kind: "p", text: "Every one of those steps loses people, and the losses compound. For a business whose customers do not yet know them, this is usually the whole argument. You cannot acquire customers through a channel they have to commit to before they can look." },

      { kind: "h2", text: "What an app genuinely gives you" },
      { kind: "p", text: "There are real capabilities here, and if you need them, nothing else will do." },
      { kind: "list", items: [
        "Notifications people actually receive. Web push exists and works on Android, but on iPhones it requires the site to be added to the home screen first, which most people never do. If your model depends on reaching someone who is not currently thinking about you, that is an app argument.",
        "Working offline, properly. A website can cache a great deal, but an app that must function with no signal for an hour (a field survey, a delivery route, a stock count) is on firmer ground.",
        "Deep access to the device. Continuous background location, Bluetooth peripherals, sustained camera work, biometric storage.",
        "Being on the home screen. If someone opens you several times a week, an icon is worth real money. If they open you twice a year, it is an icon they will delete.",
      ] },

      { kind: "h2", text: "What an app costs that nobody mentions in the first meeting" },
      { kind: "list", items: [
        "Two platforms. Even sharing a codebase, iOS and Android differ in behaviour, review and hardware. Testing is not halved.",
        "Store review. Every release is inspected by somebody else, on their schedule. A critical bug on a website is fixed in minutes; in an app it is fixed when it is approved.",
        "Developer accounts, annually, and Apple's requires a Mac in the build chain.",
        "Old versions living forever. Some users will not update, so your server has to keep speaking to the app you shipped two years ago.",
        "Store presence as a discipline: screenshots, descriptions, ratings, replies to reviews.",
      ] },
      { kind: "p", text: "The build is the smaller half. Everything above is permanent." },

      { kind: "h2", text: "The middle option most people have not considered" },
      { kind: "p", text: "A website can be installable. It can sit on the home screen with its own icon, open without browser chrome, work offline for what it has already seen, and on Android send push notifications. It is one codebase, one deployment, no store review, and it is a link, so it can still be shared." },
      { kind: "p", text: "It is not a complete substitute. iOS restricts it in ways that matter, notably around notifications and background work, and the install prompt is far less obvious. But for a large class of products (a portal, a dashboard, a booking tool, an internal system), it delivers most of what people wanted an app for, at a fraction of the cost and none of the release friction." },

      { kind: "h2", text: "Four questions that usually settle it" },
      { kind: "list", items: [
        "How often does one person use this? Several times a week points to an app. Occasionally points to the web.",
        "Do you need to reach them when they are not thinking about you? If yes, and iPhone users matter, that is the strongest app argument there is.",
        "Does it have to work with no signal? Genuinely, not theoretically.",
        "How will people find it in the first year? If the answer is advertising, search or word of mouth, they need to be able to look before they commit.",
      ] },
      { kind: "p", text: "If none of those points to an app, an app will probably be built, launched, and then quietly carried as a cost." },

      { kind: "callout", title: "The sequence that usually works", text: "Build the web version, get it in front of real users, and find out which parts they use constantly. Those parts are the app, and by then you will know what it should do instead of guessing. Starting with the app means designing for a usage pattern nobody has demonstrated yet." },

      { kind: "h2", text: "When we say build the app" },
      { kind: "p", text: "When the product is used daily and notifications are the product: logistics, dispatch, field teams, anything where somebody is told to do something and must act. When the hardware is the point. When offline is a requirement rather than a nice-to-have. And when there is already a web product with usage data proving people come back." },
      { kind: "p", text: "What we push back on is an app commissioned to look serious. That is an expensive way to look serious, and the version of it that gets built without a real usage case tends to launch to an empty store page." },
      { kind: "p", text: "Tell us what has to happen and how often, and we will tell you which of the three this is, including when the answer is the cheapest one." },
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
      { kind: "p", text: "Design projects rarely run late because the design is hard. They run late waiting for something only the client has. Nobody is being difficult. The things are scattered across a phone, an old laptop, a former employee's email and a printer who still has the file from 2019." },
      { kind: "p", text: "This is that list, so it can be gathered before the clock starts rather than during it." },

      { kind: "h2", text: "The five things" },

      { kind: "h3", text: "1. Your logo, in the file it was made in" },
      { kind: "p", text: "What is needed is the vector original: an .ai, .eps, .svg or a layered .pdf. That is the version that can be scaled to a building or shrunk to a favicon without softening, recoloured for a dark background, and separated for print." },
      { kind: "p", text: "A PNG, a JPEG or a screenshot from your own website is not that. It can be traced, and tracing is a real job that adds days and never comes back quite the same. If the original is genuinely gone, say so at the start. It changes the plan, and it is far better handled in week one than discovered in week four when something has to go to print." },
      { kind: "p", text: "While you are looking: the font files, if the logo uses type, and anyone's old brand guideline even if you think it is out of date." },

      { kind: "h3", text: "2. The real words" },
      { kind: "p", text: "Placeholder copy hides every layout problem until the worst possible moment. A heading that is three words in the mock-up and eleven in reality breaks the design it was approved in, and it always surfaces at the point where changing it is most expensive." },
      { kind: "p", text: "It does not have to be polished. A rough, honest paragraph of the actual message is far more useful than lorem ipsum or a beautifully written sentence that says nothing. If writing it is the bottleneck (and it usually is), say so, because buying the writing is a normal part of the work and a completely different project plan from one where the words already exist." },

      { kind: "h3", text: "3. Photographs, at full size" },
      { kind: "p", text: "Originals, not the copies that came back through WhatsApp. Messaging apps compress images heavily, and a picture that looks fine on a phone falls apart across a page." },
      { kind: "p", text: "If the photographs do not exist, decide early which it is: buy stock, book a shoot, or design around not having them. All three are workable. What does not work is assuming pictures will turn up later, because the layout has to be designed around something." },
      { kind: "p", text: "And be clear about rights. Images taken from a search engine are not yours to publish, and that is a problem that surfaces after launch rather than before." },

      { kind: "h3", text: "4. One name who signs it off" },
      { kind: "p", text: "One. Two is a negotiation; three is a delay. Other people can and should have opinions, but somebody has to be the person who collects them and says yes." },
      { kind: "p", text: "This is the one that catches everyone. A project with an unclear approver does not get slower gradually. It stops at the first real decision and waits. Deciding it in the first week costs nothing and saves the most." },

      { kind: "h3", text: "5. The things that cannot change" },
      { kind: "p", text: "Every business has a few, and they are invisible to anyone outside it until they are violated. A legal disclaimer that must appear. A tagline a director is attached to. A colour a parent company insists on. A regulator's mark with its own placement rules. A name that must never be abbreviated." },
      { kind: "p", text: "None of these are a problem when they are known up front. All of them are expensive when they arrive as feedback on a finished design." },

      { kind: "h2", text: "Worth adding if you have it" },
      { kind: "list", items: [
        "Access, rather than a promise of access: the domain registrar, the hosting, the social accounts, the analytics. Chasing a login from a former employee is a common and entirely avoidable delay.",
        "Two or three competitors or brands you admire, with one line each on WHY. The reason is the useful part.",
        "Anything you have already tried that did not work, so it is not proposed again.",
        "Your real deadline and what it is attached to: an event, a season, a launch. A date with a reason behind it gets planned around properly.",
      ] },

      { kind: "callout", title: "If you do not have all of it", text: "Send what you have and name what is missing. A project that starts with a known gap can be sequenced around it. A project that starts with an assumed asset stops dead the week that assumption fails, which is always later and always more expensive." },

      { kind: "h2", text: "Why this list is short" },
      { kind: "p", text: "These five are not the only inputs to good work, but they are the ones that, when absent, stop everything else. Most of what makes a project run well is decided before any design exists, and this is the part of it that is entirely in your hands." },
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
/* Words in a string, counted the way a person would.

   `"".split(/\s+/)` is `[""]`, which is ONE word, and a string with a leading
   space gets a phantom empty element at the front. Neither mattered while the
   posts were 113-205 word excerpts; both are trivially avoidable. */
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * REVISITED AGAINST THE REAL POSTS, 2026-09-14, which is the first time there
 * have been real posts to revisit it against.
 *
 * When this was written the six posts ran 113 to 205 words, so the estimate
 * said "1 minute" for every one of them and the rate behind it was never
 * tested. Rewritten, they run 800 to 1,148 words (mean 924), which at 200
 * words a minute gives 4 to 6 minutes. Spot-checked against the rendered
 * pages: the figures are plausible and they order the posts correctly, with
 * the Nigeria costs piece longest and the designer handover piece shortest.
 *
 * WHY 200 STAYS, rather than the measured figure. The best available number
 * for adult silent reading of English non-fiction is about 238 words a minute
 * (Brysbaert's 2019 meta-analysis of 190 studies); Medium famously uses 265.
 * At 238 these posts would read 4 to 5 minutes rather than 4 to 6.
 *
 * 200 is therefore a deliberate ~19% cushion, and the asymmetry is the reason
 * to keep it: this number exists so somebody can decide whether they have time
 * right now. Promising six minutes and taking five is a pleasant surprise.
 * Promising four and taking six is the reader feeling misled, on the one
 * signal we gave them. The error is cheap in one direction and not the other.
 *
 * `ceil` with a floor of one, so nothing ever reads "0 min".
 */
export function readingMinutes(post: BlogPost): number {
  const words = post.body.reduce((n, block) => {
    if (block.kind === "list") return n + countWords(block.items.join(" "));
    if (block.kind === "callout") return n + countWords(`${block.title} ${block.text}`);
    return n + countWords(block.text);
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
