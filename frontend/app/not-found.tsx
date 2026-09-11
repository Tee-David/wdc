import type { Metadata } from "next";
import LostSketch from "@/components/not-found/lost-sketch";
import "@/components/preview/preview.css";

/**
 * The 404 route.
 *
 * `robots: noindex` because a 404 that gets indexed is a 404 that shows up in
 * search results, and the page carries the `.pv` scope so it inherits the same
 * light and dark token sets as every other page rather than defining its own.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="pv">
      <LostSketch />
    </main>
  );
}
