import Link from "next/link";
import { getPortalRequest } from "@/lib/portal/session";
import { Panel } from "@/components/admin/bits";
import { NotifyForm } from "@/components/client/notify-form";
import { PasswordChange } from "@/components/account/password-change";
import { db } from "@/lib/db/pool";

/** Whether this person already has a password (they may have come in by link only). */
async function hasPassword(userId: string | undefined) {
  if (!userId) return true;
  return db.query(`SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential' AND "password" IS NOT NULL`, [userId])
    .then((r) => Boolean(r.rowCount)).catch(() => true);
}

export const metadata = { title: "Settings" };

export default async function PortalSettings() {
  const { client, session } = await getPortalRequest();
  if (!client) return null;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const withPassword = await hasPassword(userId);

  return (
    <div className="adDash">
      <header className="adDash__head">
        <div>
          <h1>Settings</h1>
          <p>Your details and how we reach you.</p>
        </div>
      </header>

      <Panel title="Profile">
        <dl className="ad__dl" style={{ display: "grid", gap: ".6rem", padding: "1rem" }}>
          <div><dt style={{ color: "var(--ad-dim)", fontSize: ".8rem" }}>Contact name</dt><dd style={{ margin: 0, fontWeight: 600 }}>{client.name}</dd></div>
          <div><dt style={{ color: "var(--ad-dim)", fontSize: ".8rem" }}>Company</dt><dd style={{ margin: 0, fontWeight: 600 }}>{client.company}</dd></div>
          <div><dt style={{ color: "var(--ad-dim)", fontSize: ".8rem" }}>Email</dt><dd style={{ margin: 0, fontWeight: 600 }}>{client.email}</dd></div>
          <div><dt style={{ color: "var(--ad-dim)", fontSize: ".8rem" }}>Phone</dt><dd style={{ margin: 0, fontWeight: 600 }}>{client.phone}</dd></div>
        </dl>
        <p style={{ padding: "0 1rem 1rem", fontSize: ".85rem", color: "var(--ad-dim)" }}>
          To change these details, ask us in <Link href="/portal/support">Support</Link> -- contact information is confirmed with you before it changes on our side.
        </p>
      </Panel>

      <Panel title={withPassword ? "Change password" : "Set a password"}>
        <div style={{ padding: "1rem" }}>
          <PasswordChange email={session?.user?.email ?? client.email} hasPassword={withPassword} />
        </div>
      </Panel>

      <Panel title="Notifications" dataTour="portal-notify">
        <div style={{ padding: "1rem" }}>
          <NotifyForm client={client} />
        </div>
      </Panel>
    </div>
  );
}
