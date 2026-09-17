import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import NameChecker from "@/components/tools/name-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * The free business name checker.
 *
 * FREE MEANS FREE, ALL THE WAY DOWN. There is no route behind this page and no
 * provider behind that: `lib/cac-name.ts` is pure, and the whole check runs in
 * the visitor's browser. Nothing is metered, so nothing has to be capped, so
 * the tool cannot have a bad day because too many people used it.
 *
 * WHY THERE IS NO REGISTER LOOKUP, said here as well as on the page. The
 * Commission publishes a search PAGE, not an interface a program may use, and
 * every third party selling one charges per lookup. Rather than buy a
 * dependency or scrape a government portal, the tool answers the half it can
 * answer completely and links the visitor to the Commission's own search for
 * the other half. That is a smaller promise and a true one.
 */

export const metadata: Metadata = {
  title: "Free CAC business name checker",
  description:
    "Check if your Nigerian business name is available. We check it against CAC's naming rules, then you search the register. Free, and the name never leaves your browser.",
  alternates: { canonical: `${SITE_URL}/tools/business-name` },
  openGraph: {
    title: `Free CAC business name checker | ${COMPANY_NAME}`,
    description:
      "The words that need the Commission's consent, and the ending your entity type requires. Checked on your own device.",
    type: "website",
    url: `${SITE_URL}/tools/business-name`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools/business-name` },
      { "@type": "ListItem", position: 3, name: "Business name checker", item: `${SITE_URL}/tools/business-name` },
    ],
  },
  /* Describes the tool actually on the page and nothing else, which is the
     rule this project already follows for FAQPage and for the other tools. */
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CAC business name checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/business-name`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function BusinessNameToolPage() {
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
              <span>Business name checker</span>
            </nav>
            <h1 className="pv-mix">Is your <b>business name</b> available?</h1>
            <p className="pv-lede">
              Two steps. We check it against CAC&rsquo;s naming rules, then you
              check the register. Free, and nothing is sent anywhere.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <NameChecker />
          </div>
        </section>

        {/* THREE FACTS, NOT FOUR PARAGRAPHS. This was an essay about CAMA
            section 852, undocumented endpoints and why we do not query the
            register. All of it true and none of it what somebody came here
            for. What is left is the three things a reader actually benefits
            from knowing, one sentence each. */}
        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <ul className="tl__facts">
              <li>
                <b>Two things send most filings back.</b> A word CAC has to approve
                by hand, and the wrong ending for what you are registering. Both are
                checked above.
              </li>
              <li>
                <b>Your name is never sent anywhere.</b> The rules are public and the
                check runs on your own device. No account, no log.
              </li>
              <li>
                <b>Only CAC can say if a name is taken.</b> Their register is the list;
                their formal search is what reserves it. We can do that part for you.
              </li>
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Name sorted? <b>We will register it.</b></h2>
              <p>
                CAC registration, TIN, and the brand that goes on top. We search
                the register, reserve the name and file it.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/branding">
                  See our brand work
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
