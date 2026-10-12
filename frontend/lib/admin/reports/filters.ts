/**
 * THE FILTERS OF THE REPORTS PAGE, all of them in the address.
 *
 * A report somebody wants to send to a colleague is a link, so nothing here is
 * held in state: every choice is a query parameter, read once, held to values
 * the page can answer, and written back the same way. A value that is not
 * recognised is dropped rather than guessed at.
 */
export const DAY = 86_400_000;

export const TABS = [
  ["overview", "Overview"], ["money", "Money"], ["receivables", "Owed to us"], ["owing", "We owe"],
  ["sales", "Sales"], ["recurring", "Recurring"], ["work", "Work"], ["team", "Team"], ["clients", "Clients"],
] as const;
export type TabKey = (typeof TABS)[number][0];

export const RANGES = [
  ["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["mtd", "This month"], ["lastmonth", "Last month"],
  ["qtd", "This quarter"], ["ytd", "This year"], ["12m", "12 months"], ["custom", "Custom"],
] as const;
export type RangeKey = (typeof RANGES)[number][0];

export const GROUPS = [["auto", "Auto"], ["day", "Day"], ["week", "Week"], ["month", "Month"], ["quarter", "Quarter"]] as const;
export type GroupKey = Exclude<(typeof GROUPS)[number][0], "auto">;
export const COMPARES = [["prev", "Previous period"], ["yoy", "Same days last year"], ["none", "No comparison"]] as const;
export type CompareKey = (typeof COMPARES)[number][0];

export type Filters = {
  tab: TabKey;
  range: RangeKey;
  from: string;
  to: string;
  cmp: CompareKey;
  groupAsked: "auto" | GroupKey;
  group: GroupKey;
  /** Currency the money figures are in; others are listed apart, never converted. */
  cur: string;
  svc: string[];
  client: string[];
  dept: string[];
  staff: string[];
  method: string[];
  status: string[];
  /** Whole naira. */
  min: number | null;
  max: number | null;
  q: string;
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : one(v).split(",")).map((x) => x.trim()).filter(Boolean).slice(0, 40);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Studio days are UTC+1, the same shift lib/admin/when.ts uses. */
export function studioToday(nowMs: number) {
  return iso(nowMs + 3_600_000);
}

export function rangeDates(range: RangeKey, today: string): { from: string; to: string } {
  const t = Date.parse(today);
  const d = new Date(t);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  switch (range) {
    case "today": return { from: today, to: today };
    case "7d": return { from: iso(t - 6 * DAY), to: today };
    case "mtd": return { from: iso(Date.UTC(y, m, 1)), to: today };
    case "lastmonth": return { from: iso(Date.UTC(y, m - 1, 1)), to: iso(Date.UTC(y, m, 0)) };
    case "qtd": return { from: iso(Date.UTC(y, Math.floor(m / 3) * 3, 1)), to: today };
    case "ytd": return { from: iso(Date.UTC(y, 0, 1)), to: today };
    case "12m": return { from: iso(t - 364 * DAY), to: today };
    default: return { from: iso(t - 29 * DAY), to: today };
  }
}

export function autoGroup(from: string, to: string): GroupKey {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  return days <= 31 ? "day" : days <= 120 ? "week" : days <= 800 ? "month" : "quarter";
}

export function readFilters(sp: Raw, nowMs: number): Filters {
  const today = studioToday(nowMs);
  const tab = (TABS.find(([k]) => k === one(sp.tab))?.[0] ?? "overview") as TabKey;
  let range = (RANGES.find(([k]) => k === one(sp.range))?.[0] ?? "") as RangeKey | "";
  const f0 = one(sp.from), t0 = one(sp.to);
  let from: string, to: string;
  if (isDay(f0) || isDay(t0)) {
    range = "custom";
    to = isDay(t0) ? t0 : today;
    from = isDay(f0) ? f0 : iso(Date.parse(to) - 29 * DAY);
  } else {
    if (!range || range === "custom") range = "30d";
    ({ from, to } = rangeDates(range, today));
  }
  if (from > to) [from, to] = [to, from];
  const cmp = (COMPARES.find(([k]) => k === one(sp.cmp))?.[0] ?? "prev") as CompareKey;
  const groupAsked = (GROUPS.find(([k]) => k === one(sp.by))?.[0] ?? "auto") as "auto" | GroupKey;
  /* One bar per day over a year is not a chart. Too many points fall back to the next size up. */
  const span = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  let group: GroupKey = groupAsked === "auto" ? autoGroup(from, to) : groupAsked;
  if (group === "day" && span > 62) group = "week";
  if (group === "week" && span > 400) group = "month";
  const num = (v: string) => { const n = Number(v.replace(/[^\d.]/g, "")); return v && Number.isFinite(n) ? Math.round(n) : null; };
  const cur = /^[A-Z]{3}$/.test(one(sp.cur)) ? one(sp.cur) : "NGN";
  return {
    tab, range: range as RangeKey, from, to, cmp, groupAsked, group, cur,
    svc: many(sp.svc), client: many(sp.client), dept: many(sp.dept), staff: many(sp.staff),
    method: many(sp.method), status: many(sp.status), min: num(one(sp.min)), max: num(one(sp.max)), q: one(sp.q).slice(0, 80),
  };
}

/** The same filters as a query string, with any change applied; empty and default values are left out. */
export function filterQuery(f: Filters, patch: Partial<Record<string, string | string[] | number | null>> = {}) {
  const base: Record<string, string | string[] | number | null | undefined> = {
    tab: f.tab === "overview" ? "" : f.tab,
    range: f.range === "custom" ? "" : f.range === "30d" ? "" : f.range,
    from: f.range === "custom" ? f.from : "", to: f.range === "custom" ? f.to : "",
    cmp: f.cmp === "prev" ? "" : f.cmp, by: f.groupAsked === "auto" ? "" : f.groupAsked, cur: f.cur === "NGN" ? "" : f.cur,
    svc: f.svc, client: f.client, dept: f.dept, staff: f.staff, method: f.method, status: f.status,
    min: f.min, max: f.max, q: f.q,
  };
  const all = { ...base, ...patch };
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(all)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) { if (v.length) u.set(k, v.join(",")); } else u.set(k, String(v));
  }
  return u.toString();
}

export function activeCount(f: Filters) {
  return f.svc.length + f.client.length + f.dept.length + f.staff.length + f.method.length + f.status.length
    + (f.min != null ? 1 : 0) + (f.max != null ? 1 : 0) + (f.q ? 1 : 0) + (f.cur !== "NGN" ? 1 : 0);
}

export type Span = { from: string; to: string };
export function compareSpan(f: Filters): Span | null {
  if (f.cmp === "none") return null;
  if (f.cmp === "yoy") {
    const sh = (v: string) => { const d = new Date(`${v}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() - 1); return iso(d.getTime()); };
    return { from: sh(f.from), to: sh(f.to) };
  }
  const span = Math.round((Date.parse(f.to) - Date.parse(f.from)) / DAY) + 1;
  const to = iso(Date.parse(f.from) - DAY);
  return { from: iso(Date.parse(to) - (span - 1) * DAY), to };
}
