"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MailOpen, MoreHorizontal, RotateCcw, Star, X } from "lucide-react";
import { bulkEntries } from "@/lib/forms/actions";
import { Form, Hidden } from "@/components/admin/form";

export type TableRow = { id: string; href: string; read: boolean; starred: boolean; cells: string[] };

/**
 * A form's entries, with the ticked-rows bar.
 *
 * NOTHING HERE DECIDES ANYTHING. The rows, their cells and which actions exist
 * come from the server; this only keeps track of which boxes are ticked and
 * shows the actions once something is. The action re-checks every id.
 */
export function EntriesTable({ formKey, inbox, tab, canDelete, canExport, columns, rows, exportQuery, empty, footer }: {
  formKey: string;
  inbox: boolean;
  tab: string;
  canDelete: boolean;
  canExport: boolean;
  columns: { key: string; label: string }[];
  rows: TableRow[];
  exportQuery: string;
  /* Drawn in place of the table when there are no rows. Inside this component
     rather than instead of it, so the result of the last action (the row that
     just moved to Trash, say) stays on screen after its row has gone. */
  empty: ReactNode;
  footer?: ReactNode;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const all = rows.length > 0 && picked.size === rows.length;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const inTrash = tab === "trash";
  const exportSelected = (format: "csv" | "xlsx") =>
    `/admin/forms/${formKey}/export?format=${format}&${exportQuery}${[...picked].map((id) => `&id=${id}`).join("")}`;

  return (
    <Form action={bulkEntries} onDone={() => setPicked(new Set())}>
      <Hidden name="form" value={formKey} />
      {[...picked].map((id) => <Hidden key={id} name="id" value={id} />)}
      {picked.size ? (
        /* ONE LINE, PINNED: what is ticked, the two things most often done to
           it, the rest under More, and a way out. It used to be a wall of
           nine buttons that pushed the table off a phone's screen. */
        <div className="adBulk" role="region" aria-label="Ticked entries">
          <b className="adBulk__n">{picked.size} selected</b>
          {inbox && !inTrash ? (
            <>
              <button className="ad__btn adBulk__btn" name="action" value="read"><MailOpen aria-hidden="true" /> <span className="adBulk__t">Mark read</span></button>
              <button className="ad__btn adBulk__btn" name="action" value="star"><Star aria-hidden="true" /> <span className="adBulk__t">Star</span></button>
            </>
          ) : null}
          {inbox && inTrash ? <button className="ad__btn adBulk__btn" name="action" value="restore"><RotateCcw aria-hidden="true" /> <span className="adBulk__t">Put back</span></button> : null}
          <details className="adBulk__more">
            <summary className="ad__btn adBulk__btn"><MoreHorizontal aria-hidden="true" /> More</summary>
            <div className="adBulk__menu" role="group" aria-label="More actions">
              {inbox && !inTrash ? (
                <>
                  <button name="action" value="unread">Mark unread</button>
                  <button name="action" value="unstar">Unstar</button>
                  {tab === "spam"
                    ? <button name="action" value="restore">Not spam</button>
                    : <button name="action" value="spam">Spam</button>}
                  <button name="action" value="trash">Move to Trash</button>
                </>
              ) : null}
              {inbox && inTrash && canDelete ? (
                <button name="action" value="delete" className="is-danger"
                  onClick={(e) => { if (!window.confirm(`Delete ${picked.size} for good? This cannot be undone.`)) e.preventDefault(); }}>
                  Delete for good
                </button>
              ) : null}
              {canExport ? (
                <>
                  <a href={exportSelected("csv")}>Export CSV</a>
                  <a href={exportSelected("xlsx")}>Export XLSX</a>
                </>
              ) : null}
            </div>
          </details>
          <button type="button" className="ad__iconButton adBulk__x" aria-label="Clear the selection" onClick={() => setPicked(new Set())}><X aria-hidden="true" /></button>
        </div>
      ) : null}
      {rows.length ? <><div className="ad__scroll" data-tour="forms-entries">
        <table className="ad__t">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c.key}>
                  {i === 0 ? (
                    <span className="adForms__lead">
                      <input type="checkbox" aria-label="Tick every entry on this page" checked={all}
                        onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} />
                      {c.label}
                    </span>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`${!r.read ? "adForms__unread" : ""}${picked.has(r.id) ? " is-picked" : ""}`}>
                {r.cells.map((cell, i) => (
                  <td key={columns[i].key} className={columns[i].key === "message" ? "adForms__clip" : undefined} title={columns[i].key === "message" ? cell : undefined}>
                    {i === 0 ? (
                      <span className="adForms__lead">
                        <input type="checkbox" aria-label={`Tick ${r.cells[1] || r.cells[0] || "this entry"}`}
                          checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
                        <Link href={r.href}>
                          {r.starred ? <Star aria-label="Starred" className="adForms__star" /> : null}
                          {cell || "Open"}
                          {!r.read ? <span className="ad__pill ad__pill--live" style={{ marginLeft: ".4rem" }}>New</span> : null}
                        </Link>
                      </span>
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>{footer}</> : empty}
    </Form>
  );
}
