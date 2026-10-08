import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { Head } from "@/components/admin/settings/kit";
import { getLegalStates } from "@/lib/legal-store";

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
                      <Link href={`/admin/settings/policies/${doc.slug}`}>Edit</Link> · <Link href={`/policies/${doc.slug}`} target="_blank">View</Link> · <a href={`/policies/${doc.slug}/pdf`}>PDF</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <p className="ad__dim">These are drafts written for a lawyer to review. Before you change what a policy promises, check it still matches the signed agreement for any client it affects.</p>
      </div>
    </>
  );
}
