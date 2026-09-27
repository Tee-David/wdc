import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { hydrateSettings } from "@/lib/settings/store";
import { COMPANY_NAME, CONTACT_EMAIL, MOTTO, REGISTERED_NAME, REGISTRAR, REGISTRATION_NO, SITE_NAME } from "@/lib/site";
import { NETWORKS, shippedSocial, socialKey } from "@/lib/social";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";
import { Head } from "@/components/admin/settings/kit";
import { BusinessForm } from "@/components/admin/settings/business-form";

export const metadata = { title: "Business profile" };

/**
 * WHO THE STUDIO IS, as the site and every email say it.
 *
 * The registered details are READ HERE, NOT EDITED: they are the legal
 * identity the privacy policy and every email footer assert, they change only
 * when the registration does, and a typo in them is a false statement in a
 * legal document. They live in lib/site.ts. The social profiles are the
 * owner's to set: they fill the row of marks in every email's footer.
 */
export default async function BusinessSettingsPage() {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "settings")) {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="The business profile is for the owner" description="The studio's registered details and social profiles are changed by the owner." />
      </section>
    );
  }
  await hydrateSettings();
  const values = Object.fromEntries(NETWORKS.map((n) => [socialKey(n.network), getSetting(socialKey(n.network)) ?? shippedSocial(n.network)]));
  const facts: [string, string][] = [
    ["Trading name", SITE_NAME], ["Company name", COMPANY_NAME], ["Registered as", REGISTERED_NAME],
    ["Registration", REGISTRATION_NO], ["Registrar", REGISTRAR], ["Motto", MOTTO], ["Contact email", CONTACT_EMAIL],
  ];
  return (
    <>
      <Head title="Business profile" line="Who the studio is, as the site and every email say it." />
      <div className="ad__stack">
        <Panel title="Registered details" action={<span className="ad__pill ad__pill--flat">Read only</span>}>
          <dl className="adForms__dl">
            {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <p className="ad__dim ad__panelNote">These are the studio&apos;s legal identity, printed on the legal pages and in every email&apos;s footer. They change when the registration does, in the site&apos;s code, so a typo here can never become a false statement there.</p>
        </Panel>
        <BusinessForm values={values} />
      </div>
    </>
  );
}
