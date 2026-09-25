import type { BlogBlock } from "@/lib/blog";

/**
 * A post body written in the rich-text editor.
 *
 * THIS IS STILL STRUCTURE, NOT HTML. The editor (TipTap) produces a
 * ProseMirror document; what is stored is that document after `cleanDoc` has
 * rebuilt it from a whitelist: paragraphs, h2 and h3, bullet and numbered
 * lists, quotes, images, and bold, italic and links inside text. Anything else
 * a crafted POST carries -- an h1, a script, an inline style, a
 * `javascript:` link, an image from somebody else's server -- is dropped, not
 * escaped, so the renderer never has to decide what to trust. The guarantees
 * `lib/blog.ts` makes for block bodies (one h1 per page, an outline that
 * nests) hold for this shape too, and are checked in `lib/blog-validate.ts`.
 *
 * No `server-only`: the editor and the spec import it as well.
 */

export type DocMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type DocInline =
  | { type: "text"; text: string; marks?: DocMark[] }
  | { type: "hardBreak" };

export type DocBlock =
  | { type: "paragraph"; content?: DocInline[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: DocInline[] }
  | { type: "bulletList" | "orderedList"; content: DocListItem[] }
  | { type: "blockquote"; content: DocBlock[] }
  | { type: "image"; attrs: { src: string; alt: string; width?: number; height?: number } }
  | { type: "video"; attrs: { src: string; title: string; width?: number; height?: number } };

export type DocListItem = { type: "listItem"; content: DocBlock[] };
export type RichDoc = { type: "doc"; content: DocBlock[] };

/** What a post's body can be: the original block list, or an editor document. */
export type BlogBody = BlogBlock[] | RichDoc;

export const DOC_LIMITS = { nodes: 3_000, text: 4_000, alt: 200 } as const;

export const isDoc = (v: unknown): v is RichDoc =>
  Boolean(v) && typeof v === "object" && (v as { type?: unknown }).type === "doc" && Array.isArray((v as { content?: unknown }).content);

/**
 * A link a reader can safely follow: https, http, mailto, or a path on this
 * site. Protocol-relative `//host` is refused because it is somebody else's
 * site wearing ours.
 */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim().slice(0, 500);
  if (/^\/(?!\/)/.test(href) || /^#[\w-]+$/.test(href)) return href;
  try {
    const u = new URL(href);
    return ["https:", "http:", "mailto:"].includes(u.protocol) ? u.toString() : null;
  } catch { return null; }
}

/**
 * An image the post may show: a file on this site, or one in our own media
 * bucket. `hosts` is the list of allowed origins (the R2 public base), passed
 * in by the server, which is the only side that knows it.
 */
export function safeImage(raw: unknown, hosts: readonly string[]): string | null {
  if (typeof raw !== "string") return null;
  const src = raw.trim().slice(0, 500);
  if (/^\/(?!\/)[\w\-./]+$/.test(src)) return src;
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return null;
    return hosts.some((h) => { try { return new URL(h).origin === u.origin; } catch { return false; } }) ? u.toString() : null;
  } catch { return null; }
}

/** A clip the post may play: an MP4 or WebM from this site or our own bucket. */
export function safeVideo(raw: unknown, hosts: readonly string[]): string | null {
  const src = safeImage(raw, hosts);
  return src && /\.(mp4|webm)(\?.*)?$/i.test(src) ? src : null;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const dim = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < 20_000 ? Math.round(v) : undefined);

/**
 * Rebuild a document from anything, keeping only what the whitelist allows.
 * Empty paragraphs, lists and quotes are dropped; the node budget stops a
 * body the size of a novel from ever reaching the database.
 */
