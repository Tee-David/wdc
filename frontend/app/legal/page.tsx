import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { LEGAL_DOCS, LEGAL_UPDATED } from "@/lib/legal";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/legal/legal.css";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Our privacy, terms, cookie, client engagement, payments and refunds, and messages policies, written plainly.",
  alternates: { canonical: `${SITE_URL}/legal` },
  openGraph: {
    title: `Legal | ${COMPANY_NAME}`,
    description: "How we handle data, what the site is, and how we work with clients.",
    type: "website",
    url: `${SITE_URL}/legal`,
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Legal", item: `${SITE_URL}/legal` },
  ],
};

export default function LegalIndexPage() {
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <h1>Legal</h1>
            <p className="pv-lede">
              The documents covering what we do with your information, what this
              site is and what it stores, how an engagement with us runs, how
              payments and refunds work, and what we email you. Written to be read.
            </p>
            <p className="lg-updated">All last updated {LEGAL_UPDATED}</p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="lg-grid">
              {LEGAL_DOCS.map((d, i) => (
                <Link className="lg-card" key={d.slug} href={`/legal/${d.slug}`}>
                  <span className="lg-card__n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="lg-card__t">{d.title}</span>
                  <span className="lg-card__d">{d.blurb}</span>
                  <span className="lg-card__go">
                    Read it
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>

            <h2 className="lg-pdfs__h">Download a copy</h2>
            <ul className="lg-pdfs">
              {LEGAL_DOCS.map((d) => (
                <li key={d.slug}><a href={`/legal/${d.slug}/pdf`} download>{d.title}, PDF</a></li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
