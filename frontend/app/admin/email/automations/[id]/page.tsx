import { notFound } from "next/navigation";
import AreaGate from "@/components/admin/owner-only";
import { AutomationCanvas } from "@/components/admin/email/automation-canvas";
import { getAutomation, statsFor, stepResults, testContacts } from "@/lib/automations";
import { allTags } from "@/lib/contacts";

export const metadata = { title: "Automation" };

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAutomation(id);
  if (!a) notFound();
  const [totals, results, tags, contacts] = await Promise.all([statsFor(id), stepResults(id, a.steps), allTags(), testContacts()]);
  return (
    <AreaGate area="settings" what="Email">
      <h1 className="ad__sr">Automation: {a.name}</h1>
      <AutomationCanvas id={a.id} name={a.name} kind={a.kind} triggerKind={a.triggerKind} triggerValue={a.triggerValue}
        enabled={a.enabled} everOn={Boolean(a.enabledAt)} steps={a.steps} tags={tags} contacts={contacts} totals={totals} results={results} />
    </AreaGate>
  );
}
