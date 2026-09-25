import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import AdBudget from "@/components/tools/ad-budget";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route. "How many people will ₦100,000 actually reach" is
 * a question every platform's own ad manager answers in its own jargon; this
 * answers it in plain reach, across five platforms at once, before anybody
 * has opened an ads account.
 */

export const metadata: Metadata = {
  title: "How far does an ad budget actually go?",
  description:
    "One naira figure, five platforms compared: the impressions and clicks it buys on Meta, Google Search, Google Display, TikTok and LinkedIn, from each platform's own published ranges for this market.",
  alternates: { canonical: `${SITE_URL}/tools/ad-budget` },
  openGraph: {
    title: `Ad budget & reach calculator | ${COMPANY_NAME}`,
    description:
      "What a media budget buys, in reach rather than in CPM jargon. Five platforms, side by side.",
    type: "website",
    url: `${SITE_URL}/tools/ad-budget`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE_URL}/tools` },
      { "@type": "ListItem", position: 3, name: "Ad budget & reach calculator", item: `${SITE_URL}/tools/ad-budget` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ad budget & reach calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/ad-budget`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function AdBudgetToolPage() {
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
              <Link href="/tools">Free tools</Link>
              <i aria-hidden="true">/</i>
              <span>Ad budget & reach</span>
            </nav>
            <h1 className="pv-mix">How far does an ad budget <b>actually go</b>?</h1>
            <p className="pv-lede">
              Put in a monthly figure and see the impressions and clicks it buys on
              five platforms at once, from each one&rsquo;s own published ranges for
              this market. The arithmetic runs on your device and answers as you type.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <AdBudget />
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Three things a platform&rsquo;s own calculator will not say</span>
              <h2 className="pv-mix">Cheap reach and a <b>strong click-through rarely arrive together</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>CPM and click-through move together, not apart.</b> The
                platforms with the cheapest reach per naira also tend to have the
                lowest click-through rate for a given budget, which is why the
                ranges above are paired rather than mixed and matched for the
                rosiest possible number.
              </li>
              <li>
                <b>A search click and a scroll-past impression are not the same
                thing.</b> Google Search costs several times more per thousand
                views than the others because someone is already looking for
                this; the click that follows is worth more than most.
              </li>
              <li>
                <b>Below a certain spend, the numbers get less reliable.</b> Most
                platforms need enough budget and enough time to learn who to show
                an ad to. A very small monthly figure buys reach, but not the
                platform&rsquo;s own optimisation.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We plan the media <b>around what it needs to achieve</b>.</h2>
              <p>
                Bring the figure above and what you are actually trying to sell. We
                will tell you which platform earns the budget and what the creative
                needs to carry, rather than splitting it evenly across all five.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/social">
                  See social & PPC work
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
