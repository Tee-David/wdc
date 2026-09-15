/**
 * What a page costs the person loading it, in naira and in seconds.
 *
 * WHY THIS IS A TOOL AND NOT A FOOTNOTE. Page weight is usually argued about
 * in kilobytes, which is a number nobody feels. In this market the same number
 * is money: a visitor on a bundle pays for every byte a site sends them, and a
 * 4MB homepage is a homepage that charges people to look at it. Turning bytes
 * into naira is the one framing that makes a business owner care about a
 * metric their developer has been ignoring for two years.
 *
 * EVERY NUMBER HERE IS EDITABLE BY THE READER, and the page says so. Data
 * prices differ by network, by bundle and by month; a tool that hard-codes one
 * and presents the result as fact is wrong for most of the people reading it.
 * The default is a reasonable middle and the input beside it is the honest
 * part.
 *
 * PURE ARITHMETIC. No network, no key, nothing to meter -- Class A in the
 * terms of `docs/tools-programme.md`, and `scripts/check-seo-audit.mjs` runs
 * it directly.
 */

/**
 * ₦250 a gigabyte, reviewed September 2026.
 *
 * WHERE IT COMES FROM. After the NCC's 2025 tariff rise, the mainstream
 * monthly bundles on MTN and Airtel land around ₦200 to ₦250 a gigabyte, with
 * Glo's larger bundles cheaper and pay-as-you-go far dearer -- Airtel's PAYU
 * rate works out near ₦4,600 a gigabyte, which is roughly eighteen times this
 * figure. So the default is deliberately the KIND number: it is what somebody
 * on a decent bundle pays, and anybody on pay-as-you-go can type their own in
 * and watch the figure multiply.
 *
 * Sources for the next review:
 *   https://technext24.com/explainer/mtn-airtel-globacom-t2mobile-data-plans/
 *   https://www.naijatechguide.com/mtn-data-plans-in-nigeria-with-prices.html
 */
export const DEFAULT_NAIRA_PER_GB = 250;
export const PRICE_REVIEWED = "September 2026";

/**
 * 400 kilobits a second: Chrome DevTools' own "Slow 3G" profile, which is
 * also roughly what a phone gets on a weak signal outside a city.
 *
 * NOT AN AVERAGE OF NIGERIAN MOBILE SPEEDS, because an average is the wrong
 * statistic here. The question a site owner needs answering is "what happens
 * to the person having a bad day", and the person having a bad day is the one
 * who leaves.
 */
export const SLOW_3G_KBPS = 400;

const BYTES_PER_GB = 1024 * 1024 * 1024;

/** What one load of this many bytes costs, in naira. */
export function costOf(bytes: number, nairaPerGb = DEFAULT_NAIRA_PER_GB) {
  return (bytes / BYTES_PER_GB) * nairaPerGb;
}

/** How long those bytes take to arrive on a slow connection, in seconds. */
export function waitOf(bytes: number, kbps = SLOW_3G_KBPS) {
  return (bytes * 8) / (kbps * 1000);
}

/**
 * Naira, at the precision the figure deserves.
 *
 * A single page load is usually a fraction of a naira, and "₦0" is both true
 * and useless -- it reads as "this is free" when the point is what it costs
 * across a month of visitors. So anything under ₦1 is shown in kobo, which is
 * a real unit people still think in, and the page multiplies up from there.
 */
export function nairaCost(value: number) {
  if (value >= 100) return `₦${Math.round(value).toLocaleString("en-NG")}`;
  if (value >= 1) return `₦${value.toFixed(2)}`;
  return `${Math.round(value * 100)} kobo`;
}

/** Seconds, said the way somebody waiting would say them. */
export function waitLabel(seconds: number) {
  if (seconds >= 90) return `${Math.round(seconds / 60)} minutes`;
  if (seconds >= 10) return `${Math.round(seconds)} seconds`;
  return `${seconds.toFixed(1)} seconds`;
}

export function weightLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export type DataCost = {
  bytes: number;
  nairaPerGb: number;
  /** One load, for one visitor. */
  naira: number;
  seconds: number;
  /** The same page a thousand times, which is the figure that lands. */
  perThousand: number;
};

export function dataCost(bytes: number, nairaPerGb = DEFAULT_NAIRA_PER_GB): DataCost {
  const naira = costOf(bytes, nairaPerGb);
  return {
    bytes,
    nairaPerGb,
    naira,
    seconds: waitOf(bytes),
    /* A THOUSAND VISITS, because one visit is always a rounding error and a
       thousand is a quiet week. It is the multiplication somebody does in
       their head badly, so the tool does it for them. */
    perThousand: naira * 1000,
  };
}
