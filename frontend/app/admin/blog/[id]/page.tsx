import Link from "next/link";
import { notFound } from "next/navigation";
import { postForAdmin, type AdminPost } from "@/lib/blog-db";
import { adminRole } from "@/lib/admin/guard";
import { when } from "@/components/admin/bits";
import { ReturnPostForm } from "@/components/admin/blog-menu";
import { toDoc } from "@/lib/blog-doc";
import { BLOG_COVERS } from "@/lib/blog-validate";
import { SERVICES } from "@/lib/services";
import { BlogEditor, type EditorPost } from "@/components/admin/blog-editor";
import { AdminState } from "@/components/admin/admin-state";
import "@/components/admin/blog-editor.css";

export const metadata = { title: "Edit post" };

const EMPTY: EditorPost = {
  id: null, slug: "", title: "", seoTitle: "", description: "", excerpt: "",
  topic: "", tags: [], cover: "", canonical: "", socialImage: "",
  body: { type: "doc", content: [] }, status: "draft", publishedAt: "", live: false, savedAt: null,
};

export default async function EditPostPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  let post: EditorPost = EMPTY;
  let found: AdminPost | null = null;
  const isOwner = (await adminRole()) === "owner";

  if (id !== "new") {
    try { found = await postForAdmin(id); } catch {
      return (
        <section className="ad__panel">
          <AdminState kind="error" title="This post could not be loaded" description="The database did not answer. Nothing has changed; reload in a minute." />
        </section>
      );
    }
    if (!found) notFound();
    const live = found.status === "published" && !found.scheduled;
    post = {
      id: found.id, slug: found.slug, title: found.title, seoTitle: found.seoTitle,
      description: found.description, excerpt: found.excerpt, topic: found.topic, tags: found.tags,
      cover: found.cover, canonical: found.canonical ?? "", socialImage: found.socialImage ?? "",
      /* A post written before the editor opens in it converted, nothing lost. */
      body: toDoc(found.body),
      status: found.status === "draft" ? "draft" : found.status === "review" ? "review" : found.scheduled ? "scheduled" : "published",
      publishedAt: found.publishedAt ? found.publishedAt.slice(0, 10) : "",
      live,
      savedAt: found.savedAt,
    };
  }

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/blog">Blog</Link></p>
          <h1>{post.id ? post.title : "New post"}</h1>
          <p>{post.id ? `/blog/${post.slug}` : "Nothing is public until you publish it."}</p>
        </div>
      </div>
      {saved ? <p className="ad__msg is-ok" role="status"><span>Saved.</span></p> : null}
      {found?.status === "draft" && found.reviewNote ? (
        <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
          <div style={{ padding: ".9rem 1rem" }}>
            <p><b>Sent back{found.reviewBy ? ` by ${found.reviewBy}` : ""}:</b> {found.reviewNote}</p>
            <p className="ad__dim" style={{ margin: ".3rem 0 0" }}>Make the changes, then choose Submit for review again.</p>
          </div>
        </section>
      ) : null}
      {found?.status === "review" ? (
        <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
          <div style={{ padding: ".9rem 1rem" }}>
            <p><span className="ad__pill ad__pill--live">In review</span> Submitted{found.submittedBy ? ` by ${found.submittedBy}` : ""}{found.submittedAt ? ` ${when(found.submittedAt)}` : ""}.</p>
            {isOwner ? <ReturnPostForm id={found.id} /> : <p className="ad__dim" style={{ margin: ".3rem 0 0" }}>The owner will publish it or send it back with a note.</p>}
          </div>
        </section>
      ) : null}
      {!isOwner && found?.status === "published" ? (
        <section className="ad__panel">
          <AdminState kind="forbidden" title={found.scheduled ? "This post is scheduled" : "This post is live"}
            description="Changes to a published or scheduled post are the owner's. Ask them, or read it on the site."
            action={found.scheduled
              ? <Link className="ad__btn" href="/admin/blog">Back to the blog</Link>
              : <a className="ad__btn ad__btn--primary" href={`/blog/${found.slug}`} target="_blank" rel="noopener noreferrer">View on the site</a>}
            secondaryAction={found.scheduled ? undefined : <Link className="ad__btn" href="/admin/blog">Back to the blog</Link>} />
        </section>
      ) : (
        <BlogEditor
          post={post}
          topics={SERVICES.map((s) => ({ value: s.slug, label: s.name }))}
          covers={[...BLOG_COVERS]}
          canPublish={isOwner}
        />
      )}
    </>
  );
}
