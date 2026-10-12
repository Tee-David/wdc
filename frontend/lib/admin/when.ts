/**
 * A time as a person says it (Writing: dates and times). Relative only under
 * a day ("12 min ago", "3 h ago"), then "Yesterday", then the day name inside
 * the week, then "14 Oct" and, in another year, "14 Oct 2025". Studio days are
 * UTC+1. Written from fixed tables, not toLocaleDateString, so a server and a
 * browser never disagree about the same date.
 */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOUR = 3_600_000, DAY = 86_400_000;
const shift = (t: number) => new Date(t + HOUR);
const dayKey = (t: number) => Math.floor((t + HOUR) / DAY);

export function whenWords(iso: string, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = now - t;
  if (diff < 0) return dateWords(iso);
  if (diff < 60_000) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < DAY && dayKey(t) === dayKey(now)) return `${Math.floor(diff / HOUR)} h ago`;
  const days = dayKey(now) - dayKey(t);
  if (days === 1) return "Yesterday";
  if (days < 7) return DAYS[shift(t).getUTCDay()];
  return dateWords(iso, now);
}

/** "Tue 14 Oct", with the year only when it is not this one. */
export function dateWords(iso: string, now = Date.now(), weekday = true) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = shift(t);
  const y = d.getUTCFullYear() === shift(now).getUTCFullYear() ? "" : ` ${d.getUTCFullYear()}`;
  return `${weekday ? `${DAYS[d.getUTCDay()]} ` : ""}${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${y}`;
}

/** "Tue 14 Oct, 15:30" (24 hour clock). */
export function dateTimeWords(iso: string, now = Date.now()) {
  const d = shift(Date.parse(iso));
  return `${dateWords(iso, now)}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Whole days between now and an ISO date: negative when it has passed. */
export function daysFrom(iso: string, now = Date.now()) {
  return dayKey(Date.parse(iso)) - dayKey(now);
}

/** "Jun 2026": a month and year, for "client since". */
export function monthYear(iso: string) {
  const d = shift(Date.parse(iso));
  return Number.isFinite(d.getTime()) ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "";
}

/** The clock, read from one named place so a server page can say "now" without calling Date.now in render. */
export const nowMs = () => Date.now();
