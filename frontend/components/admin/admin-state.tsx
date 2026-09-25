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

export function AdminState({ kind, title, description, action, secondaryAction }: {
  kind: AdminStateKind;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  const Icon = icons[kind];
  return (
    <div className={`adState adState--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <EmptyScene kind={kind} icon={Icon} />
      <strong>{title}</strong>
      <p>{description}</p>
      {action || secondaryAction ? <div className="adState__actions">{action}{secondaryAction}</div> : null}
    </div>
  );
}
