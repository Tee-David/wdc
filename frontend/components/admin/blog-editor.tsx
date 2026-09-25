"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Eye, Save } from "lucide-react";
import { docText, isDoc, type RichDoc } from "@/lib/blog-doc";
import { saveBlogPost } from "@/lib/admin/blog-actions";
import { LIMITS } from "@/lib/blog-validate";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Radios, Select, Submit, useFieldError } from "./form";

export type EditorPost = {
  id: string | null;
  slug: string; title: string; seoTitle: string; description: string; excerpt: string;
  topic: string; tags: string[]; cover: string; canonical: string; socialImage: string;
  body: RichDoc;
  status: "draft" | "scheduled" | "published";
  publishedAt: string;
  live: boolean;
  /** The row's saved_at when the editor opened it, for the concurrency check. */
  savedAt: string | null;
};

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

/**
 * The body field: the rich-text editor, loaded on this page only and after the
 * rest of the form, with a box the editor's size standing in until it arrives.
 * The hidden input is here rather than inside the editor, so a save pressed
 * before the editor has loaded still sends the body it was given.
 */
const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => <div className="adRte adRte--loading" aria-hidden="true" />,
});

function Body({ initial, restore }: { initial: RichDoc; restore: { at: number; doc: RichDoc } | null }) {
  const [doc, setDoc] = useState<RichDoc>(initial);
  /* A restore from the browser's copy remounts the editor with that copy. */
  const [seen, setSeen] = useState(0);
  if (restore && restore.at !== seen) {
    setSeen(restore.at);
    setDoc(restore.doc);
  }
  const id = useId();
  const error = useFieldError("body");
  return (
    <div className="adBlog__body">
      <span className="ad__fl" id={`${id}-l`}>Body<b aria-hidden="true"> *</b></span>
      <small className="ad__fh" id={`${id}-h`}>
        The headline above is the page&apos;s title, so start sections with Heading and use Subheading inside them.
      </small>
      <Hidden name="body" value={JSON.stringify(doc)} />
      <RichTextEditor
        key={seen} initial={doc} onChange={setDoc}
        labelledBy={`${id}-l`} describedBy={error ? `${id}-h ${id}-e` : `${id}-h`} invalid={Boolean(error)}
      />
      {error ? <small className="ad__fe" id={`${id}-e`}>{error}</small> : null}
    </div>
  );
}

/** Watches named fields in the enclosing form and hands back their values. */
function useWatched(ref: React.RefObject<HTMLDivElement | null>, names: string[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const key = names.join("|");
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => {
      const next: Record<string, string> = {};
      for (const n of key.split("|")) {
        const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${n}"]`);
        next[n] = el?.value ?? "";
      }
      setValues(next);
    };
    read();
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, [ref, key]);
  return values;
}

const slugify = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").slice(0, 80);

/**
 * How the post will look as a Google result, as it is typed. Built from the
 * same three fields the page's metadata uses, so it cannot promise something
 * the page will not send.
 */
function SearchPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const v = useWatched(ref, ["seoTitle", "title", "slug", "description"]);
  const title = v.seoTitle || v.title || "Search result title";
  const slug = v.slug || slugify(v.title ?? "") || "post-address";
  return (
    <div ref={ref} className="adBlog__serp" aria-label="Search result preview">
      <span className="adBlog__serpUrl">wedigcreativity.com.ng › blog › {slug}</span>
      <span className="adBlog__serpTitle">{title}</span>
      <span className="adBlog__serpDesc">{v.description || "The meta description appears here. Write it for somebody deciding whether to click."}</span>
    </div>
  );
}

/**
 * The address follows the headline until somebody types one of their own,
 * the way rp-web's editor does. A live post's address never moves.
 */
function SlugFollowsTitle({ locked }: { locked: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const title = form?.querySelector<HTMLInputElement>('[name="title"]');
    const slug = form?.querySelector<HTMLInputElement>('[name="slug"]');
    if (!title || !slug || locked) return;
    let own = Boolean(slug.value);
    const onSlug = () => { own = Boolean(slug.value); };
    const onTitle = () => { if (!own) slug.value = slugify(title.value); };
    slug.addEventListener("input", onSlug);
    title.addEventListener("input", onTitle);
    return () => { slug.removeEventListener("input", onSlug); title.removeEventListener("input", onTitle); };
  }, [locked]);
  return <span ref={ref} hidden />;
}