export function cleanDoc(raw: unknown, opts: { imageHosts?: readonly string[] } = {}): RichDoc {
  const hosts = opts.imageHosts ?? [];
  let budget: number = DOC_LIMITS.nodes;
  const spend = () => (budget -= 1) >= 0;

  const marks = (v: unknown): DocMark[] => {
    const out: DocMark[] = [];
    for (const m of arr(v)) {
      const o = obj(m);
      if (!o) continue;
      if ((o.type === "bold" || o.type === "italic") && !out.some((x) => x.type === o.type)) out.push({ type: o.type });
      if (o.type === "link" && !out.some((x) => x.type === "link")) {
        const href = safeHref(obj(o.attrs)?.href);
        if (href) out.push({ type: "link", attrs: { href } });
      }
    }
    return out;
  };

  const inline = (v: unknown): DocInline[] => {
    const out: DocInline[] = [];
    let length = 0;
    for (const n of arr(v)) {
      const o = obj(n);
      if (!o || !spend()) continue;
      if (o.type === "hardBreak") { out.push({ type: "hardBreak" }); continue; }
      if (o.type !== "text" || typeof o.text !== "string" || !o.text) continue;
      const text = o.text.replace(/\r\n?/g, "\n").slice(0, Math.max(0, DOC_LIMITS.text - length));
      if (!text) continue;
      length += text.length;
      const m = marks(o.marks);
      out.push(m.length ? { type: "text", text, marks: m } : { type: "text", text });
    }
    /* Trailing breaks are an empty line, not content. */
    while (out.length && out[out.length - 1].type === "hardBreak") out.pop();
    return out;
  };

  const hasText = (c: DocInline[]) => c.some((n) => n.type === "text" && n.text.trim());

  const blocks = (v: unknown, depth: number): DocBlock[] => {
    const out: DocBlock[] = [];
    for (const n of arr(v)) {
      const o = obj(n);
      if (!o || !spend()) continue;
      switch (o.type) {
        case "paragraph": {
          const content = inline(o.content);
          if (hasText(content)) out.push({ type: "paragraph", content });
          break;
        }
        case "heading": {
          /* Inside a list or a quote a heading is a paragraph in disguise. */
          const content = inline(o.content);
          if (!hasText(content)) break;
          const level = obj(o.attrs)?.level === 3 ? 3 : 2;
          out.push(depth === 0 ? { type: "heading", attrs: { level }, content } : { type: "paragraph", content });
          break;
        }
        case "bulletList": case "orderedList": {
          if (depth > 3) break;
          const items: DocListItem[] = [];
          for (const li of arr(o.content)) {
            const l = obj(li);
            if (!l || l.type !== "listItem" || !spend()) continue;
            const content = blocks(l.content, depth + 1).filter((b) => b.type !== "image");
            if (content.length) items.push({ type: "listItem", content });
          }
          if (items.length) out.push({ type: o.type, content: items });
          break;
        }
        case "blockquote": {
          if (depth > 2) break;
          const content = blocks(o.content, depth + 1).filter((b) => b.type === "paragraph" || b.type === "bulletList" || b.type === "orderedList");
          if (content.length) out.push({ type: "blockquote", content });
          break;
        }
        case "image": {
          if (depth > 0) break;
          const a = obj(o.attrs) ?? {};
          const src = safeImage(a.src, hosts);
          if (!src) break;
          const alt = typeof a.alt === "string" ? a.alt.trim().slice(0, DOC_LIMITS.alt) : "";
          const width = dim(a.width), height = dim(a.height);
          out.push({ type: "image", attrs: { src, alt, ...(width && height ? { width, height } : {}) } });
          break;
        }
        case "video": {
          if (depth > 0) break;
          const a = obj(o.attrs) ?? {};
          const src = safeVideo(a.src, hosts);
          if (!src) break;
          const title = typeof a.title === "string" ? a.title.trim().slice(0, DOC_LIMITS.alt) : "";
          const width = dim(a.width), height = dim(a.height);
          out.push({ type: "video", attrs: { src, title, ...(width && height ? { width, height } : {}) } });
          break;
        }
        default: break;
      }
    }
    return out;
  };

  const root = obj(raw);
  return { type: "doc", content: root?.type === "doc" ? blocks(root.content, 0) : [] };
}

/* ------------------------------------------------------------- converting */

const para = (text: string, marks?: DocMark[]): DocBlock => ({
  type: "paragraph", content: [marks ? { type: "text", text, marks } : { type: "text", text }],
});

/**
 * An original block post as an editor document, so a post written before the
 * editor opens in it with nothing lost. A callout becomes a quote whose first
 * line is its title in bold; a quote's attribution becomes its last line.
 */
export function blocksToDoc(blocks: BlogBlock[]): RichDoc {
  const content: DocBlock[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "p": content.push(para(b.text)); break;
      case "h2": case "h3":
        content.push({ type: "heading", attrs: { level: b.kind === "h2" ? 2 : 3 }, content: [{ type: "text", text: b.text }] });
        break;
      case "list":
        content.push({ type: "bulletList", content: b.items.map((i) => ({ type: "listItem", content: [para(i)] })) });
        break;
      case "quote":
        content.push({ type: "blockquote", content: [para(b.text), ...(b.who ? [para(b.who, [{ type: "italic" }])] : [])] });
        break;
      case "callout":
        content.push({ type: "blockquote", content: [para(b.title, [{ type: "bold" }]), para(b.text)] });
        break;
    }
  }
  return { type: "doc", content };
}

export const toDoc = (body: BlogBody): RichDoc => (isDoc(body) ? body : blocksToDoc(body));

/* ---------------------------------------------------------------- reading */

export const inlineText = (content: DocInline[] | undefined) =>
  (content ?? []).map((n) => (n.type === "text" ? n.text : " ")).join("");

/** Every word a reader will read, for the reading time. */
export function docText(doc: RichDoc): string {
  const walk = (b: DocBlock): string => {
    switch (b.type) {
      case "paragraph": case "heading": return inlineText(b.content);
      case "bulletList": case "orderedList": return b.content.map((li) => li.content.map(walk).join(" ")).join(" ");
      case "blockquote": return b.content.map(walk).join(" ");
      default: return "";
    }
  };
  return doc.content.map(walk).join(" ");
}

/** The h2/h3 headings, in order: the contents list and the outline check. */
export const docHeadings = (doc: RichDoc) =>
  doc.content
    .filter((b): b is Extract<DocBlock, { type: "heading" }> => b.type === "heading")
    .map((b) => ({ level: b.attrs.level, text: inlineText(b.content).trim() }));
