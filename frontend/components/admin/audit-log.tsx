import Link from "next/link";
import { listAudit, type AuditFilters } from "@/lib/audit-db";
import type { AuditKind, Id } from "@/lib/admin/types";
import { toEvents } from "@/lib/audit-events";
import { Empty, Panel } from "./bits";
import { AuditTable } from "./audit-table";
import { Pager } from "./pager";

/**
 * The audit log: a table of events, each opening its detail.
 *
 * READ, NOT OPERATED. The log cannot be edited, sorted into something more
 * flattering, or cleared; the only controls are the filters above it and
 * the pager under it. Record pages (a client, a project) pass `kind` or
 * `subjectId` and get the latest few; Settings passes its URL's filters and
 * a pager, so all of the history can be reached, not only the newest page.
 */
export default async function AuditLog({
  kind, subjectId, subjectIds, limit = 60, title = "Everything that changed", filters, filtered = false, pager, clearHref, more,
}: {
  kind?: AuditKind;
  subjectId?: Id;
  subjectIds?: Id[];
  limit?: number;
  title?: string;
  /** Settings' filters, read from its URL. */
  filters?: AuditFilters;
  /** Whether the person narrowed the list, which changes what "empty" means. */
  filtered?: boolean;
  /** Settings' pager: the address of another page or page size. */
  pager?: (patch: { page?: number; per?: number }) => string;
  /** Where "Clear the filters" goes, so a search that finds nothing is not a dead end. */
  clearHref?: string;
  /** A record page shows a few and offers a link for the next few, instead of a pager. */
  more?: string;
}) {
  const per = filters?.limit ?? limit;
  const { entries, total, source } = await listAudit({ range: "all", ...filters, kind: filters?.kind ?? kind, subjectId, subjectIds, limit: per });
  const events = toEvents(entries);

  return (
    <Panel title={title} action={<span className="ad__dim">{total} {total === 1 ? "change" : "changes"}</span>}>
      {events.length ? (
        <>
          <AuditTable events={events} compact={!pager} />
          {pager ? (
            <Pager label="Pages of the audit log" total={total} page={filters?.page ?? 1} per={per} noun="changes" perOptions={[10, 25, 50]} href={pager} />
          ) : total > entries.length && more ? (
            <p style={{ padding: ".8rem 1.25rem 1rem", margin: 0, display: "flex", gap: ".75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link className="ad__btn" href={more} scroll={false}>Show more</Link>
              <span className="ad__dim" style={{ fontSize: ".84rem" }}>{entries.length} newest of {total}</span>
            </p>
          ) : total > entries.length ? (
            <p className="ad__dim" style={{ padding: ".8rem 1.25rem 1rem", margin: 0, fontSize: ".84rem" }}>
              The {entries.length} most recent of {total}. Settings › Audit log has all of them.
            </p>
          ) : null}
          {source === "memory" ? (
            <p className="ad__dim" style={{ padding: "0 1.25rem 1rem", margin: 0, fontSize: ".84rem" }}>
              The database is not connected, so this is only what this server has seen since it started.
            </p>
          ) : null}
        </>
      ) : filtered ? (
        <Empty kind="no-results" title="No changes match"
          action={clearHref ? <Link className="ad__btn" href={clearHref}>Clear the filters</Link> : undefined}>
          Widen the dates or clear the search.
        </Empty>
      ) : (
        <Empty title="Nothing has changed yet">
          Every edit to a client, project, invoice, payment, expense or setting
          lands here with who made it and what it was before.
        </Empty>
      )}
    </Panel>
  );
}
