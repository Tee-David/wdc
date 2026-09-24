"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus, Save, Trash2 } from "lucide-react";
import type { BlogBlock } from "@/lib/blog";
import { saveBlogPost } from "@/lib/admin/blog-actions";
import { LIMITS } from "@/lib/blog-validate";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Radios, Select, Submit } from "./form";

export type EditorPost = {
  id: string | null;
  slug: string; title: string; seoTitle: string; description: string; excerpt: string;
  topic: string; tags: string[]; cover: string; canonical: string; socialImage: string;
  body: BlogBlock[];
  status: "draft" | "scheduled" | "published";
  publishedAt: string;
  live: boolean;
};

const KINDS: { value: BlogBlock["kind"]; label: string }[] = [
  { value: "p", label: "Paragraph" },
  { value: "h2", label: "Section heading" },
  { value: "h3", label: "Sub-heading" },
  { value: "list", label: "Bulleted list" },
  { value: "quote", label: "Quote" },
  { value: "callout", label: "Callout" },
];

function blank(kind: BlogBlock["kind"]): BlogBlock {
  switch (kind) {
    case "list": return { kind, items: [""] };
    case "quote": return { kind, text: "" };
    case "callout": return { kind, title: "", text: "" };
    default: return { kind, text: "" };
  }
}

/** Re-shape a block into another kind, keeping whatever text it had. */
function convert(b: BlogBlock, kind: BlogBlock["kind"]): BlogBlock {
  const words = b.kind === "list" ? b.items.join("\n") : b.text;
  if (kind === "list") return { kind, items: words.split("\n") };
  if (kind === "callout") return { kind, title: b.kind === "callout" ? b.title : "", text: words };
  if (kind === "quote") return { kind, text: words, ...(b.kind === "quote" && b.who ? { who: b.who } : {}) };
  return { kind, text: words };
}

/**
 * The live count under a search-result field, read off the real input.
 *
 * Listens to the named field in its own form rather than making the field
 * controlled, so the form kit's put-it-back-after-a-failure behaviour keeps
 * working untouched.
 */
function Count({ name, min, max }: { name: string; min?: number; max: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const field = ref.current?.closest("form")?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!field) return;
    const read = () => setN(field.value.trim().length);
    read();
    field.addEventListener("input", read);
    return () => field.removeEventListener("input", read);
  }, [name]);
  const bad = n !== null && (n > max || (min !== undefined && n > 0 && n < min));
  return (
    <span ref={ref} className={`adBlog__count${bad ? " is-bad" : ""}`} aria-live="polite">
      {n === null ? "" : `${n} characters${min !== undefined ? `, aim for ${min} to ${max}` : `, ${max} at most`}`}
    </span>
  );
}

