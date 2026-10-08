import Link from "next/link";
import { Palette } from "lucide-react";
import AreaGate from "@/components/admin/owner-only";
import { Panel } from "@/components/admin/bits";
import { EMAIL_KINDS } from "@/lib/email-registry";
import { getSaved } from "@/lib/email-design-store";

export const metadata = { title: "Email" };

const TABS = [["templates", "Templates"]] as const;

/**
 * EMAIL: the studio's mail in one place. Contacts, campaigns, automations and
 * reports join this page as they are built; today it holds the designs of the
 * emails the studio sends. Owner only.
 */
export default async function EmailPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current = TABS.find(([k]) => k === tab)?.[0] ?? "templates";
  const saved = await Promise.all(EMAIL_KINDS.map((k) => getSaved(k.key)));
  return (
    <AreaGate area="settings" what="Email">
      <div className="ad__head">
        <div>
          <h1>Email</h1>
          <p>Design the emails the studio sends, then switch each design on when you are happy with it.</p>
        </div>
      </div>
      <nav className="ad__tabsNav" aria-label="Email sections">
        {TABS.map(([k, label]) => <Link key={k} href={`/admin/email?tab=${k}`} aria-current={k === current ? "page" : undefined}>{label}</Link>)}
      </nav>
      <Panel title="Emails you can design" dataTour="email-templates">
        <div className="ad__scroll" data-lenis-prevent>
          <table className="ad__t">
            <thead><tr><th>Email</th><th>Sent to</th><th>Design</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
            <tbody>
              {EMAIL_KINDS.map((k, i) => {
                const s = saved[i];
                return (
                  <tr key={k.key}>
                    <td><Link href={`/admin/email/templates/${k.key}`}><b>{k.name}</b></Link><small style={{ display: "block", color: "var(--ad-dim)" }}>{k.line}</small></td>
                    <td>{k.audience === "client" ? "Clients" : k.audience === "subscriber" ? "Subscribers" : "Visitors"}</td>
                    <td>{s ? <span className={`ad__pill ${s.enabled ? "ad__pill--good" : "ad__pill--flat"}`}>{s.enabled ? "Your design is on" : "Saved, switched off"}</span> : <span className="ad__pill ad__pill--flat">Built-in</span>}</td>
                    <td className="ad__rmC"><Link className="ad__btn" href={`/admin/email/templates/${k.key}`}><Palette aria-hidden="true" /> {s ? "Edit" : "Design"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="ad__dim" style={{ marginTop: ".9rem" }}>Invoices, receipts and reminders keep their built-in design for now, because they carry the money lines.</p>
    </AreaGate>
  );
}
