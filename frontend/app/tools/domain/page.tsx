import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import DomainChecker from "@/components/tools/domain-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * A free tool that answers a real question in about five seconds.
 *
 * ITS OWN ROUTE, NOT AN ANCHOR. `/services` is a hub and each service has its
 * own page, but a tool is a different kind of thing: somebody searching "is my
 * business name available .com.ng" should land ON the tool, not on a marketing
 * page that happens to contain it. So it is server-rendered, indexable, and
 * carries its own title, description and canonical.
 *
 * The work is server-side through `/api/domain`, which is the rule anyway:
 * `connect-src 'self'` in next.config.ts means the browser cannot call a
 * registry directly even if we wanted it to.
 */

export const metadata: Metadata = {
  title: "Free domain name checker for Nigerian businesses",
  description:
    "Check one business name across .com, .ng, .com.ng, .africa, .app and .co at once. Straight from each registry, free, and no sign-up.",
  alternates: { canonical: `${SITE_URL}/tools/domain` },
  openGraph: {
    title: `Free domain name checker | ${COMPANY_NAME}`,
    description:
      "One name, six endings, answered from the registries themselves rather than guessed from DNS.",
    type: "website",
    url: `${SITE_URL}/tools/domain`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools/domain` },
      { "@type": "ListItem", position: 3, name: "Domain checker", item: `${SITE_URL}/tools/domain` },
    ],
  },
  /* Describes the tool that is actually on the page and nothing else, which is
     the rule this project already follows for FAQPage. */
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Domain name checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/domain`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function DomainToolPage() {
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
              <span>Domain checker</span>
            </nav>
            <h1>Is the domain name free?</h1>
            <p className="pv-lede">
              Type a name and we check six web addresses at once. Free, no
              sign-up, and nothing is bought here.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <DomainChecker />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">How it works</span>
              <h2 className="pv-mix">How we know, <b>and what we cannot know</b></h2>
            </div>
            <div className="tl__prose">
              <p>
                Most free checkers just ask whether a name has any web records.
                That misses a lot. Plenty of addresses somebody already owns sit
                empty with no records at all, so they look free when they are
                not. We ask the registries who actually keep the list.
              </p>
              <p>
                When a registry does not answer, we say so rather than guess.
                Nigeria&rsquo;s is unreliable right now, so <code>.ng</code> and{" "}
                <code>.com.ng</code> are usually the two a person checks for you
                by hand. That is a real check, not a brush-off.
              </p>
              <p>
                A name is only yours once it is registered. Somebody else can
                take it tomorrow, so if you have found the one you want, it is
                worth moving.
              </p>
              <p>
                Anything we buy for you is registered in <strong>your</strong>{" "}
                name, with your email as the owner. Losing control of a web
                address is the most expensive thing that happens to a small
                business online, and it is entirely avoidable at the start.
              </p>
            </div>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix">Found one? <b>We will build what sits on it.</b></h2>
              <p>
                Websites, stores and booking systems, engineered to load fast on a
                Nigerian connection and to be found once they are live.
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
