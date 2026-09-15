import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import ServiceIcon from "@/components/ui/service-icon";
import ServiceDetail from "@/components/services/service-detail";
import ServiceTools from "@/components/tools/service-tools";
import BusinessSetup from "@/components/services/business-setup";
import { SERVICES, SERVICE_BY_SLUG } from "@/lib/services";
import { faqsFor } from "@/lib/faq";
import FaqAccordion from "@/components/ui/faq-accordion";
import { CASE_STUDIES, WORK_CATEGORIES } from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/work/work.css";

/* Six services, six pages, all known at build time. */
export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICE_BY_SLUG.get(slug as never);
  if (!service) return { title: "Not found" };

  const url = `${SITE_URL}/services/${service.slug}`;
  /* NOT `service.lede` ON ITS OWN. The Work category page for the same slug
     already uses that line, so the two pages were shipping identical meta
     descriptions -- a duplicate-content signal between our own pages, and at
     57-76 characters too short to earn a snippet either. Carrying the first
     sentence of the body makes it this page's own sentence: what the service
     IS rather than what the portfolio shows. */
  const firstSentence = service.body.split(/(?<=\.)\s/)[0] ?? "";
  const description = `${service.lede} ${firstSentence}`.trim().slice(0, 158);

  return {
    title: service.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${service.name} | ${COMPANY_NAME}`,
      description,
      type: "website",
      url,
    },
  };
}

export default async function ServicePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = SERVICE_BY_SLUG.get(slug as never);
  if (!service) notFound();

  /* The work that belongs to this service, so the page argues with evidence
     rather than with adjectives. Case studies are already filed by the same
     slug, so nothing here has to be curated by hand. */
  const work = CASE_STUDIES
    /* A cover is optional in the catalogue, and a card with a hole where the
       picture goes is worse than one card fewer. */
    .filter((c) => c.category === service.slug && c.cover)
    .slice(0, 6);
  const category = WORK_CATEGORIES.find((c) => c.slug === service.slug);
  const url = `${SITE_URL}/services/${service.slug}`;
  const faqs = faqsFor(service.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      description: service.lede,
      url,
      provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
      areaServed: "Worldwide",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${service.name} deliverables`,
        itemListElement: service.deliverables.map((d) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: d },
        })),
      },
    },
    /* FAQPage describes exactly the questions rendered below and no others.
       Structured data that claims content the page does not show is the kind
       of thing that gets rich results withdrawn, and it would be a lie. */
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
        { "@type": "ListItem", position: 3, name: service.name, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        {/* THE SAME BAND EVERY OTHER PAGE OPENS WITH. The breadcrumb and the
            title live inside it, as on a Work category page, so moving between
            a service and the work that proves it does not feel like moving
            between two sites.

            It is also load-bearing rather than decorative: the header runs
            `overHero` here, which is white type on no background. Without a
            dark band under it the nav washed out to almost nothing in light
            mode -- the same fault the /services hub had. */}
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <nav className="wk-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <i aria-hidden="true">/</i>
              <Link href="/services">Services</Link>
              <i aria-hidden="true">/</i>
              <span aria-current="page">{service.short}</span>
            </nav>
            <h1 id="svc-h" className="sv-svc__title">
              <span className="sv-svc__icon">
                <ServiceIcon name={service.icon} size={22} hover="pop" />
              </span>
              {service.name}
            </h1>
            <p className="pv-lede">{service.lede}</p>
          </div>
        </section>

        <ServiceDetail service={service} />

        {/* THE COMPLIANCE HALF, AND ONLY ON THE BRAND PAGE. It sits after the
            identity work rather than before it: somebody who came for a logo
            should meet the logo work first, and then find out we can register
            the company it belongs to. */}
        {service.slug === "branding" ? <BusinessSetup /> : null}

        {work.length > 0 ? (
          <section className="pv-sec">
            <div className="pv-wrap">
              <div className="pv-bar pv-bar--split pv-reveal">
                <div className="pv-head">
                  <span className="pv-eyebrow">Proof</span>
                  <h2>{service.short} we have already shipped</h2>
                </div>
                {category ? (
                  <Link className="pv-btn pv-btn--line" href={`/work/${category.slug}`}>
                    All {category.label.toLowerCase()} work
                  </Link>
                ) : null}
              </div>

              <div className="pv-rail">
                {work.map((c) => (
                  <Link className="wk-card" key={c.slug} href={`/work/${c.category}/${c.slug}`}>
                    <span className="wk-card__shot">
                      <Image
                        src={c.cover as string}
                        alt={`${c.client}: ${c.title}`}
                        fill
                        sizes="(max-width: 560px) 92vw, (max-width: 1000px) 46vw, 31vw"
                        /* 78, NOT 74. `images.qualities` in next.config.ts is
                           [70, 78, 85], and Next 16 only allows a quality the
                           config declares -- 74 was not one of them, so this
                           rail was the one set of case-study covers not being
                           served at the quality it asked for. 78 is also what
                           `/work/<category>` passes for the very same
                           `.wk-card`, so the two rails now match. */
                        quality={78}
                      />
                    </span>
                    <span className="wk-card__body">
                      <span className="wk-card__t">{c.client}</span>
                      <span className="wk-card__meta">
                        <span className="wk-chip">{c.sector}</span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* AFTER THE PROOF, BEFORE THE QUESTIONS. By here the reader has the
            argument and the evidence, and "here is one you can use right now,
            without talking to anyone" is the natural next beat. It renders
            nothing for a service with no tools of its own. */}
        <ServiceTools service={service.slug} />

        {faqs.length > 0 ? (
          <section className="pv-sec pv-sec--alt">
            <div className="pv-wrap">
              <div className="pv-head pv-reveal">
                <span className="pv-eyebrow">Before you ask</span>
                <h2>Questions we get about {service.short.toLowerCase()}</h2>
              </div>
              <FaqAccordion items={faqs} idPrefix={`svcfaq-${service.slug}`} />
            </div>
          </section>
        ) : null}

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta pv-reveal">
              <span className="pv-eyebrow">Next step</span>
              <h2>Tell us what you need {service.short.toLowerCase()} to do.</h2>
              <p>
                Describe the problem rather than the deliverable and we will tell you
                what it actually takes, including when the answer is less than you
                expected.
              </p>
              <Link className="pv-btn pv-btn--accent" href="/contact">
                Start a conversation
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
