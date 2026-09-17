"use client";

import { useEffect, useRef } from "react";
import ServiceIcon from "@/components/ui/service-icon";

/**
 * The tour's icon vocabulary, mapped to the exact PascalCase lucide-react
 * export name `ServiceIcon`/`motion-icons-react` resolve by string --
 * verified against the site's own working call sites (`SERVICE_ICON` in
 * `components/preview/preview-body.tsx`) rather than guessed. A plain
 * string map, not a JSX table, so `lib/tours/types.ts` can import
 * `TourIconName` as a type without pulling this client component into the
 * registry's module graph.
 */
export const TOUR_ICON_NAMES = {
  activity: "Activity",
  barChart: "BarChart3",
  bell: "Bell",
  book: "BookOpenText",
  calculator: "Calculator",
  calendar: "CalendarClock",
  check: "CheckCircle2",
  clipboard: "ClipboardList",
  compass: "Compass",
  creditCard: "CreditCard",
  fileStack: "FileStack",
  filter: "Filter",
  flag: "Flag",
  folder: "FolderKanban",
  gauge: "Gauge",
  inbox: "Inbox",
  layout: "LayoutGrid",
  panelLeft: "PanelLeft",
  plus: "Plus",
  pointer: "MousePointerClick",
  receipt: "Receipt",
  replay: "RotateCcw",
  search: "Search",
  settings: "Settings",
  shieldCheck: "ShieldCheck",
  users: "Users",
  wallet: "Wallet",
} satisfies Record<string, string>;

export type TourIconName = keyof typeof TOUR_ICON_NAMES;

/**
 * The tour card's header icon: big, centred, and drawn with the exact same
 * stroke animation the marketing site's `ServiceIcon` uses everywhere else
 * on lucide glyphs, rather than a second animation system invented for the
 * admin. The only thing this wrapper does that a bare `<ServiceIcon>` does
 * not: start the draw immediately.
 *
 * `ServiceIcon`'s draw is gated behind an `is-in` class that
 * `components/ui/draw-gate.tsx` adds once an element scrolls into view --
 * exactly right for a 11,000px marketing page, meaningless for a tour
 * card, which is never off screen when it mounts (Joyride scrolls its
 * target into view before showing it at all). So this adds the class by
 * hand the moment the icon renders, once per step's icon.
 */
export function TourIcon({ name = "compass" }: { name?: TourIconName }) {
  const host = useRef<HTMLSpanElement>(null);
  const lucideName = TOUR_ICON_NAMES[name] ?? TOUR_ICON_NAMES.compass;

  useEffect(() => {
    host.current?.querySelector(".svc-draw")?.classList.add("is-in");
  }, [lucideName]);

  return (
    <span ref={host} className="tourCard__icon">
      <ServiceIcon name={lucideName} size={32} hover="none" entrance={null} />
    </span>
  );
}
