import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import { ToolCards } from "@/components/tools/service-tools";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import { FREE_TOOLS, TOOL_GROUPS, toolsIn } from "@/lib/tools";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Every free tool, in one place.
 *
 * Twelve tools shipped, each linked from its service page and the footer, and
 * `/tools` itself was a 404: the breadcrumb a visitor would reach for went
 * nowhere, and there was no page to send somebody to that said "these are all
 * free". Grouped by what the visitor is trying to do, from `TOOL_GROUPS`, so a
 * tool added to `lib/tools.ts` appears here with nothing else to edit.
 */

const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen"][FREE_TOOLS.length] ?? String(FREE_TOOLS.length);

export const metadata: Metadata = {
  title: "Free tools for building, finding and branding a business online",
  description:
    `${COUNT} free tools from ${COMPANY_NAME}: a build budget estimator, domain and CAC name checkers, an SEO snapshot, link preview, contrast and email checkers, and more. No sign-up.`,
  alternates: { canonical: `${SITE_URL}/tools` },
  openGraph: {
    title: `Free tools | ${COMPANY_NAME}`,
    description: "Real questions, answered free. No sign-up, no email wall.",
    type: "website",
    url: `${SITE_URL}/tools`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE_URL}/tools` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: FREE_TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.short,
      url: `${SITE_URL}${t.href}`,
    })),
  },
];

export default function ToolsPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Free tools</span>
            <h1 className="pv-mix">{COUNT} questions, <b>answered free</b></h1>
            <p className="pv-lede">
              No sign-up and no email wall. Each one answers in seconds and says
              plainly what it can and cannot tell you. They are the same checks we
              run on our own work.
            </p>
          </div>
        </section>

        {TOOL_GROUPS.map((g) => {
          const tools = toolsIn(g.id);
          if (tools.length === 0) return null;
          return (
            <section className="pv-sec tl-hub" key={g.id} aria-labelledby={`tl-${g.id}`}>
              <div className="pv-wrap">
                <div className="pv-head pv-reveal">
                  <h2 className="pv-mix" id={`tl-${g.id}`}>{g.title}</h2>
                  <p className="pv-lede">{g.lede}</p>
                </div>
                <ToolCards tools={tools} />
              </div>
            </section>
          );
        })}

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Found something worth fixing? <b>We can fix it.</b></h2>
              <p>
                Tell us what the tool turned up and what you want to happen next,
                and we will give you a plain answer on whether it is worth doing.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a project
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services">
                  See our services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
