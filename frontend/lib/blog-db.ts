import "server-only";

import { db } from "@/lib/db/pool";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog";
import { isDoc, type BlogBody } from "@/lib/blog-doc";
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
  body: BlogBody;
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
  body: Array.isArray(r.body) || isDoc(r.body) ? r.body : [],
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
  status: "draft" | "review" | "published";
  /** Derived: published with a date still in the future. */
  scheduled: boolean;
  publishedAt: string | null;
  savedBy: string | null;
  savedAt: string | null;
  trashedAt: string | null;
  trashedBy: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  /** The owner's note when they sent it back; cleared when it is submitted again. */
  reviewNote: string | null;
  reviewBy: string | null;
};

type AdminRow = Row & {
  id: string; status: string; saved_by: string | null; saved_at: Date | null;
  trashed_at: Date | null; trashed_by: string | null;
  submitted_by: string | null; submitted_at: Date | null; review_note: string | null; review_by: string | null;
};

const toAdmin = (r: AdminRow): AdminPost => ({
  ...toPost(r),
  id: r.id,
  status: r.status === "published" ? "published" : r.status === "review" ? "review" : "draft",
  scheduled: r.status === "published" && !!r.published_at && new Date(r.published_at) > new Date(),
  publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
  savedBy: r.saved_by,
  savedAt: r.saved_at ? new Date(r.saved_at).toISOString() : null,
  trashedAt: r.trashed_at ? new Date(r.trashed_at).toISOString() : null,
  trashedBy: r.trashed_by,
  submittedBy: r.submitted_by,
  submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
  reviewNote: r.review_note,
  reviewBy: r.review_by,
});

const ADMIN_COLUMNS = `id, status, saved_by, saved_at, trashed_at, trashed_by, submitted_by, submitted_at, review_note, review_by, ${COLUMNS}`;

