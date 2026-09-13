import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CASE_STUDIES, WORK_CATEGORIES } from "@/lib/work";
import { LEGAL_DOCS } from "@/lib/legal";
import { BLOG_POSTS } from "@/lib/blog";

/**
 * Sitemap.
 *
 * The work tiers are DERIVED, not listed by hand: a category added to
 * lib/work.ts appears here on its own, and a case study cannot ship with a
 * live page that the sitemap has never heard of. Each case study is listed at
 * its canonical category only, which is the same rule the routes themselves
 * enforce — listing it under every category it is tagged to would hand search
 * engines three URLs for one page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    { path: "/about", priority: 0.7, changeFrequency: "yearly" },
    { path: "/contact", priority: 0.8, changeFrequency: "yearly" },
    { path: "/work", priority: 0.9, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    /* Derived like the work tiers: a post added to lib/blog.ts is in the
       sitemap the same day and cannot ship as a page nothing has heard of.
       Weekly on the index because that is where new posts appear; monthly on
       a post, which changes only when it is revised. */
    ...BLOG_POSTS.map((p) => ({
      path: `/blog/${p.slug}`,
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    ...WORK_CATEGORIES.map((c) => ({
      path: `/work/${c.slug}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...CASE_STUDIES.map((c) => ({
      path: `/work/${c.category}/${c.slug}`,
      priority: 0.7,
      changeFrequency: "yearly" as const,
    })),
    /* Derived like the rest: a document added to lib/legal.ts is in the
       sitemap the same day, and cannot ship as a page search engines have
       never been told about. Low priority and yearly because that is what
       these are -- findable, not promoted. */
    { path: "/legal", priority: 0.4, changeFrequency: "yearly" as const },
    ...LEGAL_DOCS.map((d) => ({
      path: `/legal/${d.slug}`,
      priority: 0.3,
      changeFrequency: "yearly" as const,
    })),
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
