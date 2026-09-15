import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import LinkPreviewChecker from "@/components/tools/link-preview-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route. "Why does my link show no image on WhatsApp" is a
 * question people search at the moment they are about to share something, and
 * this is the page that should answer it.
 */

export const metadata: Metadata = {
  title: "How will your link look on WhatsApp?",
  description:
    "Paste a URL and see the card WhatsApp, X, LinkedIn and Facebook will build from it, with the image checked against what each one accepts.",
  alternates: { canonical: `${SITE_URL}/tools/link-preview` },
  openGraph: {
    title: `Link preview checker | ${COMPANY_NAME}`,
    description:
      "See what a shared link actually looks like before you send it to four hundred people.",
    type: "website",
    url: `${SITE_URL}/tools/link-preview`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Link preview checker", item: `${SITE_URL}/tools/link-preview` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Link preview checker",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/link-preview`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function LinkPreviewToolPage() {
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
              <span>Link preview checker</span>
            </nav>
            <h1>What does your link look like when it is shared?</h1>
            <p className="pv-lede">
              Paste it once and see the card WhatsApp, X, LinkedIn and Facebook will
              each build from it — before it goes to a group of four hundred.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <LinkPreviewChecker />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Why it matters</span>
              <h2 className="pv-mix">A link with no card is <b>a link nobody opens</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>WhatsApp is the strictest, and it is the one that counts.</b> It
                refuses any preview image over 300KB, so the channel most Nigerian
                links actually travel through is the one most likely to show a bare
                grey line where your picture should be. Keep it under 300KB at
                1200×630.
              </li>
              <li>
                <b>Four tags decide all of it.</b> <code>og:title</code>,{" "}
                <code>og:description</code>, <code>og:image</code> and{" "}
                <code>twitter:card</code>. They live in the head of the page, they are
                the same for every platform, and most sites we check are missing at
                least one.
              </li>
              <li>
                <b>The scrapers do not run JavaScript.</b> If your tags are added by
                the browser after the page loads, a crawler sees an empty head and
                builds an empty card. That is also what this tool sees, which is why
                it is the honest answer rather than a limitation.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We can make <b>every link</b> look like this.</h2>
              <p>
                Preview cards are part of every site we build, and retrofitting them to
                one you already have is an afternoon rather than a rebuild.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/social">
                  See our social work
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
