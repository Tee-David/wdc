import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { PageHead } from "@/components/admin/page-head";
import { NewFormForm } from "@/components/admin/forms/new-form";

export const metadata = { title: "New form" };

/** Start a form: a name and its address. The questions come next, in the builder. */
export default async function NewFormPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/forms", label: "Back to forms" }} title="Building forms is the owner's" description="Staff answer the entries of every form." /></section>;
  }
  return (
    <>
      <PageHead title="New form" crumbs={[{ href: "/admin/forms", label: "Forms" }]} lede={<>Name it and pick its address. <strong>You add the questions next.</strong></>} />
      <section className="adList adNewForm" aria-label="The form">
        <div className="adList__hd"><h2>The form</h2></div>
        <div className="adSetPad"><NewFormForm /></div>
      </section>
    </>
  );
}