/** Every post not in the Trash, any state. Drafts first, then newest. Bounded. */
export async function postsForAdmin(limit = 200): Promise<AdminPost[]> {
  const result = await db.query<AdminRow>(
    `SELECT ${ADMIN_COLUMNS} FROM blog_posts WHERE trashed_at IS NULL
     ORDER BY (status = 'review') DESC, (status = 'draft') DESC, published_at DESC NULLS FIRST, created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map(toAdmin);
}

/** The Trash, most recently thrown out first. */
export async function trashedPosts(limit = 200): Promise<AdminPost[]> {
  const result = await db.query<AdminRow>(
    `SELECT ${ADMIN_COLUMNS} FROM blog_posts WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC LIMIT $1`, [limit],
  );
  return result.rows.map(toAdmin);
}

export async function trashedPostCount(): Promise<number> {
  const r = await db.query<{ n: string }>("SELECT count(*) AS n FROM blog_posts WHERE trashed_at IS NOT NULL");
  return Number(r.rows[0]?.n ?? 0);
}

/** A post to edit. One in the Trash is not: restore it first. */
export async function postForAdmin(id: string): Promise<AdminPost | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await db.query<AdminRow>(`SELECT ${ADMIN_COLUMNS} FROM blog_posts WHERE id = $1 AND trashed_at IS NULL`, [id]);
  return result.rows[0] ? toAdmin(result.rows[0]) : null;
}

/** For the preview only: the post whatever its state. */
export async function postForPreview(slug: string): Promise<BlogPost | undefined> {
  const result = await db.query<Row>(`SELECT ${COLUMNS} FROM blog_posts WHERE slug = $1 AND trashed_at IS NULL LIMIT 1`, [slug]);
  return result.rows[0] ? toPost(result.rows[0]) : undefined;
}

export type SaveResult =
  | { ok: true; id: string; slug: string; previousSlug: string | null; savedAt: string }
  | { ok: false; reason: "slug-taken" | "missing" | "slug-locked" }
  /* Somebody saved it after this editor opened it. */
  | { ok: false; reason: "stale"; savedBy: string | null; savedAt: string | null };

/**
 * Insert or update one post.
 *
 * `updated_at` IS THE READER'S "UPDATED" DATE, so it moves only when the
 * editor says the revision is worth announcing, and only on a post that was
 * already live. A typo fix must not claim the post was rewritten.
 *
 * OPTIMISTIC CONCURRENCY. `opened` is the `saved_at` the editor loaded (or
 * last saved). The update only lands while the row still carries it, so two
 * people editing the same post cannot silently overwrite each other: the
 * second is refused and told who saved and when. Compared to the
 * millisecond, because that is all a JavaScript date carries. `undefined`
 * skips the check, for a caller that is not an editor.
 */
export async function savePost(
  id: string | null,
  p: import("@/lib/blog-validate").PostInput,
  by: string,
  opened?: string | null,
): Promise<SaveResult> {
  const stored = p.status === "draft" ? "draft" : p.status === "review" ? "review" : "published";
  /* Submitting stamps who and when and clears the owner's last note. */
  const submitting = stored === "review";
  const values = [
    p.slug, p.title, p.seoTitle, p.description, p.excerpt, p.topic, JSON.stringify(p.tags), p.cover,
    JSON.stringify(p.body), stored, p.publishedAt, p.canonical, p.socialImage, by,
  ];
  try {
    if (!id) {
      const r = await db.query<{ id: string; saved_at: Date }>(
        `INSERT INTO blog_posts (slug, title, seo_title, description, excerpt, topic, tags, cover, body,
                                 status, published_at, canonical, social_image, saved_by, saved_at,
                                 submitted_by, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::JSONB, $8, $9::JSONB, $10, $11, $12, $13, $14, now(),
                 ${submitting ? "$14, now()" : "NULL, NULL"})
         RETURNING id, saved_at`,
        values,
      );
      return { ok: true, id: r.rows[0].id, slug: p.slug, previousSlug: null, savedAt: new Date(r.rows[0].saved_at).toISOString() };
    }
    const before = await db.query<{ slug: string; status: string; published_at: Date | null }>(
      "SELECT slug, status, published_at FROM blog_posts WHERE id = $1 AND trashed_at IS NULL", [id],
    );
    const was = before.rows[0];
    if (!was) return { ok: false, reason: "missing" };
    const wasLive = was.status === "published" && !!was.published_at && new Date(was.published_at) <= new Date();
    /* A live post's address is in search results, feeds and other people's
       links. Changing it would turn every one of those into a 404. */
    if (wasLive && was.slug !== p.slug) return { ok: false, reason: "slug-locked" };
    const touch = p.revised && wasLive && stored === "published";
    const check = opened === undefined ? "" : "AND date_trunc('milliseconds', saved_at) IS NOT DISTINCT FROM $16::TIMESTAMPTZ";
    const updated = await db.query<{ saved_at: Date }>(
      `UPDATE blog_posts SET slug = $1, title = $2, seo_title = $3, description = $4, excerpt = $5,
              topic = $6, tags = $7::JSONB, cover = $8, body = $9::JSONB, status = $10,
              published_at = $11, canonical = $12, social_image = $13, saved_by = $14, saved_at = now()
              ${touch ? ", updated_at = now()" : ""}
              ${submitting ? ", submitted_by = $14, submitted_at = now(), review_note = NULL, review_by = NULL" : ""}
       WHERE id = $15 AND trashed_at IS NULL ${check}
       RETURNING saved_at`,
      opened === undefined ? [...values, id] : [...values, id, opened],
    );
    if (!updated.rows[0]) {
      const now = await db.query<{ saved_by: string | null; saved_at: Date | null }>(
        "SELECT saved_by, saved_at FROM blog_posts WHERE id = $1 AND trashed_at IS NULL", [id],
      );
      if (!now.rows[0]) return { ok: false, reason: "missing" };
      return {
        ok: false, reason: "stale", savedBy: now.rows[0].saved_by,
        savedAt: now.rows[0].saved_at ? new Date(now.rows[0].saved_at).toISOString() : null,
      };
    }
    return {
      ok: true, id, slug: p.slug, previousSlug: was.slug !== p.slug ? was.slug : null,
      savedAt: new Date(updated.rows[0].saved_at).toISOString(),
    };
  } catch (error) {
    /* 23505 is a unique violation, and the only unique column is the slug. */
    if ((error as { code?: string }).code === "23505") return { ok: false, reason: "slug-taken" };
    throw error;
  }
}

/**
 * The list's quick actions. "Publish now" dates the post today unless it
 * already carries a date in the past, so a post moved back from draft keeps
 * the date it first went out. A draft is the only thing that can go in the
 * Trash: a post that has been live is in search results and other people's
 * links, so it is unpublished, never erased. Nothing here touches a post that
 * is already in the Trash.
 */
export async function publishPostNow(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts
     SET status = 'published',
         published_at = CASE WHEN published_at IS NOT NULL AND published_at <= now() THEN published_at ELSE now() END,
         saved_by = $2, saved_at = now()
     WHERE id = $1 AND trashed_at IS NULL RETURNING slug, title`,
    [id, by],
  );
  return r.rows[0] ?? null;
}

