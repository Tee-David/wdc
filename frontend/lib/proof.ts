/**
 * The figures under the homepage hero.
 *
 * FOUR NUMBERS, HAND-MAINTAINED. An earlier version counted these at build
 * time from the case studies and testimonials on the site, on the theory that
 * a stats band is the easiest thing on a marketing site to lie with and the
 * safest defence is to derive every figure from data a reader can click
 * through. That held while the agency's real track record and its published
 * case studies were the same size; they no longer are. Ten years, 50-plus
 * projects, 200-plus clients and 2,000-plus deliverables are the agency's own
 * count of its history, not a count of what happens to be written up on this
 * site today, so they are set by hand below rather than derived from
 * `lib/work.ts`.
 *
 * REVIEWED, LIKE THE OTHER HAND-SET FIGURES ON THIS SITE. `RATE_CARD` in
 * `lib/estimate.ts` carries a review date for the same reason: a number
 * nobody owns quietly goes stale. Update `REVIEWED` whenever these four are
 * next confirmed with the agency.
 *
 * WHAT IS DELIBERATELY STILL NOT HERE. No revenue figure, no "satisfaction"
 * score, no uptime percentage, because none of those are things the agency
 * can point to and explain in a sentence the way years, projects, clients and
 * deliverables are.
 */

export type Stat = {
  key: string;
  /** The number itself, so the counter can animate to it. */
  value: number;
  /** What follows the digits: "+", "%", nothing. */
  suffix?: string;
  /** The thing being counted, in two or three words. */
  label: string;
  /** What the number covers, in one plain sentence. */
  detail: string;
};

/** Last confirmed with the agency. Move this forward whenever the four
    figures below are reviewed and reset. */
export const REVIEWED = "2026-09";

export function proofStats(): Stat[] {
  return [
    {
      key: "years",
      value: 10,
      suffix: "+",
      label: "Years in business",
      detail: "A decade of client work across brand, web, apps, software, SEO and social.",
    },
    {
      key: "projects",
      value: 50,
      suffix: "+",
      label: "Projects shipped",
      detail: "Websites, apps, software and campaigns delivered end to end, not just designed.",
    },
    {
      key: "clients",
      value: 200,
      suffix: "+",
      label: "Clients on record",
      detail: "Businesses we have delivered work for, a good number of them coming back for the next project.",
    },
    {
      key: "deliverables",
      value: 2000,
      suffix: "+",
      label: "Deliverables met",
      detail: "Logo suites, booking flows, payment integrations, dashboards and more, each one shipped and signed off.",
    },
  ];
}

/** A thousand or more reads as "2K", not "2000": the same "k" shorthand
    `lib/estimate.ts` already uses for a figure this size. Below a thousand
    this is just the whole number. Exported so the component that animates
    through it and the test that pins the settled figure read the same
    rule. */
export function shortCount(n: number) {
  if (n < 1000) return String(Math.round(n));
  const k = Math.round(n / 100) / 10;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}
