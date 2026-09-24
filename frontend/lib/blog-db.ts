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
 * THE FIXTURE IS THE FALLBACK FOR AN UNREACHABLE DATABASE, AND ONLY THAT.
 * The admin editor writes here now, so a reachable table is the truth even
 * when it answers with nothing: a post the editor unpublished must not come
 * back from `lib/blog.ts`. It used to fall back on an empty answer too, which
 * would have done exactly that. If the database cannot be reached at build
 * time the site still builds from the fixture -- a blog that is one revision
 * stale beats a deploy that cannot go out.
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
  canonical: string | null;
  social_image: string | null;
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
  ...(r.canonical ? { canonical: r.canonical } : {}),
  ...(r.social_image ? { socialImage: r.social_image } : {}),
});

const COLUMNS = `slug, title, seo_title, description, excerpt, topic, tags, cover,
              body, published_at, updated_at, canonical, social_image`;

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
      `SELECT ${COLUMNS}
       ${LIVE}
       ORDER BY published_at DESC`,
    );
    return result.rows.map(toPost);
  } catch {
    /* Unreachable at build time. Fall through. */
  }
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One post, or undefined. */
export async function postBySlugDb(slug: string): Promise<BlogPost | undefined> {
  try {
    const result = await db.query<Row>(
      `SELECT ${COLUMNS}
       ${LIVE} AND slug = $1
       LIMIT 1`,
      [slug],
    );
    const row = result.rows[0];
    return row ? toPost(row) : undefined;
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
      `SELECT ${COLUMNS}
       ${LIVE} AND slug <> $1
       ORDER BY (topic = $2) DESC, published_at DESC
       LIMIT $3`,
      [post.slug, post.topic, limit],
    );
    return result.rows.map(toPost);
  } catch {
    /* Fall through. */
  }
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  const mine = others.filter((p) => p.topic === post.topic);
  const rest = others.filter((p) => p.topic !== post.topic);
  return [...mine, ...rest].slice(0, limit);
}

/* ================================================================ editor ===
   Everything below is for the admin editor and the preview. None of it falls
   back to the fixture: an editor that silently showed the file when the table
   was unreachable would be editing something that is not there. */

export type AdminPost = BlogPost & {
  id: string;
  status: "draft" | "published";
  /** Derived: published with a date still in the future. */
  scheduled: boolean;
  publishedAt: string | null;
  savedBy: string | null;
  savedAt: string | null;
};

type AdminRow = Row & { id: string; status: string; saved_by: string | null; saved_at: Date | null };

const toAdmin = (r: AdminRow): AdminPost => ({
  ...toPost(r),
  id: r.id,
  status: r.status === "published" ? "published" : "draft",
  scheduled: r.status === "published" && !!r.published_at && new Date(r.published_at) > new Date(),
  publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
  savedBy: r.saved_by,
  savedAt: r.saved_at ? new Date(r.saved_at).toISOString() : null,
});

const ADMIN_COLUMNS = `id, status, saved_by, saved_at, ${COLUMNS}`;

