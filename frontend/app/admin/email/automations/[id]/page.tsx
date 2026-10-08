import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel, Tile } from "@/components/admin/bits";
import { AutomationButtons, StepEditor } from "@/components/admin/email/automation-ui";
import { getAutomation, statsFor } from "@/lib/automations";

export const metadata = { title: "Automation" };

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAutomation(id);
  if (!a) notFound();
  const stats = await statsFor(id);
  return (
    <AreaGate area="settings" what="Email">
      <div className="ad__head">
        <div>
          <Link href="/admin/email?tab=automations" className="ad__btn ad__btn--plain"><ArrowLeft aria-hidden="true" /> Automations</Link>
          <h1>{a.name}</h1>
          <p><span className={`ad__pill ${a.enabled ? "ad__pill--good" : "ad__pill--flat"}`}>{a.enabled ? "On" : "Off"}</span>{" "}
            {a.kind === "marketing" ? "Marketing: only people who asked to hear from us." : "Service: follow-up to people we work with."}{" "}
            Starts when {a.triggerKind === "tag_added" ? `the tag “${a.triggerValue}” is added` : "someone becomes a contact"}. Each person goes through once.</p>
        </div>
        <AutomationButtons id={a.id} enabled={a.enabled} />
      </div>
      <dl className="ad__tiles ad__tiles--4">
        <Tile label="In the chain" value={String(stats.active)} note="waiting for a step" />
        <Tile label="Finished" value={String(stats.completed)} note="went all the way" />
        <Tile label="Stopped early" value={String(stats.stopped)} note="matched a stop step" />
      </dl>
      <Panel title="Steps"><StepEditor id={a.id} initial={a.steps} /></Panel>
    </AreaGate>
  );
}
