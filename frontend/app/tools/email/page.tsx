import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import EmailChecker from "@/components/tools/email-checker";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/tools/tools.css";

/**
 * Its own indexable route, for the same reason the domain checker is: somebody
 * searching "why does my business email go to spam" should land on the tool.
 */

export const metadata: Metadata = {
  title: "Can people forge your business email?",
  description:
    "Free check of your domain's SPF, DMARC, DKIM and mail servers, explained in plain English. Most Nigerian business domains can be forged today.",
  alternates: { canonical: `${SITE_URL}/tools/email` },
  openGraph: {
    title: `Email deliverability check | ${COMPANY_NAME}`,
    description:
      "Four public DNS records decide whether your invoices arrive and whether anyone can send mail as you. Check yours free.",
    type: "website",
    url: `${SITE_URL}/tools/email`,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Email check", item: `${SITE_URL}/tools/email` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Email deliverability check",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Any",
    url: `${SITE_URL}/tools/email`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  },
];

export default function EmailToolPage() {
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
              <span>Email check</span>
            </nav>
            <h1>Can someone send an invoice as you?</h1>
            <p className="pv-lede">
              Four public records decide it. Most business domains we check leave the
              door open. Yours takes about five seconds to read.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <EmailChecker />
          </div>
        </section>

        <section className="pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Why it matters</span>
              <h2 className="pv-mix">Delivered is <b>not the same as trusted</b></h2>
            </div>
            <div className="tl__prose">
              <p>
                Mail that fails these checks does not usually bounce. It arrives in spam,
                which is worse, because nothing tells you it happened. Quotes, invoices
                and password resets quietly stop landing and the first you hear of it is
                a client saying they never got anything.
              </p>
              <p>
                The other half is forgery. Without a DMARC policy, anyone can put your
                domain in the From line and send an invoice with their own bank details
                on it. The recipient sees your name. This is the commonest way small
                businesses lose money to fraud, and the fix is a DNS record.
              </p>
              <p>
                We learned this on our own domain. Authentication was not the headline
                problem: SPF aligned, a DKIM key was published, MX was correct, and mail
                was still filed as spam because the policy said to do nothing about
                failures and no reports were being collected. The tool above checks the
                same four things we had to work through.
              </p>
            </div>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta">
              <span className="pv-eyebrow">Next step</span>
              <h2 className="pv-mix"><b>We can fix these</b>, usually in a day.</h2>
              <p>
                They are DNS changes rather than a rebuild, and they come as part of any
                web or SEO work we do. If that is all you need, it is all you pay for.
              </p>
              <div className="sv-cta__row">
                <Link className="pv-btn pv-btn--accent" href="/contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--light" href="/services/seo">
                  See what SEO work covers
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
