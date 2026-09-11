import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Robots policy. Everything public is crawlable. Two exceptions: /onboarding,
 * a private working surface handed to a client by link after they have paid,
 * and /offline.html, the fallback the service worker serves when the network is
 * gone -- a fallback page in search results is a search result that lies. The
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
        disallow: ["/onboarding", "/offline.html"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
