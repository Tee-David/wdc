import { isValidElement } from "react";
import { Search } from "lucide-react";
import { Pager, readPer } from "@/components/admin/pager";
import { SortMenu } from "@/components/admin/sort-menu";
import { filterQuery, type Filters } from "@/lib/admin/reports/filters";

/**
 * A report table that pages like every other list in the admin: five rows,
 * with five, ten, twenty or all, kept in the address under its own name so
 * two tables on one report never turn each other's page. The first column
 * pins and the table scrolls sideways in its own box.
 */
type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The words in a cell, so a table can be searched without each caller handing over a second copy of its rows. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}
const SEARCH_FROM = 5;
/* A cell written by bits.when(): "3 Oct 2026". Anything else in a date column ("Never", "–") sorts last. */
const DAY_TEXT = /^\d{1,2} [A-Za-z]{3,4} \d{4}$/;
const figure = (s: string) => { const n = Number.parseFloat(s.replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : -Infinity; };

/**
 * THE TABLE'S "Sort by" (owner, 2026-11-01), read off the cells so no report has to hand over a second copy: the first
 * date column gives Newest and Oldest first (newest is the default when there is one), the first column A to Z, and
 * the first two figure columns high to low. A table with no date opens in the report's own order.
 */
function sortsFor(head: string[], text: string[][], num: number[]) {
  const dateCol = head.findIndex((_, i) => !num.includes(i) && text.some((r) => DAY_TEXT.test(r[i])) && text.every((r) => DAY_TEXT.test(r[i]) || !/\d/.test(r[i])));
  const opts: { key: string; label: string }[] = [];
  if (dateCol >= 0) opts.push({ key: `${dateCol}n`, label: "Newest first" }, { key: `${dateCol}o`, label: "Oldest first" });
  else opts.push({ key: "", label: "Report order" });
  if (!num.includes(0) && dateCol !== 0) opts.push({ key: "0a", label: `${head[0]} A to Z` });
  for (const i of num.slice(0, 2)) opts.push({ key: `${i}d`, label: `${head[i]}, high to low` });
  return { opts, fallback: opts[0].key };
}
function order(text: string[][], key: string) {
  const col = Number.parseInt(key, 10), how = key.slice(-1);
  const idx = text.map((_, i) => i);
  if (!key || Number.isNaN(col)) return idx;
  const day = (s: string) => (DAY_TEXT.test(s) ? Date.parse(s) : Number.NaN);
  return idx.sort((a, b) => {
    const x = text[a][col] ?? "", y = text[b][col] ?? "";
    if (how === "a") return x.localeCompare(y);
    if (how === "d") return figure(y) - figure(x);
    const dx = day(x), dy = day(y);
    if (Number.isNaN(dx) || Number.isNaN(dy)) return Number(Number.isNaN(dx)) - Number(Number.isNaN(dy));
    return how === "o" ? dx - dy : dy - dx;
  });
}

export function pagedRows<T>(rows: T[], key: string, sp: Raw) {
  const per = readPer(sp[`per_${key}`]);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(sp[`pg_${key}`]) || "1", 10) || 1));
  return { shown: rows.slice((page - 1) * per, page * per), page, per, total: rows.length };
}

export function RTable({ id, head, rows, f, sp, empty, num = [], noun = "rows", foot }: {
  id: string; head: string[]; rows: React.ReactNode[][]; f: Filters; sp: Raw; empty: string;
  /** Column positions (0-based) that hold figures and align right. */
  num?: number[]; total: number; noun?: string; foot?: React.ReactNode[];
}) {
  const find = one(sp[`q_${id}`]).trim().slice(0, 80);
  const text = rows.map((r) => r.map((c) => textOf(c).trim()));
  const { opts, fallback } = sortsFor(head, text, num);
  const sort = opts.find((o) => o.key === one(sp[`s_${id}`]))?.key ?? fallback;
  const sorted = order(text, sort);
  const kept = sorted.filter((i) => !find || text[i].join(" ").toLowerCase().includes(find.toLowerCase())).map((i) => rows[i]);
  const { shown, page, per } = pagedRows(kept, id, sp);
  const keepPaging = Object.entries(sp).filter(([k]) => (k.startsWith("pg_") || k.startsWith("per_") || k.startsWith("q_") || k.startsWith("s_")) && !k.endsWith(`_${id}`)).flatMap(([k, v]) => [[k, one(v)] as const]);
  const href = (p: { page?: number; per?: number; sort?: string }) => {
    const u = new URLSearchParams(filterQuery(f));
    for (const [k, v] of keepPaging) u.set(k, v);
    if (p.page && p.page > 1) u.set(`pg_${id}`, String(p.page));
    if (p.per && p.per !== 5) u.set(`per_${id}`, String(p.per));
    if (find) u.set(`q_${id}`, find);
    const s = p.sort ?? sort;
    if (s !== fallback) u.set(`s_${id}`, s);
    return `/admin/reports?${u.toString()}#${id}`;
  };
  const sortMenu = rows.length > 1 ? <SortMenu options={opts.map((o) => ({ label: o.label, on: o.key === sort, href: href({ page: 1, per, sort: o.key }) }))} /> : null;
  if (!rows.length) return <p className="rp__empty" id={id}>{empty}</p>;
  const carry = [...new URLSearchParams(filterQuery(f)).entries(), ...keepPaging, ...(sort !== fallback ? [[`s_${id}`, sort] as const] : [])];
  return (
    <div id={id} className="rp__table">
      {rows.length >= SEARCH_FROM ? (
        <form method="get" action={`/admin/reports#${id}`} className="rp__tfind" role="search">
          {carry.map(([k, v], i) => <input key={`${k}${i}`} type="hidden" name={k} value={v} />)}
          <label>
            <Search aria-hidden="true" />
            <span className="ad__sr">Search {noun}</span>
            <input type="search" name={`q_${id}`} defaultValue={find} placeholder={`Search ${noun}`} maxLength={80} autoComplete="off" />
          </label>
          {find ? <a className="ad__btn ad__btn--plain" href={href({ page: 1 }).replace(/([?&])q_[^&#]*&?/, "$1")}>Clear</a> : null}
          {sortMenu}
        </form>
      ) : sortMenu ? <div className="rp__tfind">{sortMenu}</div> : null}
      {!kept.length ? <p className="rp__empty">Nothing in this table matches &ldquo;{find}&rdquo;. <a href={href({ page: 1 }).replace(/([?&])q_[^&#]*&?/, "$1")}>Clear the search</a></p> : (<>
      <div className="ad__scroll" data-lenis-prevent tabIndex={0} aria-label={`${noun} table, scrolls sideways`}>
        <table className="ad__t">
          <thead><tr>{head.map((h, i) => <th key={h} className={num.includes(i) ? "num" : undefined}>{h}</th>)}</tr></thead>
          <tbody>{shown.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={num.includes(j) ? "num" : undefined}>{c}</td>)}</tr>)}</tbody>
          {foot ? <tfoot><tr>{foot.map((c, j) => <td key={j} className={num.includes(j) ? "num" : undefined}>{c}</td>)}</tr></tfoot> : null}
        </table>
      </div>
      <Pager label={`${noun} pages`} total={kept.length} page={page} per={per} noun={noun} href={(p) => href({ page: p.page, per: p.per ?? per })} />
      </>)}
    </div>
  );
}
