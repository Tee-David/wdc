import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import SeoSnapshot from "@/components/tools/seo-snapshot";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route. "Why can't anyone find my website" is the question
 * every SEO enquiry opens with, and this is the page that should answer it
 * before anybody has to ask us.
 */

export const metadata: Metadata = {
  title: "Why can't anyone find your website?",
  description:
    "A free on-page check: title, description, headings, canonical, indexing, sharing tags and image alt text, plus what the page costs a Nigerian visitor in naira. The full Lighthouse report by email.",
  alternates: { canonical: `${SITE_URL}/tools/seo` },
  openGraph: {
    title: `On-page SEO snapshot | ${COMPANY_NAME}`,
    description:
      "Ten checks Google makes on your page, read in a second, plus what your page weight costs the person loading it.",
    type: "website",
    url: `${SITE_URL}/tools/seo`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "SEO snapshot", item: `${SITE_URL}/tools/seo` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "On-page SEO snapshot",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/seo`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function SeoToolPage() {
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
              <span>SEO snapshot</span>
            </nav>
            <h1 className="pv-mix">Why can&rsquo;t anyone <b>find your website</b>?</h1>
            <p className="pv-lede">
              Ten things Google reads off a page, checked in about a second, and what
              that page costs the person loading it, in naira. The full Lighthouse
              report follows by email if you want it.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <SeoSnapshot />
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">What this is and is not</span>
              <h2 className="pv-mix">One page, read <b>honestly</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>It reads one page, not a site.</b> One fetch, exactly as a
                crawler would take it; anything claiming to know your whole site
                from one URL is guessing.
              </li>
              <li>
                <b>Page weight is money here.</b> Elsewhere it is argued about in
                kilobytes; in Nigeria the reader is paying for every byte, so a
                heavy page is a page that charges people to look at it.
              </li>
              <li>
                <b>The slow half is the free half.</b> Lighthouse takes about a
                minute, so we run it behind the scenes and email it. Everything
                on this page is yours either way.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Most of this is <b>an afternoon</b>, not a rebuild.</h2>
              <p>
                Titles, descriptions, headings, sharing tags and alt text are edits to a
                page you already have. Weight usually is too. If that is all you need,
                it is all you pay for.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/seo">
                  See our SEO work
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
