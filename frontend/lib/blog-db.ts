import "server-only";

import { db } from "@/lib/db/pool";
import { BLOG_POSTS, type BlogBlock, type BlogPost } from "@/lib/blog";
import type { ServiceSlug } from "@/lib/services";

/**
 * The posts, from the database, behind the same shapes the pages already use.
 *
 * WHY THE ACCESSORS ARE ASYNC AND THE OLD ONES ARE NOT. `lib/blog.ts` reads an
 * array in memory and answers synchronously; a table cannot. Every caller is
 * already an async server component or route handler, so this is an `await`
 * at each call site and nothing else changes -- the returned `BlogPost` is the
 * same object shape, so the renderer, the outline builder, the sitemap and the
 * feed are all untouched.
 *
 * READ AT BUILD TIME, NOT PER REQUEST. `generateStaticParams` and the page
 * bodies run during the build, so the posts are baked into static HTML exactly
 * as they were when they came from a file. Publishing from the admin editor
 * will therefore need a revalidation, which is the trade recorded in
 * plans/blog-to-db.md: it keeps every post as fast as it is today, and moving
 * to on-demand revalidation later is a change to caching rather than to this
 * file.
 *
 * THE FIXTURE IS STILL THE FALLBACK, and that is deliberate rather than
 * timid. Until the editor in 4.8 exists, `lib/blog.ts` is the only way to
 * write a post, so it remains the source of truth that `scripts/seed-blog.mjs`
 * copies in. If the database is unreachable at build time the site builds from
 * the fixture instead of failing -- a blog that is one revision stale beats a
 * deploy that cannot go out. Delete the fallback in the same change that ships
 * the editor, not before.
 */

/** A row as the table stores it. `body` and `tags` come back parsed. */
type Row = {
  slug: string;
  title: string;
  seo_title: string;
  description: string;
  excerpt: string;
  topic: string;
  tags: string[];
  cover: string;
  body: BlogBlock[];
  published_at: Date | null;
  updated_at: Date | null;
};

/** ISO date, which is what `BlogPost.date` is and what the pages format. */
const iso = (d: Date | null): string =>
  (d ?? new Date()).toISOString().slice(0, 10);

const toPost = (r: Row): BlogPost => ({
  slug: r.slug,
  title: r.title,
  seoTitle: r.seo_title,
  description: r.description,
  excerpt: r.excerpt,
  date: iso(r.published_at),
  ...(r.updated_at ? { updated: iso(r.updated_at) } : {}),
  topic: r.topic as ServiceSlug,
  tags: Array.isArray(r.tags) ? r.tags : [],
  cover: r.cover,
  body: Array.isArray(r.body) ? r.body : [],
});

/* Only what is published AND dated at or before now, so a post written today
   for next week stays invisible until then. The index behind this query is
   partial on exactly that condition. */
const LIVE = `
  FROM blog_posts
  WHERE status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= now()
`;

/**
 * Every live post, newest first.
 *
 * Falls back to the fixture rather than throwing: see the note above.
 */
export async function postsNewestFirstDb(): Promise<BlogPost[]> {
  try {
    const result = await db.query<Row>(
      `SELECT slug, title, seo_title, description, excerpt, topic, tags, cover,
              body, published_at, updated_at
       ${LIVE}
       ORDER BY published_at DESC`,
    );
    if (result.rowCount) return result.rows.map(toPost);
  } catch {
    /* Unreachable at build time. Fall through. */
  }
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One post, or undefined. */
export async function postBySlugDb(slug: string): Promise<BlogPost | undefined> {
  try {
    const result = await db.query<Row>(
      `SELECT slug, title, seo_title, description, excerpt, topic, tags, cover,
              body, published_at, updated_at
       ${LIVE} AND slug = $1
       LIMIT 1`,
      [slug],
    );
    const row = result.rows[0];
    if (row) return toPost(row);
  } catch {
    /* Fall through. */
  }
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/**
 * Others worth reading, same topic first.
 *
 * The ordering rule is the fixture's: posts under the same topic, newest
 * first, then anything else to make the count up. Doing it in SQL rather than
 * in JavaScript keeps it one query and lets the topic index do the work.
 */
export async function relatedPostsDb(post: BlogPost, limit = 2): Promise<BlogPost[]> {
  try {
    const result = await db.query<Row>(
      `SELECT slug, title, seo_title, description, excerpt, topic, tags, cover,
              body, published_at, updated_at
       ${LIVE} AND slug <> $1
       ORDER BY (topic = $2) DESC, published_at DESC
       LIMIT $3`,
      [post.slug, post.topic, limit],
    );
    if (result.rowCount) return result.rows.map(toPost);
  } catch {
    /* Fall through. */
  }
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const mine = others.filter((p) => p.topic === post.topic);
  const rest = others.filter((p) => p.topic !== post.topic);
  return [...mine, ...rest].slice(0, limit);
}
