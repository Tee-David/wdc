/**
 * A MONTHLY RETAINER'S SCHEDULE, as a pure function so it can be checked
 * without a database (scripts/check-retainer.mjs).
 *
 * The plan is a monthly figure over a term. How the client pays for it is
 * set per client: every month, every three months, in two parts, or the whole
 * term up front. The term's total never changes with the billing; only when it is asked for.
 *
 * A BILLING CHANGE ONLY MOVES WHAT IS NOT YET DRAFTED. What has been drafted
 * stays as it was. What is left of the total is spread over the new billing's
 * dates that fall after the last drafted part, so switching midway never asks
 * for more or less than the term costs.
 */

export const RETAINER_BILLING = ["Monthly", "Quarterly", "Two parts", "Whole term up front"] as const;
export type RetainerBilling = (typeof RETAINER_BILLING)[number];

export type RetainerPart = { date: string; amount: number; n: number; of: number };

type Plan = { start: string; months: number; monthly: number; billing: RetainerBilling; drafted: { date: string; amount: number }[] };

/** "2026-11-01" plus n months, the day clamped to the month's length (31 Jan + 1 is 28 Feb). */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/** The last day the plan covers: the day before the start, `months` later. */
export function termEnd(start: string, months: number): string {
  const next = new Date(`${addMonths(start, months)}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() - 1);
  return next.toISOString().slice(0, 10);
}

/** The days a billing asks on, before anything is drafted. */
function datesFor(start: string, months: number, billing: RetainerBilling): string[] {
  if (billing === "Whole term up front" || months < 2) return [start];
  if (billing === "Two parts") return [start, addMonths(start, Math.floor(months / 2))];
  if (billing === "Quarterly") return Array.from({ length: Math.ceil(months / 3) }, (_, i) => addMonths(start, i * 3));
  return Array.from({ length: months }, (_, i) => addMonths(start, i));
}

/**
 * Every part still to be drafted, in date order, with the odd kobo on the
 * first part so the parts always add up to what is left.
 */
export function remainingParts(p: Plan): RetainerPart[] {
  const total = p.monthly * p.months;
  const billed = p.drafted.reduce((n, d) => n + d.amount, 0);
  const left = total - billed;
  if (left <= 0) return [];
  const last = p.drafted.map((d) => d.date).sort().at(-1) ?? "";
  let dates = datesFor(p.start, p.months, p.billing).filter((d) => d > last);
  /* The new billing's days have all passed: what is left is asked for at the next month the term still has, or once. */
  if (!dates.length) dates = [datesFor(p.start, p.months, "Monthly").find((d) => d > last) ?? addMonths(last, 1)];
  /* A quarter asks for the months it covers (the last one may be short); every other billing splits evenly. */
  const end = addMonths(p.start, p.months);
  const span = (a: string, b: string) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return Math.max(1, (y2 - y1) * 12 + m2 - m1); };
  const weights = p.billing === "Quarterly" ? dates.map((d, i) => span(d, dates[i + 1] ?? end)) : dates.map(() => 1);
  const sumW = weights.reduce((n, w) => n + w, 0);
  const shares = weights.map((w) => Math.floor((left * w) / sumW));
  shares[0] += left - shares.reduce((n, x) => n + x, 0);
  const done = p.drafted.length;
  return dates.map((date, i) => ({ date, amount: shares[i], n: done + i + 1, of: done + dates.length }));
}

/** The parts due on or before `today`: what the daily run drafts. */
export function dueParts(p: Plan, today: string): RetainerPart[] {
  return remainingParts(p).filter((x) => x.date <= today);
}
