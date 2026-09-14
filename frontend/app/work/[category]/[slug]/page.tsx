import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { CASE_STUDIES, caseBySlug, casesFor, categoryBySlug } from "@/lib/work";
import { COMPANY_NAME, SITE_NAME, SITE_URL } from "@/lib/site";
import { testimonialFor } from "@/lib/testimonials";
import "@/components/preview/preview.css";
import "@/components/work/work.css";
import { NewTab } from "@/components/ui/new-tab";
import { publicImageSize } from "@/lib/image-size";
import WorkToc from "@/components/work/toc";
import PageEnd from "@/components/ui/page-end";

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
  /* A TITLE BUILT TO FIT, RATHER THAN ONE TRUNCATED BY GOOGLE.

     `${client} — ${title}` plus the brand the root template appends ran 82 to
     115 characters across these sixteen pages, so every one of them was going
     to be cut or rewritten in the result -- and a rewritten title is chosen by
     Google out of the page, not by us.

     Nothing is truncated here, because a sentence cut mid-word is worse than a
     shorter true one. The descriptive half is swapped for the sector, which is
     already recorded against every case study and is exactly what a searcher
     is scanning for; the brand is dropped only if even that will not fit,
     since the client's name is doing the identifying by then. */
  /* SITE_NAME, NOT COMPANY_NAME, AND THE DIFFERENCE IS 25 CHARACTERS.

     Two things above are not quite right. This returns `title.absolute`, which
     BYPASSES the root template, so the brand is only ever what is appended
     here -- the template is not "appending" anything. And what was appended
     was `COMPANY_NAME`, "We Dig Creativity Solutions (WDC Solutions)": a 45
     character suffix against a 60 character budget, leaving 15 for a client
     and a sector.

     Measured across all fifteen case studies, that meant the two branches that
     carry the brand NEVER ran: thirteen fell through to sector-without-brand
     and two to the client alone. The fitting worked -- every title lands
     between 11 and 56 characters -- but it was fitting by dropping the brand
     every single time, while every other page on the site carries the short
     name. `SITE_NAME` is the 20 character suffix the rest of the site uses,
     which the longest titles still cannot take, but the shortest now can. */
  const brand = ` | ${SITE_NAME}`;
  const withTitle = `${cs.client}: ${cs.title}`;
  const withSector = `${cs.client}: ${cs.sector}`;
  const title =
    withTitle.length + brand.length <= 60 ? withTitle + brand
    : withSector.length + brand.length <= 60 ? withSector + brand
    : withSector.length <= 60 ? withSector
    : cs.client;

  /* The summary alone ran 54-85 characters, short enough that Google will
     usually write its own snippet instead. The brief's opening sentence is
     already on the page and says what the work had to solve, which is the half
     a searcher is missing. Nothing is written for the meta tag. */
  const description = `${cs.summary} ${cs.brief.split(/(?<=\.)\s/)[0] ?? ""}`.trim().slice(0, 158);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/work/${cs.category}/${cs.slug}` },
    openGraph: {
      title: `${cs.client} | ${COMPANY_NAME}`,
      description,
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
  /* THE REAL SHAPE OF EACH GALLERY PAGE, read at build time.

     The lead pair is cropped to a fixed 4:3 by design -- two tiles side by
     side want to match. The rest must not be: a brand guide's pages are
     portrait, landscape and square in the same row, and cropping a guide
     spread into a letterbox loses the layout that IS the work.

     `aspect-ratio: auto` was the previous answer and it was worse than the
     problem. `next/image` with `fill` is absolutely positioned, so inside a
     box with no declared ratio it contributes no height and the box collapses:
     measured on the live build, EVERY branding case study was rendering its
     last five gallery images at two pixels tall. Reading each file's real
     dimensions gives each figure its own ratio, which reserves the right space
     before the picture arrives and crops nothing. */
  const restSizes = await Promise.all(rest.map(publicImageSize));

  /* THE RAIL AND THE SECTIONS HAVE TO AGREE, and this is the only thing that
     makes them: the ids below are the ids on the `<section>` elements, and the
     two conditional entries carry the same condition the sections do. A rail
     link pointing at nothing is a dead anchor that no type checker can catch,
     so `tests/work-toc.spec.ts` walks every case study and asserts every link
     resolves to an element that exists. */
  const outline = [
    { id: "about-the-client", text: "About the client" },
    { id: "the-brief", text: "The brief" },
    { id: "the-approach", text: "The approach" },
    { id: "what-we-did", text: "What we did" },
    ...(cs.palette?.length ? [{ id: "the-palette", text: "The palette" }] : []),
    { id: "the-system", text: cs.stackLabel ?? "Built with" },
  ];

  /* The canonical address, written once. The page carries it four times -- two
     pieces of structured data, the share row and the QR code -- and four hand
     typed copies of the same template literal is three chances for one of them
     to point somewhere else after a route changes. */
  const url = `${SITE_URL}/work/${cs.category}/${cs.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Our Work", item: `${SITE_URL}/work` },
      { "@type": "ListItem", position: 3, name: cat?.name ?? cs.category, item: `${SITE_URL}/work/${cs.category}` },
      { "@type": "ListItem", position: 4, name: cs.client, item: url },
    ],
  };

  const caseJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${cs.client}: ${cs.title}`,
    abstract: cs.summary,
    url,
    creator: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
    about: cs.sector,
    ...(cs.cover ? { image: `${SITE_URL}${cs.cover}` } : {}),
  };

  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="pv-sec" style={{ paddingTop: "clamp(6.5rem, 11vw, 9rem)" }}>
          <div className="pv-wrap">
            <article className="wk-doc">

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
                      <NewTab />
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
                  { }
                  <Image
                    src={cs.cover}
                    alt={`${cs.client}: ${cs.title}`}
                    fill
                    sizes="(max-width: 900px) 100vw, 860px"
                    quality={78}
                    /* The cover is the largest thing above the fold on a case
                       study, so it is this page's LCP element and the one image
                       on the site besides the homepage hero that earns
                       `priority`. */
                    priority
                  />
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

              {/* THE RAIL IS FIRST IN THE DOM AND SECOND ON THE PAGE.

                  On a phone there is no second column and the rail stacks, and
                  a contents list is only useful ABOVE the thing it lists. The
                  grid places it on the right on a wide screen without changing
                  the order a screen reader or a narrow viewport sees. */}
              <div className="wk-split">
                <aside className="wk-rail">
                  <div><WorkToc outline={outline} /></div>
                </aside>

                <div className="wk-doc__body">
                  <section id="about-the-client">
                    <h2>About the client</h2>
                    <p>{cs.about}</p>
                  </section>

                  <section id="the-brief">
                    <h2>The brief</h2>
                    <p>{cs.brief}</p>
                  </section>

                  {lead.length ? (
                    <div className={`wk-shots${lead.length === 2 ? " wk-shots--2" : ""}`}>
                      {lead.map((src) => (
                        <div className="wk-shot" key={src}>
                          { }
                          <Image
                            src={src}
                            alt={`${cs.client} interface`}
                            fill
                            sizes="(max-width: 720px) 100vw, 45vw"
                            quality={78}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <section id="the-approach">
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

                  <section id="what-we-did">
                    <h2>What we did</h2>
                    <ul className="wk-list">
                      {cs.did.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </section>

                  {/* Swatches, not a sentence. A row of the actual colours says
                      more about an identity than a paragraph naming them, and the
                      hex is the thing a reader would want anyway. */}
                  {cs.palette?.length ? (
                    <section id="the-palette">
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

                  <section id="the-system">
                    <h2>{cs.stackLabel ?? "Built with"}</h2>
                    <div className="wk-stack">
                      {cs.stack.map((s) => (
                        <span className="wk-chip wk-chip--quiet" key={s}>{s}</span>
                      ))}
                    </div>
                  </section>

                  {rest.length ? (
                    <div className={`wk-shots${rest.length >= 2 ? " wk-shots--2" : ""} wk-shots--tall`}>
                      {rest.map((src, n) => (
                        <div
                          className="wk-shot"
                          key={src}
                          style={{ aspectRatio: `${restSizes[n].width} / ${restSizes[n].height}` }}
                        >
                          <Image
                            src={src}
                            alt={`${cs.client}: a page from the delivered work`}
                            fill
                            sizes="(max-width: 720px) 100vw, 45vw"
                            quality={78}
                          />
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
                        <NewTab />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* The two things you do once you have read it, in the same shape
                  and the same order an article ends in. Below `wk-split` rather
                  than inside it, so the sticky contents rail lets go where the
                  case study does instead of travelling beside a share row. */}
              <PageEnd
                url={url}
                title={`${cs.client}: ${cs.title}`}
                what="case study"
                scanLabel="Scan to open this case study on your phone."
              />

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
