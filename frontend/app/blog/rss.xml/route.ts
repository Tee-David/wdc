import { postsNewestFirstDb } from "@/lib/blog-db";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { hydrateSettings } from "@/lib/settings/store";
import { getSetting } from "@/lib/admin/store";

/**
 * An RSS feed for the blog.
 *
 * WHY RSS AND NOT JSON FEED. Both were on the table. RSS is what the readers
 * people actually use will accept without being told, and it is what a search
 * engine, a newsletter service and an aggregator all look for at a predictable
 * address. JSON Feed is nicer to write and almost nothing consumes it.
 *
 * WHY IT IS A ROUTE AND NOT A FILE. The posts are data, so the feed is derived
 * from the same array the pages render. A checked-in XML file would be wrong
 * the first time somebody published without remembering to update it.
 */

/* The posts are static, so the feed is too: built once and served from the
   edge cache rather than assembled per request. */
export const dynamic = "force-static";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const [all] = await Promise.all([postsNewestFirstDb(), hydrateSettings()]);
  /* The newest N, set in Settings > Blog and site copy; a saved value that is
     not a sane number falls back to what shipped. */
  const n = Number(getSetting("blog.rssCount") ?? 50);
  const posts = all.slice(0, Number.isInteger(n) && n >= 5 && n <= 100 ? n : 50);
  /* The feed's own timestamp is the newest post's, not "now" -- a feed whose
     lastBuildDate moves on every fetch tells every reader it has changed when
     it has not. */
  const newest = posts[0]?.updated ?? posts[0]?.date ?? new Date().toISOString();

  const items = posts.map((post) => {
    const url = `${SITE_URL}/blog/${post.slug}`;
    return [
      "    <item>",
      `      <title>${escape(post.title)}</title>`,
      `      <link>${url}</link>`,
      /* Permanent and unique, and not a URL, so a later move of the site does
         not make every old item look new. */
      `      <guid isPermaLink="false">${escape(post.slug)}</guid>`,
      `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
      `      <description>${escape(post.description)}</description>`,
      ...post.tags.map((tag) => `      <category>${escape(tag)}</category>`),
      "    </item>",
    ].join("\n");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escape(SITE_NAME)} Blog</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    "    <description>Notes on branding, search, building and growth, from the agency.</description>",
    "    <language>en</language>",
    `    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
