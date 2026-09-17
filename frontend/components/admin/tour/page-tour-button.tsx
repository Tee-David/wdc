"use client";

import { Compass } from "lucide-react";
import { useAdminTour } from "./tour-provider";

/**
 * Dropped into a page's own `ad__head` action row. Reads "replay" versus
 * "take a tour" off this browser's own completion record, so a page
 * finished once does not keep inviting itself back under the same label.
 *
 * Renders nothing on a route with no page tour registered (see
 * `lib/tours/admin.ts`) and nothing while any tour is already running, so
 * it can never open a second one on top of the first.
 */
export default function PageTourButton() {
  const { hasPageTour, pageTourCompleted, startPageTour, active } = useAdminTour();
  if (!hasPageTour || active) return null;

  return (
    <button type="button" className="ad__btn" onClick={startPageTour}>
      <Compass aria-hidden="true" /> {pageTourCompleted ? "Replay this page's tour" : "Tour this page"}
    </button>
  );
}
