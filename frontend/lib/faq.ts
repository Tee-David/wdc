/**
 * FAQ shown on /preview and fed to the FAQPage JSON-LD.
 *
 * Drafted from what the site already says about itself — the PRD, llms.txt and
 * the page metadata — rather than inventing new claims. Nothing here promises a
 * price or a turnaround that WDC has not already published.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "What does WDC actually do?",
    a: "Branding and design, SEO, full-stack web development, cross-platform app development, software engineering with AI, and social media and PPC. The point of keeping them under one roof is that there are no hand-off gaps between the people who design a thing and the people who build it.",
  },
  {
    q: "Do you work with smaller budgets?",
    /* NO HEADCOUNT FIGURE HERE. This said "we manage hundreds of client
       accounts", which nothing on the site evidences and which sits a scroll
       away from a portfolio naming fifteen projects. A reader who notices that
       gap discounts everything else on the page, and the sentence was not
       carrying the answer anyway -- the answer is the offer to be told the
       truth about what a budget buys. */
    a: "Yes, and we would rather you asked than assumed. Tell us what you are working with and we will tell you honestly what it does and does not cover, rather than quoting for something you do not need yet.",
  },
  {
    q: "How does a project start?",
    a: "With a call about the outcome you want, not a list of features. We map what the work has to achieve, agree the scope, then design and build against it. You are included at every step rather than shown a finished thing at the end.",
  },
  {
    q: "Can you take on just one part of a project?",
    a: "Yes, and we can take all of it. Plenty of clients come to us for one discipline, most often design or SEO, and add the rest once it is working; plenty of others hand us the brand, the site, the app and the campaigns together. That is the point of keeping all six services under one roof, and it is when the work is at its best, because nothing is lost between the people who design a thing and the people who build it.",
  },
  {
    q: "Do you build with AI?",
    a: "Where it earns its place. We integrate AI and LLM features into products when they solve a real business problem, and we say so plainly when they would not. The engineering is built around the outcome, not around the technology.",
  },
  {
    q: "Where are you based, and who can you work with?",
    a: "We work with brands wherever they are. Everything after the first conversation works well remotely, and our clients run across Nigeria and beyond. You can reach us at info@wedigcreativity.com.ng.",
  },
  {
    q: "What do you build with?",
    a: "On the web, Next.js and React with TypeScript, custom or CMS-driven, WordPress included. On mobile, Flutter, React Native, Swift, Kotlin and C#, delivered to the App Store and Play Store. Behind them, SQL and NoSQL databases, APIs and Rust or Go services on Google Cloud, Azure, Oracle Cloud or AWS. We pick the stack the work needs, not the one we feel like using.",
  },
  {
    q: "What happens after launch?",
    a: "Launch is the start of the work, not the end of it. We stay on for maintenance, continuous SEO optimisation and performance care, and for apps and products that keep shipping updates. If you would rather take it in-house, we hand it over properly documented.",
  },
  {
    q: "Can you help us get found by ChatGPT and other AI tools?",
    a: "Yes. AI visibility is part of how we do SEO now, alongside keyword research, technical SEO, competitor analysis, Google Business Profile and Search Console. We optimise brands to be found and cited by LLMs like ChatGPT, Claude and Gemini, not just ranked on a results page.",
  },
  {
    q: "Do you run social accounts and paid ads too?",
    a: "Yes. Organic growth and follower campaigns, day-to-day account management across Facebook, Instagram, X, WhatsApp, TikTok and LinkedIn, automations and auto-replies, paid ads and content calendars, with reporting that keeps you in the loop rather than in the dark.",
  },
];
