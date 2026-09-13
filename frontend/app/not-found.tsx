import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
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
  /* NULL, NOT A URL. Metadata is inherited, and the root layout canonicalises
     to the site root -- so every 404 was declaring itself a duplicate of the
     homepage, which is an invitation to fold missing URLs into it. A 404 has
     no stable address of its own to point at either, since it is served for
     whatever was asked for, so the honest answer is no canonical at all. */
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <LostSketch />
      </main>
    </>
  );
}
