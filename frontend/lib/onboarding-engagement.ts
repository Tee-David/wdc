import type { ServiceSlug } from "./services";

/**
 * THE CLIENT ENGAGEMENT SECTION, ONE PER SERVICE (plan section 8, grouped to
 * four ticks by plans/onboarding-ux-research.md E7).
 *
 * DRAFT, AND NOT LEGAL ADVICE. This is plain words written by the studio for
 * the owner to read. An indemnity or a limit of liability only protects the
 * studio when a qualified Nigerian lawyer has fitted it to Nigerian law and to
 * the signed agreement, and a ticked box can carry less weight than a signed
 * agreement. So the section does NOT appear on the live form until BOTH are
 * true: `LAWYER_APPROVED` below is flipped by whoever commits the lawyer's
 * version, and the `ONBOARDING_ENGAGEMENT` environment variable is "on". Either
 * one missing keeps it off, and the form behaves exactly as it did.
 *
 * Why four ticks and not thirteen: reading and ticking thirteen sections on a
 * phone at the end of a form is the heaviest screen in the journey, and it
 * comes where people are tired but nearly done. Each group carries a two line
 * summary and the full words behind "Read in full", so nothing is hidden and
 * nothing is a wall.
 *
 * What is recorded when a client accepts: this text's version, the date and
 * time, and the typed full name, as plain answers (engagement_version,
 * engagement_accepted_at, engagement_name) in the existing answers JSON. No
 * schema change.
 */

export const ENGAGEMENT_VERSION = "2026-10-draft-4";

/** Flip to true only when a qualified Nigerian lawyer has approved this text. */
export const LAWYER_APPROVED = false;

/** True when the section should be shown. Server only: it reads the environment. */
export function engagementIsLive(env: Record<string, string | undefined> = process.env): boolean {
  return LAWYER_APPROVED && env.ONBOARDING_ENGAGEMENT === "on";
}

export type EngagementGroup = {
  id: "work" | "money" | "limits" | "ending";
  title: string;
  /** Two lines, always visible. */
  summary: string;
  /** The full words, behind "Read in full". One paragraph per entry. */
  body: string[];
};

const SHARED: Record<EngagementGroup["id"], Omit<EngagementGroup, "id">> = {
  work: {
    title: "What we do, and what you give us",
    summary: "We deliver the work in your quote. You give us what we need, on time, and tell us once what you want changed.",
    body: [
      "We deliver the work described in your quote and in this form. Anything outside that is new work. We will agree it in writing, with its own price and date, before we start it.",
      "You give us what we need to do the work: files, words, pictures, access and decisions. We tell you what and when. If it arrives late, the dates move by the same amount.",
      "Changes inside the agreed work are included for the number of rounds in your quote. A change that adds something new goes through the same written step as any new work.",
      "How many review meetings there are, and when the recorded handover meeting is held, depends on the kind of project and is in your agreed scope. After a handover meeting we send a handover document. Dates depend on your feedback and your approvals. One person signs work off, as you said above, so that feedback does not arrive from several directions and disagree with itself. Feedback is normally due within five working days of each review.",
    ],
  },
  money: {
    title: "Money and who owns the work",
    summary: "You pay what we agreed, and the costs that go to other companies. The work is yours once it is fully paid.",
    body: [
      "You pay the fees and deposits in your quote on the dates in it. Some costs are paid to other companies and not to us, such as domains, hosting, app store accounts, ad spend and paid tools. You pay those directly and we tell you about them before they are bought.",
      "Work is paid in stages, with a deposit to start. Money paid for work already done is not refunded, and we refund payments for stages that have not started, less costs already committed to others. The finished work becomes yours when your final payment is made. Until then we keep the rights to it. We may show the finished work in our portfolio, unless you ask us in writing not to.",
    ],
  },
  limits: {
    title: "What we cannot promise",
    summary: "We cannot promise results. You confirm that what you give us is yours to use.",
    body: [
      "We do our work carefully and we do not promise a result. Rankings, visitors, sales, ad performance and app store approval depend on people and companies we do not control.",
      "Platforms, search engines, stores and payment providers change their rules. When they do, we tell you and we adjust the work, but we are not responsible for the change.",
      "You promise that you own or may use everything you give us, such as logos, pictures, fonts, music, words and data. If somebody makes a claim about something you gave us, or about an instruction you gave us, you deal with it and cover our costs from it.",
      "If you collect information about your own customers, you are responsible for using it lawfully.",
      "Our responsibility to you for any problem is limited to the fees you paid us for the work in question, except where the law does not allow a limit. [The exact wording is to be set by the studio's lawyer.]",
    ],
  },
  ending: {
    title: "Ending the work, and the law",
    summary: "Either of us can end the work in writing. Nigerian law applies, and we talk first if we disagree.",
    body: [
      "Either of us can end the work by writing to the other. You pay for the work done up to that date and for any costs already committed to other companies.",
      "Nigerian law applies. If we disagree, we first try to settle it by talking. The full Client Engagement Policy and our Payments and Refunds Policy are on the Policies page of our website. [The steps after that are to be set by the studio's lawyer.]",
    ],
  },
};

