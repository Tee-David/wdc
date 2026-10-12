import { isValidElement } from "react";
import { Search } from "lucide-react";
import { Pager, readPer } from "@/components/admin/pager";
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
  const kept = find ? rows.filter((r) => r.map(textOf).join(" ").toLowerCase().includes(find.toLowerCase())) : rows;
  const { shown, page, per } = pagedRows(kept, id, sp);
  const keepPaging = Object.entries(sp).filter(([k]) => (k.startsWith("pg_") || k.startsWith("per_") || k.startsWith("q_")) && !k.endsWith(`_${id}`)).flatMap(([k, v]) => [[k, one(v)] as const]);
  const href = (p: { page?: number; per?: number }) => {
    const u = new URLSearchParams(filterQuery(f));
    for (const [k, v] of keepPaging) u.set(k, v);
    if (p.page && p.page > 1) u.set(`pg_${id}`, String(p.page));
    if (p.per && p.per !== 5) u.set(`per_${id}`, String(p.per));
    if (find) u.set(`q_${id}`, find);
    return `/admin/reports?${u.toString()}#${id}`;
  };
  if (!rows.length) return <p className="rp__empty" id={id}>{empty}</p>;
  const carry = [...new URLSearchParams(filterQuery(f)).entries(), ...keepPaging];
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
        </form>
      ) : null}
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
