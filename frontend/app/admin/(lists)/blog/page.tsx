import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { CalendarClock, Download, FilePlus2, Globe, Newspaper, PencilLine, SearchCheck, Trash2 } from "lucide-react";
import { POST_TRASH_DAYS, postsForAdmin, trashedPostCount, trashedPosts, type AdminPost } from "@/lib/blog-db";
import { adminRole } from "@/lib/admin/guard";
import { SERVICES } from "@/lib/services";
import { Empty, Panel, Tile, when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { BlogPostMenu, TrashedPostMenu } from "@/components/admin/blog-menu";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { Pager, readPer } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";

export const metadata = { title: "Blog" };

type State = "draft" | "review" | "scheduled" | "published";
const stateOf = (p: AdminPost): State => (p.status === "draft" ? "draft" : p.status === "review" ? "review" : p.scheduled ? "scheduled" : "published");
const PILL: Record<State, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "ad__pill--flat" },
  review: { label: "In review", tone: "ad__pill--live" },
  scheduled: { label: "Scheduled", tone: "ad__pill--warn" },
  published: { label: "Published", tone: "ad__pill--good" },
};

type BlogQuery = { q?: string; state?: string; service?: string; from?: string; to?: string; page?: string; per?: string };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function queryHref(query: BlogQuery, changes: Partial<BlogQuery>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) if (value) params.set(key, value);
  const suffix = params.toString();
  return `/admin/blog${suffix ? `?${suffix}` : ""}#post-list`;
}

