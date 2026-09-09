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
    a: "Yes. We manage hundreds of client accounts and work with every budget. Tell us what you are working with and we will tell you honestly what it does and does not cover, rather than quoting for something you do not need yet.",
  },
  {
    q: "How does a project start?",
    a: "With a call about the outcome you want, not a list of features. We map what the work has to achieve, agree the scope, then design and build against it. You are included at every step rather than shown a finished thing at the end.",
  },
  {
    q: "Can you take on just one part of a project?",
    a: "Yes. Plenty of clients come to us for one discipline, most often design or SEO, and add the rest once it is working. We would rather do one part properly than take the whole thing and stretch it thin.",
  },
  {
    q: "Do you build with AI?",
    a: "Where it earns its place. We integrate AI and LLM features into products when they solve a real business problem, and we say so plainly when they would not. The engineering is built around the outcome, not around the technology.",
  },
  {
    q: "Where are you based, and who can you work with?",
    a: "We work with brands wherever they are. Everything after the first conversation works well remotely, and our clients run across Nigeria and beyond. You can reach us at info@wedigcreativity.com.ng.",
  },
];
