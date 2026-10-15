import Link from "next/link";
import { Download, Columns3 } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { can } from "@/lib/admin/permissions";
import { adminRole } from "@/lib/admin/guard";
import { COLUMNS, cell, listAll, readColumns } from "@/lib/forms/all-entries";
import { Empty, when } from "@/components/admin/bits";
import { Pager } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { FilterPick } from "@/components/admin/pick";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "All entries" };

type SP = Record<string, string | string[] | undefined>;

/**
 * Every entry from every form in one table (the Entries card on Forms): search,
 * dates, a form filter, a column chooser, pagination and an export. The
 * address carries all of it, so a filtered view can be shared or bookmarked.
 */
export default async function AllEntries({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [{ rows, total, filters: f, forms }, role] = await Promise.all([listAll(sp), adminRole()]);
  const cols = readColumns(sp.cols);
  const form = typeof sp.form === "string" ? sp.form : "";
  const keep = { q: f.q || undefined, form: form || undefined, sort: f.sort === "newest" ? undefined : f.sort, per: f.per, cols: cols.join(",") };
  const href = (patch: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const all: Record<string, string | number | undefined> = { ...keep, from: f.from || undefined, to: f.to || undefined, ...patch };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "") u.set(k, String(v));
    const s = u.toString();
    return `/admin/forms/all${s ? `?${s}` : ""}`;
  };
  const exportQs = new URLSearchParams(href({ page: undefined }).split("?")[1] ?? "").toString();

  return (
    <>
      <PageHead title="All entries" crumbs={[{ href: "/admin/forms", label: "Forms" }]}
        lede={<>Every entry from every form, newest first. <strong>{total} {total === 1 ? "entry" : "entries"}.</strong></>}
        action={can(role, "exports") ? (
          <div className="ad__row">
            <a className="ad__btn" href={`/admin/forms/all/export?${exportQs}&format=csv`}><Download aria-hidden="true" /> CSV</a>
            <a className="ad__btn" href={`/admin/forms/all/export?${exportQs}&format=xlsx`}><Download aria-hidden="true" /> Excel</a>
          </div>
        ) : undefined} />

      <section className="adList" aria-label="Entries" data-tour="entries-table">
        <div className="adList__hd"><h2>Entries</h2><span className="adList__n">{total}</span></div>
        <div data-tour="entries-filters">
        <form method="get" action="/admin/forms/all" className="ad__filters" style={{ padding: "0 1.25rem .9rem" }}>
          <label className="ad__filterSearch">
            Search
            <input type="search" name="q" defaultValue={f.q} placeholder="A name, email or answer" />
          </label>
          <FilterPick label="Form" name="form" defaultValue={form} placeholder="Every form"
                      options={forms.map((x) => ({ value: x.key, label: x.title }))} />
          <FilterPick label="Order" name="sort" defaultValue={f.sort} placeholder="Newest first"
                      options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "name", label: "Name A to Z" }]} />
          <details className="ad__range">
            <summary aria-label="Choose columns"><Columns3 aria-hidden="true" /><span>Columns ({cols.length})</span></summary>
            <div className="ad__rangeMenu" style={{ padding: ".6rem .8rem", display: "grid", gap: ".5rem" }}>
              {COLUMNS.map((c) => (
                <label key={c.key} className="ad__row" style={{ minHeight: "2.75rem" }}>
                  <input type="checkbox" name="cols" value={c.key} defaultChecked={cols.includes(c.key)} /> {c.label}
                </label>
              ))}
            </div>
          </details>
          <input type="hidden" name="per" value={f.per} />
          {f.from ? <input type="hidden" name="from" value={f.from} /> : null}
          {f.to ? <input type="hidden" name="to" value={f.to} /> : null}
          <span className="ad__row">
            <button type="submit" className="ad__btn">Apply</button>
            {f.q || form || f.from || f.to ? <Link className="ad__btn ad__btn--plain" href="/admin/forms/all">Clear</Link> : null}
          </span>
        </form>
        <div style={{ padding: "0 1.25rem 1rem" }}>
          <DateRange value={{ from: f.from, to: f.to }} keep={keep}
            action="/admin/forms/all" href={(r) => href({ from: r.from, to: r.to, page: undefined })} />
        </div>
        </div>
          {rows.length ? (
            <>
              <div className="ad__scroll" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr>{cols.map((k) => <th key={k}>{COLUMNS.find((c) => c.key === k)?.label}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.form.key}-${r.id}`}>
                        {cols.map((k, i) => {
                          const v = k === "when" ? when(r.at) : cell(r, k);
                          return (
                            <td key={k}>
                              {i === 0
                                ? <Link href={`/admin/forms/${r.form.key}/entries/${r.id}`}><b>{v || "(none)"}</b></Link>
                                : v || <span className="ad__dim">–</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager label="Entries" total={total} page={f.page} per={f.per} noun="entries"
                href={(p) => href({ page: p.page && p.page > 1 ? p.page : undefined, per: p.per ?? f.per })} />
            </>
          ) : (
            <Empty title={f.q || form || f.from || f.to ? "No entries match" : "No entries yet"} action={f.q || form || f.from || f.to ? <Link className="ad__btn" href="/admin/forms/all">Clear filters</Link> : <Link className="ad__btn" href="/admin/forms">Open forms</Link>}>
              {f.q || form || f.from || f.to ? "Clear a filter to see more." : "Entries appear here as soon as someone sends a form."}
            </Empty>
          )}
      </section>
    </>
  );
}
