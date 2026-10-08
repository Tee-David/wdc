/**
 * RANKING FOR THE SERVER-SEARCHED PICKERS (lib/admin/search-actions.ts).
 *
 * Pure, with no server imports, so a spec can run it without a database and
 * the client component can share the row shape.
 *
 * NO PATTERN IS BUILT FROM WHAT THE PERSON TYPED. Matching is lower-cased
 * `startsWith` and `indexOf` on plain strings, so a query like `(a+` or `.*` is
 * only text to look for. (The two database kinds escape `% _ \` before they
 * hand the same text to ILIKE; see search-actions.ts.)
 */

export type SearchRow = { value: string; label: string; hint?: string };

/** The most rows one search returns. The picker shows about six at a time and scrolls the rest. */
export const SEARCH_LIMIT = 20;
/** Longer than any name, email or company; the rest of a pasted line is noise. */
export const QUERY_MAX = 80;

/** What was typed, made safe to compare: a string, one space between words, 80 characters at most. */
export function cleanQuery(q: unknown): string {
  if (typeof q !== "string") return "";
  return q.replace(/\s+/g, " ").trim().slice(0, QUERY_MAX).trim();
}

const digits = (s: string) => s.replace(/\D/g, "");
const isWordChar = (c: string) => /[\p{L}\p{N}]/u.test(c);

/** True when `needle` begins a word of `hay` (after a space, dot, dash, @ or the like). */
function atWordStart(hay: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at < 0) return false;
    if (at === 0 || !isWordChar(hay[at - 1])) return true;
    from = at + 1;
  }
}

/**
 * How well `q` fits one record: 0 is best, null is no match.
 *
 *  0 the name is exactly what was typed
 *  1 the name starts with it
 *  2 a word of the name starts with it
 *  3 the name contains it
 *  4 another field (email, company, phone) starts with it
 *  5 another field contains it, or the digits of a phone do
 *  6 every word typed is found somewhere in the record, in any order
 */
export function scoreMatch(q: string, primary: string, others: string[] = []): number | null {
  const n = cleanQuery(q).toLocaleLowerCase();
  if (!n) return 0;
  const p = primary.toLocaleLowerCase();
  if (p === n) return 0;
  if (p.startsWith(n)) return 1;
  if (atWordStart(p, n)) return 2;
  if (p.includes(n)) return 3;
  const rest = others.map((o) => o.toLocaleLowerCase()).filter(Boolean);
  if (rest.some((o) => o.startsWith(n))) return 4;
  if (rest.some((o) => o.includes(n))) return 5;
  const nd = digits(n);
  /* A phone is typed as +234 803 or 0803: compare the digits, once there are enough to mean something. */
  if (nd.length >= 3 && nd.length === n.replace(/[\s+()-]/g, "").length && rest.some((o) => digits(o).includes(nd))) return 5;
  const words = n.split(" ");
  if (words.length > 1) {
    const all = [p, ...rest];
    if (words.every((w) => all.some((h) => h.includes(w)))) return 6;
  }
  return null;
}

export type Searchable = { primary: string; others?: string[] };

/**
 * The best `limit` of `items` for `q`, best first, and how many matched in all
 * (so the picker can say "type more to narrow"). With nothing typed it is the
 * first `limit` in the order given (`tie: "input"`) or by name (`tie: "label"`).
 * Equal scores keep the same rule, so the same query always gives the same list.
 */
export function rankRows<T>(
  items: readonly T[],
  q: string,
  read: (item: T) => Searchable,
  { limit = SEARCH_LIMIT, tie = "label" }: { limit?: number; tie?: "label" | "input" } = {},
): { rows: T[]; total: number } {
  const scored: { item: T; score: number; at: number; name: string }[] = [];
  items.forEach((item, at) => {
    const s = read(item);
    const score = scoreMatch(q, s.primary, s.others);
    if (score !== null) scored.push({ item, score, at, name: s.primary.toLocaleLowerCase() });
  });
  scored.sort((a, b) =>
    a.score - b.score ||
    (tie === "label" ? a.name.localeCompare(b.name) || a.at - b.at : a.at - b.at));
  return { rows: scored.slice(0, Math.max(0, limit)).map((x) => x.item), total: scored.length };
}

/** The pattern the database kinds hand to ILIKE: the typed text with `% _ \` made literal. */
export function likeOf(q: string, mode: "contains" | "prefix"): string {
  const t = cleanQuery(q).replace(/[\\%_]/g, "\\$&");
  return mode === "prefix" ? `${t}%` : `%${t}%`;
}
