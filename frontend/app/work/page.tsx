import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { WORK_CATEGORIES, countFor } from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Websites, products, brand systems and campaigns we have shipped. Browse by service: branding and design, SEO, web, apps, software and AI, social and PPC.",
  alternates: { canonical: `${SITE_URL}/work` },
  openGraph: {
    title: "Our Work | We Dig Creativity",
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

export default function WorkHubPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pv">
        {/* The hub is one dark plate holding the whole set, as in the
            reference: six categories read as a group rather than as six cards
            adrift on the page. */}
        <section className="pv-sec" style={{ paddingTop: "clamp(7rem, 12vw, 10rem)" }}>
          <div className="pv-wrap">
            <div className="wk-plate">
              <div className="wk-plate__head">
                <div style={{ display: "grid", gap: 10 }}>
                  <span className="pv-eyebrow">Our Work</span>
                  <h1 className="wk-plate__t">Work, by what it took to make</h1>
                </div>
                <p className="wk-plate__note">
                  Explore the digital journeys we have designed and built in partnership
                  with our clients. Pick the discipline you came for.
                </p>
              </div>

              <div className="wk-cats">
                {WORK_CATEGORIES.map((c) => {
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
