import Link from "next/link";
import { Bell, KeyRound, UserRound } from "lucide-react";
import { SecurityEmailPreference } from "@/components/admin/settings/security-email-preference";
import { PersonalNotificationPreferences } from "@/components/workspace/personal-preferences";
import { ClientProfilePreference } from "@/components/client/profile-preference";
import { getPortalRequest } from "@/lib/portal/session";
import { Panel } from "@/components/admin/bits";
import { PageHead } from "@/components/admin/page-head";
import { Tabs } from "@/components/admin/tabs";
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

const SECTIONS = [
  { key: "profile", label: "Profile", Icon: UserRound },
  { key: "notifications", label: "Notifications", Icon: Bell },
  { key: "signin", label: "Sign-in and devices", Icon: KeyRound },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

/**
 * THE CLIENT'S SETTINGS, as C-Settings draws them: the same Settings layout
 * as the studio's, a section menu beside the page on a wide screen and tabs
 * on a phone, and changes that wait for the shared save bar.
 *
 * ponytail: the board's "People at your business" needs clients to invite
 * their own colleagues; project access is still granted by Admin, so the
 * section waits until that is decided.
 */
export default async function PortalSettings({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { client, session, support, isPrimaryContact } = await getPortalRequest();
  if (!client) return null;
  const sp = await searchParams;
  const section: Section = SECTIONS.some((x) => x.key === sp.s) ? sp.s as Section : "profile";
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const withPassword = section === "signin" ? await hasPassword(userId) : true;
  const devices = section === "signin" && userId && !support ? await listDevices(userId, (session as { session?: { id?: string } } | null)?.session?.id) : [];
  const at = (k: Section) => (k === "profile" ? "/portal/settings" : `/portal/settings?s=${k}`);

  return (
    <>
      <PageHead title="Settings" lede={<>Your details, what we send you and how you sign in. <strong>Changes wait for Save.</strong></>} />
      <div className="pSet__tabs"><Tabs label="Settings sections" current={section} items={SECTIONS.map((x) => ({ key: x.key, label: x.label, href: at(x.key) }))} /></div>
      <div className="adSet">
        <nav className="adSet__nav" aria-label="Settings sections">
          <ul>
            {SECTIONS.map(({ key, label, Icon }) => (
              <li key={key}>
                <Link href={at(key)} aria-current={section === key ? "page" : undefined}>
                  <Icon aria-hidden="true" className="adSet__glyph" />
                  <span className="adSet__text"><b>{label}</b></span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="adSet__main pSet__main">
          {section === "profile" ? (
            <>
              {isPrimaryContact ? (
                <Panel title="Your details">
                  <p className="pSet__sub ad__dim">Used on invoices and in every message we send.</p>
                  <ProfileForm client={client} />
                </Panel>
              ) : (
                <Panel title="Project access"><p className="pSet__sub">You can see the projects you have been invited to. Admin manages project access; company details belong to the main contact.</p></Panel>
              )}
              {isPrimaryContact && !support && userId ? <ClientProfilePreference userId={userId} name={session?.user.name ?? client.name} /> : null}
            </>
          ) : null}
          {section === "notifications" ? (
            <>
              <PersonalNotificationPreferences />
              {isPrimaryContact ? (
                <Panel title="Emails from the studio" dataTour="portal-notify">
                  <p className="pSet__sub ad__dim">Every one of these can be switched off.</p>
                  <NotifyForm client={client} />
                </Panel>
              ) : null}
              {!support && userId ? <SecurityEmailPreference userId={userId} /> : null}
            </>
          ) : null}
          {section === "signin" ? (
            <Panel title="Sign-in" dataTour="portal-signin">
              {support ? <p className="pSet__sub">Sign-in settings are private and cannot be changed in a support view.</p> : <SignInCard email={session?.user?.email ?? client.email} hasPassword={withPassword} devices={devices} />}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
