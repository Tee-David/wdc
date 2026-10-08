import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { WORK_CATEGORIES, countFor } from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import { hydrateCaseStudies } from "@/lib/work-db";

export const metadata: Metadata = {
  /* `absolute`, because this title ends in "| WDC" and the root template
     would otherwise append the full brand name a second time. */
  title: { absolute: "Our Work | Branding, Web, Apps & Software Projects | WDC" },
  description:
    "Explore branding, websites, mobile apps, software, SEO and digital campaigns designed and built by We Dig Creativity for growing businesses.",
  alternates: { canonical: `${SITE_URL}/work` },
  openGraph: {
    title: "Our Work | Branding, Web, Apps & Software Projects | WDC",
    description: "The digital journeys we have designed and built with our clients.",
    type: "website",
    url: `${SITE_URL}/work`,
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Our Work", item: `${SITE_URL}/work` },
  ],
};

/* A CollectionPage listing the six category pages, so a result for "WDC work"
   can surface the category a searcher actually wants rather than only the hub. */
const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `Our Work | ${COMPANY_NAME}`,
  url: `${SITE_URL}/work`,
  hasPart: WORK_CATEGORIES.map((c) => ({
    "@type": "CollectionPage",
    name: c.name,
    description: c.lede,
    url: `${SITE_URL}/work/${c.slug}`,
  })),
};

export default async function WorkHubPage() {
  await hydrateCaseStudies();
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        {/* THE SAME SHAPE /blog USES: a navy band carrying the title, then the
            cards on the page's own ground. This was a dark plate holding the
            whole set; the plate made a slab inside a light page and made the
            three hubs look like three different sites. */}
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Our Work</span>
            <h1 className="pv-mix">Work, by <b>what it took to make</b></h1>
            <p className="pv-lede">
              Explore the digital journeys we have designed and built in partnership
              with our clients. Pick the discipline you came for.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="wk-cats">
                {WORK_CATEGORIES.map((c, at) => {
                  const n = countFor(c);
                  return (
                    <Link className="wk-cat" href={`/work/${c.slug}`} key={c.slug}>
                      <span className="wk-cat__bar">
                        <span className="wk-cat__t">{c.label}</span>
                        {/* Counted from the catalogue, never typed by hand: a
                            card that says 4 and opens a wall of a hundred is
                            worse than no count at all. */}
                        <span className="wk-cat__n">{n}</span>
                      </span>
                      <span className="wk-cat__shot">
                        { }
                        <Image
                          src={c.cover}
                          alt={`${c.name} work`}
                          fill
                          /* The first two are above the fold and are what the page paints
                             first, so they load now; lazy loading them delayed it. */
                          loading={at < 2 ? "eager" : "lazy"}
                          fetchPriority={at < 2 ? "high" : "auto"}
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          quality={78}
                        />
                        <span className="wk-cat__go" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      </main>

      <WorkFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd, collectionJsonLd]),
        }}
      />
    </>
  );
}
