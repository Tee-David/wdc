import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import ServicesBody from "@/components/services/services-body";
import { SERVICES } from "@/lib/services";
import { COMPANY_NAME, CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Branding and design, SEO, full-stack web development, cross-platform apps, software engineering with AI, and social media and PPC. The six WDC services in detail, with the work behind them.",
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: "Services | We Dig Creativity",
    description:
      "Six services, one team. Design, engineering and growth under one roof, with no hand-off gaps.",
    type: "website",
    url: `${SITE_URL}/services`,
  },
};

/* One Service node per offering, each pointing at its own anchor so a result
   can deep-link to the section it describes. The homepage already emits a
   coarser servicesJsonLd(); this is the detailed version for this page. */
const jsonLd = SERVICES.map((s) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: s.name,
  description: s.lede,
  url: `${SITE_URL}/services#${s.slug}`,
  provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
  areaServed: "Worldwide",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: `${s.name} deliverables`,
    itemListElement: s.deliverables.map((d) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: d },
    })),
  },
}));

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
  ],
};

export default function ServicesPage() {
  return (
    <>
      <Header overHero />
      <main className="flex-1">
        <ServicesBody />
      </main>

      <footer className="pv">
        <div
          className="pv-sec pv-sec--band"
          style={{ paddingBlock: "clamp(2.4rem,4vw,3.4rem)" }}
        >
          <div className="pv-wrap">
            <p style={{ color: "var(--on-band-dim)", fontSize: ".9rem", textAlign: "center" }}>
              © {new Date().getFullYear()} We Dig Creativity Solutions. All rights reserved.{" "}
              {/* Underlined, not just recoloured. A link inside a run of body text that
                  is only distinguished by colour is invisible to anyone who
                  cannot separate that colour from the text around it. */}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "0.18em" }}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p
              style={{
                color: "var(--on-band-dim)",
                fontSize: ".9rem",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              ...brilliant simplicity{" "}
              <strong style={{ color: "var(--accent)" }}>of thought!</strong>
            </p>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([...jsonLd, breadcrumbJsonLd]) }}
      />
    </>
  );
}
