import type { AuditEntry, AuditKind } from "@/lib/admin/types";
import { verbOf } from "@/lib/audit-verbs";

/**
 * AUDIT ROWS AS EVENTS A PERSON READS (Settings › Audit log).
 *
 * One save that changed three fields writes three rows, one per field, so
 * the table groups rows made by the same person, to the same record, with the
 * same words, within two seconds, into one event with a list of changes. The
 * raw rows travel with it, for the detail view's copyable record.
 */
export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  kind: AuditKind;
  subjectId: string;
  subject: string;
  action: string;
  note?: string;
  verb: { key: string; label: string; tone: string };
  changes: { field: string; label: string; from: string; to: string }[];
  href: string | null;
  raw: AuditEntry[];
};

const HREF: Partial<Record<AuditKind, (id: string) => string>> = {
  client: (id) => `/admin/clients/${id}`,
  project: (id) => `/admin/projects/${id}`,
  invoice: (id) => `/admin/money/${id}`,
};

export const KIND_LABEL: Record<AuditKind, string> = {
  client: "Clients", project: "Projects", task: "Tasks", update: "Updates", deliverable: "Deliverables",
  invoice: "Invoices", payment: "Payments", expense: "Expenses", submission: "Forms", setting: "Settings and team", content: "Content",
};

/** "vatRate" → "VAT rate", "due_in_days" → "Due in days". */
export function fieldLabel(field: string): string {
  const words = field.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().toLowerCase();
  const fixed = words.replace(/\b(vat|url|seo|id|ssl|r2|smtp)\b/g, (w) => w.toUpperCase());
  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
}

export function toEvents(entries: AuditEntry[]): AuditEvent[] {
  const out: AuditEvent[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    const sameSave = last && last.actor === e.actor && last.subjectId === e.subjectId && last.action === e.action
      && Math.abs(new Date(last.at).getTime() - new Date(e.at).getTime()) <= 2000;
    const change = e.field ? { field: e.field, label: fieldLabel(e.field), from: e.from ?? "", to: e.to ?? "" } : null;
    if (sameSave && change) {
      last.changes.push(change);
      last.raw.push(e);
      continue;
    }
    const v = verbOf(e.action);
    out.push({
      id: e.id, at: e.at, actor: e.actor, kind: e.kind, subjectId: e.subjectId, subject: e.subject,
      action: e.action, note: e.note,
      verb: { key: v.key, label: v.label, tone: v.tone },
      changes: change ? [change] : [],
      href: HREF[e.kind]?.(e.subjectId) ?? null,
      raw: [e],
    });
  }
  return out;
}

/** Wall-clock time in Lagos, whatever the server's zone, and saying so. */
export function lagosTime(iso: string, opts: { withYear?: boolean } = {}) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos", day: "numeric", month: "short", ...(opts.withYear ? { year: "numeric" } : {}),
    hour: "2-digit", minute: "2-digit",
  });
}
