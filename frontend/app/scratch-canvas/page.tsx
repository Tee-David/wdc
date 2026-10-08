import "@/components/admin/admin.css";
import { AutomationCanvas } from "@/components/admin/email/automation-canvas";
import { ToastHost } from "@/components/admin/toast";
import { ConfirmHost } from "@/components/admin/confirm";
import type { Step } from "@/lib/automations-flow";

const rid = (s: string) => s;
const steps: Step[] = [
  { id: rid("a1"), type: "email", name: "Welcome email", subject: "Welcome, {{contact.first_name | \"friend\"}}", design: { subject: "", preheader: "", heading: "", blocks: [{ id: "b1", type: "text", text: "Thanks for joining." }] } },
  { id: "a2", type: "wait", days: 3, hours: 0, weekdays: [], hour: null },
  { id: "a3", type: "if", tag: "client", yes: [{ id: "a4", type: "stop" }], no: [
    { id: "a5", type: "email", name: "Our best work", subject: "", design: { subject: "", preheader: "", heading: "", blocks: [{ id: "b2", type: "text", text: "A few projects." }] } },
    { id: "a6", type: "tag", tag: "nurtured", remove: false },
  ] },
];

export default async function Scratch({ searchParams }: { searchParams: Promise<{ dark?: string; empty?: string }> }) {
  const sp = await searchParams;
  return (
    <div className={`ad${sp.dark ? " dark" : ""}`} style={{ padding: 16 }}>
      <AutomationCanvas id="x" name="Welcome series" kind="marketing" triggerKind="tag_added" triggerValue="newsletter" enabled={false} everOn={false}
        steps={sp.empty ? [] : steps} tags={[{ tag: "client", n: 38 }, { tag: "newsletter", n: 912 }, { tag: "nurtured", n: 4 }]}
        contacts={[{ id: "c1", label: "Tunde (tunde@example.com)" }]} totals={{ active: 12, completed: 20, stopped: 6 }} results={{ reached: { a1: 38, a2: 31, a3: 19 }, upNext: { a3: 4 } }} />
      <ToastHost /><ConfirmHost />
    </div>
  );
}
