import Link from "next/link";
import { FilePlus2, Newspaper } from "lucide-react";
import { postsForAdmin, type AdminPost } from "@/lib/blog-db";
import { Panel, when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";

export const metadata = { title: "Blog posts" };

function State({ post }: { post: AdminPost }) {
  if (post.status === "draft") return <span className="ad__pill ad__pill--flat">Draft</span>;
  if (post.scheduled) return <span className="ad__pill ad__pill--warn">Scheduled</span>;
  return <span className="ad__pill ad__pill--good">Published</span>;
}

/**
 * Every post, any state, drafts first.
 *
 * READ FROM THE TABLE ONLY. The public blog falls back to the code fixture
 * when the database cannot be reached; this screen does not, because editing
 * a copy that is not the real one is worse than saying it cannot be reached.
 */
export default async function BlogPostsPage() {
  const configured = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  let posts: AdminPost[] | null = null;
  if (configured) {
    try { posts = await postsForAdmin(); } catch (error) {
      console.error("Blog posts could not be read", error instanceof Error ? error.message : "unknown error");
    }
  }

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/settings">Settings</Link></p>
          <h1>Blog posts</h1>
          <p>Write, schedule and unpublish posts. What you save here is what /blog shows.</p>
        </div>
        {posts ? <Link className="ad__btn ad__btn--primary" href="/admin/settings/blog/new"><FilePlus2 aria-hidden="true" /> New post</Link> : null}
      </div>

      {!configured ? (
        <section className="ad__panel">
          <AdminState kind="error" title="The blog database is not connected"
            description="COCKROACHDB_URL is not set on this deployment, so there is nothing to edit. The public blog is showing the posts written into the code." />
        </section>
      ) : posts === null ? (
        <section className="ad__panel">
          <AdminState kind="error" title="Posts could not be loaded"
            description="The database did not answer. Nothing has changed; reload in a minute." />
        </section>
      ) : posts.length === 0 ? (
        <section className="ad__panel">
          <AdminState kind="first-use" title="No posts yet"
            description="Posts you write here appear on /blog when you publish them, or on the date you schedule."
            action={<Link className="ad__btn ad__btn--primary" href="/admin/settings/blog/new"><FilePlus2 aria-hidden="true" /> Write the first post</Link>} />
        </section>
      ) : (
        <Panel title={`${posts.length} post${posts.length === 1 ? "" : "s"}`}>
          <div className="ad__scroll">
            <table className="ad__t">
              <thead>
                <tr><th>Post</th><th>State</th><th>Date shown</th><th>Last saved</th></tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/settings/blog/${p.id}`}><b>{p.title}</b></Link>
                      <small>/blog/{p.slug}</small>
                    </td>
                    <td><State post={p} /></td>
                    <td className="ad__dim ad__num">{p.publishedAt ? when(p.publishedAt) : "Not set"}</td>
                    <td className="ad__dim">{p.savedAt ? `${when(p.savedAt)}${p.savedBy ? ` by ${p.savedBy}` : ""}` : "Imported"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <p className="ad__dim" style={{ marginTop: ".8rem", fontSize: ".8rem", display: "flex", gap: ".4rem", alignItems: "center" }}>
        <Newspaper aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
        Headings, lists, quotes and callouts only. The page itself guarantees one headline and a correct outline.
      </p>
    </>
  );
}
