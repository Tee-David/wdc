import { Info } from "lucide-react";
import type { InvoiceStatus, Stage } from "@/lib/admin/types";

/**
 * The small pieces every admin screen uses, in one file so that a status pill
 * on the dashboard and the same pill on the invoice list cannot drift into two
 * different things.
 */

/** Said once at the top of any screen showing invented data. */
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="ad__demo">
      <Info aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Panel({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ad__panel">
      <div className="ad__panelH">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Tile({
  label, value, note, tone,
}: {
  label: string; value: string; note?: string;
  tone?: "good" | "bad" | "accent";
}) {
  return (
    <div className={`ad__tile${tone ? ` ad__tile--${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="ad__empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

/* A stage's tone. "Revisions" is amber rather than red: it is normal work, not
   a failure, and colouring it as a problem teaches people to ignore red. */
const STAGE_TONE: Record<Stage, string> = {
  Onboarding: "ad__pill--warn",
  Discovery: "",
  "In progress": "ad__pill--live",
  Review: "",
  Revisions: "ad__pill--warn",
  Delivered: "ad__pill--good",
};

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={`ad__pill ${STAGE_TONE[stage]}`}>{stage}</span>;
}

const INV_TONE: Record<InvoiceStatus, string> = {
  Draft: "ad__pill--flat",
  Sent: "",
  "Part paid": "ad__pill--warn",
  Paid: "ad__pill--good",
  Overdue: "ad__pill--bad",
};

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  return <span className={`ad__pill ${INV_TONE[status]}`}>{status}</span>;
}

/** A date a person would say, not an ISO string. */
export function when(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
