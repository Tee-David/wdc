import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import OnboardingMount from "@/components/onboarding/onboarding-mount";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

/**
 * Client onboarding.
 *
 * NOT INDEXED, and said three ways, because one of them alone is not enough:
 * this `robots` metadata emits the meta tag a crawler reads on the page, the
 * disallow in app/robots.ts stops a well-behaved crawler fetching it at all,
 * and the sitemap never mentions it. The meta tag is the one that actually
 * binds — a disallow only asks a crawler not to look, and a URL it never
 * looked at can still be listed if someone links to it.
 *
 * A SELF-CANONICAL, WHICH IS NOT THE SAME AS ASKING TO BE INDEXED. This block
 * used to say a canonical is a request to index and therefore omitted one --
 * but omitting it does not mean there is none. The root layout sets
 * `alternates.canonical` to the site root, and metadata is INHERITED, so this
 * page was quietly telling every crawler that it is a duplicate of the
 * homepage. That is a far worse signal than the one the omission was avoiding,
 * and `noindex` decides indexing regardless.
 */
export const metadata: Metadata = {
  title: "Client onboarding",
  description: "The brief. For clients who have already started a project with us.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: `${SITE_URL}/onboarding` },
};

export default function OnboardingPage() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="pv-sec ob-sec">
          <div className="pv-wrap">
            {/* THE PAGE'S ONE HEADING, RENDERED ON THE SERVER.

                The form is mounted client-side, so until it hydrated this
                document had no h1 at all -- its outline began with the
                footer's "Company". A screen-reader user landing here was told
                nothing about where they were.

                Visually hidden rather than drawn, because the form supplies
                its own visible heading a moment later and two stacked titles
                would be worse design for everyone. Nothing is hidden BEHIND
                client rendering: this is in the server HTML, which is the
                whole point of it. The step titles below are h2 so the outline
                has exactly one h1 and no gaps. */}
            <h1 className="sr-only">Client onboarding</h1>
            <OnboardingMount />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
