import Link from "next/link";
import { Download } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AUDIT_KINDS } from "@/lib/admin/types";
import { AUDIT_RANGES, auditActors, readAuditFilters } from "@/lib/audit-db";
import { KIND_LABEL } from "@/lib/audit-events";
import { AUDIT_VERBS } from "@/lib/audit-verbs";
import { AdminState } from "@/components/admin/admin-state";
import AuditLog from "@/components/admin/audit-log";

export const metadata = { title: "Audit log" };

/**
 * What changed, who changed it, and what it was before. Append-only by
 * construction: the filters narrow what is shown and nothing edits it. The
 * filters and the page live in the URL, so a view can be linked, survives a
 * reload, and every page of the history can be reached.
 */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="The audit log is for the owner" description="Every change made in the admin, with who made it." /></section>;
  }
  const sp = await searchParams;
  const filters = readAuditFilters(sp);
  const actors = await auditActors();
  const filtered = Boolean(filters.kind || filters.actor || filters.q || filters.verb || filters.range !== "30d");
  /* The same filters, as a query, for the pager and the export. */
  const keep = (patch: Record<string, string | number | undefined> = {}) => {
    const u = new URLSearchParams();
    const all = { kind: filters.kind, actor: filters.actor, q: filters.q, verb: filters.verb, range: filters.range !== "30d" ? filters.range : undefined, per: filters.limit !== 25 ? filters.limit : undefined, page: undefined, ...patch };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) u.set(k, String(v));
    return u.toString();
  };
  return (
    <>
      <div className="ad__head">
        <div><h1>Audit log</h1><p>Every change, who made it, and what it was before. Times are Lagos time.</p></div>
        <div className="ad__row">
          <a className="ad__btn" href={`/admin/settings/audit/export?${keep()}`}><Download aria-hidden="true" /> Export CSV</a>
        </div>
      </div>
      <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
        <form className="ad__filterBar" method="get" role="search">
          <label className="ad__filterSearch"><span className="ad__sr">Search</span>
            <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="A client, an invoice number, a value" />
          </label>
          <label><span className="ad__sr">Who</span>
            <select name="actor" defaultValue={filters.actor ?? ""}>
              <option value="">Anybody</option>
              {actors.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label><span className="ad__sr">Action</span>
            <select name="verb" defaultValue={filters.verb ?? ""}>
              <option value="">Any action</option>
              {AUDIT_VERBS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </label>
          <label><span className="ad__sr">Area</span>
            <select name="kind" defaultValue={filters.kind ?? ""}>
              <option value="">Every area</option>
              {AUDIT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label><span className="ad__sr">When</span>
            <select name="range" defaultValue={filters.range}>
              {AUDIT_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
          {filters.limit !== 25 ? <input type="hidden" name="per" value={filters.limit} /> : null}
          <button className="ad__btn ad__btn--primary" type="submit">Show</button>
          {filtered ? <Link className="ad__btn" href="/admin/settings/audit">Clear</Link> : null}
        </form>
      </section>
      <AuditLog filters={filters} filtered={filtered} clearHref="/admin/settings/audit"
        title={filtered ? "Matching changes" : "The last 30 days"}
        pager={(p) => `/admin/settings/audit?${keep({ page: p.page, per: p.per ?? (filters.limit !== 25 ? filters.limit : undefined) })}`} />
    </>
  );
}
