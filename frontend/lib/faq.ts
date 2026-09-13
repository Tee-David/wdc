/**
 * FAQ shown on /preview and fed to the FAQPage JSON-LD.
 *
 * Drafted from what the site already says about itself — the PRD, llms.txt and
 * the page metadata — rather than inventing new claims. Nothing here promises a
 * price or a turnaround that WDC has not already published.
 */
import type { ServiceSlug } from "@/lib/services";

export type Faq = {
  q: string;
  a: string;
  /** Which services this question belongs to. OMITTED MEANS EVERY SERVICE:
      "how does a project start" is the same answer whichever one you came
      for, and duplicating it six times would be six places to forget. */
  services?: ServiceSlug[];
};

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
    services: ["software", "apps"],
  },
  {
    q: "Where are you based, and who can you work with?",
    a: "We work with brands wherever they are. Everything after the first conversation works well remotely, and our clients run across Nigeria and beyond. You can reach us at info@wedigcreativity.com.ng.",
  },
  {
    q: "What do you build with?",
    a: "On the web, Next.js and React with TypeScript, custom or CMS-driven, WordPress included. On mobile, Flutter, React Native, Swift, Kotlin and C#, delivered to the App Store and Play Store. Behind them, SQL and NoSQL databases, APIs and Rust or Go services on Google Cloud, Azure, Oracle Cloud or AWS. We pick the stack the work needs, not the one we feel like using.",
    services: ["web", "software", "apps"],
  },
  {
    q: "What happens after launch?",
    a: "Launch is the start of the work, not the end of it. We stay on for maintenance, continuous SEO optimisation and performance care, and for apps and products that keep shipping updates. If you would rather take it in-house, we hand it over properly documented.",
  },
  {
    q: "Can you help us get found by ChatGPT and other AI tools?",
    a: "Yes. AI visibility is part of how we do SEO now, alongside keyword research, technical SEO, competitor analysis, Google Business Profile and Search Console. We optimise brands to be found and cited by LLMs like ChatGPT, Claude and Gemini, not just ranked on a results page.",
    services: ["seo"],
  },
  {
    q: "Do you run social accounts and paid ads too?",
    a: "Yes. Organic growth and follower campaigns, day-to-day account management across Facebook, Instagram, X, WhatsApp, TikTok and LinkedIn, automations and auto-replies, paid ads and content calendars, with reporting that keeps you in the loop rather than in the dark.",
    services: ["social"],
  },

  /* ONE PER SERVICE THAT HAD NONE OF ITS OWN, AND A SECOND WHERE THE BUYER
     ASKS TWO THINGS. Counted before writing these: branding had ZERO questions
     tagged to it, so its page was showing five general ones and answering
     nothing a buyer of branding specifically walks in holding. seo, web and
     social had one each.

     Every answer below is drawn from what `lib/services.ts` already says this
     studio does, the same rule the file opened with. No price, no turnaround
     and no capability that is not already published elsewhere on the site. */
  {
    q: "Do we get the original logo files, or just images?",
    a: "The originals, in the formats that keep working. A brand built here is handed over as a system rather than a single lockup: the vector artwork that can be scaled to a building or shrunk to a favicon, the versions for light, dark and busy backgrounds, and the type and colour that go with them. If you later work with someone else, you are not starting again.",
    services: ["branding"],
  },
  {
    q: "We already have a logo. Can you work with it?",
    a: "Usually, and the first thing we will tell you is which it should be. Sometimes the mark is fine and what is missing is the system around it, the type, the colour, the layouts and the rules for using them. Sometimes the mark itself is the problem. We work out what the brand has to say before drawing anything, which is the step that answers this honestly rather than by selling you a redesign.",
    services: ["branding"],
  },
  {
    q: "How long before SEO actually shows results?",
    a: "Honestly, longer than anyone selling it usually admits, and it depends on what is wrong. Technical faults that stop a site being read can be fixed quickly and often move things within weeks. Earning rankings on competitive terms is content and authority work measured in months. We start with an audit and a crawl so you are told which of the two you are looking at before committing.",
    services: ["seo"],
  },
  {
    q: "Will we be able to update the site ourselves?",
    a: "If you need to, yes, and we will ask that question before deciding the architecture rather than after. If someone in your office has to add a post, a product or a price without calling anyone, that is a CMS and it gets planned for. If the site genuinely changes twice a year, a CMS can be an expensive answer to a problem you do not have. Both are fine; deciding after launch is what costs.",
    services: ["web"],
  },
  {
    q: "Do you handle the writing and the photography?",
    a: "The writing, yes, and it is worth budgeting for rather than assuming. Copy is the most commonly under-budgeted part of a website, and a project waiting on words nobody has time to write is the most common reason one stalls. For images we will tell you plainly whether a shoot, stock or what you already have is the right call, and what each one means for the result.",
    services: ["web", "branding"],
  },
  {
    q: "Do you keep running the accounts, or set them up and leave?",
    a: "Either, and we would rather you chose deliberately. We run day-to-day management, the content calendar, the automations that catch enquiries out of hours and the paid campaigns, with reporting on what it actually did. If you would rather your own team ran it, we set it up and hand it over properly instead of leaving you with a login and a guess.",
    services: ["social"],
  },
];

/**
 * The questions to show on one service's page: the ones tagged to it, plus
 * every untagged one, which applies to all six.
 *
 * Capped, because a service page is not the FAQ page. The general questions
 * are already on /contact in full; here they are the two or three a buyer of
 * THIS service is most likely to be holding, and the specific ones come first
 * because they are why this list is on this page at all.
 */
export function faqsFor(slug: ServiceSlug, limit = 5): Faq[] {
  const mine = FAQS.filter((f) => f.services?.includes(slug));
  const general = FAQS.filter((f) => !f.services);
  return [...mine, ...general].slice(0, limit);
}
