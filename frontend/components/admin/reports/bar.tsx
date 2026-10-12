import Link from "next/link";
import { ChevronDown, Download, FileSpreadsheet, FileText, X } from "lucide-react";
import { DateRange } from "@/components/admin/date-range";
import { COMPARES, GROUPS, RANGES, activeCount, filterQuery, type Filters } from "@/lib/admin/reports/filters";
import { REPORTS } from "@/lib/admin/reports/datasets";
import { FilterSheet, type SheetOptions } from "./filter-sheet";

/**
 * THE BAR OVER EVERY REPORT: the period, what to compare it with, how to group
 * it, and the rest of the filters in a sheet. Everything is a link or a GET
 * form, so it works before the page hydrates and the result is an address.
 * Filters that are on show as chips you can take off one at a time.
 */
const href = (f: Filters, patch: Parameters<typeof filterQuery>[1] = {}) => {
  const q = filterQuery(f, patch);
  return `/admin/reports${q ? `?${q}` : ""}`;
};

export function FilterBar({ f, options, names }: { f: Filters; options: SheetOptions; names: Record<string, string> }) {
  const carry = Object.fromEntries(new URLSearchParams(filterQuery({ ...f, svc: [], dept: [], staff: [], method: [], status: [], client: [], min: null, max: null, cur: "NGN", q: "" })).entries());
  const keep: Record<string, string> = Object.fromEntries(new URLSearchParams(filterQuery(f, { from: "", to: "", range: "" })).entries());
  const chips: { label: string; off: string }[] = [
    ...f.svc.map((v) => ({ label: `Service: ${names[`svc:${v}`] ?? v}`, off: href(f, { svc: f.svc.filter((x) => x !== v) }) })),
    ...f.dept.map((v) => ({ label: `Department: ${names[`dept:${v}`] ?? v}`, off: href(f, { dept: f.dept.filter((x) => x !== v) }) })),
    ...f.staff.map((v) => ({ label: `Person: ${v}`, off: href(f, { staff: f.staff.filter((x) => x !== v) }) })),
    ...f.client.map((v) => ({ label: `Client: ${names[`client:${v}`] ?? v}`, off: href(f, { client: f.client.filter((x) => x !== v) }) })),
    ...f.method.map((v) => ({ label: `Method: ${v}`, off: href(f, { method: f.method.filter((x) => x !== v) }) })),
    ...f.status.map((v) => ({ label: `Status: ${v}`, off: href(f, { status: f.status.filter((x) => x !== v) }) })),
    ...(f.min != null ? [{ label: `At least ${f.min.toLocaleString("en")}`, off: href(f, { min: null }) }] : []),
    ...(f.max != null ? [{ label: `At most ${f.max.toLocaleString("en")}`, off: href(f, { max: null }) }] : []),
    ...(f.cur !== "NGN" ? [{ label: `Currency: ${f.cur}`, off: href(f, { cur: "" }) }] : []),
    ...(f.q ? [{ label: `Search: ${f.q}`, off: href(f, { q: "" }) }] : []),
  ];
  return (
    <section className="ad__panel rp__bar" aria-label="Report filters" data-tour="reports-range">
      <div className="rp__barRow">
        <div className="rp__chips" role="group" aria-label="Period">
          {RANGES.filter(([k]) => k !== "custom").map(([k, label]) => (
            <Link key={k} scroll={false} className="rp__chip" href={href(f, { range: k, from: "", to: "" })} aria-current={f.range === k ? "true" : undefined}>{label}</Link>
          ))}
          <DateRange value={{ from: f.from, to: f.to }} action="/admin/reports" keep={keep} label="Custom dates"
            href={(r) => href(f, { range: "", from: r.from ?? "", to: r.to ?? "" })} />
        </div>
      </div>
      <div className="rp__barRow rp__barRow--b">
        <FilterSheet options={options} count={activeCount(f)} carry={carry}
          values={{ svc: f.svc, dept: f.dept, staff: f.staff, method: f.method, status: f.status, client: f.client, cur: f.cur, min: f.min, max: f.max, q: f.q }} />
        <div className="rp__seg" role="group" aria-label="Compare with">
          <span className="rp__segL">Compare</span>
          {COMPARES.map(([k, label]) => <Link key={k} scroll={false} href={href(f, { cmp: k === "prev" ? "" : k })} aria-current={f.cmp === k ? "true" : undefined}>{label}</Link>)}
        </div>
        <div className="rp__seg" role="group" aria-label="Group by">
          <span className="rp__segL">Group by</span>
          {GROUPS.map(([k, label]) => <Link key={k} scroll={false} href={href(f, { by: k === "auto" ? "" : k })} aria-current={f.groupAsked === k ? "true" : undefined}>{label}{k === "auto" && f.groupAsked === "auto" ? ` (${f.group})` : ""}</Link>)}
        </div>
      </div>
      {chips.length ? (
        <div className="rp__on" aria-label="Filters that are on">
          {chips.map((c) => <Link key={c.label} className="rp__on__chip" href={c.off} scroll={false} aria-label={`Remove filter ${c.label}`}>{c.label}<X aria-hidden="true" /></Link>)}
          <Link className="rp__clear" scroll={false} href={href(f, { svc: [], dept: [], staff: [], method: [], status: [], client: [], min: null, max: null, cur: "", q: "" })}>Clear all</Link>
        </div>
      ) : null}
    </section>
  );
}

/** One button for every file the page can make, all honouring the filters that are on. */
export function ExportMenu({ f, tab }: { f: Filters; tab: string }) {
  const q = filterQuery(f);
  const one = (report: string, format: string) => `/admin/reports/export?${q ? `${q}&` : ""}report=${report}&format=${format}`;
  const mine = REPORTS.find(([k]) => k === (tab === "money" ? "income" : tab === "receivables" ? "aging" : tab === "owing" ? "income" : tab === "work" ? "team" : tab))?.[0] ?? "income";
  return (
    <details className="rp__export" data-tour="reports-export">
      <summary className="ad__btn ad__btn--primary"><Download aria-hidden="true" /> Export <ChevronDown aria-hidden="true" /></summary>
      <div className="rp__exportMenu">
        <p>This view, with your filters</p>
        <a href={one(mine, "csv")}><FileText aria-hidden="true" /> CSV</a>
        <a href={one(mine, "xlsx")}><FileSpreadsheet aria-hidden="true" /> Excel</a>
        <p>Everything the filters can see</p>
        <a href={one("all", "csv")}><FileText aria-hidden="true" /> All sections, CSV</a>
        <a href={one("all", "xlsx")}><FileSpreadsheet aria-hidden="true" /> All sections, Excel</a>
      </div>
    </details>
  );
}
