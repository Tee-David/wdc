import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import GalleryWall from "@/components/work/gallery-wall";
import {
  WORK_CATEGORIES,
  casesFor,
  categoryBySlug,
  countFor,
  wallFor,
} from "@/lib/work";
import { COMPANY_NAME, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

/* Every category is known at build time, so all six prerender rather than
   being generated on first request. */
export function generateStaticParams() {
  return WORK_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category } = await params;
  const c = categoryBySlug(category);
  if (!c) return {};
  /* The lede alone ran 57-76 characters. What it is missing is the thing a
     searcher wants from a portfolio page -- how much of it there is, and what
     kind of work. Counted, never typed. */
  const n = countFor(c);
  /* AND THEN THE CLIENTS, WHILE THERE IS ROOM. Built and measured: the
     sentence above alone landed four of the six categories between 100 and 118
     characters, short enough that Google usually writes its own snippet out of
     the page rather than using the tag.

     The client names are the specific, true thing a searcher scanning a
     portfolio is actually looking for, and they are already on the page. Names
     are added one at a time and dropped whole when the next will not fit, so
     the sentence never ends on half a client. */
  /* `c.label` UNCHANGED, AND A SINGULAR THAT AGREES. Lowercasing the label to
     make it sit mid-sentence also lowercased the acronyms, so /work/seo read
     "1 project in seo" -- and the plural tail did not agree with its own
     count either: "1 project in seo, every one of them live". */
  const base = n === 1
    ? `${c.lede} One project in ${c.label}, and it is live.`
    : `${c.lede} ${n} projects in ${c.label}, every one of them live.`;
  const description = (() => {
    const clients = casesFor(c.slug).map((cs) => cs.client);
    let out = base;
    const named: string[] = [];
    for (const client of clients) {
      const next = [...named, client];
      const tail = ` Work for ${next.join(", ")}.`;
      if ((base + tail).length > 158) break;
      named.push(client);
      out = base + tail;
    }
    return out.slice(0, 158);
  })();

  return {
    title: `${c.name} work`,
    description,
    alternates: { canonical: `${SITE_URL}/work/${c.slug}` },
    openGraph: {
      title: `${c.name} work | ${COMPANY_NAME}`,
      description,
      type: "website",
      url: `${SITE_URL}/work/${c.slug}`,
    },
  };
}

export default async function WorkCategoryPage(
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const c = categoryBySlug(category);
  if (!c) notFound();

  const cases = casesFor(c.slug);
  /* The loose artwork that is not already carried inside one of the stories
     above it, so the page never shows the same image twice. */
  const wall = wallFor(c.slug);
  const n = countFor(c);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Our Work", item: `${SITE_URL}/work` },
      { "@type": "ListItem", position: 3, name: c.name, item: `${SITE_URL}/work/${c.slug}` },
    ],
  };

  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <h1>{c.name}</h1>
            <p className="pv-lede">{c.lede}</p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "clamp(1.4rem, 2.4vw, 2rem)",
              }}
            >
              <h2 className="pv-mix" style={{ fontSize: "clamp(1.4rem, 1.2rem + 1vw, 2rem)" }}>
                <b>Case studies</b>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>
                {n} {n === 1 ? "case study" : "case studies"}
              </p>
            </div>

            {cases.length ? (
              <div className="wk-grid">
                {cases.map((cs) => (
                  /* Always the piece's CANONICAL category, never the one being
                     browsed: TraxStaff is listed under web, apps and software,
                     and linking each listing to its own path would serve the
                     same case study from three addresses. */
                  <Link
                    className="wk-card"
                    key={cs.slug}
                    href={`/work/${cs.category}/${cs.slug}`}
                  >
                    <span className="wk-card__shot">
                      {cs.cover ? (
                         
                        <Image
                          src={cs.cover}
                          alt={`${cs.client} — ${cs.title}`}
                          fill
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          quality={78}
                        />
                      ) : (
                        <span className="wk-card__none" aria-hidden="true">{cs.client}</span>
                      )}
                    </span>
                    <span className="wk-card__body">
                      <span className="wk-card__t">{cs.title}</span>
                      <span className="wk-card__d">{cs.summary}</span>
                      <span className="wk-card__meta">
                        <span className="wk-chip">{cs.client}</span>
                        <span className="wk-chip wk-chip--quiet">{cs.sector}</span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty label={c.label} />
            )}
          </div>
        </section>

        {/* The wall. Not every piece belongs to a written story -- a one-off
            flyer for a client we did one flyer for is still work, and burying
            it because it has no case study would be hiding the majority of the
            output. It sits under the stories, where it reads as the archive
            rather than as the argument. */}
        {wall.length ? (
          <section className="pv-sec pv-sec--alt">
            <div className="pv-wrap">
              <div
                style={{
                  display: "flex", flexWrap: "wrap", gap: 12,
                  alignItems: "baseline", justifyContent: "space-between",
                  marginBottom: "clamp(1.4rem, 2.4vw, 2rem)",
                }}
              >
                <h2 className="pv-mix" style={{ fontSize: "clamp(1.4rem, 1.2rem + 1vw, 2rem)" }}>
                  More <b>{c.label.toLowerCase()} work</b>
                </h2>
                <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>
                  {wall.length} {wall.length === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <GalleryWall pieces={wall} />
            </div>
          </section>
        ) : null}

        {/* Sideways move, so a category with two entries is not a dead end. */}
        <section className={`pv-sec${wall.length ? "" : " pv-sec--alt"}`}>
          <div className="pv-wrap">
            <h2 className="pv-mix" style={{ fontSize: "clamp(1.2rem, 1.1rem + .6vw, 1.5rem)", marginBottom: "1.2rem" }}>
              Other <b>disciplines</b>
            </h2>
            <div className="wk-cats">
              {WORK_CATEGORIES.filter((x) => x.slug !== c.slug).map((x) => (
                <Link className="wk-cat" href={`/work/${x.slug}`} key={x.slug}>
                  <span className="wk-cat__bar">
                    <span className="wk-cat__t">{x.label}</span>
                    <span className="wk-cat__n">{countFor(x)}</span>
                  </span>
                  <span className="wk-cat__shot">
                    { }
                    <Image
                      src={x.cover}
                      alt={`${x.name} work`}
                      fill
                      sizes="(max-width: 720px) 50vw, 25vw"
                      quality={78}
                    />
                    <span className="wk-cat__go" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <WorkFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}

/* Honest empty state. Borrowing another category's work to fill this grid
   would imply a case study that does not exist. */
function Empty({ label }: { label: string }) {
  return (
    <div className="wk-empty">
      <h3 style={{ fontSize: "1.1rem" }}>
        The {label} write-ups are still being published.
      </h3>
      <p style={{ color: "var(--muted)", maxWidth: "56ch" }}>
        We have done the work; it is the case study that is outstanding. Ask us and we
        will send relevant examples directly.
      </p>
      <Link className="pv-btn pv-btn--accent" href="/#pv-contact">
        Ask for examples
      </Link>
    </div>
  );
}
