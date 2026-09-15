import { CASE_STUDIES } from "./work";
import { TESTIMONIALS } from "./testimonials";
import { SERVICES } from "./services";

/**
 * The figures under the homepage hero.
 *
 * NOT ONE OF THEM IS TYPED IN. Every number below is COUNTED, at build time,
 * from the same data the rest of the site renders: the case studies in
 * `lib/work.ts`, the client quotes in `lib/testimonials.ts`, the six services
 * in `lib/services.ts`. Add a project and the strip says eighteen the same
 * day; take one down and it says sixteen. There is no second copy to drift.
 *
 * WHY THAT IS THE WHOLE DESIGN RATHER THAN AN IMPLEMENTATION DETAIL. A stats
 * band is the easiest thing on a marketing site to lie with -- "500+ projects",
 * "98% satisfaction", "10M users" -- and the reference layouts are full of
 * exactly those. `lib/work.ts` already refuses to carry invented client
 * results, and `lib/testimonials.ts` records that eight fabricated
 * testimonials attributed to invented people once rendered on this site and
 * were deleted. Putting hand-typed figures under the hero would walk all of
 * that back in the largest type on the page.
 *
 * SO THE SMALLNESS IS THE ARGUMENT. Seventeen projects is not five hundred,
 * and a studio that publishes seventeen and lets you open every one of them is
 * making a claim a reader can check in thirty seconds -- which is worth more
 * than a number they cannot. The copy says so out loud.
 *
 * WHAT IS DELIBERATELY NOT HERE. No revenue figure, no "satisfaction" score,
 * no uptime percentage, no years-in-business, no team size. We can count what
 * we have shipped and who has spoken on the record; we cannot evidence any of
 * those, and a figure nobody can check is the one that makes a reader discount
 * the three beside it.
 */

export type Stat = {
  key: string;
  /** The number itself, so the counter can animate to it. */
  value: number;
  /** What follows the digits: "+", "%", nothing. */
  suffix?: string;
  /** The thing being counted, in two or three words. */
  label: string;
  /** Where the number comes from, and why it matters. One sentence. */
  detail: string;
};

/**
 * Deliverables across every case study.
 *
 * `did` is the "what the engagement covered" list on each piece -- the logo
 * suite, the booking flow, the payment integration, the signage. Summing them
 * is the only volume figure on this page, and it is a count of lines somebody
 * wrote down against delivered work rather than an estimate of effort.
 */
function deliverables() {
  return CASE_STUDIES.reduce((total, study) => total + study.did.length, 0);
}

/**
 * Sectors with exactly one client in them.
 *
 * Counted rather than asserted, because the interesting fact is the RATIO: at
 * the time of writing every one of the seventeen sits in a sector of its own,
 * which is what "we have worked across" actually means when a studio says it.
 * If two clients ever share a sector this number drops, and the copy that
 * renders it is written to stay true when it does.
 */
function sectors() {
  return new Set(CASE_STUDIES.map((study) => study.sector)).size;
}

export function proofStats(): Stat[] {
  const projects = CASE_STUDIES.length;
  const quoted = TESTIMONIALS.length;

  return [
    {
      key: "projects",
      value: projects,
      label: "Projects delivered",
      detail: `Every one live, named and on this site. Across ${sectors()} different sectors, which is most of why the work does not all look the same.`,
    },
    {
      key: "deliverables",
      value: deliverables(),
      label: "Things shipped",
      detail: "Counted off the case studies themselves: logo suites, booking flows, payment integrations, signage. The work, not the pitch.",
    },
    {
      key: "quoted",
      value: quoted,
      /* THE RATIO IS THE POINT, and it is computed rather than rounded: a
         testimonial count on its own says nothing about how many clients
         declined. */
      label: `Clients on the record`,
      detail: `${quoted} of the ${projects} agreed to be quoted, in their own words. None of it written by us — the ones who said nothing are simply not here.`,
    },
    {
      key: "services",
      value: SERVICES.length,
      label: "Disciplines, one team",
      detail: "Brand, web, apps, software, SEO and social under one roof, so nothing is lost between the people who design a thing and the people who build it.",
    },
  ];
}

/**
 * The line that makes the numbers mean something.
 *
 * It is generated from the same counts so it cannot contradict the strip above
 * it -- the commonest way a stats band goes wrong is prose that was true when
 * it was written.
 */
export function proofLine() {
  return `${CASE_STUDIES.length} projects, ${TESTIMONIALS.length} clients on the record, nothing rounded up.`;
}
