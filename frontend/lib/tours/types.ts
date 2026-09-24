import type { TourIconName } from "@/components/admin/tour/tour-icon";

/**
 * The tour system's shared shape, for both the admin registry
 * (`lib/tours/admin.ts`) and whatever client-side registry eventually joins
 * it once there is a client portal to walk through -- see the note at the
 * top of that file for why there is not one yet.
 *
 * WHY TYPED REGISTRIES RATHER THAN JSX WRITTEN AT THE CALL SITE. A step is
 * data -- a target, a title, a sentence, sometimes a page -- and keeping it
 * as data is what lets `tour-provider.tsx` walk a multi-page tour, persist
 * "has this been seen" per id, and filter steps by role, none of which is
 * possible if a tour is a hand-written tree of Joyride components.
 */

export type TourRole = "owner" | "staff" | "client";

/** Three depths, not one. `welcome` orients a first-time sign-in around the
 *  navigation alone; `walkthrough` is the deep, cross-page tour of what is
 *  actually on every screen; `page` covers one page's own controls. Keeping
 *  them distinct is what lets a returning admin skip straight to "what does
 *  THIS page do" without sitting through an orientation they finished
 *  months ago. */
export type TourKind = "welcome" | "walkthrough" | "page";

export type TourStep = {
  /** Stable within its tour; used for persistence and for jumping to a step
   *  directly (a page tour's own launcher does this). Never derived from
   *  index, so reordering steps in the registry cannot silently rename one
   *  a test or a deep link already refers to. */
  id: string;
  /** A CSS selector, matched against a `data-tour` attribute wherever
   *  possible -- see the note in `lib/tours/admin.ts` -- because a
   *  generated class or a DOM position both drift the moment a component is
   *  refactored, and a tour that points at nothing is worse than no tour.
   *  `"body"` with `placement: "center"` is the one exception, for an
   *  intro/outro slide with nothing specific to spotlight. */
  target: string;
  title: string;
  /** One or two sentences: the outcome, the control, what to do next. Not a
   *  narration of what is already visible on the control itself. */
  content: string;
  /** Which admin route this step's target lives on. Omitted for a
   *  single-page tour, where every step is implicitly the page the tour was
   *  launched from. Present on a full-walkthrough step whose target is on a
   *  different page than the previous one, which is what tells
   *  `tour-provider.tsx` to navigate before waiting for the target to
   *  mount. */
  href?: string;
  /** The friendly page name this step belongs to, shown in the tooltip and
   *  used to count "N pages to go" on a walkthrough. Only the first step on
   *  a new page needs to set it; the rest inherit it. */
  page?: string;
  /** Steps absent from this list are shown to everyone; a step present here
   *  is shown only to a session whose role is in the list. Today there is
   *  exactly one role (`owner`) wired through auth, so nothing in the
   *  registry actually uses this yet -- it exists so the day a `staff` role
   *  is real, filtering steps is a data change, not a new mechanism. */
  roles?: TourRole[];
  placement?: "top" | "bottom" | "left" | "right" | "auto" | "center";
  /** Dropped below the sidebar's `1024px` collapse breakpoint -- the rail's
   *  own anchors exist in the DOM there but are visually hidden. */
  desktopOnly?: boolean;
  /** Dropped at that same breakpoint and up (the mobile menu button, the
   *  drawer it opens). */
  mobileOnly?: boolean;
  /** Dropped silently if its target is not in the DOM when the tour reaches
   *  it -- an empty table, a panel with nothing in it this run. Every step
   *  already degrades this way on a missing target (see
   *  `tour-runtime.tsx`); marking a step `optional` just says the gap is
   *  expected rather than a fault to note. */
  optional?: boolean;
  /** The tooltip's animated header icon. */
  icon?: TourIconName;
  /** An interactive stop: the reader clicks the real control (not a "Next"
   *  button) and the tour advances itself. `clickTarget` overrides which
   *  selector counts as the click when it differs from `target` (a nav
   *  link, say, whose click and whose spotlight are the same element, so
   *  it is usually omitted). The Next button still works as a fallback for
   *  a reader who would rather not. */
  interact?: { hint: string; clickTarget?: string };
  /** Renders the "~N min · N stops" chip. Set on a tour's opening step
   *  only. */
  showEstimate?: boolean;
};

export type TourDef = {
  id: string;
  /** Bumped when the steps change enough that someone who finished the old
   *  version should be offered the new one. Persistence is keyed on
   *  `${id}@${version}`, so a version bump is a clean slate rather than a
   *  migration to write. */
  version: number;
  kind: TourKind;
  title: string;
  steps: TourStep[];
};

/** Back-compat alias -- `tour-provider.tsx` and `storage.ts` were written
 *  against this name before `TourDef` grew a `kind`. */
export type Tour = TourDef;

export type TourCompletion = {
  status: "completed" | "skipped";
  at: string;
};

/** Computed once when a tour starts and hung off each Joyride step's `data`
 *  field, so the tooltip renders its icon, progress, encouragement and
 *  interactive prompt without re-deriving any of it at paint time. See
 *  `lib/tours/meta.ts`. */
export type TourStepMeta = {
  icon?: TourIconName;
  interactSelector?: string;
  interactHint?: string;
  showEstimate?: boolean;
  estimateMinutes: number;
  totalStops: number;
  page?: string;
  encouragement?: string;
};
