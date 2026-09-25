import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import BrokenLinksChecker from "@/components/tools/broken-links-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route, the last item off section 1B's "later" list. One
 * page fetched, every link on it checked once, in parallel -- a crawl of the
 * whole site is a different and heavier tool than the one a free page can
 * promise for nothing.
 */

export const metadata: Metadata = {
  title: "Are any of the links on your page broken?",
  description:
    "Paste one page and we check every link on it: which ones work, which answer with an error, and which we could not reach at all. No sign-up, one fetch of one page.",
  alternates: { canonical: `${SITE_URL}/tools/broken-links` },
  openGraph: {
    title: `Broken link checker | ${COMPANY_NAME}`,
    description: "Every link on one page, checked once, sorted broken first.",
    type: "website",
    url: `${SITE_URL}/tools/broken-links`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE_URL}/tools` },
      { "@type": "ListItem", position: 3, name: "Broken link checker", item: `${SITE_URL}/tools/broken-links` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Broken link checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/broken-links`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function BrokenLinksToolPage() {
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
              <span>Broken link checker</span>
            </nav>
            <h1 className="pv-mix">Are any of the links on your page <b>broken</b>?</h1>
            <p className="pv-lede">
              Paste one page and we check every link on it in parallel: which
              ones work, which answer with an error, and which we could not
              reach at all. One fetch of one page, no sign-up.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <BrokenLinksChecker />
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">What this does and does not do</span>
              <h2 className="pv-mix">One page, checked properly, <b>not the whole site guessed at</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>Every link is checked once, at the moment you ask.</b> A link
                that broke five minutes ago and one that has been broken for a
                year look identical from a page nobody has re-checked.
              </li>
              <li>
                <b>&ldquo;Could not check&rdquo; is not the same as broken.</b>{" "}
                Some sites block automated requests entirely, and a few private
                or unusual addresses are ones we never fetch on principle. Both
                read honestly rather than as a red mark that is not deserved.
              </li>
              <li>
                <b>It reads one page, not your whole sitemap.</b> A page with
                dozens of links checks in seconds; a full-site crawl that
                finds every broken link across every page is a heavier job we
                do by hand.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We will find <b>every broken link on the whole site</b>.</h2>
              <p>
                Send us the domain and we will crawl it properly, page by page,
                and hand back a list ordered by what a visitor is actually
                likely to click.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/web">
                  See our web work
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
