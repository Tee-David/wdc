import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { AdminState } from "@/components/admin/admin-state";
import { Pager } from "@/components/admin/pager";
import { DropArea, MediaBrowser, UploadButton, UploadProvider } from "@/components/admin/media-library";
import {
  listMedia, MEDIA_KINDS, MEDIA_SORTS, mediaBudgetBytes, mediaDatabaseConfigured, mediaSummary,
  type MediaAsset, type MediaKind, type MediaSort,
} from "@/lib/media";
import { readableBytes } from "@/lib/media-validate";
import { r2Config } from "@/lib/r2";
import "@/components/admin/media-library.css";

export const metadata = { title: "Media" };
export const dynamic = "force-dynamic";

type Params = { show?: string; q?: string; page?: string; per?: string; kind?: string; sort?: string; month?: string; by?: string; needs?: string; view?: string };
const PER = [24, 48, 96];
const SORT_LABEL: Record<MediaSort, string> = { new: "Newest first", old: "Oldest first", name: "Name, A to Z", big: "Largest first" };
const KIND_LABEL: Record<MediaKind, string> = { image: "Pictures", video: "Videos", pdf: "PDFs" };
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Lagos" });

/**
 * Pictures, videos and documents for the public site, stored in R2.
 *
 * WHAT THIS IS NOT: the onboarding uploads. Those belong to a client's brief
 * and are opened from their record; this is the studio's own shelf of files
 * to put on pages. Separate key prefixes (`media/` against `onboarding/`) so
 * neither can reach into the other.
 *
 * Everything that narrows the list is in the URL, so a filtered view is a
 * link, and the search runs on the server, so an old file is one search away.
 */
