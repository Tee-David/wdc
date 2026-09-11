import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { CASE_STUDIES, caseBySlug, casesFor, categoryBySlug } from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import { testimonialFor } from "@/lib/testimonials";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

/* One path per case study, at its CANONICAL category only. Generating every
   category a piece is tagged to would prerender the same page at three URLs,
   which is the duplicate-content problem the canonical rule exists to avoid. */
export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ category: c.category, slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string; slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const cs = caseBySlug(slug);
  if (!cs) return {};
  return {
    title: `${cs.client} — ${cs.title}`,
    description: cs.summary,
    alternates: { canonical: `${SITE_URL}/work/${cs.category}/${cs.slug}` },
    openGraph: {
      title: `${cs.client} | ${COMPANY_NAME}`,
      description: cs.summary,
      type: "article",
      url: `${SITE_URL}/work/${cs.category}/${cs.slug}`,
      images: cs.cover ? [{ url: `${SITE_URL}${cs.cover}` }] : undefined,
    },
  };
}

export default async function WorkDetailPage(
  { params }: { params: Promise<{ category: string; slug: string }> },
) {
  const { category, slug } = await params;
  const cs = caseBySlug(slug);
  // A real case study reached through a category it is not tagged to, or at a
  // path that is not its canonical one, is a 404 rather than a second copy.
  if (!cs || cs.category !== category) notFound();

  const cat = categoryBySlug(cs.category);
  /* Undefined for a client who has not given one, and the block simply does
     not render — the page has never needed a testimonial to be complete. */
  const said = testimonialFor(cs.slug);
  const siblings = casesFor(cs.category).filter((x) => x.category === cs.category);
  const i = siblings.findIndex((x) => x.slug === cs.slug);
  const prev = i > 0 ? siblings[i - 1] : null;
  const next = i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null;

  const shots = cs.gallery ?? [];
  const lead = shots.slice(0, 2);
  const rest = shots.slice(2);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Our Work", item: `${SITE_URL}/work` },
      { "@type": "ListItem", position: 3, name: cat?.name ?? cs.category, item: `${SITE_URL}/work/${cs.category}` },
      { "@type": "ListItem", position: 4, name: cs.client, item: `${SITE_URL}/work/${cs.category}/${cs.slug}` },
    ],
  };

  const caseJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${cs.client} — ${cs.title}`,
    abstract: cs.summary,
    url: `${SITE_URL}/work/${cs.category}/${cs.slug}`,
    creator: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
    about: cs.sector,
    ...(cs.cover ? { image: `${SITE_URL}${cs.cover}` } : {}),
  };

  return (
    <>
      <Header />
      <main className="flex-1 pv">
        <section className="pv-sec" style={{ paddingTop: "clamp(6.5rem, 11vw, 9rem)" }}>
          <div className="pv-wrap">
            <article className="wk-doc">
              <nav className="wk-crumbs" aria-label="Breadcrumb">
                <Link href="/work">Our Work</Link>
                <i aria-hidden="true">/</i>
                <Link href={`/work/${cs.category}`}>{cat?.label ?? cs.category}</Link>
                <i aria-hidden="true">/</i>
                <span>{cs.client}</span>
              </nav>

              <h1>{cs.title}</h1>

              <p className="wk-meta">
                <span>Client <b>{cs.client}</b></span>
                <span>Industry <b>{cs.sector}</b></span>
                <span>Location <b>{cs.location}</b></span>
                {cs.url ? (
                  <span>
                    Site{" "}
                    <a
                      href={cs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-ink)",
                        textDecoration: "underline",
                        textUnderlineOffset: ".18em",
                        fontWeight: 600,
                      }}
                    >
                      {new URL(cs.url).hostname.replace(/^www\./, "")}
                    </a>
                  </span>
                ) : null}
              </p>

              {cs.cover ? (
                /* Screenshots are landscape and crop happily; a flyer or a
                   guide page is portrait or square, and cropping one to 16:8
                   takes the masthead off the top and the details off the
                   bottom. Design work is contained on a ground instead. */
                <div className={`wk-doc__hero${
                  cs.category === "branding" || cs.category === "social" ? " wk-doc__hero--art" : ""
                }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cs.cover} alt={`${cs.client} — ${cs.title}`} decoding="async" />
                </div>
              ) : null}

              {/* The figure strip renders ONLY when the client has published
                  figures. Estimating them to fill the row would be inventing a
                  result on someone else's behalf — see lib/work.ts. */}
              {cs.metrics?.length ? (
                <div className="wk-figs">
                  {cs.metrics.map((m) => (
                    <div className="wk-fig" key={m.l}>
                      <span className="wk-fig__v">{m.v}</span>
                      <span className="wk-fig__l">{m.l}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="wk-doc__body">
                <section>
                  <h2>About the client</h2>
                  <p>{cs.about}</p>
                </section>

                <section>
                  <h2>The brief</h2>
                  <p>{cs.brief}</p>
                </section>

                {lead.length ? (
                  <div className={`wk-shots${lead.length === 2 ? " wk-shots--2" : ""}`}>
                    {lead.map((src) => (
                      <div className="wk-shot" key={src}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${cs.client} interface`} loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                ) : null}

                <section>
                  <h2>The approach</h2>
                  {/* Split on blank lines rather than rendered as one block.
                      The design case studies run to three or four paragraphs
                      and a wall of prose is not read. */}
                  {cs.approach.split("\n\n").map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
                </section>

                {/* Brand copy: a line off a guide page the client signed off —
                    a positioning statement, a tagline. It is what the brand
                    SAYS, not what the client thinks of the work, which is why
                    it is captioned with where it came from. */}
                {cs.quote ? (
                  <figure className="wk-quote">
                    <blockquote>{cs.quote.text}</blockquote>
                    <figcaption>{cs.quote.from}</figcaption>
                  </figure>
                ) : null}

                {/* And the testimonial, which is a different thing: the client
                    on the work itself. This block used to carry a note saying
                    none had been asked for. They have been, and these are what
                    came back — attributed to the organisation, because that is
                    how they were given. No invented name, no invented role. */}
                {said ? (
                  <figure className="wk-quote wk-quote--said">
                    <blockquote>{said.text}</blockquote>
                    <figcaption>{said.client}</figcaption>
                  </figure>
                ) : null}

                <section>
                  <h2>What we did</h2>
                  <ul className="wk-list">
                    {cs.did.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </section>

                {/* Swatches, not a sentence. A row of the actual colours says
                    more about an identity than a paragraph naming them, and the
                    hex is the thing a reader would want anyway. */}
                {cs.palette?.length ? (
                  <section>
                    <h2>The palette</h2>
                    <ul className="wk-pal">
                      {cs.palette.map((c) => (
                        <li key={c.hex}>
                          <span className="wk-pal__c" style={{ background: c.hex }} />
                          <b>{c.name}</b>
                          <small>{c.hex.toUpperCase()}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <h2>{cs.stackLabel ?? "Built with"}</h2>
                  <div className="wk-stack">
                    {cs.stack.map((s) => (
                      <span className="wk-chip wk-chip--quiet" key={s}>{s}</span>
                    ))}
                  </div>
                </section>

                {rest.length ? (
                  <div className={`wk-shots${rest.length >= 2 ? " wk-shots--2" : ""} wk-shots--tall`}>
                    {rest.map((src) => (
                      <div className="wk-shot" key={src}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${cs.client} interface`} loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {cs.url ? (
                  <div>
                    <a
                      className="pv-btn pv-btn--accent"
                      href={cs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit {cs.client}
                    </a>
                  </div>
                ) : null}
              </div>

              {prev || next ? (
                <nav className="wk-pager" aria-label={`More ${cat?.label ?? ""} work`}>
                  {/* Only the links that exist. A placeholder for the missing
                      side reserved half the row and left a lone card marooned
                      beside a column of nothing. */}
                  {prev ? (
                    <Link className="wk-pager__l" href={`/work/${prev.category}/${prev.slug}`}>
                      <span className="wk-pager__k">Previous</span>
                      <span className="wk-pager__t">{prev.client}</span>
                    </Link>
                  ) : null}
                  {next ? (
                    <Link className="wk-pager__l wk-pager__l--next" href={`/work/${next.category}/${next.slug}`}>
                      <span className="wk-pager__k">Next</span>
                      <span className="wk-pager__t">{next.client}</span>
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </article>
          </div>
        </section>
      </main>

      <WorkFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, caseJsonLd]) }}
      />
    </>
  );
}
