import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { IntegrationsPanel } from "@/components/admin/integrations-panel";

export const metadata = { title: "Integrations" };

/** What each outside service is, not what it will be: configured, missing, not built or manual. */
export default async function IntegrationsPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Integrations are for the owner" description="The services the site depends on, and whether each is set up." /></section>;
  }
  return (
    <>
      <div className="ad__head"><div><h1>Integrations</h1><p>Each outside service, and whether it is set up. Nothing here claims to be working without a check.</p></div></div>
      <IntegrationsPanel />
    </>
  );
}
