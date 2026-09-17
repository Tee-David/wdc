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

export type TourRole = "owner" | "staff";

export type TourStep = {
  /** Stable within its tour; used for persistence and for jumping to a step
   *  directly (a page tour's own launcher does this). Never derived from
   *  index, so reordering steps in the registry cannot silently rename one
   *  a test or a deep link already refers to. */
  id: string;
  /** A CSS selector, matched against a `data-tour` attribute wherever
   *  possible -- see the note in `lib/tours/admin.ts` -- because a
   *  generated class or a DOM position both drift the moment a component is
   *  refactored, and a tour that points at nothing is worse than no tour. */
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
  /** Steps absent from this list are shown to everyone; a step present here
   *  is shown only to a session whose role is in the list. Today there is
   *  exactly one role (`owner`) wired through auth, so nothing in the
   *  registry actually uses this yet -- it exists so the day a `staff` role
   *  is real, filtering steps is a data change, not a new mechanism. */
  roles?: TourRole[];
  placement?: "top" | "bottom" | "left" | "right" | "auto" | "center";
};

export type Tour = {
  /** Stable id, used as the localStorage key's subject and never reused for
   *  a differently-scoped tour even if the old one is retired. */
  id: string;
  /** Bumped when the steps change enough that someone who finished the old
   *  version should be offered the new one. Persistence is keyed on
   *  `${id}@${version}`, so a version bump is a clean slate rather than a
   *  migration to write. */
  version: number;
  title: string;
  steps: TourStep[];
};

export type TourCompletion = {
  status: "completed" | "skipped";
  at: string;
};
