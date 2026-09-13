import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import LegalToc from "@/components/legal/legal-toc";
import { LEGAL_DOCS, legalBySlug } from "@/lib/legal";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/legal/legal.css";

/* All four are known at build time, so all four prerender. */
export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) return {};

  /* THE BLURB ALONE IS TOO SHORT TO SURVIVE AS A SNIPPET. The four run 75 to
     114 characters, and below roughly 120 Google usually writes its own
     snippet out of the page instead of using the tag. The document's own
     `intro` already says, in its first sentence, what the policy covers, which
     is the half a searcher is missing -- so nothing here is written for the
     meta tag, exactly as the case-study pages do it.

     WHOLE SENTENCES ONLY. A `.slice(0, 158)` is what the case-study page does,
     and on this content it cuts mid-word: the engagement policy landed on
     "...how we work with clients: how an". Sentences are added while they fit
     and dropped whole when they do not, so the description always ends where a
     sentence ends. */
  const description = (() => {
    let out = doc.blurb.trim();
    for (const s of doc.intro.split(/(?<=\.)\s+/)) {
      const next = `${out} ${s.trim()}`.trim();
      if (next.length > 158) break;
      out = next;
    }
    /* AND THE DATE, WHEN THERE IS STILL ROOM. Built and measured: adding whole
       intro sentences only helped the cookie policy, whose first sentence is
       short. The other three open with a sentence long enough to blow the
       budget on its own, so they stayed at 103-114 and would still have been
       rewritten by Google.

       The currency of a policy is exactly what someone checks when they land
       on one, it is already on the page under the heading, and it is short
       enough to fit where a sentence is not. */
    const dated = `${out} Last updated ${doc.updated}.`;
    return dated.length <= 158 ? dated : out;
  })();

  return {
    title: doc.title,
    description,
    alternates: { canonical: `${SITE_URL}/legal/${doc.slug}` },
    openGraph: {
      title: `${doc.title} | ${COMPANY_NAME}`,
      description,
      type: "article",
      url: `${SITE_URL}/legal/${doc.slug}`,
    },
  };
}

export default async function LegalDocPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const doc = legalBySlug(slug);
  if (!doc) notFound();

  const sections = doc.sections.map((s, i) => ({ id: `s${i}`, heading: s.heading }));
  const others = LEGAL_DOCS.filter((d) => d.slug !== doc.slug)
    .map((d) => ({ slug: d.slug, title: d.title }));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Legal", item: `${SITE_URL}/legal` },
      { "@type": "ListItem", position: 3, name: doc.title, item: `${SITE_URL}/legal/${doc.slug}` },
    ],
  };

  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <h1>{doc.title}</h1>
            <p className="pv-lede">{doc.blurb}</p>
            <p className="lg-updated">Last updated {doc.updated}</p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="lg-cols">
              <LegalToc sections={sections} others={others} />

              {/* `<article>` rather than a div: this is one self-contained
                  document, which is what the element is for and what a reader
                  mode will extract. */}
              <article className="lg-body">
                <p className="lg-intro">{doc.intro}</p>

                {doc.sections.map((s, i) => (
                  /* `scroll-mt` on the section, not on the heading, so a jump
                     from the contents lands the heading below the fixed
                     header instead of underneath it. */
                  <section key={s.heading} id={`s${i}`} className="lg-sec">
                    <h2>{s.heading}</h2>
                    {s.body.map((para) => <p key={para.slice(0, 28)}>{para}</p>)}
                  </section>
                ))}

                <p className="lg-foot">
                  This page explains how we work. It is written to be understood
                  rather than to be impressive, and if any part of it is unclear
                  we would rather you asked than guessed.{" "}
                  <Link href="/contact">Ask us about it</Link>.
                </p>
              </article>
            </div>
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
