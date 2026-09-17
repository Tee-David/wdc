import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import ScopeEstimator from "@/components/tools/scope-estimator";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route, like the three tools before it. "How much does an
 * app cost in Nigeria" is a search somebody makes before they are ready to
 * talk to anybody, and this is the page that should meet them there.
 */

export const metadata: Metadata = {
  title: "What will your app or software cost to build?",
  description:
    "Eight questions, then an indicative range in naira and dollars with the phases broken out. No email needed to see it, and it is a range rather than a quote.",
  alternates: { canonical: `${SITE_URL}/tools/estimate` },
  openGraph: {
    title: `Scope and budget estimator | ${COMPANY_NAME}`,
    description:
      "An honest range for building a website, a web app or a mobile app, with what moves it and what it assumes.",
    type: "website",
    url: `${SITE_URL}/tools/estimate`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Budget estimator", item: `${SITE_URL}/tools/estimate` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Scope and budget estimator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/estimate`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function EstimateToolPage() {
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
              <span>Budget estimator</span>
            </nav>
            <h1 className="pv-mix">What will it <b>cost to build</b>?</h1>
            <p className="pv-lede">
              Eight questions, then a range in naira and dollars with the phases
              broken out. No email, no call, and nothing is sent anywhere while you
              answer.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <ScopeEstimator />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">How to read it</span>
              <h2 className="pv-mix">A range you can <b>plan against</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>It is a range because the scope is.</b> Eight answers describe the
                shape of a project, not its detail, and the gap between the low and
                the high end is where the detail lives. Anybody who gives you one
                number from eight questions is guessing and hiding it.
              </li>
              <li>
                <b>The figure is days of work, priced.</b> Every answer adds days to
                the build rather than picking a tier off a price list, which is why a
                rush costs more than an open date and why roles cost more than a
                single sign-in. It is the same arithmetic we do before quoting.
              </li>
              <li>
                <b>Under-scoping is the usual failure.</b> So the high end sits
                further from the middle than the low end does. If your project comes
                in under the range that is a good conversation; if it lands above a
                figure we published, that is the one nobody enjoys.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Tell us the <b>outcome</b>, not the feature list.</h2>
              <p>
                A project starts with a call about what the work has to achieve. Bring
                the range above and we will tell you plainly what it does and does not
                cover, and what a smaller first version would look like.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/software">
                  See our software work
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
