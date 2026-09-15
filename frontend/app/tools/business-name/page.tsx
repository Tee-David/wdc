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
    "Check a Nigerian business or company name against CAC's own naming rules before you file. Free, instant, and the name never leaves your browser.",
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
            <h1>Will CAC accept your business name?</h1>
            <p className="pv-lede">
              The two things that send most filings back, checked before you pay
              for one. Free, instant, and your name never leaves your browser.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <NameChecker />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">How it works</span>
              <h2 className="pv-mix">Checked against the law, <b>not against a guess</b></h2>
            </div>
            <div className="tl__prose">
              <p>
                Two things send a name back more often than anything else, and
                neither of them depends on who else is registered. The first is a
                word the Commission will not approve without looking at it by
                hand: <code>Federal</code>, <code>National</code>,{" "}
                <code>Group</code>, <code>Holdings</code> and a handful of others,
                listed in section 852 of the Companies and Allied Matters Act
                2020. Those are not refusals. Plenty of registered Nigerian
                companies carry them. They just take longer, and it helps to know
                that before you are waiting.
              </p>
              <p>
                The second is the ending. A business name is an enterprise, not an
                incorporated company, so it may not call itself{" "}
                <code>Limited</code> or <code>Ltd</code>; a company must end in{" "}
                <code>Limited</code>, <code>Plc</code> or <code>Unlimited</code>.
                People mix these up constantly and it is the easiest correction in
                the world to make before filing rather than after.
              </p>
              <p>
                <strong>The name is never sent anywhere.</strong> The rules are
                public and the check is arithmetic, so it runs on your own device.
                No account, no quota, no log of what you typed. A business name is
                an idea you have not registered yet, and you should not have to
                hand it to a stranger to find out whether it is spelled properly.
              </p>
              <p>
                What this cannot tell you is whether the name is taken. The
                Commission publishes a search page for people to use rather than
                an interface a website may query, and the companies that resell
                that data charge for every lookup. So we do not guess and we do
                not pretend: the tool says what it checked, and points you at the
                Commission&rsquo;s own search for the rest.
              </p>
            </div>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Name sorted? <b>We will register it.</b></h2>
              <p>
                CAC registration, TIN, and the identity that goes on top of it.
                We check the register by hand, reserve the name and file it, then
                design what the business looks like once it exists.
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
