"use client";

import { LogOut, Play } from "lucide-react";
import { useOptionalAdminTour } from "./tour/tour-provider";
import { initialsOf } from "./focus";

/**
 * The sidebar's foot, pinned under a menu that scrolls: an offer of the tour
 * until it has been taken, then who is signed in and the way out.
 *
 * The card goes once the walkthrough is finished rather than nagging for
 * ever; the "?" in the top bar still replays any tour.
 */
export function SideTourCard({ collapsed }: { collapsed: boolean }) {
  const tours = useOptionalAdminTour();
  if (collapsed || !tours || tours.active || tours.walkthroughCompleted) return null;
  return (
    <div className="ad__tourCard">
      <span className="ad__tourTile" aria-hidden="true"><Play /></span>
      <b>Two-minute tour</b>
      <p>Walk through the dashboard, or only this page. Skip it any time.</p>
      <button type="button" className="ad__tourStart" onClick={tours.startWalkthrough}>Start the tour</button>
    </div>
  );
}

export function SideProfile({
  user,
  role,
  collapsed,
  onSignOut,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  role: string;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className={`ad__me${collapsed ? " is-collapsed" : ""}`}>
      <span className="ad__meAv" aria-hidden="true">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" />
        ) : initialsOf(user, role)}
      </span>
      {!collapsed ? (
        <span className="ad__meText">
          <b>{user.name || role}</b>
          <small>{role}{user.email ? ` · ${user.email}` : ""}</small>
        </span>
      ) : null}
      <button type="button" className="ad__iconButton ad__meOut" onClick={onSignOut} aria-label="Sign out" title="Sign out">
        <LogOut aria-hidden="true" />
      </button>
    </div>
  );
}
