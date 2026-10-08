import { Clock, GitBranch, Mail, OctagonX, StickyNote, Tag, Webhook, Zap, type LucideIcon } from "lucide-react";
import type { StepType } from "@/lib/automations-flow";

export const ICONS: Record<StepType | "trigger", LucideIcon> = {
  trigger: Zap, wait: Clock, email: Mail, tag: Tag, stop_if_tag: OctagonX, if: GitBranch, note: StickyNote, webhook: Webhook, stop: OctagonX,
};

/** The solid icon tile of a step. Its colour comes from the type (automation-canvas.css), its glyph is always white. */
export function Tile({ type }: { type: StepType | "trigger" }) {
  const Icon = ICONS[type];
  return <span className="adWf__tile" data-t={type} aria-hidden="true"><Icon /></span>;
}