/** Service specific terms, added to the group they belong to. */
const EXTRA: Record<ServiceSlug, Partial<Record<EngagementGroup["id"], string[]>>> = {
  branding: {
    work: ["We agree a design direction first. A logo, flyer or social design gets one revision after the final version, with no variations or new directions. A brand guide has one direction and one round of corrections. Batch and monthly jobs run to the quantity and the dates in your quote. A new batch or an extra piece is new work."],
    money: ["Fonts, pictures and music we use for you may carry licences. We tell you which ones, and you keep to them. Motion work that uses music needs a licence for that music."],
    limits: ["Checking that a name or a mark can be registered as a trademark is your responsibility. We can point you to someone who does it."],
  },
  seo: {
    work: ["Our SEO work starts at three months. You approve changes to your content before they go live. Access to your tools is arranged through each tool's own sharing settings, never by sending us a password."],
    limits: ["No one can promise a ranking, and we do not. We are not responsible for a penalty from earlier work or for changes others make to the site. Search engines and AI answer tools change how they work without warning, and we are not responsible for that."],
  },
  web: {
    work: ["A content-managed site is concluded at handover. An online shop includes up to 20 products uploaded free, and more are charged from our price list. A free review of your current site is advice. It is not a promise of results."],
    money: ["Your domain is registered in your name unless you ask otherwise. Hosting is either an account in your name or hosting we provide on the terms in our Client Engagement Policy, with regular backups up to a week old. Up to three business email addresses are included, and more are charged. Payment providers have their own terms and fees, and some setups are limited by the type of site. We tell you which."],
    limits: ["Plugins and platforms we build on belong to other companies and can change. You are responsible for the words and pictures you give us."],
  },
  apps: {
    work: ["After the first release you get up to one month of testing and review. We show you a first version, a prototype, before the full build. We do not build games, anything deceptive, or apps that need heavy hardware."],
    money: ["Unless you ask otherwise, the app store developer accounts are opened in our name, and the app can be moved to your own account on request. The stores charge their own fees and make their own decisions."],
    limits: ["App store review and rules are outside our control. We prepare each submission carefully, and we cannot promise approval. You are responsible for the data and privacy duties that come with your users' information."],
  },
  software: {
    work: ["Demos of past work happen on the discovery call. Very heavy software is outside what we take on."],
    limits: ["AI can be wrong, so a person should check anything important it produces. You set the rules for your data. Other companies' tools and APIs can change or stop, and we are not responsible for that. You are responsible for using the system lawfully."],
  },
  social: {
    work: ["Nothing is posted until you approve it, within the time you told us. We plan the calendar, schedule the posts and suggest trends."],
    money: ["Ad spend is paid to the platform and is separate from our fee. The accounts are yours, and you add us through each platform's sharing tools. We never ask for a password."],
    limits: ["We are not responsible if a platform bans, restricts, suspends or seizes an account. Platform policies and ad approvals are outside our control, and we cannot promise how ads or posts will perform. You promise you may use the content you give us."],
  },
};

const ORDER: EngagementGroup["id"][] = ["work", "money", "limits", "ending"];

export function engagementFor(service: ServiceSlug): EngagementGroup[] {
  return ORDER.map((id) => ({
    id,
    ...SHARED[id],
    body: [...SHARED[id].body, ...(EXTRA[service][id] ?? [])],
  }));
}

/** The words the client must type to accept, checked here and on the server. */
export function engagementNameProblem(name: unknown): string | null {
  if (typeof name !== "string") return "Type your full name to accept.";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? null : "Type your first and last name to accept.";
}
