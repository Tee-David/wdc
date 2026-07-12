import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Robots policy. Everything public is crawlable — there is no
 * authenticated surface yet. Sitemap points at the apex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
