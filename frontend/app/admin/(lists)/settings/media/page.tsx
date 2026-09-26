import Link from "next/link";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { redirect } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { AdminState } from "@/components/admin/admin-state";
import { Pager } from "@/components/admin/pager";
import { DropArea, LibraryFolders, MediaBrowser, UploadButton, UploadProvider } from "@/components/admin/media-library";
import { folderTree, type FolderTree } from "@/lib/media-folders";
import {
  listMedia, MEDIA_KINDS, MEDIA_SORTS, mediaBudgetBytes, mediaDatabaseConfigured, mediaSummary,
  type MediaAsset, type MediaKind, type MediaSort,
} from "@/lib/media";
import { readableBytes } from "@/lib/media-validate";
import { r2Config } from "@/lib/r2";
import "@/components/admin/media-library.css";
import { FilterPick } from "@/components/admin/pick";
import { adminRole } from "@/lib/admin/guard";

export const metadata = { title: "Media" };
export const dynamic = "force-dynamic";

type Params = { show?: string; q?: string; page?: string; per?: string; kind?: string; sort?: string; month?: string; by?: string; needs?: string; view?: string; folder?: string; deep?: string };
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
  const isOwner = (await adminRole()) === "owner";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const kind = (MEDIA_KINDS as readonly string[]).includes(sp.kind ?? "") ? (sp.kind as MediaKind) : "";
  const sort = (Object.keys(MEDIA_SORTS) as MediaSort[]).includes(sp.sort as MediaSort) ? (sp.sort as MediaSort) : "new";
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : "";
  const by = (sp.by ?? "").slice(0, 120);
  const needsAlt = sp.needs === "1";
  const view = sp.view === "list" ? "list" : "grid";
  const per = PER.includes(Number(sp.per)) ? Number(sp.per) : 48;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const folder = sp.folder === "unsorted" || /^[0-9a-f-]{36}$/i.test(sp.folder ?? "") ? sp.folder! : "";
  const deep = sp.deep === "1" && folder !== "" && folder !== "unsorted";
  const state = { show: archived ? "archived" : "", q, kind, sort: sort === "new" ? "" : sort, month, by, needs: needsAlt ? "1" : "", view: view === "grid" ? "" : view, per: per === 48 ? "" : String(per), page: "", folder, deep: deep ? "1" : "" };
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
  let tree: FolderTree = { folders: [], unsorted: 0, all: 0 };
  try {
    [{ items, total }, sum, tree] = await Promise.all([
      listMedia({ archived, q, page, per, kind, sort, month, by, needsAlt, folder: archived ? "" : folder, deep }),
      mediaSummary(),
      folderTree(),
    ]);
  } catch {
    sum = null;
  }
  const failed = !sum;

  /* A page past the end (a file archived since the link was made): the last
     page that exists, rather than an empty library. */
  if (!failed && !items.length && total > 0 && page > 1) redirect(href({ page: Math.ceil(total / per) }));

  /* Where you are: the folder, the folders above it, and the ones inside it. */
  const current = tree.folders.find((f) => f.id === folder) ?? null;
  const trail: typeof tree.folders = [];
  for (let f = current; f; f = tree.folders.find((x) => x.id === f!.parentId) ?? null) trail.unshift(f);
  const here = {
    folder: current,
    trail,
    name: current ? current.name : folder === "unsorted" ? "Unsorted" : "All files",
    children: current ? tree.folders.filter((f) => f.parentId === current.id).sort((a, b) => a.position - b.position) : [],
  };

  const budget = mediaBudgetBytes();
  const used = sum ? sum.bytes.image + sum.bytes.video + sum.bytes.pdf + sum.bytes.other : 0;
  const share = (n: number) => `${Math.max(n > 0 ? 0.6 : 0, (n / budget) * 100)}%`;

  return (
    <UploadProvider folder={current ? current.id : null} disabled={failed ? "The library could not be read just now, so uploads are paused." : blocked}>
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
              <nav className="adMedia__tabs" aria-label="Which files" data-tour="media-tabs">
                <Link href={href({ show: "", kind: "", page: 1 })} aria-current={!archived && !kind ? "page" : undefined}>All <span>{sum.live}</span></Link>
                {MEDIA_KINDS.map((k) => (
                  <Link key={k} href={href({ show: "", kind: k, page: 1 })} aria-current={!archived && kind === k ? "page" : undefined}>{KIND_LABEL[k]} <span>{sum!.kinds[k]}</span></Link>
                ))}
                <Link href={href({ show: "archived", kind: "", needs: "", page: 1 })} aria-current={archived ? "page" : undefined}>Trash <span>{sum.archived}</span></Link>
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
            <div className={`adMedia__body${archived ? " is-flat" : ""}`}>
              {!archived ? <LibraryFolders tree={tree} current={folder} currentName={here.name} /> : null}
              <div className="adMedia__main">
              {!archived && (folder || tree.folders.length) ? (
                <div className="adMedia__crumbs">
                  <nav aria-label="Where you are">
                    <ol>
                      <li><Link href={href({ folder: "", deep: "", page: 1 })} aria-current={!folder ? "page" : undefined}>All files</Link></li>
                      {here.trail.map((f, n) => (
                        <li key={f.id} className={n < here.trail.length - 2 ? "is-far" : undefined}>
                          <Link href={href({ folder: f.id, page: 1 })} aria-current={f.id === folder ? "page" : undefined}>{f.name}</Link>
                        </li>
                      ))}
                      {folder === "unsorted" ? <li><Link href={href({ folder: "unsorted", page: 1 })} aria-current="page">Unsorted</Link></li> : null}
                    </ol>
                  </nav>
                  {here.folder && here.folder.total > here.folder.own ? (
                    <Link className={`adMedia__chip${deep ? " is-on" : ""}`} href={href({ deep: deep ? "" : "1", page: 1 })} aria-pressed={deep}>
                      Include subfolders
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {here.children.length ? (
                <ul className="adMedia__subs" aria-label={`Folders in ${here.name}`}>
                  {here.children.map((f) => <li key={f.id}><Link href={href({ folder: f.id, deep: "", page: 1 })}>{f.name} <span>{f.total}</span></Link></li>)}
                </ul>
              ) : null}
              <form className="adMedia__filters" method="get" action="/admin/settings/media" role="search" aria-label="Find files">
                {Object.entries(state).filter(([k, v]) => v && !["q", "sort", "month", "by", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <label className="ad__filterSearch adMedia__q"><span className="ad__sr">Search files</span>
                  <input name="q" type="search" defaultValue={q} placeholder="Search names, descriptions and captions" />
                </label>
                <FilterPick className="adMedia__sel" label="Sort" hideLabel name="sort" defaultValue={sort}
                            options={(Object.keys(SORT_LABEL) as MediaSort[]).map((s) => ({ value: s, label: SORT_LABEL[s] }))} />
                {sum!.months.length > 1 ? (
                  <FilterPick className="adMedia__sel" label="Month" hideLabel name="month" defaultValue={month} placeholder="Any month"
                              options={sum!.months.map((m) => ({ value: m, label: monthLabel(m) }))} />
                ) : null}
                {sum!.uploaders.length > 1 ? (
                  <FilterPick className="adMedia__sel" label="Uploaded by" hideLabel name="by" defaultValue={by} placeholder="Anyone"
                              options={sum!.uploaders.map((u) => ({ value: u, label: u }))} />
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

              <MediaBrowser items={items} view={view} tree={tree} archived={archived} canDelete={isOwner} empty={filtered ? (
                <AdminState kind="no-results" title={q ? `No files match “${q}”` : "No files match"}
                  description="Search looks at names, descriptions and captions."
                  action={<Link className="ad__btn" href={href({ q: "", month: "", by: "", needs: "", page: 1 })}>Clear the filters</Link>} />
              ) : archived ? (
                <AdminState kind="cleared" title="The Trash is empty"
                  description="Files moved to the Trash land here. Restore them from here, or delete them permanently." />
              ) : here.folder ? (
                here.folder.total > here.folder.own && !deep ? (
                  <AdminState kind="cleared" title={`Nothing directly in ${here.folder.name}`}
                    description={`Its folders hold ${here.folder.total - here.folder.own} ${here.folder.total - here.folder.own === 1 ? "file" : "files"}.`}
                    action={<Link className="ad__btn" href={href({ deep: "1", page: 1 })}>Show the {here.folder.total - here.folder.own} in subfolders</Link>} />
                ) : (
                  <AdminState kind="cleared" title={`${here.folder.name} is empty`}
                    description={blocked ? "Drag files onto it from All files." : "Upload into it, or drag files onto it from All files."}
                    action={blocked ? <Link className="ad__btn" href={href({ folder: "", page: 1 })}>Show all files</Link> : <UploadButton />} />
                )
              ) : folder === "unsorted" ? (
                <AdminState kind="cleared" title="Everything is in a folder"
                  description="New uploads land here until they are moved into one." />
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
              </div>
            </div>
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
      <div className="ad__row"><PageTourButton />{children}</div>
    </div>
  );
}
