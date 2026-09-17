import { getAudit, auditCount } from "@/lib/admin/data";
import type { AuditKind, Id } from "@/lib/admin/types";
import { Empty, Panel } from "./bits";

/**
 * The audit log, as a list.
 *
 * A SERVER COMPONENT WITH NO CONTROLS. This screen is read, not operated: the
 * log cannot be edited, sorted into something more flattering, or cleared, and
 * giving it buttons would suggest otherwise. Filtering happens by passing
 * `kind` or `subjectId` from whichever page is rendering it, so the project
 * page can show its own record and Settings can show everything.
 *
 * BOUNDED, AND IT SAYS SO. An unbounded list is a page that gets slower every
 * week it is used, and the count under it is what stops a bounded list reading
 * as the whole history.
 */
export default async function AuditLog({
  kind, subjectId, subjectIds, limit = 60, title = "Everything that changed",
}: {
  kind?: AuditKind;
  subjectId?: Id;
  subjectIds?: Id[];
  limit?: number;
  title?: string;
}) {
  const entries = await getAudit({ kind, subjectId, subjectIds, limit });
  const total = await auditCount({ kind, subjectId, subjectIds });

  return (
    <Panel title={title}>
      {entries.length ? (
        <>
          <ol className="ad__log">
            {entries.map((e) => (
              <li key={e.id} className="ad__logRow">
                <span className="ad__logWhen">
                  <time dateTime={e.at}>
                    {new Date(e.at).toLocaleString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </time>
                </span>
                <span className="ad__logWhat">
                  <span className="ad__kind">{e.kind}</span>
                  <b>{e.subject}</b> {e.action}
                  {e.note ? <> &middot; {e.note}</> : null}
                  {/* THE BEFORE AND AFTER, which is the whole reason this
                      exists. `del`/`ins` rather than two spans: a screen
                      reader announces them as a removal and an insertion,
                      which is exactly what they are. */}
                  {e.field ? (
                    <span className="ad__logMove">
                      {e.field}: <del>{e.from || "nothing"}</del> &rarr; <ins>{e.to || "nothing"}</ins>
                    </span>
                  ) : null}
                  <span className="ad__logWho"> by {e.actor}</span>
                </span>
              </li>
            ))}
          </ol>
          {total > entries.length ? (
            <p className="ad__dim" style={{ padding: ".2rem 1rem 1rem", margin: 0, fontSize: ".84rem" }}>
              The {entries.length} most recent of {total}. Nothing here can be
              edited or removed; the list is append-only.
            </p>
          ) : (
            <p className="ad__dim" style={{ padding: ".2rem 1rem 1rem", margin: 0, fontSize: ".84rem" }}>
              Append-only. Nothing here can be edited or removed.
            </p>
          )}
        </>
      ) : (
        <Empty title="Nothing has changed yet">
          Every edit to a client, project, invoice, payment, expense or setting
          lands here with who made it and what it was before.
        </Empty>
      )}
    </Panel>
  );
}
