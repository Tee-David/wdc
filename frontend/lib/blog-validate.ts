import { SERVICES, type ServiceSlug } from "@/lib/services";
import { BLOG_POSTS, type BlogBlock } from "@/lib/blog";
import { blocksToDoc, cleanDoc, docHeadings, isDoc, safeImage, type RichDoc } from "@/lib/blog-doc";

/**
 * What the blog editor is allowed to write.
 *
 * NO `server-only`, so the spec can import it and the editor can show the
 * same limits the server enforces. Everything here treats its input as
 * hostile: the editor is a form, and a form is a POST anybody can send.
 *
 * THE BODY IS A WHITELISTED DOCUMENT, NEVER MARKUP. The rich-text editor
 * sends a ProseMirror document; `cleanDoc` rebuilds it from the nodes the
 * renderer knows (paragraphs, h2/h3, lists, quotes, images; bold, italic,
 * links) and drops everything else. A body in the original block shape is
 * converted first, so an older client or a script cannot bypass the check.
 * There is no HTML anywhere in this path, because an editor that accepts
 * markup has given the one-h1, nested-outline guarantee away.
 */

/* "review" is a draft handed to the owner: nobody outside can see it either. */
export const POST_STATUSES = ["draft", "review", "scheduled", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** The covers are the site's own hero photographs; nothing else is offered. */
export const BLOG_COVERS: readonly string[] = [...new Set(BLOG_POSTS.map((p) => p.cover))].sort();

export const LIMITS = {
  title: 110,
  seoTitle: { max: 60 },
  description: { min: 120, max: 155 },
  excerpt: 220,
  tags: 8,
  blocks: 200,
  text: 4_000,
} as const;

export type PostInput = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  topic: ServiceSlug;
  tags: string[];
  cover: string;
  canonical: string | null;
  socialImage: string | null;
  body: RichDoc;
  status: PostStatus;
  /** The display date. Required to publish or schedule; ignored for a draft. */
  publishedAt: string | null;
  /** Ticked when a published post is revised enough to say so. */
  revised: boolean;
};

type Raw = Record<string, unknown>;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");

function block(raw: unknown): BlogBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Raw;
  switch (b.kind) {
    case "p": case "h2": case "h3": {
      const t = text(b.text, LIMITS.text);
      return t ? { kind: b.kind, text: t } : null;
    }
    case "list": {
      const items = Array.isArray(b.items) ? b.items.map((i) => text(i, 600)).filter(Boolean).slice(0, 30) : [];
      return items.length ? { kind: "list", items } : null;
    }
    case "quote": {
      const t = text(b.text, LIMITS.text);
      const who = text(b.who, 120);
      return t ? { kind: "quote", text: t, ...(who ? { who } : {}) } : null;
    }
    case "callout": {
      const title = text(b.title, 120), t = text(b.text, LIMITS.text);
      return title && t ? { kind: "callout", title, text: t } : null;
    }
    default: return null;
  }
}

