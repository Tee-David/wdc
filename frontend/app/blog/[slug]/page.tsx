import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import PageEnd from "@/components/ui/page-end";
import BlogToc from "@/components/blog/toc";
import {
  BLOG_POSTS, formatDate, postBySlug, readingMinutes, relatedPosts,
  type BlogBlock, type BlogPost,
} from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/blog/blog.css";

/* Every post is known at build time, so every post is a static page. */
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return { title: "Not found" };

  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    /* `absolute`, because each post writes its own search-result title and the
       root template would otherwise append the brand to a title already sized
       to fit without it. */
    title: { absolute: post.seoTitle },
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.seoTitle,
      description: post.description,
      type: "article",
      url,
      /* NO `images` HERE ON PURPOSE. Setting it explicitly suppresses the
         `opengraph-image` file convention, and the drawn card beside this file
         carries the post's headline -- which the cover photograph does not.
         Next serves the same generated image as `twitter:image` too. */
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.description,
    },
  };
}

/**
 * A heading's anchor, derived from its text rather than stored.
 *
 * Derived on purpose: an id typed into the data would drift from the heading
 * the first time somebody edits the wording, and a contents link pointing at a
 * heading that no longer exists is worse than no contents at all. The same
 * function builds the link and the target, so they cannot disagree.
 */
const headingId = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Only h2 and h3 are navigable landmarks; nothing else gets an id. */
const outlineOf = (post: BlogPost) =>
  post.body
    .filter((b): b is Extract<BlogBlock, { kind: "h2" | "h3" }> => b.kind === "h2" || b.kind === "h3")
    .map((b) => ({ id: headingId(b.text), text: b.text, sub: b.kind === "h3" }));

/** One block, one element. Headings stay h2/h3 so the outline never breaks. */
function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "h2": return <h2 id={headingId(block.text)}>{block.text}</h2>;
    case "h3": return <h3 id={headingId(block.text)}>{block.text}</h3>;
    case "list":
      return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
    case "quote":
      return (
        <blockquote>
          {block.text}
          {block.who ? <cite>{block.who}</cite> : null}
        </blockquote>
      );
    case "callout":
      return (
        <aside className="bl-note">
          <b>{block.title}</b>
          <p>{block.text}</p>
        </aside>
      );
    default: return <p>{block.text}</p>;
  }
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  /* MORE THAN TWO, because this is a rail now. Two cards in a scroller is a grid
   with extra steps: nothing to scroll to, and a third of the track empty on a
   wide screen. */
  const more = relatedPosts(post, 5);
  const outline = outlineOf(post);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: `${SITE_URL}${post.cover}`,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      keywords: post.tags.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        {/* The cover IS the hero. The scrim is weighted to the bottom, where the
            type sits, rather than spread evenly over the whole photograph --
            the same reasoning as the homepage hero. */}
        <section className="bl-hero">
          <span className="bl-hero__shot">
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="100vw"
              /* 70, NOT 72, AND THIS ONE WAS NOT COSMETIC. `images.qualities`
                 in next.config.ts is [70, 78, 85], and Next 16 rejects any
                 quality the config does not declare -- the optimiser answers
                 400 `"q" parameter (quality) of 72 is not allowed` and serves
                 no image at all. This is the post's LCP element, marked
                 `priority`, so the one image the page is built around was the
                 one failing. 70 is the declared value nearest it and the
                 cheapest of the three, which is what an LCP image wants. */
              quality={70}
              /* This is the page's largest contentful paint. */
              priority
            />
          </span>
          <span className="bl-hero__veil" aria-hidden="true" />
          <div className="pv-wrap bl-hero__in">
            <p className="bl-hero__meta">
              <Link href="/blog">Blog</Link>
              <span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                {" · "}
                {readingMinutes(post)} min read
                {post.updated ? ` · updated ${formatDate(post.updated)}` : ""}
              </span>
            </p>
            <h1>{post.title}</h1>
            <p className="bl-hero__lede">{post.excerpt}</p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className={outline.length > 0 ? "bl-layout" : "bl-layout bl-layout--solo"}>
              {/* CONTENTS ONLY. Sharing and the code used to sit here too, which
                  put both of them ABOVE the article on every phone -- a reader
                  was offered the share buttons before they had read a word. They
                  now close the article instead, where they are something you do
                  after finishing rather than an obstacle in front of the start.

                  Sticky beside the article on desktop; a collapsed block above
                  it on a phone, because eight links is a wall between the
                  reader and what they came for. */}
              {outline.length > 0 && (
                <aside className="bl-rail">
                  <div>
                    <BlogToc outline={outline} />
                  </div>
                </aside>
              )}

              <article className="bl-post">
                <div className="bl-body">
                  {post.body.map((block, i) => (
                    <Block key={`${block.kind}-${i}`} block={block} />
                  ))}
                </div>

                <ul className="bl-tags" aria-label="Topics">
                  {post.tags.map((t) => <li className="bl-tag" key={t}>{t}</li>)}
                </ul>
              </article>

              {/* WHAT COMES AFTER THE ARTICLE, IN ITS OWN GRID ROW, AND THAT IS
                  WHAT STOPS THE RAIL.

                  A sticky element releases at the edge of its CONTAINING BLOCK,
                  which for a grid item is its grid area. While the rail and the
                  whole of this end matter shared one row, the rail's area ran to
                  the bottom of the longest column, so the contents list went on
                  travelling beside the share row, the QR code and "Read next" --
                  long after there was any heading left to point at.

                  Splitting these into row 2 leaves the rail's area ending with
                  the prose, so it lets go exactly where the article does. It is
                  also the honest grouping: sharing, the QR and the next post are
                  things you do AFTER reading, not part of what you read. The
                  tags stay inside `<article>` because they describe it. */}
              <div className="bl-after">
                {/* The two things you do once you have finished reading. */}
                <PageEnd
                  url={url}
                  title={post.title}
                  what="post"
                  scanLabel="Scan to open this article on your phone."
                />
              </div>

              {/* READ NEXT STARTS AT THE LEFT EDGE, in a row of its own.
                  By the time a reader reaches it the contents rail has ended,
                  so the first column is empty space -- and a carousel that
                  begins where the prose begins leaves a 15rem hole beside its
                  own heading. It spans both columns instead. The share row
                  above it does NOT: that still lines up with the article it
                  belongs to. */}
              {more.length > 0 && (
                  <div className="bl-next">
                    <h2>Read next</h2>
                    <div className="pv-rail">
                      {more.map((p) => (
                        <Link className="bl-card" key={p.slug} href={`/blog/${p.slug}`}>
                          <span className="bl-card__shot">
                            <Image src={p.cover} alt="" fill sizes="(max-width: 620px) 92vw, 40vw" quality={70} />
                          </span>
                          <span className="bl-card__body">
                            <span className="bl-card__kind">{p.tags[0]}</span>
                            <h2>{p.title}</h2>
                            <p>{p.excerpt}</p>
                            <span className="bl-card__foot">{readingMinutes(p)} min read</span>
                            <span className="bl-card__go" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 17 17 7M9 7h8v8" />
                              </svg>
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta pv-reveal">
              <span className="pv-eyebrow">Your turn</span>
              <h2>Tell us what you are trying to work out.</h2>
              <p>
                If this raised a question about your own project, ask it. We answer
                the same working day and we will tell you straight whether it is
                something we should be doing for you.
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
