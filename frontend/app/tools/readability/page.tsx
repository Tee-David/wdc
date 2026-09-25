import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import ReadabilityChecker from "@/components/tools/readability-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route. Copy that reads easily converts better, and the
 * Flesch score is the one readability number most people have actually heard
 * of -- Microsoft Word has shipped it for decades -- so it needs no
 * explaining before the tool is useful.
 */

export const metadata: Metadata = {
  title: "Is your website copy actually easy to read?",
  description:
    "Paste your copy and get the Flesch Reading Ease and Grade Level scores instantly, with plain advice on what to do about the number. Runs on your own device.",
  alternates: { canonical: `${SITE_URL}/tools/readability` },
  openGraph: {
    title: `Readability checker | ${COMPANY_NAME}`,
    description:
      "The Flesch score, and what it actually means for your copy, in one paste.",
    type: "website",
    url: `${SITE_URL}/tools/readability`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Readability checker", item: `${SITE_URL}/tools/readability` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Readability checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/readability`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function ReadabilityToolPage() {
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
              <span>Readability checker</span>
            </nav>
            <h1 className="pv-mix">Is your website copy <b>actually easy to read</b>?</h1>
            <p className="pv-lede">
              Paste a paragraph or a whole page and get the Flesch Reading Ease
              and Grade Level scores instantly, with a plain line on what the
              number means for who is reading it. Nothing you paste leaves your
              device.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <ReadabilityChecker />
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">What the score is actually measuring</span>
              <h2 className="pv-mix">Sentence length moves it <b>more than word choice does</b></h2>
            </div>
            <ul className="tl__facts">
              <li>
                <b>It counts sentences, words and syllables, nothing else.</b> No
                dictionary of difficulty, no AI judgement -- the same formula
                Microsoft Word has used for decades, which is why the number
                means something to people who have seen it before.
              </li>
              <li>
                <b>There is no universal target.</b> Most web and marketing copy
                reads best in the Standard band or easier; a technical page
                written for specialists is allowed to sit lower.
              </li>
              <li>
                <b>A low score is a prompt to look, not a verdict.</b> Some of the
                most persuasive writing uses longer sentences on purpose. Read the
                copy before you rewrite it to satisfy a number.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">We write copy that <b>reads the way it needs to</b>.</h2>
              <p>
                Bring the page that scored lower than you expected. We will tell you
                whether it is the sentences or the words, and whether it is even the
                problem worth fixing first.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/seo">
                  See our SEO & content work
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
