import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { Head } from "@/components/admin/settings/kit";
import { getLegalStates } from "@/lib/legal-store";
import { ENGAGEMENT_VERSION, LAWYER_APPROVED } from "@/lib/onboarding-engagement";

export const metadata = { title: "Policies" };

/** Every policy on the site, with who last changed it. Open one to edit its text, tabs and sections. */
export default async function PoliciesPage() {
  if (!can(await adminRole(), "content")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Policies are not part of your role" description="Ask an owner if you need to change the legal text." /></section>;
  }
  const states = await getLegalStates();
  return (
    <>
      <Head title="Policies" line="The legal text clients read and download. Edit the words, tabs and sections; the last-updated date follows each save." />
      <div className="ad__stack">
        <Panel title="Policies">
          <div className="ad__scroll">
            <table className="ad__t">
              <thead><tr><th>Policy</th><th>State</th><th>Last updated on the page</th><th><span className="ad__sr">Open</span></th></tr></thead>
              <tbody>
                {states.map(({ doc, edited }) => (
                  <tr key={doc.slug}>
                    <td><b>{doc.title}</b><small className="ad__dim">{doc.tabs ? `${doc.tabs.length} tabs, ${doc.sections.length} sections` : `${doc.sections.length} sections`}</small></td>
                    <td>{edited ? `Edited ${when(edited.at)} by ${edited.by}` : "As shipped"}</td>
                    <td>{doc.updated}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="adSet__links"><Link href={`/admin/settings/policies/${doc.slug}`}>Edit</Link><Link href={`/policies/${doc.slug}`} target="_blank">View</Link><a href={`/policies/${doc.slug}/pdf`}>PDF</a></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Lawyer approval">
          <div className="adPanelPad" style={{ display: "grid", gap: ".6rem" }}>
            <p style={{ margin: 0 }}>
              <span className={`ad__pill ad__pill--${LAWYER_APPROVED ? "good" : "warn"}`}>{LAWYER_APPROVED ? "Approved" : "Waiting on a lawyer"}</span>{" "}
              <span className={`ad__pill ad__pill--${process.env.ONBOARDING_ENGAGEMENT === "on" ? "good" : "flat"}`}>{process.env.ONBOARDING_ENGAGEMENT === "on" ? "Switched on" : "Switched off"}</span>
            </p>
            <p style={{ margin: 0 }}>The client engagement section of the onboarding forms (version {ENGAGEMENT_VERSION}) stays off the live forms until <b>both</b> are true: a qualified Nigerian lawyer has approved the text, and it is switched on for the site.</p>
            <p className="ad__dim" style={{ margin: 0, fontSize: ".9rem" }}>{LAWYER_APPROVED
              ? process.env.ONBOARDING_ENGAGEMENT === "on" ? "Clients see it and tick it at the end of their form." : "Approved, but not shown yet. Set ONBOARDING_ENGAGEMENT to on for the site to show it."
              : "Send the draft and these policies to the lawyer. When their version comes back, it is committed with the approval flag, and the section can then be switched on."}</p>
          </div>
        </Panel>
        <p className="ad__dim">These are drafts written for a lawyer to review. Before you change what a policy promises, check it still matches the signed agreement for any client it affects.</p>
      </div>
    </>
  );
}
