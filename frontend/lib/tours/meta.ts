import type { TourKind, TourStep, TourStepMeta } from "./types";

/**
 * Step metadata, computed once when a tour starts and hung off each step's
 * `data` field so the tooltip can render its icon, progress, encouragement
 * and interactive prompt without re-deriving anything at paint time.
 *
 * Computed AFTER the caller has already filtered the step list (role/
 * viewport-only steps dropped), so the counts promised to the reader
 * ("12 stops", "2 pages to go") match the tour they actually get.
 */

/** Average dwell per stop, in seconds -- tuned against the length of the
 *  real copy below. */
const SECONDS_PER_STOP = 9;

/** Rounded minutes for a tour of `stops` steps. Never rounds down to zero. */
export function estimateMinutes(stops: number): number {
  return Math.max(1, Math.round((stops * SECONDS_PER_STOP) / 60));
}

/**
 * Group consecutive steps into "pages". A step declares a new page by
 * carrying a `page` different from the running one; steps without one
 * continue the current page. Page tours never vary `page` mid-tour, so they
 * collapse to a single group, which is what their "steps left" copy wants.
 */
function groupSteps(steps: TourStep[]): { groupOf: number[]; groupCount: number } {
  const groupOf: number[] = [];
  let page: string | undefined;
  let group = -1;

  steps.forEach((step, i) => {
    if (i === 0 || (step.page !== undefined && step.page !== page)) {
      group += 1;
      if (step.page !== undefined) page = step.page;
    }
    groupOf[i] = group;
  });

  return { groupOf, groupCount: group + 1 };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The nudge under the progress rail. Kept short -- it is a garnish, not a
 *  paragraph. */
function encouragementFor(options: {
  index: number; total: number; kind: TourKind; pagesLeft: number; stopsLeftOnPage: number;
}): string | undefined {
  const { index, total, kind, pagesLeft, stopsLeftOnPage } = options;

  if (index === total - 1) return "That's everything -- you're all set.";
  if (index === 0) return undefined; // the opener leads with the duration estimate instead

  if (kind === "walkthrough") {
    if (stopsLeftOnPage === 0 && pagesLeft > 0) return `Good progress -- ${plural(pagesLeft, "page", "pages")} to go.`;
    if (stopsLeftOnPage > 0) return `${plural(stopsLeftOnPage, "stop", "stops")} left on this page.`;
    return undefined;
  }

  const left = total - 1 - index;
  return left > 0 ? `Only ${plural(left, "step", "steps")} left.` : undefined;
}

/** Attach the computed `data` payload to every step. Returns new step
 *  objects; the registry's own definitions are never mutated, since a tour
 *  can be started many times in one session. */
export function withStepMeta(steps: TourStep[], kind: TourKind): (TourStep & { data: TourStepMeta })[] {
  const total = steps.length;
  const minutes = estimateMinutes(total);
  const { groupOf, groupCount } = groupSteps(steps);

  let lastPage: string | undefined;
  const pageOf = steps.map((s) => { if (s.page !== undefined) lastPage = s.page; return lastPage; });

  return steps.map((step, index) => {
    const stopsLeftOnPage = steps.filter((_, j) => j > index && groupOf[j] === groupOf[index]).length;
    const pagesLeft = groupCount - 1 - groupOf[index];

    const data: TourStepMeta = {
      icon: step.icon,
      interactSelector: step.interact ? (step.interact.clickTarget ?? step.target) : undefined,
      interactHint: step.interact?.hint,
      showEstimate: step.showEstimate,
      estimateMinutes: minutes,
      totalStops: total,
      page: pageOf[index],
      encouragement: encouragementFor({ index, total, kind, pagesLeft, stopsLeftOnPage }),
    };

    return { ...step, data };
  });
}
