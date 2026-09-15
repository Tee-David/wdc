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
};

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
  },
];

export function toolsFor(service: ServiceSlug) {
  return FREE_TOOLS.filter((t) => t.services.includes(service));
}