function Blocks({ initial }: { initial: BlogBlock[] }) {
  const [blocks, setBlocks] = useState<BlogBlock[]>(initial.length ? initial : [blank("p")]);
  const id = useId();
  const set = (i: number, b: BlogBlock) => setBlocks((all) => all.map((x, j) => (j === i ? b : x)));
  const move = (i: number, by: number) => setBlocks((all) => {
    const next = [...all];
    const [b] = next.splice(i, 1);
    next.splice(i + by, 0, b);
    return next;
  });

  return (
    <fieldset className="adBlog__blocks" aria-describedby={`${id}-h`}>
      <legend className="ad__fl">Body</legend>
      <small className="ad__fh" id={`${id}-h`}>
        One block at a time. The post&apos;s headline is its title above, so sections start at &ldquo;Section heading&rdquo;.
      </small>
      <Hidden name="body" value={JSON.stringify(blocks)} />
      <ol className="adBlog__list">
        {blocks.map((b, i) => (
          <li key={i} className="adBlog__block">
            <div className="adBlog__blockBar">
              <label className="ad__sr" htmlFor={`${id}-k${i}`}>Block {i + 1} type</label>
              <select id={`${id}-k${i}`} value={b.kind} onChange={(e) => set(i, convert(b, e.target.value as BlogBlock["kind"]))}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <span className="adBlog__tools">
                <button type="button" className="ad__btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move block ${i + 1} up`}><ArrowUp aria-hidden="true" /></button>
                <button type="button" className="ad__btn" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Move block ${i + 1} down`}><ArrowDown aria-hidden="true" /></button>
                <button type="button" className="ad__btn" onClick={() => setBlocks((all) => all.filter((_, j) => j !== i))} disabled={blocks.length === 1} aria-label={`Remove block ${i + 1}`}><Trash2 aria-hidden="true" /></button>
              </span>
            </div>
            {b.kind === "callout" ? (
              <input aria-label={`Block ${i + 1} callout title`} placeholder="The claim, in a few words" value={b.title}
                     onChange={(e) => set(i, { ...b, title: e.target.value })} />
            ) : null}
            {b.kind === "list" ? (
              <textarea aria-label={`Block ${i + 1} list, one item per line`} rows={Math.max(3, b.items.length)}
                        placeholder="One item per line" value={b.items.join("\n")}
                        onChange={(e) => set(i, { kind: "list", items: e.target.value.split("\n") })} />
            ) : (
              <textarea aria-label={`Block ${i + 1} text`} rows={b.kind === "h2" || b.kind === "h3" ? 1 : 4}
                        value={b.text} onChange={(e) => set(i, { ...b, text: e.target.value } as BlogBlock)} />
            )}
            {b.kind === "quote" ? (
              <input aria-label={`Block ${i + 1} quote attribution`} placeholder="Who said it (optional)" value={b.who ?? ""}
                     onChange={(e) => set(i, { ...b, who: e.target.value })} />
            ) : null}
          </li>
        ))}
      </ol>
      <div className="adBlog__add">
        {KINDS.map((k) => (
          <button type="button" key={k.value} className="ad__btn" onClick={() => setBlocks((all) => [...all, blank(k.value)])}>
            <Plus aria-hidden="true" /> {k.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function BlogEditor({ post, topics, covers }: {
  post: EditorPost;
  topics: { value: string; label: string }[];
  covers: string[];
}) {
  const coverOptions = covers.map((c) => ({ value: c, label: c.replace(/^\/hero\//, "").replace(/\.\w+$/, "").replace(/-/g, " ") }));
  return (
    <Form action={saveBlogPost} className="adBlog">
      {post.id ? <Hidden name="id" value={post.id} /> : null}
      <Fields>
        <Field name="title" label="Headline" required defaultValue={post.title} hint="The page's one h1." />
        <Field name="slug" label="Address" required half defaultValue={post.slug}
               hint={post.live ? "Fixed now that the post is live, so links to it keep working." : "Becomes /blog/<address>. Lower case and hyphens."} />
        <Select name="topic" label="Service" required half defaultValue={post.topic} options={topics} placeholder="Pick one" />
        <Area name="excerpt" label="Card sentence" required rows={2} defaultValue={post.excerpt} hint="One sentence on the blog index." />
        <Field name="tags" label="Tags" half defaultValue={post.tags.join(", ")} hint={`Comma separated, up to ${LIMITS.tags}.`} />
        <Select name="cover" label="Cover photograph" required half defaultValue={post.cover} options={coverOptions} />
      </Fields>

      <h2 className="adBlog__h">Search and sharing</h2>
      <Fields>
        <Field name="seoTitle" label="Search result title" required defaultValue={post.seoTitle} />
        <Count name="seoTitle" max={LIMITS.seoTitle.max} />
        <Area name="description" label="Meta description" required rows={3} defaultValue={post.description} />
        <Count name="description" min={LIMITS.description.min} max={LIMITS.description.max} />
        <Field name="canonical" label="Canonical address" half defaultValue={post.canonical}
               hint="Only if this post first appeared elsewhere. Empty means its own URL." placeholder="https://" />
        <Select name="socialImage" label="Social image" half defaultValue={post.socialImage}
                options={[{ value: "", label: "The drawn card with the headline (recommended)" }, ...coverOptions]} />
      </Fields>

      <Blocks initial={post.body} />

      <h2 className="adBlog__h">Publishing</h2>
      <Fields>
        <Radios name="status" label="State" defaultValue={post.status} options={[
          { value: "draft", label: "Draft", note: "Nobody can see it. Choosing this for a live post unpublishes it." },
          { value: "scheduled", label: "Scheduled", note: "Goes live by itself on the date below." },
          { value: "published", label: "Published", note: "Live now, shown with the date below." },
        ]} />
        <Field name="publishedAt" label="Date shown on the post" type="date" half defaultValue={post.publishedAt}
               hint="Separate from when it was written. Required to publish or schedule." />
        {post.live ? (
          <Checks name="revised" label="Revision" long options={[{ value: "on", label: "This is a meaningful revision: show readers an updated date" }]} />
        ) : null}
      </Fields>

      <Actions>
        <Submit icon={Save}>Save</Submit>
        {post.id ? (
          <a className="ad__btn" href={`/api/blog/preview?slug=${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener">
            <Eye aria-hidden="true" /> Preview on the real page
          </a>
        ) : null}
      </Actions>
    </Form>
  );
}