/* An empty body carries no writing, so it does not make a copy worth offering. */
const bodyText = (json: string) => {
  try {
    const doc = JSON.parse(json || "null");
    return isDoc(doc) && docText(doc).trim() ? JSON.stringify(doc) : "";
  } catch { return ""; }
};

const BACKUP_FIELDS = ["title", "slug", "topic", "excerpt", "tags", "cover", "seoTitle", "description", "canonical", "socialImage", "publishedAt"];

/**
 * A copy of the unsaved post in this browser, so an expired session or a
 * closed tab never costs the writing. Kept per post, offered back on the next
 * visit if it differs from what was saved, and cleared by a successful save.
 */
function useBackup(key: string, formRef: React.RefObject<HTMLDivElement | null>, saved: string) {
  const [offer, setOffer] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      /* Read after mount on purpose: storage does not exist on the server, so
         the offer can only be known once the page is in a browser. */
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      if (raw && raw !== saved) setOffer(JSON.parse(raw));
      /* A new post that has since been saved: its "new" copy is this post. */
      const fresh = localStorage.getItem("wdc-blog-backup:new");
      if (key !== "wdc-blog-backup:new" && fresh) {
        const f = JSON.parse(fresh);
        if (f.slug && f.slug === JSON.parse(saved).slug) localStorage.removeItem("wdc-blog-backup:new");
      }
    } catch { /* No storage: nothing to offer. */ }
  }, [key, saved]);
  useEffect(() => {
    const form = formRef.current?.closest("form");
    if (!form) return;
    let t = 0;
    const write = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const data: Record<string, string> = {};
        for (const n of BACKUP_FIELDS) {
          data[n] = form.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? "";
        }
        data.body = bodyText(form.querySelector<HTMLInputElement>('[name="body"]')?.value ?? "");
        const json = JSON.stringify(data);
        try {
          if (json === saved) localStorage.removeItem(key);
          else localStorage.setItem(key, json);
        } catch { /* best effort */ }
      }, 600);
    };
    form.addEventListener("input", write);
    form.addEventListener("click", write);
    return () => { window.clearTimeout(t); form.removeEventListener("input", write); form.removeEventListener("click", write); };
  }, [key, formRef, saved]);
  return { offer, dismiss: () => { try { localStorage.removeItem(key); } catch {} setOffer(null); } };
}