/** Every post, any state. Drafts first, then newest. Bounded. */
export async function postsForAdmin(limit = 200): Promise<AdminPost[]> {
  const result = await db.query<AdminRow>(
    `SELECT ${ADMIN_COLUMNS} FROM blog_posts
     ORDER BY (status = 'draft') DESC, published_at DESC NULLS FIRST, created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(toAdmin);
}

export async function postForAdmin(id: string): Promise<AdminPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<AdminRow>(`SELECT ${ADMIN_COLUMNS} FROM blog_posts WHERE id = $1`, [id]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
}

/** For the preview only: the post whatever its state. */
export async function postForPreview(slug: string): Promise<BlogPost | undefined> {
  const result = await db.query<Row>(`SELECT ${COLUMNS} FROM blog_posts WHERE slug = $1 LIMIT 1`, [slug]);
  return result.rows[0] ? toPost(result.rows[0]) : undefined;
}

export type SaveResult =
  | { ok: true; id: string; slug: string; previousSlug: string | null }
  | { ok: false; reason: "slug-taken" | "missing" | "slug-locked" };

/**
 * Insert or update one post.
 *
 * `updated_at` IS THE READER'S "UPDATED" DATE, so it moves only when the
 * editor says the revision is worth announcing, and only on a post that was
 * already live. A typo fix must not claim the post was rewritten.
 */
export async function savePost(
  id: string | null,
  p: import("@/lib/blog-validate").PostInput,
  by: string,
): Promise<SaveResult> {
  const stored = p.status === "draft" ? "draft" : "published";
  const values = [
    p.slug, p.title, p.seoTitle, p.description, p.excerpt, p.topic, JSON.stringify(p.tags), p.cover,
    JSON.stringify(p.body), stored, p.publishedAt, p.canonical, p.socialImage, by,
  ];
  try {
    if (!id) {
      const r = await db.query<{ id: string }>(
        `INSERT INTO blog_posts (slug, title, seo_title, description, excerpt, topic, tags, cover, body,
                                 status, published_at, canonical, social_image, saved_by, saved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::JSONB, $8, $9::JSONB, $10, $11, $12, $13, $14, now())
         RETURNING id`,
        values,
      );
      return { ok: true, id: r.rows[0].id, slug: p.slug, previousSlug: null };
    }
    const before = await db.query<{ slug: string; status: string; published_at: Date | null }>(
      "SELECT slug, status, published_at FROM blog_posts WHERE id = $1", [id],
    );
    const was = before.rows[0];
    if (!was) return { ok: false, reason: "missing" };
    const wasLive = was.status === "published" && !!was.published_at && new Date(was.published_at) <= new Date();
    /* A live post's address is in search results, feeds and other people's
       links. Changing it would turn every one of those into a 404. */
    if (wasLive && was.slug !== p.slug) return { ok: false, reason: "slug-locked" };
    const touch = p.revised && wasLive && stored === "published";
    await db.query(
      `UPDATE blog_posts SET slug = $1, title = $2, seo_title = $3, description = $4, excerpt = $5,
              topic = $6, tags = $7::JSONB, cover = $8, body = $9::JSONB, status = $10,
              published_at = $11, canonical = $12, social_image = $13, saved_by = $14, saved_at = now()
              ${touch ? ", updated_at = now()" : ""}
       WHERE id = $15`,
      [...values, id],
    );
    return { ok: true, id, slug: p.slug, previousSlug: was.slug !== p.slug ? was.slug : null };
  } catch (error) {
    /* 23505 is a unique violation, and the only unique column is the slug. */
    if ((error as { code?: string }).code === "23505") return { ok: false, reason: "slug-taken" };
    throw error;
  }
}

/**
 * The list's quick actions. "Publish now" dates the post today unless it
 * already carries a date in the past, so a post moved back from draft keeps
 * the date it first went out. A draft is the only thing that can be deleted:
 * a post that has been live is in search results and other people's links,
 * so it is unpublished, never erased.
 */
export async function publishPostNow(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts
     SET status = 'published',
         published_at = CASE WHEN published_at IS NOT NULL AND published_at <= now() THEN published_at ELSE now() END,
         saved_by = $2, saved_at = now()
     WHERE id = $1 RETURNING slug, title`,
    [id, by],
  );
  return r.rows[0] ?? null;
}

export async function movePostToDraft(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts SET status = 'draft', saved_by = $2, saved_at = now() WHERE id = $1 RETURNING slug, title`,
    [id, by],
  );
  return r.rows[0] ?? null;
}

export async function deleteDraftPost(id: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `DELETE FROM blog_posts WHERE id = $1 AND status = 'draft' RETURNING slug, title`,
    [id],
  );
  return r.rows[0] ?? null;
}
