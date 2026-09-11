import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Robots policy. Everything public is crawlable. The one exception is
 * /onboarding, which is a private working surface handed to a client by link
 * after they have paid, not a page anyone should arrive at from a search. The
 * page also carries `robots: { index: false }` in its own metadata, which is
 * the binding half: a disallow only asks a crawler not to fetch the URL, and
 * a URL that is never fetched can still be listed if something links to it.
 *
 * Sitemap points at the apex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