export function BlogEditor({ post, topics, covers }: {
  post: EditorPost;
  topics: { value: string; label: string }[];
  covers: string[];
}) {
  const coverOptions = covers.map((c) => ({ value: c, label: c.replace(/^\/hero\//, "").replace(/\.\w+$/, "").replace(/-/g, " ") }));
  const anchor = useRef<HTMLDivElement>(null);
  const key = `wdc-blog-backup:${post.id ?? "new"}`;
  const savedSnapshot = JSON.stringify({
    title: post.title, slug: post.slug, topic: post.topic, excerpt: post.excerpt, tags: post.tags.join(", "),
    cover: post.cover, seoTitle: post.seoTitle, description: post.description, canonical: post.canonical,
    socialImage: post.socialImage, publishedAt: post.publishedAt, body: bodyText(JSON.stringify(post.body)),
  });
  const backup = useBackup(key, anchor, savedSnapshot);
  const [restore, setRestore] = useState<{ at: number; doc: RichDoc } | null>(null);
  const [opened, setOpened] = useState(post.savedAt);

  const doRestore = () => {
    const form = anchor.current?.closest("form");
    if (!form || !backup.offer) return;
    for (const n of BACKUP_FIELDS) {
      const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${n}"]`);
      if (el && typeof backup.offer[n] === "string") el.value = backup.offer[n];
    }
    try {
      const doc = JSON.parse(backup.offer.body || "null");
      if (isDoc(doc)) setRestore({ at: Date.now(), doc });
    } catch { /* keep the body as it is */ }
    form.dispatchEvent(new Event("input", { bubbles: true }));
    backup.dismiss();
  };

  return (
    <Form action={saveBlogPost} className="adBlog adBlog--split" onDone={(s) => {
      try { localStorage.removeItem(key); } catch {}
      /* The version this editor now holds, so its next save is not refused as stale. */
      if (s.stamp) setOpened(s.stamp);
    }}>
      <div ref={anchor} hidden />
      <SlugFollowsTitle locked={post.live} />
      {post.id ? <Hidden name="id" value={post.id} /> : null}
      {post.id ? <Hidden name="opened" value={opened ?? ""} /> : null}

      {backup.offer ? (
        <p className="ad__banner adBlog__restore" role="status">
          <span>There is an unsaved version of this post in this browser.</span>
          <span className="ad__row">
            <button type="button" className="ad__btn ad__btn--primary" onClick={doRestore}>Restore it</button>
            <button type="button" className="ad__btn" onClick={backup.dismiss}>Discard</button>
          </span>
        </p>
      ) : null}

      <div className="adBlog__main">
        <section className="ad__panel adBlog__card">
          <Fields>
            <Field name="title" label="Headline" required defaultValue={post.title} hint="The page's one h1." />
            <Area name="excerpt" label="Card sentence" required rows={2} defaultValue={post.excerpt} hint="One sentence on the blog index and in link previews." />
          </Fields>
          <Body initial={post.body} restore={restore} />
        </section>
      </div>

      <aside className="adBlog__side">
        <section className="ad__panel adBlog__card">
          <h2 className="adBlog__h">Publish</h2>
          <Radios name="status" label="State" defaultValue={post.status} options={[
            { value: "draft", label: "Draft", note: "Nobody can see it. Choosing this for a live post unpublishes it." },
            { value: "scheduled", label: "Scheduled", note: "Goes live by itself on the date below." },
            { value: "published", label: "Published", note: "Live now, shown with the date below." },
          ]} />
          <Field name="publishedAt" label="Date shown on the post" type="date" defaultValue={post.publishedAt}
                 hint="Separate from when it was written. Needed to publish or schedule." />
          {post.live ? (
            <Checks name="revised" label="Revision" long options={[{ value: "on", label: "A meaningful revision: show readers an updated date" }]} />
          ) : null}
          <Actions>
            <Submit icon={Save}>Save</Submit>
            {post.id ? (
              <a className="ad__btn" href={`/api/blog/preview?slug=${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener">
                <Eye aria-hidden="true" /> Preview on the real page
              </a>
            ) : null}
          </Actions>
        </section>

        <section className="ad__panel adBlog__card">
          <h2 className="adBlog__h">Details</h2>
          <Fields>
            <Field name="slug" label="Address" required defaultValue={post.slug}
                   hint={post.live ? "Fixed now that the post is live, so links to it keep working." : "Fills itself from the headline until you type your own."} />
            <Select name="topic" label="Service" required defaultValue={post.topic} options={topics} placeholder="Pick one" />
            <Field name="tags" label="Tags" defaultValue={post.tags.join(", ")} hint={`Comma separated, up to ${LIMITS.tags}.`} />
            <Select name="cover" label="Cover photograph" required defaultValue={post.cover} options={coverOptions} />
          </Fields>
        </section>

        <section className="ad__panel adBlog__card">
          <h2 className="adBlog__h">Search and sharing</h2>
          <SearchPreview />
          <Fields>
            <Field name="seoTitle" label="Search result title" required defaultValue={post.seoTitle} />
            <Count name="seoTitle" max={LIMITS.seoTitle.max} />
            <Area name="description" label="Meta description" required rows={3} defaultValue={post.description} />
            <Count name="description" min={LIMITS.description.min} max={LIMITS.description.max} />
            <Field name="canonical" label="Canonical address" defaultValue={post.canonical}
                   hint="Only if this post first appeared elsewhere. Empty means its own URL." placeholder="https://" />
            <Select name="socialImage" label="Social image" defaultValue={post.socialImage}
                    options={[{ value: "", label: "The drawn card with the headline (recommended)" }, ...coverOptions]} />
          </Fields>
        </section>
      </aside>
    </Form>
  );
}
