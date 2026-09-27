import { siteFaqs } from "@/lib/site-content";
import { SERVICES } from "@/lib/services";
import { when } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { FaqEditor } from "@/components/admin/faq-editor";
import { FaqHistory } from "@/components/admin/revisions";
import { contentHistory } from "@/lib/revisions";
import "@/components/admin/blog-editor.css";

export const metadata = { title: "FAQ" };

/**
 * The questions on the homepage, /contact and every service page.
 *
 * Saved as one override over `lib/faq.ts`; resetting deletes it and the
 * shipped questions come back. The FAQPage structured data is built from the
 * same list, so it can never describe questions the page does not show.
 */
export default async function FaqPage() {
  const configured = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  const { faqs, edited } = await siteFaqs();
  return (
    <>
      <div className="ad__head">
        <div>
          <h1>FAQ</h1>
          <p>
            {edited ? `Edited ${when(edited.at)} by ${edited.by}.` : "Showing the questions that shipped with the site."}
                      </p>
        </div>
      </div>
      {configured ? (
        <>
          <section className="ad__panel" style={{ padding: "1rem" }}>
            <FaqEditor initial={faqs} edited={Boolean(edited)} services={SERVICES.map((s) => ({ value: s.slug, label: s.short }))} />
          </section>
          <div style={{ marginTop: "1rem" }}>
            <FaqHistory items={await contentHistory("faq").catch(() => [])} />
          </div>
        </>
      ) : (
        <section className="ad__panel">
          <AdminState kind="error" title="The content database is not connected"
            description="COCKROACHDB_URL is not set, so edits have nowhere to be saved. The site is showing the questions that shipped." />
        </section>
      )}
    </>
  );
}
