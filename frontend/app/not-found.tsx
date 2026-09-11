import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import LostSketch from "@/components/not-found/lost-sketch";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

/**
 * The 404 route.
 *
 * `robots: noindex` because a 404 that gets indexed is a 404 that shows up in
 * search results. `follow` stays on, so the links out of it still pass a
 * crawler through to the real pages.
 *
 * The page carries the `.pv` scope, so it inherits the same light and dark
 * token sets as every other page rather than defining its own, and it carries
 * the real header and footer: the single job of this page is to stop being a
 * dead end, and the site's own navigation does that better than anything
 * invented for the occasion.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 pv">
        <LostSketch />
      </main>
      <SiteFooter />
    </>
  );
}
