import "server-only";

import { db } from "@/lib/db/pool";
import { getAppSetting } from "@/lib/app-settings";
import { SITE_SOCIAL_IMAGE_KEY } from "@/lib/site-seo";

export type Use = { label: string; href: string; where: string };

/**
 * WHERE A FILE IS USED: a post's cover, its social image, a picture or video
 * in its body, and the site's link preview. Read from the records themselves
 * each time rather than kept as a list that could fall behind them. A match
 * on the address, which is the only thing that ties a use to the file.
 */
export async function mediaUsage(url: string): Promise<Use[]> {
  if (!url) return [];
  const [posts, preview] = await Promise.all([
    db.query<{ id: string; title: string; cover: string; social_image: string | null; in_body: boolean; trashed: boolean }>(
      `SELECT id, title, cover, social_image, strpos(body::STRING, $1) > 0 AS in_body, trashed_at IS NOT NULL AS trashed
       FROM blog_posts WHERE cover = $1 OR social_image = $1 OR strpos(body::STRING, $1) > 0 ORDER BY saved_at DESC LIMIT 50`,
      [url],
    ),
    getAppSetting<string>(SITE_SOCIAL_IMAGE_KEY, ""),
  ]);
  const uses: Use[] = posts.rows.map((p) => ({
    label: p.title,
    href: `/admin/blog/${p.id}`,
    where: [p.cover === url ? "cover" : "", p.social_image === url ? "social image" : "", p.in_body ? "in the post" : ""].filter(Boolean).join(", ") + (p.trashed ? " (in the Trash)" : ""),
  }));
  if (preview === url) uses.push({ label: "The site's link preview", href: "/admin/settings/site", where: "Website and SEO" });
  return uses;
}