/* Read the clock outside the render, where the purity rule wants it. */
function staleDrafts(posts: AdminPost[]) {
  const monthAgo = Date.now() - 30 * 86_400_000;
  return posts.filter((p) => stateOf(p) === "draft" && (!p.savedAt || Date.parse(p.savedAt) < monthAgo)).length;
}

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
export default async function BlogPostsPage({ searchParams }: { searchParams: Promise<BlogQuery> }) {
  const query = await searchParams;
  const per = readPer(query.per);
  const from = query.from && DAY_RE.test(query.from) ? query.from : undefined;
  const to = query.to && DAY_RE.test(query.to) ? query.to : undefined;
  const service = SERVICES.find((s) => s.slug === query.service)?.slug;
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const wanted = (["draft", "review", "scheduled", "published"] as const).find((s) => s === query.state);
  const inTrash = query.state === "trash";
  const configured = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  let posts: AdminPost[] | null = null;
  let trash: AdminPost[] = [];
  let trashCount = 0;
  if (configured) {
    try {
      [posts, trashCount, trash] = await Promise.all([postsForAdmin(), trashedPostCount(), inTrash ? trashedPosts() : Promise.resolve([])]);
    } catch (error) {
      console.error("Blog posts could not be read", error instanceof Error ? error.message : "unknown error");
    }
  }
  const counts = { published: 0, scheduled: 0, draft: 0, review: 0 };
  for (const p of posts ?? []) counts[stateOf(p)]++;
  const rows = (posts ?? [])
    .filter((p) => !wanted || stateOf(p) === wanted)
    .filter((p) => !service || p.topic === service)
    .filter((p) => (!from || (p.publishedAt ?? "").slice(0, 10) >= from) && (!to || (p.publishedAt ?? "9999").slice(0, 10) <= to))
    .filter((p) => !search || [p.title, p.slug, p.excerpt, ...p.tags].some((v) => v.toLocaleLowerCase().includes(search)));
  const filtered = Boolean(search || wanted || service || from || to);
  const pageCount = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1), pageCount);
  const shown = rows.slice((page - 1) * per, page * per);
  /* The notes under the figures, read off the same rows. */
  const live = (posts ?? []).filter((p) => stateOf(p) === "published" && p.publishedAt).map((p) => p.publishedAt!).sort();
  const queued = (posts ?? []).filter((p) => stateOf(p) === "scheduled" && p.publishedAt).map((p) => p.publishedAt!).sort();
  const stale = staleDrafts(posts ?? []);
  const isOwner = (await adminRole()) === "owner";
  const trashRows = trash.filter((p) => !search || [p.title, p.slug].some((v) => v.toLocaleLowerCase().includes(search)));

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
      ) : inTrash ? (
        <Panel title={`Trash (${trash.length})`} action={<Link className="ad__btn" href="/admin/blog">Back to the posts</Link>}>
          <p className="ad__dim" style={{ padding: "0 1rem", margin: ".2rem 0 .8rem" }}>
            Drafts stay here for {POST_TRASH_DAYS} days, then the daily tidy removes them for good. Restoring one brings it back as a draft.
          </p>
          {trashRows.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Post</th><th>Moved here</th><th>Removed for good</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                <tbody>
                  {trashRows.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.title}</b><small>/blog/{p.slug}</small></td>
                      <td className="ad__dim">{p.trashedAt ? `${when(p.trashedAt)}${p.trashedBy ? ` by ${p.trashedBy}` : ""}` : ""}</td>
                      <td className="ad__dim ad__num">{p.trashedAt ? when(new Date(new Date(p.trashedAt).getTime() + POST_TRASH_DAYS * 86_400_000).toISOString()) : ""}</td>
                      <td className="ad__rmC"><TrashedPostMenu post={{ id: p.id, title: p.title }} canDelete={isOwner} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="The Trash is empty" icon={Trash2}>Drafts you move to the Trash wait here for {POST_TRASH_DAYS} days before they are removed.</Empty>
          )}
        </Panel>
      ) : posts.length === 0 ? (
        <section className="ad__panel">
          <AdminState kind="first-use" title="No posts yet"
            description="Posts you write here appear on /blog when you publish them, or on the date you schedule."
            action={<Link className="ad__btn ad__btn--primary" href="/admin/blog/new"><FilePlus2 aria-hidden="true" /> Write the first post</Link>}
            secondaryAction={trashCount ? <Link className="ad__btn" href="/admin/blog?state=trash"><Trash2 aria-hidden="true" /> Trash ({trashCount})</Link> : undefined} />
        </section>
      ) : (
        <>
          <dl className="ad__tiles">
            <Tile label="Published" value={String(counts.published)} icon={Globe} iconTone="good" note={live.length ? `Last one ${when(live[live.length - 1])}` : "Nothing live yet"} />
            <Tile label="In review" value={String(counts.review)} icon={SearchCheck} iconTone="live" tone={counts.review ? "accent" : undefined} note={isOwner ? "Waiting for you to publish or send back" : "Waiting for the owner"} />
            <Tile label="Scheduled" value={String(counts.scheduled)} icon={CalendarClock} iconTone="warn" note={queued.length ? `Next goes out ${when(queued[0])}` : "Nothing waiting on a date"} />
            <Tile label="Drafts" value={String(counts.draft)} icon={PencilLine} note={stale ? `${stale} not touched in a month` : "Only you can see these"} />
          </dl>

          <div style={{ marginTop: ".9rem" }}>
            <Panel title={filtered ? `${rows.length} of ${posts.length} posts` : `${posts.length} post${posts.length === 1 ? "" : "s"}`}>
              <div className="ad__filterBar" data-tour="blog-filters">
              {/* The range is its own form, beside this one: a form cannot hold another. */}
              <form className="ad__filterForm" method="get" action="/admin/blog#post-list" aria-label="Filter posts">
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
                    <option value="review">In review</option>
                    <option value="draft">Drafts</option>
                  </select>
                </label>
                <label>
                  <span className="ad__sr">Service</span>
                  <select name="service" defaultValue={service ?? ""}>
                    <option value="">Every service</option>
                    {SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.short}</option>)}
                  </select>
                </label>
                {from ? <input type="hidden" name="from" value={from} /> : null}
                {to ? <input type="hidden" name="to" value={to} /> : null}
                {query.per ? <input type="hidden" name="per" value={per} /> : null}
                <button type="submit" className="ad__btn ad__btn--primary">Apply</button>
              </form>
                <DateRange
                  label="Date shown"
                  value={{ from, to }}
                  href={(r) => queryHref(query, { from: r.from, to: r.to, page: undefined })}
                  keep={{ q: query.q, state: query.state, service: query.service, per: query.per }}
                  action="/admin/blog#post-list"
                />
                {filtered ? <Link className="ad__btn" href="/admin/blog">Clear filters</Link> : null}
                {trashCount ? <Link className="ad__btn" href="/admin/blog?state=trash"><Trash2 aria-hidden="true" /> Trash ({trashCount})</Link> : null}
              </div>
              <div data-tour="blog-table">
              {rows.length ? (
                <>
                {/* Publishing and unpublishing are the owner's; the Trash takes
                    drafts only, and says so for any live post in the selection. */}
                <BulkBar target="post-list" noun="posts"
                  actions={[
                    ...(isOwner ? [{ kind: "posts:publish", label: "Publish", icon: "publish" as const, confirm: "Publish {n} posts now? Each goes live on the blog straight away." }] : []),
                    { kind: "posts:trash", label: "Move to Trash", icon: "trash" as const, danger: true, confirm: "Move {n} drafts to the Trash? They stay there 30 days and can be put back." },
                  ]}
                  more={isOwner ? [{ kind: "posts:draft", label: "Move to draft", confirm: "Take {n} posts off the blog and back to draft?" }] : []} />
                <div className="ad__scroll" id="post-list">
                  <table className="ad__t">
                    <thead>
                      <tr>
                        <th><span className="ad__pickRow"><PickAll label="Select every post" />Post</span></th><th>State</th><th>Service</th><th>Date shown</th><th>Last saved</th>
                        <th className="ad__rmH"><span className="ad__sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((p) => {
                        const state = stateOf(p);
                        return (
                          <tr key={p.id}>
                            <td>
                              <span className="ad__pickRow"><RowPick id={p.id} label={p.title} /><span><Link href={`/admin/blog/${p.id}`}><b>{p.title}</b></Link>
                              <small>/blog/{p.slug}</small></span></span>
                            </td>
                            <td><span className={`ad__pill ${PILL[state].tone}`}>{PILL[state].label}</span></td>
                            <td>{SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic}</td>
                            <td className="ad__dim ad__num">{p.publishedAt ? when(p.publishedAt) : "Not set"}</td>
                            <td className="ad__dim">{p.savedAt ? `${when(p.savedAt)}${p.savedBy ? ` by ${p.savedBy}` : ""}` : "Imported"}</td>
                            <td className="ad__rmC"><BlogPostMenu post={{ id: p.id, title: p.title, slug: p.slug, state }} canPublish={isOwner} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              ) : (
                <Empty title="No posts match these filters" icon={Newspaper}
                  action={<Link className="ad__btn" href="/admin/blog">Clear filters</Link>}>
                  Try a broader search, or clear the filters to see every post.
                </Empty>
              )}
              </div>
              {rows.length ? (
                <Pager
                  label="Post pages"
                  total={rows.length}
                  page={page}
                  per={per}
                  noun={rows.length === 1 ? "post" : "posts"}
                  href={(patch) => queryHref(query, {
                    page: patch.page && patch.page > 1 ? String(patch.page) : undefined,
                    per: patch.per ? String(patch.per) : query.per,
                  })}
                />
              ) : null}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
