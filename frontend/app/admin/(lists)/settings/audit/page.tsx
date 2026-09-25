import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AUDIT_KINDS } from "@/lib/admin/types";
import { AUDIT_RANGES, auditActors, readAuditFilters } from "@/lib/audit-db";
import { AdminState } from "@/components/admin/admin-state";
import AuditLog from "@/components/admin/audit-log";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Audit log" };

const KIND_LABEL: Record<(typeof AUDIT_KINDS)[number], string> = {
  client: "Clients", project: "Projects", task: "Tasks", update: "Updates", deliverable: "Deliverables",
  invoice: "Invoices", payment: "Payments", expense: "Expenses", submission: "Forms", setting: "Settings and team", content: "Content",
};

/**
 * What changed, who changed it, and what it was before. Append-only by
 * construction: the filters narrow what is shown and nothing edits it. The
 * filters live in the URL, so a filtered view can be linked and survives a
 * reload.
 */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="The audit log is for the owner" description="Every change made in the admin, with who made it." /></section>;
  }
  const sp = await searchParams;
  const filters = readAuditFilters(sp);
  const actors = await auditActors();
  const filtered = Boolean(filters.kind || filters.actor || filters.q || filters.range !== "30d");
  return (
    <>
      <div className="ad__head"><div><h1>Audit log</h1><p>Every change, who made it, and what it was.</p></div></div>
      <section className="ad__panel" style={{ marginBottom: ".9rem" }}>
      <form className="adForms__filters" method="get" role="search" style={{ borderBottom: 0 }}>
        <label>What
          <select name="kind" defaultValue={filters.kind ?? ""}>
            <option value="">Everything</option>
            {AUDIT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label>Who
          <select name="actor" defaultValue={filters.actor ?? ""}>
            <option value="">Anybody</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>When
          <select name="range" defaultValue={filters.range}>
            {AUDIT_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
        <label className="adForms__search">Search
          <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="A client, an invoice number, a value" />
        </label>
        <button className="ad__btn ad__btn--primary" type="submit">Show</button>
        {filtered ? <Link className="ad__btn" href="/admin/settings/audit">Clear</Link> : null}
      </form>
      </section>
      <AuditLog filters={filters} filtered={filtered} limit={100} title={filtered ? "Matching changes" : "The last 30 days"} />
    </>
  );
}