export async function movePostToDraft(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts SET status = 'draft', saved_by = $2, saved_at = now() WHERE id = $1 AND trashed_at IS NULL RETURNING slug, title`,
    [id, by],
  );
  return r.rows[0] ?? null;
}

export const POST_TRASH_DAYS = 30;

/** The posts waiting on the owner, for the nav and the dashboard. */
export async function reviewCount(): Promise<number> {
  const r = await db.query<{ n: string }>("SELECT count(*) AS n FROM blog_posts WHERE status = 'review' AND trashed_at IS NULL");
  return Number(r.rows[0]?.n ?? 0);
}

/** The owner sends a post back to its writer with a note; it is a draft again. */
export async function returnPost(id: string, note: string, by: string): Promise<{ slug: string; title: string; to: string | null } | null> {
  const r = await db.query<{ slug: string; title: string; submitted_by: string | null }>(
    `UPDATE blog_posts SET status = 'draft', review_note = $2, review_by = $3, saved_by = $3, saved_at = now()
     WHERE id = $1 AND status = 'review' AND trashed_at IS NULL RETURNING slug, title, submitted_by`,
    [id, note.slice(0, 2000), by],
  );
  const row = r.rows[0];
  return row ? { slug: row.slug, title: row.title, to: row.submitted_by } : null;
}

/** A draft (or a post in review) into the Trash. Its address stays reserved until it is removed. */
export async function trashDraftPost(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts SET trashed_at = now(), trashed_by = $2
     WHERE id = $1 AND status IN ('draft', 'review') AND trashed_at IS NULL RETURNING slug, title`,
    [id, by.slice(0, 120)],
  );
  return r.rows[0] ?? null;
}

/** Out of the Trash, as the draft it went in as. */
export async function restorePost(id: string, by: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `UPDATE blog_posts SET trashed_at = NULL, trashed_by = NULL, saved_by = $2, saved_at = now()
     WHERE id = $1 AND trashed_at IS NOT NULL RETURNING slug, title`,
    [id, by],
  );
  return r.rows[0] ?? null;
}

/** For good, and only from the Trash. */
export async function deleteTrashedPost(id: string): Promise<{ slug: string; title: string } | null> {
  const r = await db.query<{ slug: string; title: string }>(
    `DELETE FROM blog_posts WHERE id = $1 AND trashed_at IS NOT NULL RETURNING slug, title`,
    [id],
  );
  return r.rows[0] ?? null;
}

/** The daily tidy: what has been in the Trash longer than it keeps things. */
export async function purgeTrashedPosts(days = POST_TRASH_DAYS): Promise<number> {
  const r = await db.query(
    `DELETE FROM blog_posts WHERE trashed_at IS NOT NULL AND trashed_at < now() - ($1::INT * INTERVAL '1 day')`,
    [days],
  );
  return r.rowCount ?? 0;
}
