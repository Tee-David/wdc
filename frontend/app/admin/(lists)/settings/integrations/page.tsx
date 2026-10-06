import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { IntegrationsPanel } from "@/components/admin/integrations-panel";
import { PaystackForm } from "@/components/admin/settings/paystack-form";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import { paystackConfig } from "@/lib/paystack";

export const metadata = { title: "Integrations" };

/** What each outside service is, not what it will be: configured, missing, not built or manual. */
export default async function IntegrationsPage() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Integrations are for the owner" description="The services the site depends on, and whether each is set up." /></section>;
  }
  let mode:Awaited<ReturnType<typeof selectedPaystackMode>>;
  try { mode=await selectedPaystackMode(); } catch { return <AdminState kind="error" title="Payment settings unavailable" description="Check the database before changing payment mode." back={{href:"/admin/settings/system",label:"Open system health"}} />; }
  return (
    <>
      <div className="ad__head"><div><h1>Integrations</h1><p>Keys live in the hosting environment, never here.</p></div></div>
      <IntegrationsPanel />
      <PaystackForm mode={mode} testReady={paystackConfig("test").ok} liveReady={paystackConfig("live").ok} />
    </>
  );
}
