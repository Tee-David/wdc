import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import BrandKitBuilder from "@/components/tools/brand-kit-builder";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route, off section 1B's "later" list: the cheap subset
 * of a brand pack that a logo upload and `sharp` -- already in the tree for
 * `next/image` -- make trivial. The contrast maths is `lib/contrast.ts`,
 * already shipped for /tools/contrast.
 */

export const metadata: Metadata = {
  title: "What does your logo actually give you to work with?",
  description:
    "Upload your logo and get its real colour palette, a WCAG contrast check of each colour against white and black, and a six-size favicon set, ready to download. Nothing you upload is stored.",
  alternates: { canonical: `${SITE_URL}/tools/brand-kit` },
  openGraph: {
    title: `Brand asset pack | ${COMPANY_NAME}`,
    description: "A logo in, a palette, a contrast check and a favicon set out.",
    type: "website",
    url: `${SITE_URL}/tools/brand-kit`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Brand asset pack", item: `${SITE_URL}/tools/brand-kit` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Brand asset pack",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/brand-kit`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function BrandKitToolPage() {
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
              <span>Brand asset pack</span>
            </nav>
            <h1>What does your logo actually give you to work with?</h1>
            <p className="pv-lede">
              Upload it and get the real colours in the file, whether each one
              reads as text on white or black, and a six-size favicon set ready
              to drop into a site. Nothing you upload is stored anywhere.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <BrandKitBuilder />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">What this reads, and what it does not</span>
              <h2 className="pv-mix">The colours in the file, <b>not a redesign of them</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>The palette is read, not designed.</b> It reports the
                colours actually in your file, most-used first -- including a
                flat white or black background, if that is what the file has.
              </li>
              <li>
                <b>The favicons crop to fit, they do not redraw your mark.</b>{" "}
                A logo meant to sit inside a lot of whitespace will look small
                at 16px, the same as it would in any browser tab. That is a
                design decision worth having a conversation about, not
                something this tool can fix by guessing.
              </li>
              <li>
                <b>Nothing you upload is kept.</b> It is decoded, measured and
                resized for the length of one request, then gone. If you want
                us to hold onto brand files for a live project, that goes
                through the client portal, not a public tool.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We build the whole identity <b>around what actually works</b>.</h2>
              <p>
                If the palette this hands back does not clear contrast where
                you need it to, or the mark does not hold up at 16px, that is
                exactly the kind of problem branding work solves properly.
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
