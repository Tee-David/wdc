import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import JsonLd from "@/components/seo/json-ld";
import { BLOG_POSTS, formatDate, postsNewestFirst, readingMinutes } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "@/components/preview/preview.css";
import "@/components/work/work.css";
import "@/components/blog/blog.css";

export const metadata: Metadata = {
  title: { absolute: "Blog | Web, Branding, SEO & Software Advice | WDC" },
  description:
    "Plain, practical writing on websites, branding, SEO, apps and software, from the team that builds them. No jargon, no invented numbers.",
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: { "application/rss+xml": `${SITE_URL}/blog/rss.xml` },
  },
  openGraph: {
    title: "Blog | Web, Branding, SEO & Software Advice | WDC",
    description:
      "Practical writing on websites, branding, SEO, apps and software, from the team that builds them.",
    type: "website",
    url: `${SITE_URL}/blog`,
  },
};

/* Blog + Breadcrumb, both derived from the same array the page renders, so the
   markup and the structured data cannot describe different things. */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} blog`,
    url: `${SITE_URL}/blog`,
    description:
      "Practical writing on websites, branding, SEO, apps and software.",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    blogPost: BLOG_POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated ?? p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
      author: { "@type": "Organization", name: SITE_NAME },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
    ],
  },
];

export default function BlogIndex() {
  const posts = postsNewestFirst();

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <h1>Blog</h1>
            <p className="pv-lede">
              What we have learned building websites, brands and software, written
              the way we would explain it on a call. No jargon for its own sake,
              and no figures we could not evidence if you asked.
            </p>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="bl-grid">
              {posts.map((post, n) => (
                <Link className="bl-card" key={post.slug} href={`/blog/${post.slug}`}>
                  <span className="bl-card__shot">
                    <Image
                      src={post.cover}
                      alt=""
                      fill
                      /* Measured against the rendered card: one column below
                         620px, then two, then three. */
                      sizes="(max-width: 620px) 92vw, (max-width: 1100px) 46vw, 30vw"
                      quality={70}
                      /* Only the first row is worth fetching eagerly; the rest
                         are below the fold on every viewport. */
                      priority={n < 3}
                    />
                  </span>

                  <span className="bl-card__body">
                    <span className="bl-card__kind">{post.tags[0]}</span>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <span className="bl-card__foot">
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      {" · "}
                      {readingMinutes(post)} min read
                    </span>

                    {/* Decorative: the whole card is the link, so this must not
                        be announced as a second destination. */}
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
        </section>

        <section className="pv-sec pv-sec--band">
          <div className="pv-wrap">
            <div className="pv-cta pv-reveal">
              <span className="pv-eyebrow">Something you want answered</span>
              <h2>Ask us the question directly.</h2>
              <p>
                If the thing you are trying to work out is not here, tell us what it
                is. We will answer it straight, and if it is a good question we will
                write it up.
              </p>
              <Link className="pv-btn pv-btn--accent" href="/contact">
                Ask a question
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
