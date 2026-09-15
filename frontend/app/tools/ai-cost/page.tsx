import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import AiCost from "@/components/tools/ai-cost";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route. "How much does the OpenAI API cost" is a search
 * somebody makes with a spreadsheet open, and every answer they find is in
 * dollars per million tokens — a unit nobody budgets in. This one answers in
 * naira a month.
 */

export const metadata: Metadata = {
  title: "What will an AI feature cost you every month?",
  description:
    "Volume in, naira out. The same feature priced across eight models from Anthropic, OpenAI and Google, with what moves the bill and where a model is the wrong tool.",
  alternates: { canonical: `${SITE_URL}/tools/ai-cost` },
  openGraph: {
    title: `AI running-cost calculator | ${COMPANY_NAME}`,
    description:
      "A model bill arrives every month for as long as the feature is switched on. This is what it looks like, in naira.",
    type: "website",
    url: `${SITE_URL}/tools/ai-cost`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "AI running-cost calculator", item: `${SITE_URL}/tools/ai-cost` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AI running-cost calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/ai-cost`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function AiCostToolPage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <nav className="wk-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <i aria-hidden="true">/</i>
              <span>AI running cost</span>
            </nav>
            <h1>What will an AI feature cost you every month?</h1>
            <p className="pv-lede">
              Not to build — to run. Tell us what it does and how often, and see the
              same feature priced across eight models in naira, with the cheap and the
              expensive way to do it side by side.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <AiCost />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Three things nobody mentions</span>
              <h2 className="pv-mix">The bill is <b>mostly about shape</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>Writing costs several times more than reading.</b> Output tokens are
                priced four to six times higher than input on every model anyone sells.
                A feature that reads a hundred pages and answers in a sentence is cheap;
                one that drafts a page from a sentence is not.
              </li>
              <li>
                <b>The model you pick matters more than the prompt.</b> The spread
                between the cheapest and dearest model in the table above is more than
                twentyfold for identical work. Most features do not need the dearest,
                and finding that out takes an afternoon of testing rather than a
                quarter of tuning.
              </li>
              <li>
                <b>Sometimes the answer is ordinary code.</b> Sorting into fixed
                buckets, matching a record, answering from a table you already have —
                code does those faster, cheaper and the same way every time. We say so
                before quoting, which is occasionally an expensive sentence for us.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We build the ones that <b>earn their place</b>.</h2>
              <p>
                Bring the figure above and the feature you have in mind. We will tell
                you which model it actually needs, what it would cost to build, and
                whether it should be a model at all.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/tools/estimate">
                  Price the build
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
