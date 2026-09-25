import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminState } from "@/components/admin/admin-state";
import { Pager } from "@/components/admin/pager";
import { MediaGrid, MediaUploader } from "@/components/admin/media-library";
import { listMedia, MEDIA_PAGE, mediaCounts, mediaDatabaseConfigured, type MediaAsset } from "@/lib/media";
import { r2Config } from "@/lib/r2";
import "@/components/admin/media-library.css";

export const metadata = { title: "Media" };
export const dynamic = "force-dynamic";

/**
 * Pictures and documents for the public site, stored in R2.
 *
 * WHAT THIS IS NOT: the onboarding uploads. Those belong to a client's brief
 * and are opened from their record; this is the studio's own shelf of files
 * to put on pages. Separate key prefixes (`media/` against `onboarding/`) so
 * neither can reach into the other.
 */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ show?: string; q?: string; page?: string }> }) {
  const query = await searchParams;
  const archived = query.show === "archived";
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const href = (patch: { page?: number; q?: string }) => {
    const u = new URLSearchParams();
    if (archived) u.set("show", "archived");
    const nq = patch.q ?? q;
    if (nq) u.set("q", nq);
    if ((patch.page ?? 1) > 1) u.set("page", String(patch.page));
    const s = u.toString();
    return `/admin/settings/media${s ? `?${s}` : ""}`;
  };

  if (!mediaDatabaseConfigured()) {
    return (
      <>
        <Head />
        <section className="ad__panel">
          <AdminState kind="error" title="The content database is not connected"
            description="COCKROACHDB_URL is not set, so uploads would have nowhere to be listed." />
        </section>
      </>
    );
  }

  /* Uploading needs the bucket's credentials AND its public address: a file
     with no address a page can use is not a library entry, it is a leak of
     storage. Existing files still list without either. */
  const r2 = r2Config();
  const blocked = !r2.ok
    ? `Uploads are off until ${r2.missing.join(", ")} ${r2.missing.length === 1 ? "is" : "are"} set.`
    : !r2.config.publicBase
      ? "Uploads are off until CLOUDFLARE_R2_URL, the bucket's public address, is set."
      : undefined;

  let items: MediaAsset[] = [];
  let total = 0;
  let counts = { live: 0, archived: 0 };
  let failed = false;
  try {
    [{ items, total }, counts] = await Promise.all([listMedia({ archived, q, page }), mediaCounts()]);
  } catch {
    failed = true;
  }

  /* A page past the end (a file archived since the link was made): the last
     page that exists, rather than an empty library. */
  if (!failed && !items.length && total > 0 && page > 1) redirect(href({ page: Math.ceil(total / MEDIA_PAGE) }));

  return (
    <>
      <Head />
      <section className="ad__panel adMedia">
        <MediaUploader disabled={failed ? "The library could not be read just now, so uploads are paused." : blocked} />

        <nav className="adMedia__views" aria-label="Which files">
          <Link href="/admin/settings/media" aria-current={archived ? undefined : "page"}>In the library ({counts.live})</Link>
          <Link href="/admin/settings/media?show=archived" aria-current={archived ? "page" : undefined}>Archived ({counts.archived})</Link>
        </nav>

        {failed ? (
          <AdminState kind="error" title="The library could not be read"
            description="The database did not answer just now. Nothing was lost; reload in a moment." />
        ) : (
          <>
            {/* SEARCH ON THE SERVER once the library is bigger than a page,
                so a file from years ago is one search away rather than
                unreachable behind the newest 120. */}
            {(archived ? counts.archived : counts.live) > MEDIA_PAGE || q ? (
              <form className="adMedia__find" method="get" action="/admin/settings/media" aria-label="Search files">
                {archived ? <input type="hidden" name="show" value="archived" /> : null}
                <label className="ad__filterSearch">
                  <span className="ad__sr">Search files</span>
                  <input name="q" type="search" defaultValue={q} placeholder="Search every file by name or description" />
                </label>
                <button type="submit" className="ad__btn">Search</button>
                {q ? <Link className="ad__btn" href={href({ q: "", page: 1 })}>Clear</Link> : null}
              </form>
            ) : null}
            <MediaGrid search={!q && total <= MEDIA_PAGE} items={items} empty={q ? (
              <AdminState kind="no-results" title={`No files match “${q}”`}
                description="Search looks at file names and descriptions."
                action={<Link className="ad__btn" href={href({ q: "", page: 1 })}>Clear the search</Link>} />
            ) : archived ? (
              <AdminState kind="cleared" title="Nothing archived"
                description="Files you archive land here, and can be put back from here." />
            ) : (
              <AdminState kind="first-use" title="No files yet"
                description="Upload a picture or a PDF and it gets a permanent address you can use on any page, with its description kept beside it."
                action={<span className="ad__dim">Use “Upload files” above to add the first one.</span>} />
            )} />
            {total > MEDIA_PAGE ? (
              <Pager label="Pages of files" total={total} page={page} per={MEDIA_PAGE} noun="files" perOptions={[]} href={(p) => href({ page: p.page })} />
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function Head() {
  return (
    <div className="ad__head">
      <div>
        <h1>Media library</h1>
        <p>Pictures and files for the site and the blog.</p>
      </div>
    </div>
  );
}