export function parsePost(raw: Raw, opts: { imageHosts?: readonly string[] } = {}): { ok: true; post: PostInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const slug = text(raw.slug, 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = "Lower-case letters, numbers and single hyphens, like how-we-price-a-website.";

  const title = text(raw.title, LIMITS.title);
  if (!title) errors.title = "A post needs a headline.";

  const seoTitle = text(raw.seoTitle, 200);
  if (!seoTitle) errors.seoTitle = "Write the title a search result should show.";
  else if (seoTitle.length > LIMITS.seoTitle.max) errors.seoTitle = `${seoTitle.length} characters. Google cuts titles at about ${LIMITS.seoTitle.max}.`;

  const description = text(raw.description, 400);
  if (description.length < LIMITS.description.min || description.length > LIMITS.description.max) {
    errors.description = `${description.length} characters. Between ${LIMITS.description.min} and ${LIMITS.description.max} is what earns a full snippet.`;
  }

  const excerpt = text(raw.excerpt, LIMITS.excerpt);
  if (!excerpt) errors.excerpt = "One sentence for the index card.";

  const topic = text(raw.topic, 40);
  if (!SERVICES.some((s) => s.slug === topic)) errors.topic = "Pick the service this post belongs to.";

  const tags = (typeof raw.tags === "string" ? raw.tags.split(",") : Array.isArray(raw.tags) ? raw.tags : [])
    .map((t) => text(t, 40)).filter(Boolean);
  const uniqueTags = [...new Set(tags)].slice(0, LIMITS.tags);

  const cover = text(raw.cover, 500);
  /* One of the site's own, or a photo uploaded to our own media bucket. */
  const ownCover = (v: string) => BLOG_COVERS.includes(v) || Boolean(opts.imageHosts?.length && safeImage(v, opts.imageHosts) && /^https:/.test(v));
  if (!ownCover(cover)) errors.cover = "Pick one of the site's cover photographs, or upload one.";

  const canonicalRaw = text(raw.canonical, 500);
  let canonical: string | null = null;
  if (canonicalRaw) {
    try {
      const u = new URL(canonicalRaw);
      if (u.protocol !== "https:") throw new Error();
      canonical = u.toString();
    } catch { errors.canonical = "An https address, or leave it empty to use the post's own URL."; }
  }

  const socialRaw = text(raw.socialImage, 500);
  const socialImage = socialRaw || null;
  if (socialImage && !ownCover(socialImage)) errors.socialImage = "Leave it empty to use the drawn card, or pick a cover photograph.";

  let parsedBody: unknown = raw.body;
  if (typeof parsedBody === "string") {
    try { parsedBody = JSON.parse(parsedBody); } catch { parsedBody = null; }
  }
  const legacy = Array.isArray(parsedBody)
    ? blocksToDoc(parsedBody.slice(0, LIMITS.blocks).map(block).filter((b): b is BlogBlock => b !== null))
    : null;
  const body = cleanDoc(legacy ?? (isDoc(parsedBody) ? parsedBody : null), { imageHosts: opts.imageHosts });
  if (!body.content.some((b) => b.type === "paragraph")) errors.body = "The post needs at least one paragraph.";
  /* A PICTURE THE WHITELIST REFUSED IS SAID, NOT SWALLOWED. cleanDoc drops an
     image from another website (or one tucked inside a list or quote); saving
     without a word left the owner looking for a picture that had gone. */
  const offered = JSON.stringify(parsedBody ?? null).match(/"type":"image"/g)?.length ?? 0;
  const kept = body.content.filter((b) => b.type === "image").length;
  if (!legacy && offered > kept) {
    errors.body = offered - kept === 1
      ? "One picture cannot be used: it is from another website, or inside a list or quote. Upload it with Picture, on a line of its own."
      : `${offered - kept} pictures cannot be used: they are from another website, or inside a list or quote. Upload them with Picture, each on a line of its own.`;
  }
  /* The outline rule the renderer relies on: an h3 only ever sits under an h2. */
  if (docHeadings(body)[0]?.level === 3) errors.body = "The first heading has to be a section heading (h2); a sub-heading needs a section above it.";

  const status = (POST_STATUSES as readonly string[]).includes(String(raw.status)) ? (raw.status as PostStatus) : "draft";
  const dateRaw = text(raw.publishedAt, 40);
  let publishedAt: string | null = null;
  if (dateRaw) {
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? `${dateRaw}T08:00:00.000Z` : dateRaw);
    if (Number.isNaN(d.getTime())) errors.publishedAt = "That is not a date.";
    else publishedAt = d.toISOString();
  }
  if ((status === "published" || status === "scheduled") && !publishedAt) errors.publishedAt = "Publishing or scheduling needs a date.";
  /* A DAY, NOT A MOMENT. A date-only value is stored at 08:00 UTC (09:00 in
     Lagos), so "published, today" pressed at 7am was a post that stayed
     hidden for two hours while the editor said it was live. Published means
     live now: today's date is clamped to this moment, and a later day is
     what Scheduled is for. */
  if (status === "published" && publishedAt && new Date(publishedAt) > new Date()) {
    const lagosToday = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) && dateRaw <= lagosToday) publishedAt = new Date().toISOString();
    else errors.publishedAt = "That date is still to come. Choose Scheduled to publish it then, or today's date to publish now.";
  }
  if (status === "scheduled" && publishedAt && new Date(publishedAt) <= new Date()) {
    errors.publishedAt = "A scheduled post needs a date in the future. For today, publish it.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    post: {
      slug, title, seoTitle, description, excerpt, topic: topic as ServiceSlug, tags: uniqueTags, cover,
      canonical, socialImage, body, status,
      publishedAt,
      revised: raw.revised === true || raw.revised === "on" || raw.revised === "1",
    },
  };
}
