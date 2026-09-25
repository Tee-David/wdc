import type { ServiceSlug } from "@/lib/services";

/**
 * The free tools, and which service page each one belongs beside.
 *
 * WHY A REGISTRY RATHER THAN MARKUP ON A PAGE. Two tools shipped at
 * `/tools/domain` and `/tools/email`, both server-rendered, both indexable,
 * both in the sitemap -- and NOTHING on the site linked to either. They were
 * reachable by typing the URL or by finding them in a search result, which is
 * the one route a visitor already on our services page will never take.
 *
 * The checklist says each tool is "linked from the matching `#slug` section".
 * A registry is how that stays true: the service page renders whatever names
 * its own slug, so the next tool is an entry here rather than an edit to a
 * page somebody has to remember to make. The three still to build -- the scope
 * estimator on `software` and `apps`, the link preview checker on `social`,
 * the SEO snapshot on `seo` -- drop in without touching any page.
 *
 * `services` is a LIST because two of the planned tools genuinely serve two
 * audiences; `href` is written out rather than derived from the slug, because a
 * route is a fact about the app and not a naming convention to be clever with.
 */
export type FreeTool = {
  slug: string;
  href: string;
  /** The question the visitor actually has, in their words. */
  title: string;
  /** What they get, and how long it takes. One sentence. */
  blurb: string;
  /** The button. A verb, because the thing is a tool and not a page. */
  action: string;
  /** For a directory like the footer, where a verb repeated down a column
   *  says less than the tool's name does. */
  short: string;
  /** lucide-react export name. PascalCase; lucide ships no lowercase exports. */
  icon: string;
  services: ServiceSlug[];
  /** Where it sits on /tools: what the visitor is trying to do. */
  group: ToolGroup;
};

/** The /tools page's sections, in order. Named for the visitor's job, not
 *  for our services, because nobody arrives thinking "I need SEO". */
export const TOOL_GROUPS = [
  { id: "plan", title: "Planning a build", lede: "Before you spend: what it costs, what it runs to, and whether the name is free." },
  { id: "found", title: "Getting found", lede: "Why a page is not showing up, not being clicked, or not being read." },
  { id: "brand", title: "Brand and reach", lede: "Colours people can read, a logo that works everywhere, and mail nobody can fake." },
] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number]["id"];

export const FREE_TOOLS: FreeTool[] = [
  {
    slug: "domain",
    href: "/tools/domain",
    title: "Is your business name still free?",
    blurb:
      "One name in, six endings out: .com, .ng, .com.ng, .africa, .app and .co. Answered from the registries' own records rather than from a DNS lookup, which is the check that calls a parked domain available.",
    action: "Check a name",
    short: "Domain checker",
    icon: "Globe",
    services: ["web"],
    group: "plan",
  },
  {
    slug: "business-name",
    href: "/tools/business-name",
    title: "Will CAC accept your business name?",
    blurb:
      "The words that need the Commission's consent and the ending your entity type has to carry, checked against section 852 of CAMA 2020 before you pay to file. It runs on your own device, so a name you have not registered yet is never sent anywhere.",
    action: "Check a name",
    short: "Business name checker",
    icon: "Building2",
    services: ["branding"],
    group: "plan",
  },
  {
    slug: "estimate",
    href: "/tools/estimate",
    title: "What will it cost to build?",
    blurb:
      "Eight questions about the shape of the project, then an indicative range in naira and dollars with the phases broken out and the assumptions named. The arithmetic runs on your device and the figure appears before we ask for anything.",
    action: "Work out a range",
    short: "Budget estimator",
    icon: "Calculator",
    services: ["software", "apps"],
    group: "plan",
  },
  {
    slug: "ai-cost",
    href: "/tools/ai-cost",
    title: "What will an AI feature cost to run?",
    blurb:
      "Volume in, naira a month out. The same feature priced across eight models from Anthropic, OpenAI and Google, with what moves the bill, and a plain word about when ordinary code is the better answer.",
    action: "Price a feature",
    short: "AI cost calculator",
    icon: "Sparkles",
    services: ["software"],
    group: "plan",
  },
  {
    slug: "seo",
    href: "/tools/seo",
    title: "Why can't anyone find your website?",
    blurb:
      "Ten things Google reads off a page: title, description, headings, indexing, canonical, sharing tags, alt text, checked in about a second, with what the page costs a Nigerian visitor in naira beside them. The full Lighthouse report follows by email.",
    action: "Check a page",
    short: "SEO snapshot",
    icon: "Gauge",
    services: ["seo"],
    group: "found",
  },
  {
    slug: "link-preview",
    href: "/tools/link-preview",
    title: "How will your link look when it is shared?",
    blurb:
      "Paste a URL and see the card WhatsApp, X, LinkedIn and Facebook each build from it, with the title and description cut where each one cuts them and the image checked against what each one accepts.",
    action: "Check a link",
    short: "Link preview checker",
    icon: "Share2",
    services: ["social"],
    group: "found",
  },
  {
    slug: "email",
    href: "/tools/email",
    title: "Can someone send an invoice as you?",
    blurb:
      "Your domain's DMARC, SPF and DKIM records read back in plain sentences, with the mail provider named. If the answer is yes, this is the page that tells you.",
    action: "Check a domain",
    short: "Email checker",
    icon: "ShieldCheck",
    services: ["web"],
    group: "brand",
  },
  {
    slug: "contrast",
    href: "/tools/contrast",
    title: "Can people actually read that colour combination?",
    blurb:
      "Two colours in, the real WCAG ratio out, checked against all six thresholds at once. Runs on your own device, and answers as you type.",
    action: "Check two colours",
    short: "Contrast checker",
    icon: "Contrast",
    services: ["branding"],
    group: "brand",
  },
  {
    slug: "readability",
    href: "/tools/readability",
    title: "Is your website copy actually easy to read?",
    blurb:
      "Paste a paragraph and get the Flesch Reading Ease and Grade Level scores instantly, with plain advice on the number. Runs on your own device.",
    action: "Check your copy",
    short: "Readability checker",
    icon: "BookOpenText",
    services: ["seo"],
    group: "found",
  },
  {
    slug: "ad-budget",
    href: "/tools/ad-budget",
    title: "How far does an ad budget actually go?",
    blurb:
      "One naira figure compared across five platforms at once, from each one's own published CPM and click-through ranges for this market. No ad account needed to see it.",
    action: "Price a budget",
    short: "Ad budget calculator",
    icon: "BarChart3",
    services: ["social"],
    group: "brand",
  },
  {
    slug: "broken-links",
    href: "/tools/broken-links",
    title: "Are any of the links on your page broken?",
    blurb:
      "Paste one page and every link on it gets checked in parallel: which ones work, which answer with an error, and which we could not reach at all. One fetch of one page, sorted broken first.",
    action: "Check a page",
    short: "Broken link checker",
    icon: "Link2Off",
    services: ["web"],
    group: "found",
  },
  {
    slug: "brand-kit",
    href: "/tools/brand-kit",
    title: "What does your logo actually give you to work with?",
    blurb:
      "Upload your logo and get its real colour palette, a WCAG contrast check of each colour against white and black, and a six-size favicon set. Nothing you upload is stored.",
    action: "Build a kit",
    short: "Brand asset pack",
    icon: "Palette",
    services: ["branding"],
    group: "brand",
  },
];

export function toolsIn(group: ToolGroup) {
  return FREE_TOOLS.filter((t) => t.group === group);
}

export function toolsFor(service: ServiceSlug) {
  return FREE_TOOLS.filter((t) => t.services.includes(service));
}
