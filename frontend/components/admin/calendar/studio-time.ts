/**
 * Studio time for the calendar: the studio's days are UTC+1 all year (Africa/Lagos has no
 * daylight saving), so a stored instant is turned into a studio date and clock time by adding an hour.
 * Plain functions with no Date.now, so a server page and a client component agree on the same instant.
 */
const HOUR = 3_600_000;

export type StudioStamp = { date: string; time: string };

/** An ISO instant as the studio's "2026-10-12" and "10:42". */
export function studioStamp(iso: string | number): StudioStamp {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return { date: "", time: "" };
  const d = new Date(t + HOUR).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
}

/** The day part of anything stored as a date or an instant: a bare date is already a studio day. */
export function studioDay(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : studioStamp(value).date;
}

/** A studio date and clock time back to an instant (ISO, UTC). */
export function studioInstant(date: string, time = "00:00"): string {
  return new Date(Date.parse(`${date}T${time}:00.000Z`) - HOUR).toISOString();
}
