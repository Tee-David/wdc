import Link from "next/link";
import { BulkBar, PickAll, RowPick } from "@/components/admin/bulk";
import { CalendarClock, FilePlus2, Globe, Newspaper, PencilLine, SearchCheck, Trash2 } from "lucide-react";
import { POST_TRASH_DAYS, postsForAdmin, trashedPostCount, trashedPosts, type AdminPost } from "@/lib/blog-db";
import { adminRole } from "@/lib/admin/guard";
import { SERVICES } from "@/lib/services";
import { Empty, Panel, when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { BlogPostMenu, TrashedPostMenu } from "@/components/admin/blog-menu";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { ClickRow } from "@/components/admin/click-row";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Pager, readPer } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { FilterPick } from "@/components/admin/pick";

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
function staleCutoff() { return Date.now() - 30 * 86_400_000; }
function staleDrafts(posts: AdminPost[]) {
  const monthAgo = staleCutoff();
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

  /* WHAT NEEDS YOU: posts waiting for a decision first (oldest first), then
     drafts nobody has touched in a month. */
  const monthAgo = staleCutoff();
  const deckItems: DeckItem[] = [
    ...(posts ?? []).filter((p) => stateOf(p) === "review").sort((x, y) => Date.parse(x.submittedAt ?? "0") - Date.parse(y.submittedAt ?? "0")).slice(0, 4).map((p): DeckItem => ({
      id: `review-${p.id}`, kind: "Review", tone: "live", urgency: p.submittedAt ? `Sent ${when(p.submittedAt)}` : "In review", label: SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic,
      title: `“${p.title}” is waiting for review`,
      body: p.submittedBy ? `${p.submittedBy} sent it for review. ${isOwner ? "Publish it, schedule it or send it back with a note." : "The owner publishes it or sends it back with a note."}` : "It is waiting for a decision.",
      facts: [{ k: "Address", v: `/blog/${p.slug}` }, ...(p.submittedBy ? [{ k: "From", v: p.submittedBy }] : [])],
      why: "A post that waits for review is one that is not ranking yet.",
      primary: { label: isOwner ? "Review the post" : "Open the post", href: `/admin/blog/${p.id}` },
    })),
    ...(posts ?? []).filter((p) => stateOf(p) === "draft" && (!p.savedAt || Date.parse(p.savedAt) < monthAgo)).slice(0, 3).map((p): DeckItem => ({
      id: `stale-${p.id}`, kind: "Draft", tone: "neutral", urgency: p.savedAt ? `Last saved ${when(p.savedAt)}` : "Never saved here", label: SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic,
      title: `Finish “${p.title}”`, body: "Nobody has touched this draft in over a month.",
      facts: [{ k: "Address", v: `/blog/${p.slug}` }],
      why: "One post a week keeps a blog ranking; a draft that sits does nothing.",
      primary: { label: "Open the editor", href: `/admin/blog/${p.id}` },
    })),
  ];
  const nextOut = queued[0];
  const lede = posts ? <>
    {counts.published} {counts.published === 1 ? "post" : "posts"} live, {counts.draft} {counts.draft === 1 ? "draft" : "drafts"}, {counts.scheduled} scheduled.{" "}
    {nextOut ? <strong>Next goes out {when(nextOut)}.</strong> : counts.review ? <strong>{counts.review} waiting for review.</strong> : null}
  </> : "Write, schedule and unpublish posts.";
  const recent = [...(posts ?? [])].filter((p) => stateOf(p) === "published" && p.publishedAt).sort((x, y) => Date.parse(y.publishedAt!) - Date.parse(x.publishedAt!)).slice(0, 3);
  const upcoming = [...(posts ?? [])].filter((p) => stateOf(p) === "scheduled" && p.publishedAt).sort((x, y) => Date.parse(x.publishedAt!) - Date.parse(y.publishedAt!)).slice(0, 3);
  const stateChips = [
    { key: "", label: "All", href: queryHref(query, { state: undefined, page: undefined }), count: (posts ?? []).length },
    { key: "draft", label: "Drafts", href: queryHref(query, { state: "draft", page: undefined }), count: counts.draft },
    { key: "scheduled", label: "Scheduled", href: queryHref(query, { state: "scheduled", page: undefined }), count: counts.scheduled },
    { key: "review", label: "In review", href: queryHref(query, { state: "review", page: undefined }), count: counts.review },
    { key: "published", label: "Published", href: queryHref(query, { state: "published", page: undefined }), count: counts.published },
  ];

  return (
    <>
      <PageHead
        title="Blog"
        lede={lede}
        action={posts ? <Link className="ad__btn ad__btn--primary" href="/admin/blog/new" data-tour="blog-new"><FilePlus2 aria-hidden="true" /> New post</Link> : undefined}
        chores={posts ? <ChoresMenu label="blog, more" items={[
          { label: "Case studies", href: "/admin/blog/work", icon: "file" },
          { label: "Media library", href: "/admin/settings/media", icon: "image" },
          { label: "Export posts as CSV", href: "/admin/blog/export", icon: "download", external: true },
          ...(trashCount ? [{ label: `Trash (${trashCount})`, href: "/admin/blog?state=trash", icon: "trash" as const }] : []),
        ]} /> : undefined}
      />

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
        <Workbench
          railLabel="Blog pulse"
          rail={<>
            <RailHead title="Blog pulse" />
            <StatTiles items={[
              { label: "Published", value: String(counts.published), note: live.length ? `Last one ${when(live[live.length - 1])}` : "Nothing live yet", icon: Globe, tone: "good", href: queryHref(query, { state: "published", page: undefined }) },
              { label: "Drafts", value: String(counts.draft), note: stale ? `${stale} not touched in a month` : "Only you can see these", noteTone: stale ? "accent" : undefined, icon: PencilLine, tone: "live", href: queryHref(query, { state: "draft", page: undefined }) },
              { label: "Scheduled", value: String(counts.scheduled), note: queued.length ? `Next ${when(queued[0])}` : "Nothing waiting on a date", icon: CalendarClock, tone: "brand", href: queryHref(query, { state: "scheduled", page: undefined }) },
              { label: "In review", value: String(counts.review), note: isOwner ? "Waiting for you" : "Waiting for the owner", noteTone: counts.review ? "accent" : undefined, icon: SearchCheck, tone: counts.review ? "live" : "neutral", href: queryHref(query, { state: "review", page: undefined }) },
            ]} />
            <RailCard title="Coming up" aside="Scheduled posts" link={isOwner ? { href: "/admin/email?tab=calendar", label: "Calendar" } : undefined}>
              <RailRows empty="Nothing is waiting on a date. Schedule a draft from its row." rows={upcoming.map((p) => ({ key: p.id, title: p.title, sub: `${when(p.publishedAt)} · ${SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic}`, icon: CalendarClock, tone: "brand" as const, href: `/admin/blog/${p.id}`, tag: { text: "Booked", tone: "good" as const } }))} />
            </RailCard>
            <RailCard title="Latest posts" aside="Published">
              <RailRows empty="Nothing has been published yet." rows={recent.map((p) => ({ key: p.id, title: p.title, sub: `${when(p.publishedAt)} · ${SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic}`, icon: Globe, tone: "good" as const, href: `/admin/blog/${p.id}` }))} />
            </RailCard>
          </>}
        >
          <Deck id="blog" title="The blog this week" items={deckItems}
            emptyTitle="The blog is looked after."
            emptyBody="Nothing is waiting for review and no draft has gone cold."
            emptyNext={{ label: "Write a post", href: "/admin/blog/new" }} />

          <section className="adList" aria-label="All posts" data-tour="blog-table">
            <div className="adList__hd">
              <h2>{filtered ? "Posts" : "All posts"}</h2>
              <span className="adList__n">{filtered ? `${rows.length} of ${posts.length}` : posts.length}</span>
              <span className="adList__sp" />
              <UrlSearch label="Search posts" placeholder="Title, address or tag" />
            </div>
            <div className="adList__pad"><Chips label="State" items={stateChips} current={wanted ?? ""} /></div>
            <div className="adList__tools" data-tour="blog-filters">
              <form className="ad__filterForm" method="get" action="/admin/blog#post-list" aria-label="Filter by service">
                {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
                {wanted ? <input type="hidden" name="state" value={wanted} /> : null}
                {from ? <input type="hidden" name="from" value={from} /> : null}
                {to ? <input type="hidden" name="to" value={to} /> : null}
                {query.per ? <input type="hidden" name="per" value={per} /> : null}
                <FilterPick label="Service" hideLabel name="service" defaultValue={service ?? ""} placeholder="Every service"
                            options={SERVICES.map((s) => ({ value: s.slug, label: s.short }))} />
                <button type="submit" className="ad__btn">Apply</button>
              </form>
              <DateRange
                label="Date shown"
                value={{ from, to }}
                href={(r) => queryHref(query, { from: r.from, to: r.to, page: undefined })}
                keep={{ q: query.q, state: query.state, service: query.service, per: query.per }}
                action="/admin/blog#post-list"
              />
              <span className="adSp" />
              {filtered ? <Link className="ad__btn" href="/admin/blog">Clear filters</Link> : null}
            </div>
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
              <div className="ad__scroll" id="post-list" tabIndex={0} role="region" aria-label="Posts table, scrolls sideways" data-lenis-prevent>
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
                        <ClickRow key={p.id} href={`/admin/blog/${p.id}`} label={`${p.title}, ${PILL[state].label}. Press Enter to open.`}>
                          <td>
                            <span className="ad__pickRow"><RowPick id={p.id} label={p.title} /><span><Link href={`/admin/blog/${p.id}`}><b>{p.title}</b></Link>
                            <small>/blog/{p.slug}</small></span></span>
                          </td>
                          <td><span className={`ad__pill ${PILL[state].tone}`}>{PILL[state].label}</span></td>
                          <td>{SERVICES.find((s) => s.slug === p.topic)?.short ?? p.topic}</td>
                          <td className="ad__dim ad__num">{p.publishedAt ? when(p.publishedAt) : "Not set"}</td>
                          <td className="ad__dim">{p.savedAt ? `${when(p.savedAt)}${p.savedBy ? ` by ${p.savedBy}` : ""}` : "Imported"}</td>
                          <td className="ad__rmC"><BlogPostMenu post={{ id: p.id, title: p.title, slug: p.slug, state }} canPublish={isOwner} /></td>
                        </ClickRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
              </>
            ) : (
              <Empty title={search ? `No post matches “${query.q?.trim()}”` : "No posts match these filters"} icon={Newspaper}
                action={<Link className="ad__btn" href="/admin/blog">Clear filters</Link>}>
                Try a broader search, or clear the filters to see every post.
              </Empty>
            )}
          </section>
        </Workbench>
      )}
    </>
  );
}
