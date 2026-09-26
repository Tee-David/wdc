"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AuditEvent } from "@/lib/audit-events";
import { KIND_LABEL, lagosTime } from "@/lib/audit-events";
import { Dialog } from "./dialog";
import { CopyText } from "./copy-text";
import "./audit-table.css";

const TONE: Record<string, string> = {
  bad: "ad__pill--bad", warn: "ad__pill--warn", good: "ad__pill--good", neutral: "ad__pill--flat", brand: "ad__pill--brand", live: "ad__pill--live",
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/**
 * THE AUDIT LOG AS A TABLE (artifact "WDC Settings Review"): who, the verb as
 * a solid pill, the record, the area and the time in Lagos. Every row opens
 * the detail: a sentence, the before and after of each field, and the raw
 * record to copy. Phones get the same rows as cards.
 */
export function AuditTable({ events, compact = false }: { events: AuditEvent[]; compact?: boolean }) {
  const [open, setOpen] = useState<AuditEvent | null>(null);
  return (
    <>
      <div className="adAudit">
        <div className="adAudit__head" aria-hidden="true">
          <span>Who</span>
          <span>Action</span>
          <span>Record</span>
          {compact ? null : <span>Area</span>}
          <span>When (Lagos)</span>
          <span />
        </div>
        {events.map((e) => (
          <button key={e.id} type="button" className={`adAudit__row${compact ? " is-compact" : ""}`} onClick={() => setOpen(e)}
            aria-label={`${e.actor} ${e.action} ${e.subject}, ${lagosTime(e.at)}. Open the detail.`}>
            <span className="adAudit__who">
              <span className="adAudit__av" aria-hidden="true">{initials(e.actor)}</span>
              <b>{e.actor}</b>
            </span>
            <span><span className={`ad__pill ${TONE[e.verb.tone] ?? "ad__pill--flat"}`}>{e.verb.label}</span></span>
            <span className="adAudit__rec">
              <b>{e.subject}</b>
              <small>{e.action}{e.changes.length ? ` · ${e.changes.length === 1 ? e.changes[0].label : `${e.changes.length} fields`}` : ""}</small>
            </span>
            {compact ? null : <span className="adAudit__area">{KIND_LABEL[e.kind]}</span>}
            <span className="adAudit__when"><time dateTime={e.at}>{lagosTime(e.at)}</time></span>
            <span className="adAudit__go" aria-hidden="true"><span>View detail</span><ChevronRight /></span>
          </button>
        ))}
      </div>
      {open ? <AuditDetail event={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function AuditDetail({ event: e, onClose }: { event: AuditEvent; onClose: () => void }) {
  const json = JSON.stringify(e.raw.length === 1 ? e.raw[0] : e.raw, null, 2);
  return (
    <Dialog open onClose={onClose} title={`${e.actor} ${e.action} ${e.subject} on ${lagosTime(e.at, { withYear: true })}`} wide>
      <div className="adAuditD">
        <dl className="adAuditD__facts">
          <div><dt>Action</dt><dd><span className={`ad__pill ${TONE[e.verb.tone] ?? "ad__pill--flat"}`}>{e.verb.label}</span></dd></div>
          <div><dt>Who</dt><dd>{e.actor}</dd></div>
          <div><dt>Area</dt><dd>{KIND_LABEL[e.kind]}</dd></div>
          <div><dt>Record</dt><dd>{e.href ? <Link href={e.href} onClick={onClose}>{e.subject}</Link> : e.subject} <code>{e.subjectId}</code></dd></div>
        </dl>
        {e.changes.length ? (
          <div className="ad__scroll">
            <table className="ad__t adAuditD__diff">
              <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
              <tbody>
                {e.changes.map((c, i) => (
                  <tr key={i}>
                    <th scope="row">{c.label}</th>
                    <td><del>{c.from || "nothing"}</del></td>
                    <td><ins>{c.to || "nothing"}</ins></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {e.note ? <p className="adAuditD__note">{e.note}</p> : null}
        <div className="adAuditD__raw">
          <div className="adAuditD__rawBar"><span>The recorded entry</span><CopyText text={json} label="Copy" className="ad__btn adAuditD__copy" /></div>
          <pre tabIndex={0}>{json}</pre>
        </div>
        <div className="adAuditD__acts">
          <button type="button" className="ad__btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}