export default async function MediaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const archived = sp.show === "archived";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const kind = (MEDIA_KINDS as readonly string[]).includes(sp.kind ?? "") ? (sp.kind as MediaKind) : "";
  const sort = (Object.keys(MEDIA_SORTS) as MediaSort[]).includes(sp.sort as MediaSort) ? (sp.sort as MediaSort) : "new";
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : "";
  const by = (sp.by ?? "").slice(0, 120);
  const needsAlt = sp.needs === "1";
  const view = sp.view === "list" ? "list" : "grid";
  const per = PER.includes(Number(sp.per)) ? Number(sp.per) : 48;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const state = { show: archived ? "archived" : "", q, kind, sort: sort === "new" ? "" : sort, month, by, needs: needsAlt ? "1" : "", view: view === "grid" ? "" : view, per: per === 48 ? "" : String(per), page: "" };
  const href = (patch: Partial<Record<keyof typeof state, string | number>>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...state, ...patch })) if (v !== "" && v !== undefined && !(k === "page" && String(v) === "1")) u.set(k, String(v));
    const s = u.toString();
    return `/admin/settings/media${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(q || month || by || needsAlt);

  if (!mediaDatabaseConfigured()) {
    return (
      <>
        <Head />
        <section className="ad__panel">
          <AdminState kind="error" title="The content database is not connected"
            description="There is nowhere for uploads to be listed until it is. Settings › Integrations says what it needs." />
        </section>
      </>
    );
  }

  /* Uploading needs the bucket's credentials AND its public address: a file
     with no address a page can use is not a library entry. Files already
     here still list without either. Said in words, not variable names. */
  const r2 = r2Config();
  const blocked = !r2.ok
    ? "File storage isn't connected, so uploads are off. Files already here still work."
    : !r2.config.publicBase
      ? "File storage has no public address yet, so uploads are off."
      : undefined;

  let items: MediaAsset[] = [];
  let total = 0;
  let sum: Awaited<ReturnType<typeof mediaSummary>> | null = null;
  try {
    [{ items, total }, sum] = await Promise.all([
      listMedia({ archived, q, page, per, kind, sort, month, by, needsAlt }),
      mediaSummary(),
    ]);
  } catch {
    sum = null;
  }
  const failed = !sum;

  /* A page past the end (a file archived since the link was made): the last
     page that exists, rather than an empty library. */
  if (!failed && !items.length && total > 0 && page > 1) redirect(href({ page: Math.ceil(total / per) }));

  const budget = mediaBudgetBytes();
  const used = sum ? sum.bytes.image + sum.bytes.video + sum.bytes.pdf + sum.bytes.other : 0;
  const share = (n: number) => `${Math.max(n > 0 ? 0.6 : 0, (n / budget) * 100)}%`;

  return (
    <UploadProvider disabled={failed ? "The library could not be read just now, so uploads are paused." : blocked}>
      <Head>
        <UploadButton />
      </Head>
      {blocked ? (
        <p className="adMedia__off" id="adMediaOff">{blocked} <Link href="/admin/settings/integrations">Connections and health</Link></p>
      ) : null}

      <DropArea>
        <section className="ad__panel adMedia">
          {sum ? (
            <div className="adMedia__top">
              <nav className="adMedia__tabs" aria-label="Which files">
                <Link href={href({ show: "", kind: "", page: 1 })} aria-current={!archived && !kind ? "page" : undefined}>All <span>{sum.live}</span></Link>
                {MEDIA_KINDS.map((k) => (
                  <Link key={k} href={href({ show: "", kind: k, page: 1 })} aria-current={!archived && kind === k ? "page" : undefined}>{KIND_LABEL[k]} <span>{sum!.kinds[k]}</span></Link>
                ))}
                <Link href={href({ show: "archived", kind: "", needs: "", page: 1 })} aria-current={archived ? "page" : undefined}>Archived <span>{sum.archived}</span></Link>
              </nav>
              <div className="adMedia__store" title={`${readableBytes(used)} of ${readableBytes(budget)}`}>
                <span className="adMedia__storeBar" role="img" aria-label={`Storage: ${readableBytes(used)} used of ${readableBytes(budget)}`}>
                  <i className="is-image" style={{ width: share(sum.bytes.image) }} />
                  <i className="is-video" style={{ width: share(sum.bytes.video) }} />
                  <i className="is-pdf" style={{ width: share(sum.bytes.pdf) }} />
                </span>
                <small><b>{readableBytes(used)}</b> of {readableBytes(budget)}</small>
              </div>
            </div>
          ) : null}

          {failed ? (
            <AdminState kind="error" title="The library could not be read"
              description="The database did not answer just now. Nothing was lost; reload in a moment." />
          ) : (
            <>
              <form className="adMedia__filters" method="get" action="/admin/settings/media" role="search" aria-label="Find files">
                {Object.entries(state).filter(([k, v]) => v && !["q", "sort", "month", "by", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <label className="ad__filterSearch adMedia__q"><span className="ad__sr">Search files</span>
                  <input name="q" type="search" defaultValue={q} placeholder="Search names, descriptions and captions" />
                </label>
                <label className="adMedia__sel"><span className="ad__sr">Sort</span>
                  <select name="sort" defaultValue={sort}>{(Object.keys(SORT_LABEL) as MediaSort[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}</select>
                </label>
                {sum!.months.length > 1 ? (
                  <label className="adMedia__sel"><span className="ad__sr">Month</span>
                    <select name="month" defaultValue={month}><option value="">Any month</option>{sum!.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
                  </label>
                ) : null}
                {sum!.uploaders.length > 1 ? (
                  <label className="adMedia__sel"><span className="ad__sr">Uploaded by</span>
                    <select name="by" defaultValue={by}><option value="">Anyone</option>{sum!.uploaders.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                  </label>
                ) : null}
                <button type="submit" className="ad__btn">Show</button>
                {filtered ? <Link className="ad__btn ad__btn--ghost" href={href({ q: "", month: "", by: "", needs: "", page: 1 })}>Clear</Link> : null}
              </form>
              <div className="adMedia__bar">
                <p className="ad__dim adMedia__count">
                  {total} {total === 1 ? "file" : "files"}{filtered ? " match" : ""}
                </p>
                {!archived && (kind === "" || kind === "image") && sum!.needsAlt ? (
                  <Link className={`adMedia__chip${needsAlt ? " is-on" : ""}`} href={href({ needs: needsAlt ? "" : "1", page: 1 })} aria-pressed={needsAlt}>
                    Needs a description <span>{sum!.needsAlt}</span>
                  </Link>
                ) : null}
                <span className="adMedia__views" role="group" aria-label="Show as">
                  <Link href={href({ view: "" })} aria-current={view === "grid" ? "true" : undefined} aria-label="Grid"><LayoutGrid aria-hidden="true" /></Link>
                  <Link href={href({ view: "list" })} aria-current={view === "list" ? "true" : undefined} aria-label="List"><List aria-hidden="true" /></Link>
                </span>
              </div>

              <MediaBrowser items={items} view={view} empty={filtered ? (
                <AdminState kind="no-results" title={q ? `No files match “${q}”` : "No files match"}
                  description="Search looks at names, descriptions and captions."
                  action={<Link className="ad__btn" href={href({ q: "", month: "", by: "", needs: "", page: 1 })}>Clear the filters</Link>} />
              ) : archived ? (
                <AdminState kind="cleared" title="Nothing archived"
                  description="Files you archive land here, and can be put back from here." />
              ) : kind ? (
                <AdminState kind="cleared" title={`No ${KIND_LABEL[kind].toLowerCase()} yet`}
                  description="Upload one and it shows here."
                  action={<Link className="ad__btn" href={href({ kind: "", page: 1 })}>Show all files</Link>} />
              ) : (
                <AdminState kind="first-use" title="No files yet"
                  description={blocked ? "Once file storage is connected, pictures and PDFs get a permanent address you can use on any page." : "Upload a picture, a video or a PDF, or drop them here. Each gets a permanent address you can use on any page, with its description kept beside it."}
                  action={blocked ? <Link className="ad__btn" href="/admin/settings/integrations">Set it up</Link> : <UploadButton />} />
              )} />
              {total > per ? (
                <Pager label="Pages of files" total={total} page={page} per={per} noun="files" perOptions={PER}
                  href={(p) => href({ page: p.page ?? 1, per: p.per ? (p.per === 48 ? "" : p.per) : state.per })} />
              ) : null}
            </>
          )}
        </section>
      </DropArea>
    </UploadProvider>
  );
}

function Head({ children }: { children?: React.ReactNode }) {
  return (
    <div className="ad__head">
      <div>
        <h1>Media library</h1>
        <p>Pictures, videos and files for the site and the blog.</p>
      </div>
      {children ? <div className="ad__row">{children}</div> : null}
    </div>
  );
}
