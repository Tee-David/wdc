import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CASE_STUDIES, WORK_CATEGORIES } from "@/lib/work";

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
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
