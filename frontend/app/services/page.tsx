import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { WORK_CATEGORIES, countFor } from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/services/services-hub.css";
import { hydrateCaseStudies } from "@/lib/work-db";
import ServiceIcon from "@/components/ui/service-icon";
import ServiceChooser from "@/components/services/service-chooser";
import { needsFor } from "@/lib/service-needs";

export const metadata: Metadata = {
  /* Not "Services". The template appends the brand, so the first and most
     heavily weighted words were being spent on a word that describes every
     website there has ever been. */
  title: "Creative, Web, SEO & Software Services",
  description:
    "Explore branding, SEO, web development, mobile apps, software and AI, social media and PPC services from one creative and engineering team.",
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: "Creative, Web, SEO & Software Services | We Dig Creativity",
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
  url: `${SITE_URL}/services/${s.slug}`,
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

/* A CollectionPage listing the six service pages, so a result for "WDC
   services" can surface the one a searcher actually wants rather than only the
   hub. Same shape as the Work hub's. */
const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `Services | ${COMPANY_NAME}`,
  url: `${SITE_URL}/services`,
  hasPart: SERVICES.map((s) => ({
    "@type": "Service",
    name: s.name,
    description: s.lede,
    url: `${SITE_URL}/services/${s.slug}`,
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
  ],
};

export default async function ServicesPage() {
  await hydrateCaseStudies();
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        {/* ONE PLATE HOLDING THE WHOLE SET, exactly as the Work hub does: six
            services read as a group rather than as six cards adrift on a page.

            This route used to render all six services in full -- six code-split
            stage demos, six tool marquees and a pinned rail on one URL. The
            audit measured it at 8,320ms of blocked main thread against the
            homepage's 1,360ms, 3,707KB, and 27.4 phone screens long. It is a
            hub now, and each service carries its own weight on its own page. */}
        {/* THE SAME SHAPE /blog USES: a navy band carrying the title, then
            the cards on the page's own ground. The plate that used to hold
            them was a dark slab inside a light page, which made this the only
            hub on the site that did not look like the others -- and, because
            the header runs `overHero` here, the band is also what the header's
            white type is sitting on. Without it the nav washed out to almost
            nothing in light mode. */}
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Services</span>
            <h1 className="pv-mix">Six services, <b>one team</b></h1>
            <p className="pv-lede">
              Design, engineering and growth under one roof, so nothing is lost in
              the hand-off. Pick the one you came for.
            </p>
          </div>
        </section>

        {/* A MENU, NOT A SECOND GALLERY. This used to be the same six picture
            tiles, with the same counts, as /work, so the two pages answered the
            same question twice. /work shows the work; this answers the buyer's
            question: what do I actually get, and which one do I need? The four
            chips are the first four deliverables from each service page, and
            the counts come from the catalogue, never typed by hand. */}
        <section className="pv-sec">
          <div className="pv-wrap">
            <ServiceChooser listId="svh-list" />
            <ul className="svh-list" id="svh-list">
              {SERVICES.map((s) => {
                const category = WORK_CATEGORIES.find((c) => c.slug === s.slug);
                const n = category ? countFor(category) : 0;
                return (
                  <li className="svh-row" key={s.slug} data-needs={needsFor(s.slug)}>
                    <span className="svh-row__ic" aria-hidden="true">
                      <ServiceIcon name={s.icon} size={22} />
                    </span>
                    <div className="svh-row__body">
                      <h2 className="svh-row__t">
                        <Link href={`/services/${s.slug}`}>{s.name}</Link>
                        <span className="svh-row__fit">Fits</span>
                      </h2>
                      <p className="svh-row__d">{s.lede}</p>
                      <ul className="svh-row__chips" aria-label={`Part of ${s.name}`}>
                        {s.deliverables.slice(0, 4).map((d) => <li key={d}>{d}</li>)}
                      </ul>
                    </div>
                    <div className="svh-row__acts">
                      <Link className="pv-btn pv-btn--accent" href={`/services/${s.slug}`} aria-label={`What's included in ${s.name}`}>
                        What&rsquo;s included
                      </Link>
                      {/* A service with no work filed under it offers none,
                          rather than a confident zero. */}
                      {category && n > 0 ? (
                        <Link className="svh-row__work" href={`/work/${category.slug}`}>
                          See the work ({n})
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta pv-reveal">
              <span className="pv-eyebrow">Not sure which</span>
              <h2 className="pv-mix"><b>Describe the problem</b> and we will tell you which of these it is.</h2>
              <p>
                Most projects need two or three of the six, and knowing which is
                our job rather than yours.
              </p>
              <Link className="pv-btn pv-btn--accent" href="/contact">
                Start a conversation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([...jsonLd, breadcrumbJsonLd, collectionJsonLd]),
        }}
      />
    </>
  );
}
