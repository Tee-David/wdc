import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CASE_STUDIES, WORK_CATEGORIES } from "@/lib/work";
import { LEGAL_DOCS } from "@/lib/legal";
import { postsNewestFirstDb } from "@/lib/blog-db";
import { SERVICES } from "@/lib/services";
import { FREE_TOOLS } from "@/lib/tools";
import { hydrateCaseStudies } from "@/lib/work-db";

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
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await hydrateCaseStudies();
  const now = new Date();
  /* The live posts, from the table the editor writes: an unpublished post
     leaves the sitemap the moment it leaves the blog. */
  const posts = await postsNewestFirstDb();
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    /** When this page's CONTENT last changed, where we actually know. */
    lastModified?: Date;
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    /* DERIVED, like everything else here. Services were the one set listed by
       hand, so when /services became a hub with six pages under it, the six
       new URLs were not in the sitemap at all -- which is the exact failure
       the note above says this file exists to prevent. */
    ...SERVICES.map((s) => ({
      path: `/services/${s.slug}`,
      priority: 0.85,
      changeFrequency: "monthly" as const,
    })),
    /* A tool is its own destination, not a section of a marketing page:
       somebody searching "is my business name available .com.ng" should land
       on the tool. Monthly because the page changes when the tool does, not
       when a registry answers differently.

       DERIVED, LIKE THE SERVICES ABOVE, and for the reason written there. The
       three that shipped first were listed by hand here, so the four added
       with section 1B would have been live, linked from the footer and from
       their service pages, and invisible to this file -- which is the exact
       failure the note at the top of this sitemap says it exists to prevent.
       `lib/tools.ts` is the one list now. */
    { path: "/tools", priority: 0.8, changeFrequency: "monthly" },
    ...FREE_TOOLS.map((tool) => ({
      path: tool.href,
      priority: 0.75,
      changeFrequency: "monthly" as const,
    })),
    { path: "/about", priority: 0.7, changeFrequency: "yearly" },
    { path: "/contact", priority: 0.8, changeFrequency: "yearly" },
    { path: "/start", priority: 0.7, changeFrequency: "yearly" },
    { path: "/work", priority: 0.9, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    /* Derived like the work tiers: a post published in the editor is in the
       sitemap the same day and cannot ship as a page nothing has heard of.
       Weekly on the index because that is where new posts appear; monthly on
       a post, which changes only when it is revised. */
    ...posts.filter((p) => !p.canonical).map((p) => ({
      path: `/blog/${p.slug}`,
      priority: 0.6,
      changeFrequency: "monthly" as const,
      /* The post's own date, not the deploy's. See the note on lastModified
         below -- for these we actually know the answer. */
      lastModified: new Date(p.updated ?? p.date),
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

  /* `lastModified` FALLS BACK TO THE BUILD, AND THAT IS A COMPROMISE WORTH
     NAMING. Stamping every URL with the deploy time tells a crawler that all
     forty pages changed whenever any one of them did, which is how the field
     stops being believed. Where the content carries its own date -- blog posts
     do -- that date is used instead. The rest are marketing pages edited in
     source, where the build is the closest honest answer we have. */
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: r.lastModified ?? now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
