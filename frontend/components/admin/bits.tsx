import { EmptyScene, sceneFor, type SceneKind } from "./empty-scene";
import Link from "next/link";
import { CountUp } from "./count-up";
import "./empty-scene.css";
import { Inbox, Info, type LucideIcon } from "lucide-react";
import type { Approval, Attention, Health, InvoiceStatus, Stage } from "@/lib/admin/types";

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
  title, action, children, dataTour, id,
}: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
  /** A tour step's `target`, when this panel is one -- see `lib/tours/admin.ts`. */
  dataTour?: string;
  /** An anchor another page links straight to. */
  id?: string;
}) {
  return (
    <section className="ad__panel" data-tour={dataTour} id={id}>
      <div className="ad__panelH">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A KPI card (the mockups' .kpi). `icon` sits in a solid tile beside the
 * label; `badge` is a short solid pill beside the figure ("1 overdue"), for
 * the one fact about the number that changes what you do next.
 */
export function Tile({
  label, value, note, tone, icon: Icon, iconTone = "brand", badge, href,
}: {
  label: string; value: string; note?: string;
  /** Makes the whole card a link to the list this figure counts. */
  href?: string;
  tone?: "good" | "bad" | "accent";
  icon?: LucideIcon;
  iconTone?: "brand" | "good" | "bad" | "warn" | "live" | "neutral";
  badge?: { label: string; tone: "good" | "bad" | "warn" | "live" | "flat" };
}) {
  return (
    <div className={`ad__tile${tone ? ` ad__tile--${tone}` : ""}${href ? " ad__tile--link" : ""}`}>
      <dt>
        <span>{href ? <Link className="ad__tileHit" href={href}>{label}</Link> : label}</span>
        {Icon ? <span className={`ad__tileIcon ad__tileIcon--${iconTone}`} aria-hidden="true"><Icon /></span> : null}
      </dt>
      <dd>
        <CountUp value={value} />
        {badge ? <span className={`ad__pill ad__pill--${badge.tone} ad__tileBadge`}>{badge.label}</span> : null}
      </dd>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function Empty({
  title,
  children,
  action,
  icon: Icon = Inbox,
  kind,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  /** Which scene: first-use unless the title says otherwise (see sceneFor). */
  kind?: SceneKind;
}) {
  return (
    <div className="ad__empty" role="status">
      <EmptyScene kind={kind ?? sceneFor(title)} icon={Icon} />
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
      {action ? <div className="ad__emptyAction">{action}</div> : null}
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
  /* Flat, like a draft: a struck invoice is not a failure and it is not a
     warning, it is a document that has been taken out of play. Red would put
     it in the same visual bucket as "overdue", which is the one state that
     genuinely wants somebody to do something. */
  Void: "ad__pill--flat",
};

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  return <span className={`ad__pill ${INV_TONE[status]}`}>{status}</span>;
}

/**
 * HOW IT IS GOING, as a pill.
 *
 * Two of the four are bad news and they are told apart deliberately: "blocked"
 * is something WE cannot get past, "waiting on client" is something somebody
 * else owes us. They need different actions from whoever reads the board, so
 * they get different colours.
 */
const HEALTH_TONE: Record<Health, string> = {
  "On track": "ad__pill--good",
  "At risk": "ad__pill--warn",
  "Waiting on client": "ad__pill--warn",
  Blocked: "ad__pill--bad",
};

export function HealthPill({ health }: { health: Health }) {
  return <span className={`ad__pill ${HEALTH_TONE[health]}`}>{health}</span>;
}

const APPROVAL_TONE: Record<Approval, string> = {
  "Not sent": "ad__pill--flat",
  "Awaiting client": "",
  Approved: "ad__pill--good",
  "Revision requested": "ad__pill--warn",
};

export function ApprovalPill({ approval }: { approval: Approval }) {
  return <span className={`ad__pill ${APPROVAL_TONE[approval]}`}>{approval}</span>;
}

const TONE_CLASS = { bad: "ad__pill--bad", warn: "ad__pill--warn", info: "ad__pill--flat" } as const;

/**
 * WHY THIS ROW IS ASKING FOR SOMEBODY.
 *
 * Derived by `projectAttention`, never stored -- see the note there. Renders
 * nothing at all when there is nothing to say, so a healthy project does not
 * carry an empty slot on every list.
 */
export function AttentionPills({
  items, except,
}: {
  items: Attention[];
  /**
   * A label already shown beside these, so it is not said twice.
   *
   * `projectAttention` deliberately includes the health reasons, because the
   * dashboard queue has no health pill and needs the complete answer to "why
   * is this here". The project page and the list DO draw a HealthPill, and
   * without this they rendered "Waiting on client" twice in a row. The
   * derivation stays complete; the duplicate is dropped at the one place that
   * knows it is a duplicate.
   */
  except?: string;
}) {
  const shown = except ? items.filter((a) => a.label !== except) : items;
  if (!shown.length) return null;
  return (
    <span className="ad__attn">
      {shown.map((a) => (
        <span key={a.label} className={`ad__pill ${TONE_CLASS[a.tone]}`}>{a.label}</span>
      ))}
    </span>
  );
}

/** A date a person would say, not an ISO string. */
export function when(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
