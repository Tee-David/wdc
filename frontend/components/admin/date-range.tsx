import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DateInput } from "./pick";

/**
 * THE DATE RANGE every admin list filters by (the mockups' date picker).
 *
 * Presets first, because they are what people actually pick, then a custom
 * pair of dates. Like the pager it is a server component on a native
 * <details>: the presets are links and "custom" is a GET form that carries
 * the rest of the list's query in hidden fields, so the chosen range lives in
 * the URL. Only the two calendars are client components.
 *
 * Dates are Lagos calendar days (UTC+1, no daylight saving), and the list
 * reading them treats `to` as the END of that day, so "Today" means today.
 */
export type RangeValue = { from?: string; to?: string };

const DAY = 86_400_000;
/** Today's date in Lagos, as YYYY-MM-DD. */
function lagosToday() {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}
function shift(iso: string, days: number) {
  return new Date(Date.parse(iso + "T00:00:00Z") + days * DAY).toISOString().slice(0, 10);
}
function startOfMonth(iso: string, back = 0) {
  const d = new Date(iso + "T00:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1)).toISOString().slice(0, 10);
}
function endOfMonth(iso: string, back = 0) {
  const d = new Date(iso + "T00:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back + 1, 0)).toISOString().slice(0, 10);
}

export function rangePresets(today = lagosToday()) {
  const d = new Date(today + "T00:00:00Z");
  const quarter = Math.floor(d.getUTCMonth() / 3) * 3;
  const quarterStart = new Date(Date.UTC(d.getUTCFullYear(), quarter, 1)).toISOString().slice(0, 10);
  const yearStart = `${d.getUTCFullYear()}-01-01`;
  return [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shift(today, -1), to: shift(today, -1) },
    { label: "Last 7 days", from: shift(today, -6), to: today },
    { label: "Last 30 days", from: shift(today, -29), to: today },
    { label: "This month", from: startOfMonth(today), to: today },
    { label: "Last month", from: startOfMonth(today, 1), to: endOfMonth(today, 1) },
    { label: "This quarter", from: quarterStart, to: today },
    { label: "This year", from: yearStart, to: today },
    { label: "Last 12 months", from: shift(today, -364), to: today },
  ];
}

const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** What the button says: a preset's name when the range is one, else the dates. */
export function describeRange(value: RangeValue) {
  if (!value.from && !value.to) return "All time";
  const preset = rangePresets().find((p) => p.from === value.from && p.to === value.to);
  if (preset) return preset.label;
  if (value.from && value.to) return value.from === value.to ? fmt(value.from) : `${fmt(value.from)} – ${fmt(value.to)}`;
  return value.from ? `From ${fmt(value.from)}` : `Until ${fmt(value.to!)}`;
}

export function DateRange({
  value,
  href,
  keep = {},
  action,
  label = "Dates",
}: {
  value: RangeValue;
  /** The list's address with this range applied (and the page reset). */
  href: (range: RangeValue) => string;
  /** The rest of the list's query, carried by the custom form. */
  keep?: Record<string, string | number | undefined>;
  /** Where the custom form submits; the current page by default. */
  action?: string;
  label?: string;
}) {
  const presets = rangePresets();
  const all = !value.from && !value.to;
  return (
    <details className="ad__range">
      <summary aria-label={`${label}: ${describeRange(value)}`}>
        <CalendarDays aria-hidden="true" />
        <span>{describeRange(value)}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="ad__rangeMenu">
        <div className="ad__rangePresets">
          <Link href={href({})} aria-current={all ? "true" : undefined}>All time</Link>
          {presets.map((p) => (
            <Link key={p.label} href={href({ from: p.from, to: p.to })} aria-current={p.from === value.from && p.to === value.to ? "true" : undefined}>
              {p.label}
            </Link>
          ))}
        </div>
        <form className="ad__rangeCustom" method="get" action={action}>
          {Object.entries(keep).map(([k, v]) =>
            v === undefined || v === "" || k === "from" || k === "to" || k === "page" ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
          )}
          <b>Custom range</b>
          {/* The admin's own calendar, not the browser's (pick.tsx). Named by
              aria-label: a server component has no id to point a <label> at
              that is unique across the routes Next keeps mounted. */}
          <div className="ad__rangeField"><span aria-hidden="true">From</span><DateInput name="from" defaultValue={value.from} label="From" /></div>
          <div className="ad__rangeField"><span aria-hidden="true">To</span><DateInput name="to" defaultValue={value.to} label="To" /></div>
          <button type="submit" className="ad__btn ad__btn--primary">Apply</button>
        </form>
      </div>
    </details>
  );
}
