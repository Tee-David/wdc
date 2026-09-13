import type { Metadata } from "next";
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
 * NO CANONICAL. A canonical URL is a request to index this address, which is
 * the opposite of what the rest of this block is for.
 *
 * DEMO. The form does not submit anywhere yet. It is here so the questions,
 * the branching and the flow can be seen and argued with before the endpoint,
 * the R2 uploads and the resume links are built behind it.
 */
export const metadata: Metadata = {
  title: "Client onboarding",
  description: "The brief. For clients who have already started a project with us.",
  robots: { index: false, follow: false, nocache: true },
};

export default function OnboardingPage() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="pv-sec ob-sec">
          <div className="pv-wrap">
            <OnboardingMount />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
