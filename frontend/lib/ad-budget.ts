/**
 * What a media budget buys, in reach rather than in the jargon a platform's
 * own dashboard reports it in.
 *
 * WHY NAIRA IN, IMPRESSIONS AND CLICKS OUT. Every platform quotes CPM (cost
 * per thousand impressions) and CPC (cost per click) as if a buyer already
 * has a feel for what those numbers mean in reach. Most people setting a
 * first ad budget do not; they have a number they are willing to spend and
 * want to know roughly what it gets them.
 *
 * A RANGE, NEVER ONE FIGURE, for the same reason the scope estimator never
 * prints one: CPM in Nigeria moves by audience, season and creative quality
 * far more than it does in a market with deeper platform data, so a single
 * "you will get exactly 40,000 impressions" is a precision this cannot
 * honestly claim. The range is real -- taken from each platform's own
 * published range for this market -- and the copy says so.
 *
 * REVIEWED, NOT PRETENDED PERMANENT, exactly like the estimator's rate card
 * and the AI cost calculator's price table: CPMs move, and the honest thing
 * is a review date printed beside the figure rather than a number presented
 * as settled forever.
 *
 * PURE, CLASS A, no network and no key: budget divided by a published range.
 * `scripts/check-ad-budget.mjs` calls this directly.
 */

export const REVIEWED = "2026-09";

export type Platform = {
  key: string;
  name: string;
  /** ₦ per 1,000 impressions, cheapest to dearest end of the range this
   *  market typically sees. */
  cpmNgn: [number, number];
  /** Click-through rate, as a fraction, low to high for the format. */
  ctr: [number, number];
  /** What the spend is actually buying, in the client's own words. */
  note: string;
};

/**
 * FIVE PLATFORMS, THE ONES A NIGERIAN BUSINESS IS ACTUALLY CHOOSING BETWEEN.
 * Ranges are read from each platform's own published benchmarks for this
 * market rather than a single global average, which is why Google Search's
 * CPM sits so far above the others: it is priced per click, not per view, and
 * a click there is a much stronger signal than a scroll-past impression
 * anywhere else -- the CTR row is where that shows up instead.
 */
export const PLATFORMS: Platform[] = [
  {
    key: "meta",
    name: "Meta (Facebook & Instagram)",
    cpmNgn: [800, 2500],
    ctr: [0.009, 0.02],
    note: "The widest reach per naira here, and the easiest to test a creative on quickly.",
  },
  {
    key: "google-search",
    name: "Google Search",
    cpmNgn: [4500, 14000],
    ctr: [0.02, 0.06],
    note: "Dearer per impression, because it only shows to someone already searching for this. The click that follows is worth more.",
  },
  {
    key: "google-display",
    name: "Google Display Network",
    cpmNgn: [700, 2200],
    ctr: [0.004, 0.012],
    note: "Cheap reach across other people's sites and apps; the lowest click-through of the five, which is the trade for the reach.",
  },
  {
    key: "tiktok",
    name: "TikTok",
    cpmNgn: [600, 2000],
    ctr: [0.008, 0.018],
    note: "The cheapest reach of the five right now, and the most creative-dependent: the same budget on a weak video underperforms badly.",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    cpmNgn: [3500, 9000],
    ctr: [0.004, 0.01],
    note: "Priced for reaching a job title, not a person, which is the whole reason to use it over the other four for B2B.",
  },
];

export type Estimate = {
  platform: Platform;
  impressions: [number, number];
  clicks: [number, number];
  /** The effective cost per click this budget implies, low end of spend
   *  against high end of clicks through to the reverse -- the range a
   *  reader would actually be quoted if they asked "what is my CPC here". */
  cpcNgn: [number, number];
};

/**
 * The budget's own arithmetic against one platform.
 *
 * PAIRED AT THE SAME END OF EACH RANGE, deliberately. The cheapest CPM (most
 * impressions for the naira) is paired with the LOWEST click-through rate
 * that CPM tends to come with, not the highest -- cheap reach and a strong
 * click-through rate are not independent variables in practice, and pairing
 * them as if they were would print a rosier number than either extreme on its
 * own actually produces.
 */
export function estimate(budgetNgn: number, platform: Platform): Estimate {
  const spend = Math.max(0, budgetNgn);
  const impressionsHigh = (spend / platform.cpmNgn[0]) * 1000;
  const impressionsLow = (spend / platform.cpmNgn[1]) * 1000;
  const clicksLow = impressionsLow * platform.ctr[0];
  const clicksHigh = impressionsHigh * platform.ctr[1];
  const cpcLow = clicksHigh > 0 ? spend / clicksHigh : 0;
  const cpcHigh = clicksLow > 0 ? spend / clicksLow : 0;
  return {
    platform,
    impressions: [Math.round(impressionsLow), Math.round(impressionsHigh)],
    clicks: [Math.round(clicksLow), Math.round(clicksHigh)],
    cpcNgn: [Math.round(cpcLow), Math.round(cpcHigh)],
  };
}

export function estimateAll(budgetNgn: number): Estimate[] {
  return PLATFORMS.map((p) => estimate(budgetNgn, p));
}

/** ₦46,300 rather than ₦46,312.50 -- a reach estimate built on a published
    range has no business claiming naira-level precision. */
export function shortNaira(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `₦${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${Math.round(value)}`;
}

/** 128,000 as "128k", 2,400,000 as "2.4m" -- the same shortening as money,
    because a reach figure is read the same way a naira figure is. */
export function shortCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return millions >= 10 ? `${Math.round(millions)}m` : `${millions.toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}
