import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";
import { NewFormForm } from "@/components/admin/forms/new-form";

export const metadata = { title: "New form" };

/** Start a form: a name and its address. The questions come next, in the builder. */
export default async function NewFormPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/forms", label: "Back to forms" }} title="Building forms is the owner's" description="Staff answer the entries of every form." /></section>;
  }
  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/forms">Forms</Link></p>
          <h1>New form</h1>
          <p>Name it and pick its address. You add the questions next.</p>
        </div>
      </div>
      <Panel title="The form">
        <div className="adSetPad"><NewFormForm /></div>
      </Panel>
    </>
  );
}
