import Link from "next/link";
import { Download, FilePlus2, Newspaper } from "lucide-react";
import { postsForAdmin, type AdminPost } from "@/lib/blog-db";
import { SERVICES } from "@/lib/services";
import { Empty, Panel, Tile, when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { BlogPostMenu } from "@/components/admin/blog-menu";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Blog" };

type State = "draft" | "scheduled" | "published";
const stateOf = (p: AdminPost): State => (p.status === "draft" ? "draft" : p.scheduled ? "scheduled" : "published");
const PILL: Record<State, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "ad__pill--flat" },
  scheduled: { label: "Scheduled", tone: "ad__pill--warn" },
  published: { label: "Published", tone: "ad__pill--good" },
};

/**
 * Every post, any state: what is live, what is waiting on a date, and what
 * is still being written.
 *
 * READ FROM THE TABLE ONLY. The public blog falls back to the code fixture
 * when the database cannot be reached; this screen does not, because editing
 * a copy that is not the real one is worse than saying it cannot be reached.
 * Filters are a plain GET form, so the state is in the URL like every other
 * list in the admin.
 */
export default async function BlogPostsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string }> }) {
  const query = await searchParams;
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const wanted = (["draft", "scheduled", "published"] as const).find((s) => s === query.state);
  const configured = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  let posts: AdminPost[] | null = null;
  if (configured) {
    try { posts = await postsForAdmin(); } catch (error) {
      console.error("Blog posts could not be read", error instanceof Error ? error.message : "unknown error");
    }
  }
  const counts = { published: 0, scheduled: 0, draft: 0 };
  for (const p of posts ?? []) counts[stateOf(p)]++;
  const rows = (posts ?? [])
    .filter((p) => !wanted || stateOf(p) === wanted)
    .filter((p) => !search || [p.title, p.slug, p.excerpt, ...p.tags].some((v) => v.toLocaleLowerCase().includes(search)));
  const filtered = Boolean(search || wanted);

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Blog</h1>
          <p>Write, schedule and unpublish posts. What you save here is what /blog shows.</p>
        </div>
        <div className="ad__row">
          <PageTourButton />
          {/* A file download, not a page, so a plain link: client navigation
              would try to render the CSV as a route. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          {posts ? <a className="ad__btn" href="/admin/blog/export"><Download aria-hidden="true" /> Export CSV</a> : null}
          {posts ? <Link className="ad__btn ad__btn--primary" href="/admin/blog/new"><FilePlus2 aria-hidden="true" /> New post</Link> : null}
        </div>
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
            action={<Link className="ad__btn ad__btn--primary" href="/admin/blog/new"><FilePlus2 aria-hidden="true" /> Write the first post</Link>} />
        </section>
      ) : (
        <>
          <dl className="ad__tiles">
            <Tile label="Published" value={String(counts.published)} tone="good" note="Live on /blog" />
            <Tile label="Scheduled" value={String(counts.scheduled)} note="Go live on their date" />
            <Tile label="Drafts" value={String(counts.draft)} note="Only you can see these" />
          </dl>

          <div style={{ marginTop: ".9rem" }}>
            <Panel title={filtered ? `${rows.length} of ${posts.length} posts` : `${posts.length} post${posts.length === 1 ? "" : "s"}`}>
              <form className="ad__filterBar" method="get" action="/admin/blog" aria-label="Filter posts" data-tour="blog-filters">
                <label className="ad__filterSearch">
                  <span className="ad__sr">Search posts</span>
                  <input name="q" type="search" defaultValue={query.q} placeholder="Search title, address, excerpt or tag" />
                </label>
                <label>
                  <span className="ad__sr">State</span>
                  <select name="state" defaultValue={wanted ?? ""}>
                    <option value="">Every state</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Drafts</option>
                  </select>
                </label>
                <button type="submit" className="ad__btn">Filter</button>
                {filtered ? <Link className="ad__btn" href="/admin/blog">Clear filters</Link> : null}
              </form>
              {rows.length ? (
                <div className="ad__scroll" data-tour="blog-table">
                  <table className="ad__t">
                    <thead>
                      <tr>
                        <th>Post</th><th>State</th><th>Service</th><th>Date shown</th><th>Last saved</th>
                        <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => {
                        const state = stateOf(p);
                        return (
                          <tr key={p.id}>
                            <td>
                              <Link href={`/admin/blog/${p.id}`}><b>{p.title}</b></Link>
                              <small>/blog/{p.slug}</small>
                            </td>
                            <td><span className={`ad__pill ${PILL[state].tone}`}>{PILL[state].label}</span></td>
                            <td>{SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic}</td>
                            <td className="ad__dim ad__num">{p.publishedAt ? when(p.publishedAt) : "Not set"}</td>
                            <td className="ad__dim">{p.savedAt ? `${when(p.savedAt)}${p.savedBy ? ` by ${p.savedBy}` : ""}` : "Imported"}</td>
                            <td className="ad__rmC"><BlogPostMenu post={{ id: p.id, title: p.title, slug: p.slug, state }} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No posts match these filters" icon={Newspaper}
                  action={<Link className="ad__btn" href="/admin/blog">Clear filters</Link>}>
                  Try a broader search, or clear the filters to see every post.
                </Empty>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
