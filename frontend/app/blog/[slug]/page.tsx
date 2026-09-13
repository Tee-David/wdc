import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import {
  BLOG_POSTS, formatDate, postBySlug, readingMinutes, relatedPosts,
  type BlogBlock,
} from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/work/work.css";
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
       root template would otherwise append the brand to a title that has
       already been sized to fit without it. */
    title: { absolute: post.seoTitle },
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.seoTitle,
      description: post.description,
      type: "article",
      url,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
    },
    twitter: { card: "summary_large_image", title: post.seoTitle, description: post.description },
  };
}

/** One block, one element. Headings stay h2/h3 so the outline never breaks. */
function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "h2": return <h2>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "list":
      return (
        <ul>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
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
  const more = relatedPosts(post);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      keywords: post.tags.join(", "),
      wordCount: post.body.reduce(
        (n, b) => n + (b.kind === "list" ? b.items.join(" ") : b.kind === "callout" ? b.title + " " + b.text : b.text).split(/\s+/).length,
        0,
      ),
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
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <p className="bl-post__meta">
              <Link href="/blog" style={{ color: "inherit" }}>Blog</Link>
              <span>
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                {" · "}
                {readingMinutes(post)} min read
                {post.updated ? ` · updated ${formatDate(post.updated)}` : ""}
              </span>
            </p>
            <h1>{post.title}</h1>
            <p className="pv-lede">{post.excerpt}</p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <article className="bl-post">
              <div className="bl-body">
                {post.body.map((block, i) => (
                  <Block key={`${block.kind}-${i}`} block={block} />
                ))}
              </div>

              <ul className="bl-tags" aria-label="Topics">
                {post.tags.map((t) => <li className="bl-tag" key={t}>{t}</li>)}
              </ul>

              {more.length > 0 && (
                <div className="bl-next">
                  <h2>Read next</h2>
                  <div className="bl-grid">
                    {more.map((p) => (
                      <Link className="bl-card" key={p.slug} href={`/blog/${p.slug}`}>
                        <p className="bl-card__meta">
                          {p.tags[0]}
                          <span>{readingMinutes(p)} min read</span>
                        </p>
                        <h2>{p.title}</h2>
                        <p>{p.excerpt}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
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
