import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Robots policy. Everything public is crawlable, with four exceptions.
 *
 * /onboarding is a private working surface handed to a client by link after
 * they have paid. /offline.html is the fallback the service worker serves when
 * the network is gone -- a fallback page in search results is a search result
 * that lies.
 *
 * /i/ and /r/ are the public invoice and receipt documents. They are addressed
 * by a random 128-bit token rather than by their number, so they cannot be
 * found by guessing -- but a token pasted into a forwarded email, a support
 * ticket or a chat that gets indexed is a real way for one to leak, and a
 * client's invoice turning up in a search result is not a mistake anybody gets
 * to make twice. Both also carry `robots: { index: false }` in their own
 * metadata, which is the binding half: a disallow only asks a crawler not to
 * fetch the URL, and a URL that is never fetched can still be listed if
 * something links to it.
 *
 * Sitemap points at the apex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/onboarding", "/offline.html", "/i/", "/r/", "/q/", "/pay/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
