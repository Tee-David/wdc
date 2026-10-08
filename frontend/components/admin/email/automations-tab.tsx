import Link from "next/link";
import { Workflow } from "lucide-react";
import { Empty, Panel } from "../bits";
import { NewAutomation } from "./automation-ui";
import { listAutomations } from "@/lib/automations";
import { countSteps } from "@/lib/automations-flow";

/** The list of automations. A row opens the canvas. */
export async function AutomationsTab() {
  const list = await listAutomations();
  if (!list) return <Empty title="Automations are not set up yet" icon={Workflow}>Apply migration 0047 in Settings › System, then reload.</Empty>;
  return (
    <Panel title="Automations" action={<NewAutomation />}>
      {list.length ? (
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>Automation</th><th>Starts when</th><th>State</th><th className="num">Steps</th></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/admin/email/automations/${a.id}`}><b>{a.name}</b></Link></td>
                <td className="ad__dim">{a.triggerKind === "tag_added" ? `Tag “${a.triggerValue}” is added` : "Someone becomes a contact"}</td>
                <td><span className={`ad__pill ${a.enabled ? "ad__pill--good" : "ad__pill--flat"}`}>{a.enabled ? "On" : a.enabledAt ? "Off" : "Draft"}</span></td>
                <td className="num">{countSteps(a.steps)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <Empty title="No automations yet" icon={Workflow} action={<NewAutomation />}>A chain that welcomes new people or follows up after a tag: wait, email, tag, check a tag and split into Yes and No.</Empty>}
    </Panel>
  );
}
