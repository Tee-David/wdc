import { SecurityEmailPreference } from "@/components/admin/settings/security-email-preference";
import { ClientProfilePreference } from "@/components/client/profile-preference";
import { getPortalRequest } from "@/lib/portal/session";
import { Panel } from "@/components/admin/bits";
import { NotifyForm, ProfileForm, SignInCard } from "@/components/client/settings-forms";
import { db } from "@/lib/db/pool";
import { listDevices } from "@/lib/auth/devices";
import "@/components/admin/settings/settings.css";
import "@/components/client/portal.css";

/** Whether this person already has a password (they may have come in by link only). */
async function hasPassword(userId: string | undefined) {
  if (!userId) return true;
  return db.query(`SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential' AND "password" IS NOT NULL`, [userId])
    .then((r) => Boolean(r.rowCount)).catch(() => true);
}

export const metadata = { title: "Settings" };

/**
 * THE CLIENT'S SETTINGS, as PSettings.dc.html draws them: the profile on the
 * left, what we email them about and how they sign in on the right.
 */
export default async function PortalSettings() {
  const { client, session, support } = await getPortalRequest();
  if (!client) return null;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const withPassword = await hasPassword(userId);
  const devices = userId && !support ? await listDevices(userId, (session as { session?: { id?: string } } | null)?.session?.id) : [];

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Settings</h1>
          <p>Your details and how we reach you.</p>
        </div>
      </header>

      <div className="pSet">
        <Panel title="Profile">
          <p className="pSet__sub ad__dim">Used on invoices and in every message we send.</p>
          <ProfileForm client={client} />
        </Panel>
        <div className="pSet__side">
          {!support && userId ? <ClientProfilePreference userId={userId} name={session?.user.name??client.name} /> : null}
          <Panel title="Notifications" dataTour="portal-notify">
            <p className="pSet__sub ad__dim">Every one of these can be switched off.</p>
            <NotifyForm client={client} />
          </Panel>
          {!support && userId ? <SecurityEmailPreference userId={userId} /> : null}
          <Panel title="Sign-in" dataTour="portal-signin">
            {support ? <p>Sign-in settings are private and cannot be changed in a support view.</p> : <SignInCard email={session?.user?.email ?? client.email} hasPassword={withPassword} devices={devices} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
