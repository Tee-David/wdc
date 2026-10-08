import Link from "next/link";
import { SecurityEmailPreference } from "@/components/admin/settings/security-email-preference";
import { adminRole } from "@/lib/admin/guard";
import { PasswordChange } from "@/components/account/password-change";
import { getAdminRequest } from "@/lib/admin/session";
import { db } from "@/lib/db/pool";
import { AdminState } from "@/components/admin/admin-state";
import { Panel } from "@/components/admin/bits";
import { MyNameForm, SignOutOne, SignOutOthers, UnlinkGoogle } from "@/components/admin/settings/account-controls";

export const metadata = { title: "My account" };

const time = (d: Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/** "Chrome on Windows" from a user agent: enough to recognise a session, no more. */
function device(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

/**
 * The signed-in person's own account (WordPress's Profile screen). Open to
 * every admin role, because it only ever changes the account asking.
 */
export default async function AccountPage() {
  if (!(await adminRole())) {
    return <section className="ad__panel"><AdminState kind="forbidden" action={<Link className="ad__btn ad__btn--primary" href="/login?redirect=%2Fadmin%2Fsettings%2Faccount">Log in</Link>} title="Sign in to see your account" description="This page is about the account you are signed in with." /></section>;
  }
  const { capture, session } = await getAdminRequest();
  const head = <div className="ad__head"><div><h1>My account</h1><p>Your profile, password and devices.</p></div></div>;
  if (capture || !session?.session) {
    return <>{head}<section className="ad__panel"><AdminState kind="forbidden" action={<Link className="ad__btn" href="/admin/settings">Back to settings</Link>} title="This is a preview session" description="There is no real account behind it, so there is nothing to change. Sign in to manage your own." /></section></>;
  }
  const userId = session.user.id;
  const current = session.session.id;
  let sessions: { id: string; createdAt: Date; userAgent: string | null; ipAddress: string | null }[] = [];
  let methods: { providerId: string; hasPassword: boolean }[] = [];
  let failed = false;
  try {
    const [s, a] = await Promise.all([
      db.query<{ id: string; createdAt: Date; userAgent: string | null; ipAddress: string | null }>(
        `SELECT "id", "createdAt", "userAgent", "ipAddress" FROM "session" WHERE "userId" = $1 AND "expiresAt" > now() ORDER BY "createdAt" DESC LIMIT 50`, [userId]),
      db.query<{ providerId: string; hasPassword: boolean }>(`SELECT "providerId", ("password" IS NOT NULL) AS "hasPassword" FROM "account" WHERE "userId" = $1`, [userId]),
    ]);
    sessions = s.rows; methods = a.rows;
  } catch { failed = true; }
  const hasPassword = methods.some((m) => m.providerId === "credential" && m.hasPassword);
  const hasGoogle = methods.some((m) => m.providerId === "google");

  return (
    <>
      {head}
      <div className="ad__stack">
        <Panel title="Name">
          <div style={{ padding: "0 1rem 1rem" }}>
            <p className="ad__dim" style={{ marginBottom: ".6rem" }}>Signed in as {session.user.email}. Your email identifies your account and linked records. Contact the studio if it needs correcting.</p>
            <MyNameForm name={session.user.name} />
          </div>
        </Panel>

        <Panel title="Sign-in methods">
          {failed ? <AdminState kind="error" title="Could not load your sign-in methods" description="The database did not answer. Reload in a minute." /> : (
            <dl className="adForms__dl">
              <div><dt>Password</dt><dd>{hasPassword ? "Set" : "Not set yet. Set one below."}</dd></div>
              <div><dt>Emailed link</dt><dd>Always available, to {session.user.email}</dd></div>
              <div><dt>Google</dt><dd>
                {hasGoogle ? (
                  <span className="ad__row">Linked {hasPassword ? <UnlinkGoogle /> : <small className="ad__dim">Set a password before you can unlink it.</small>}</span>
                ) : "Not linked"}
              </dd></div>
            </dl>
          )}
        </Panel>

        <Panel title={hasPassword ? "Change password" : "Set a password"}>
          <div className="adSetPad"><PasswordChange email={session.user.email} hasPassword={hasPassword} /></div>
        </Panel>

        <Panel title={`Signed in on ${sessions.length} of 5 devices`} action={<span className="ad__dim adSet__aside">A sixth sign-in signs out the oldest</span>}>
          {sessions.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Device</th><th>Signed in</th><th>From</th><th><span className="ad__sr">Sign out</span></th></tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td><b>{device(s.userAgent)}</b>{s.id === current ? <small><span className="ad__pill ad__pill--good">This session</span></small> : null}</td>
                      <td>{time(s.createdAt)}</td>
                      <td>{s.ipAddress || "Unknown"}</td>
                      <td>{s.id === current ? <small className="ad__dim">This device</small> : <SignOutOne id={s.id} label={device(s.userAgent)} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {sessions.length > 1 ? <div style={{ padding: "0 1rem 1rem" }}><SignOutOthers /></div> : null}
        </Panel>

        <SecurityEmailPreference userId={userId} />

        <Panel title="Tours">
          <p className="ad__dim" style={{ padding: "0 1rem 1rem" }}>Replay any tour from the question mark at the top of every page.</p>
        </Panel>
      </div>
    </>
  );
}
