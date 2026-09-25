import Link from "next/link";
import { AdminState } from "@/components/admin/admin-state";
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
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const archived = (await searchParams).show === "archived";

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
    [{ items, total }, counts] = await Promise.all([listMedia({ archived }), mediaCounts()]);
  } catch {
    failed = true;
  }

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
            <MediaGrid items={items} empty={archived ? (
              <AdminState kind="cleared" title="Nothing archived"
                description="Files you archive land here, and can be put back from here." />
            ) : (
              <AdminState kind="first-use" title="No files yet"
                description="Upload a picture or a PDF and it gets a permanent address you can use on any page, with its description kept beside it."
                action={<span className="ad__dim">Use “Upload files” above to add the first one.</span>} />
            )} />
            {total > items.length ? (
              <p className="ad__dim adMedia__more">Showing the newest {MEDIA_PAGE} of {total}.</p>
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
