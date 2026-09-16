import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import ContrastChecker from "@/components/tools/contrast-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route, the cheap subset of the brand asset pack this was
 * meant to be part of: a reader picking two colours for a logo or a page
 * should not wait on that being built.
 */

export const metadata: Metadata = {
  title: "Can people actually read that colour combination?",
  description:
    "Two colours in, the real WCAG ratio out, checked against all six thresholds at once: AA and AAA, normal and large text, and UI components. Runs on your own device.",
  alternates: { canonical: `${SITE_URL}/tools/contrast` },
  openGraph: {
    title: `Contrast checker | ${COMPANY_NAME}`,
    description:
      "A ratio, not a guess: the same formula WCAG itself uses, checked against all six thresholds at once.",
    type: "website",
    url: `${SITE_URL}/tools/contrast`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Contrast checker", item: `${SITE_URL}/tools/contrast` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Contrast checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/contrast`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function ContrastToolPage() {
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
              <span>Contrast checker</span>
            </nav>
            <h1>Can people actually read that colour combination?</h1>
            <p className="pv-lede">
              Pick a text colour and a background, and see the real ratio against
              all six WCAG thresholds at once, with a live preview at both text
              sizes. No upload, no email, and nothing leaves your device.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <ContrastChecker />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Why it is six numbers, not one</span>
              <h2 className="pv-mix">A ratio that passes for a <b>headline can fail for a paragraph</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>Large text needs less contrast than body copy.</b> WCAG sets a
                lower bar, 3:1 rather than 4.5:1, for anything 24px and up or bold
                at 18.66px and up. A pale tint that fails for a paragraph often
                passes for the headline sitting above it.
              </li>
              <li>
                <b>AA is the bar most audits and most laws check for.</b> AAA is
                the stricter, optional tier: worth reaching for body copy where you
                can, not a requirement everywhere.
              </li>
              <li>
                <b>An icon or a border needs contrast too.</b> The UI-components
                row is the one people forget: a focus ring, an icon that carries
                meaning, or a control&rsquo;s own edge needs 3:1 against what sits
                behind it, the same as large text.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We build the palette <b>around what actually reads</b>.</h2>
              <p>
                Bring the colours you are torn between. We will tell you which
                pairing carries your brand and clears the bar, rather than one
                that only looks right on the monitor you designed it on.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/branding">
                  See branding work
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
