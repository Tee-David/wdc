/**
 * WHICH DAY IS WRONG, in words. Pure, so the editor (to warn as you type) and
 * the API route (to answer a refused save) say the same thing. The server's
 * `validSchedule` (policy.ts) stays the gate; this only names the first
 * problem it can find, or returns null when it finds none.
 */
type Weekly = { days: string[]; startTime: string; endTime: string };
type Exception = { date: string; startTime: string; endTime: string };
type Range = { start: string; end: string };

function clash(ranges: Range[], next: Range): Range | undefined {
  return ranges.find((range) => next.start < range.end && next.end > range.start);
}

export function scheduleProblem(schedule: { availability: Weekly[]; overrides: Exception[] }): string | null {
  const seen = new Map<string, Range[]>();
  const check = (label: string, key: string, start: string, end: string) => {
    if (start >= end) return `${label}: a range ends at ${end} but starts at ${start}. The end must be after the start.`;
    const ranges = seen.get(key) ?? [];
    const other = clash(ranges, { start, end });
    if (other) return `${label} has two ranges that overlap (${other.start} to ${other.end} and ${start} to ${end}). Change or remove one.`;
    ranges.push({ start, end });
    seen.set(key, ranges);
    return null;
  };
  for (const row of schedule.availability) {
    for (const day of row.days) {
      const found = check(day, `day:${day}`, row.startTime, row.endTime);
      if (found) return found;
    }
  }
  for (const row of schedule.overrides) {
    const found = check(`The exception on ${row.date}`, `date:${row.date}`, row.startTime, row.endTime);
    if (found) return found;
  }
  return null;
}
