import Link from "next/link";
import { Ban, CheckCircle2, Inbox, SearchX, TriangleAlert, type LucideIcon } from "lucide-react";
import "./states.css";
import "./empty-scene.css";
import { EmptyScene } from "./empty-scene";

export type AdminStateKind = "first-use" | "cleared" | "no-results" | "forbidden" | "error";

const icons: Record<AdminStateKind, LucideIcon> = {
  "first-use": Inbox,
  cleared: CheckCircle2,
  "no-results": SearchX,
  forbidden: Ban,
  error: TriangleAlert,
};

export function AdminState({ kind, title, description, action, secondaryAction, back }: {
  kind: AdminStateKind;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Where a no-access page sends people back to (the dashboard unless said). */
  back?: { href: string; label: string };
}) {
  const Icon = icons[kind];
  /* NO ACCESS IS NEVER A DEAD END: it names who to ask and gives a way back,
     whether or not the page thought to. */
  if (kind === "forbidden" && !action) {
    const to = back ?? { href: "/admin", label: "Back to the dashboard" };
    action = <Link className="ad__btn" href={to.href}>{to.label}</Link>;
    if (typeof description === "string" && !/ask the owner/i.test(description)) {
      description = `${description} Ask the owner if you need something changed here.`;
    }
  }
  return (
    <div className={`adState adState--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <EmptyScene kind={kind} icon={Icon} />
      <strong>{title}</strong>
      <p>{description}</p>
      {action || secondaryAction ? <div className="adState__actions">{action}{secondaryAction}</div> : null}
    </div>
  );
}
