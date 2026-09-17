"use client";

import { motion, useReducedMotion, type Transition, type TargetAndTransition } from "motion/react";
import {
  Activity, BarChart3, Bell, BookOpenText, Calculator, CalendarClock, CheckCircle2, ClipboardList,
  Compass, CreditCard, FileStack, Filter, Flag, FolderKanban, Gauge, Inbox, LayoutGrid,
  type LucideIcon, MousePointerClick, PanelLeft, Plus, Receipt, RotateCcw, Search,
  Settings, ShieldCheck, Sparkles, Users, Wallet,
} from "lucide-react";

/**
 * The tour's icon vocabulary. Every step names one of these; the tooltip
 * header renders it inside an accent-tinted disc with a gentle, looping
 * animation, adapted from a reference tour built for a comparable admin --
 * kept as a plain map (no JSX) so `lib/tours/types.ts` can import
 * `TourIconName` as a type without pulling a client component into the
 * registry's module graph.
 */
export const TOUR_ICONS = {
  activity: Activity,
  barChart: BarChart3,
  bell: Bell,
  book: BookOpenText,
  calculator: Calculator,
  calendar: CalendarClock,
  check: CheckCircle2,
  clipboard: ClipboardList,
  compass: Compass,
  creditCard: CreditCard,
  fileStack: FileStack,
  filter: Filter,
  flag: Flag,
  folder: FolderKanban,
  gauge: Gauge,
  inbox: Inbox,
  layout: LayoutGrid,
  panelLeft: PanelLeft,
  plus: Plus,
  pointer: MousePointerClick,
  receipt: Receipt,
  replay: RotateCcw,
  search: Search,
  settings: Settings,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  users: Users,
  wallet: Wallet,
} satisfies Record<string, LucideIcon>;

export type TourIconName = keyof typeof TOUR_ICONS;

type MotionFamily = "float" | "pulse" | "wiggle" | "spin" | "nudge";

/** Each family is a small, low-amplitude loop -- presence, never
 *  distraction, and every one of them is skipped under
 *  `prefers-reduced-motion` by the component below. */
const FAMILIES: Record<MotionFamily, { animate: TargetAndTransition; transition: Transition }> = {
  float: {
    animate: { y: [0, -2.5, 0] },
    transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
  },
  pulse: {
    animate: { scale: [1, 1.12, 1] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  wiggle: {
    animate: { rotate: [0, -9, 8, -4, 0] },
    transition: { duration: 1.6, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" },
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 9, repeat: Infinity, ease: "linear" },
  },
  nudge: {
    animate: { x: [0, 2.5, 0], y: [0, 2.5, 0] },
    transition: { duration: 1.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" },
  },
};

/** Icon → motion family. Anything unmapped floats. */
const ICON_MOTION: Partial<Record<TourIconName, MotionFamily>> = {
  activity: "pulse",
  bell: "wiggle",
  calendar: "wiggle",
  check: "pulse",
  compass: "spin",
  flag: "wiggle",
  gauge: "pulse",
  panelLeft: "nudge",
  plus: "pulse",
  pointer: "nudge",
  replay: "spin",
  search: "nudge",
  settings: "spin",
  sparkles: "pulse",
};

/**
 * Animated step icon: a lucide glyph in an accent disc with a soft halo
 * breathing behind it. All motion is disabled under `prefers-reduced-motion`,
 * leaving a clean static icon -- the halo is skipped entirely rather than
 * frozen mid-pulse.
 */
export function TourIcon({ name = "sparkles", className }: { name?: TourIconName; className?: string }) {
  const reduced = useReducedMotion();
  const Icon = TOUR_ICONS[name] ?? Sparkles;
  const family = FAMILIES[ICON_MOTION[name] ?? "float"];

  return (
    <span className={`tourCard__icon${className ? ` ${className}` : ""}`}>
      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="tourCard__iconHalo"
          animate={{ scale: [1, 1.3, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        className="tourCard__iconGlyph"
        animate={reduced ? undefined : family.animate}
        transition={reduced ? undefined : family.transition}
      >
        <Icon aria-hidden="true" />
      </motion.span>
    </span>
  );
}
