import Link from "next/link";
import { notFound } from "next/navigation";
import { postForAdmin } from "@/lib/blog-db";
import { BLOG_COVERS } from "@/lib/blog-validate";
import { SERVICES } from "@/lib/services";
import { BlogEditor, type EditorPost } from "@/components/admin/blog-editor";
import { AdminState } from "@/components/admin/admin-state";
import "@/components/admin/blog-editor.css";

export const metadata = { title: "Edit post" };

const EMPTY: EditorPost = {
  id: null, slug: "", title: "", seoTitle: "", description: "", excerpt: "",
  topic: "", tags: [], cover: BLOG_COVERS[0] ?? "", canonical: "", socialImage: "",
  body: [], status: "draft", publishedAt: "", live: false,
};

export default async function EditPostPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  let post: EditorPost = EMPTY;

  if (id !== "new") {
    let found;
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
      body: found.body,
      status: found.status === "draft" ? "draft" : found.scheduled ? "scheduled" : "published",
      publishedAt: found.publishedAt ? found.publishedAt.slice(0, 10) : "",
      live,
    };
  }

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/settings/blog">Blog posts</Link></p>
          <h1>{post.id ? post.title : "New post"}</h1>
          <p>{post.id ? `/blog/${post.slug}` : "Nothing is public until you publish it."}</p>
        </div>
      </div>
      {saved ? <p className="ad__msg is-ok" role="status"><span>Saved.</span></p> : null}
      <section className="ad__panel" style={{ padding: "1rem" }}>
        <BlogEditor
          post={post}
          topics={SERVICES.map((s) => ({ value: s.slug, label: s.name }))}
          covers={[...BLOG_COVERS]}
        />
      </section>
    </>
  );
}
