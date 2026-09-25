import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { invitationsConfigured, invitationsFor, inviteState } from "@/lib/invitations";
import { listTeam, type TeamMember } from "@/lib/team";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel, when } from "@/components/admin/bits";
import { InvitationRow, InviteStaffForm, MemberControls } from "@/components/admin/settings/team-controls";

export const metadata = { title: "Team" };

const time = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })
  : "Never";

/**
 * Who can reach the admin (WordPress's Users screen, cut to what a studio
 * needs): the owners and staff, when each last signed in, and the changes an
 * owner makes to somebody else's access. Clients are on their own records.
 */
export default async function TeamPage() {
  if (!can(await adminRole(), "team")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="The team is the owner's" description="Who can reach the admin, and what they can do." /></section>;
  }
  if (!invitationsConfigured()) {
    return <section className="ad__panel"><AdminState kind="error" title="The accounts database is not connected" description="COCKROACHDB_URL is not set, so there are no accounts to show." /></section>;
  }
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  const me = (session?.user as { id?: string } | undefined)?.id ?? "";
  let team: TeamMember[] = [];
  let invites: Awaited<ReturnType<typeof invitationsFor>> = [];
  let failed = false;
  try { [team, invites] = await Promise.all([listTeam(), invitationsFor({ role: "staff", limit: 50 })]); } catch { failed = true; }
  const pending = invites.filter((i) => inviteState(i) === "pending");

  return (
    <>
      <div className="ad__head"><div><h1>Team</h1><p>Who can reach the admin. Staff run the day&apos;s work; owners can do everything, including this page.</p></div></div>
      {failed ? (
        <AdminState kind="error" title="The team could not be loaded" description="The database did not answer. Reload in a minute." />
      ) : (
        <div className="ad__stack">
          <Panel title={`${team.filter((t) => !t.deactivatedAt).length} with access`}>
            {team.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>Who</th><th>Role</th><th>Last signed in</th><th>Signed in now</th><th>Actions</th></tr></thead>
                  <tbody>
                    {team.map((m) => (
                      <tr key={m.id}>
                        <td><b>{m.name}</b><small>{m.email}</small></td>
                        <td>
                          <span className={`ad__pill ${m.role === "owner" ? "ad__pill--live" : "ad__pill--flat"}`}>{m.role === "owner" ? "Owner" : "Staff"}</span>
                          {m.deactivatedAt ? <small><span className="ad__pill ad__pill--bad">Deactivated</span> {when(m.deactivatedAt)}{m.deactivatedBy ? ` by ${m.deactivatedBy}` : ""}</small> : null}
                        </td>
                        <td>{time(m.lastSignIn)}</td>
                        <td className="num">{m.sessions ? `${m.sessions} ${m.sessions === 1 ? "session" : "sessions"}` : "No"}</td>
                        <td>
                          {m.id === me
                            ? <span className="ad__pill ad__pill--flat">You</span>
                            : <MemberControls id={m.id} name={m.name} role={m.role} active={!m.deactivatedAt} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No accounts yet">The first owner is made with the seed script; everybody else is invited from here.</Empty>
            )}
          </Panel>

          <Panel title="Invite a member of staff">
            <div style={{ padding: "0 1rem 1rem" }}><InviteStaffForm /></div>
          </Panel>

          <Panel title={`Invitations waiting (${pending.length})`}>
            {pending.length ? (
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>Who</th><th>Sent</th><th>Works until</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pending.map((i) => (
                      <tr key={i.id}>
                        <td><b>{i.name}</b><small>{i.email}</small></td>
                        <td>{when(i.createdAt)} by {i.invitedBy}</td>
                        <td>{when(i.expiresAt)}</td>
                        <td><InvitationRow id={i.id} name={i.name} email={i.email} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Nobody is waiting">An invitation works once, for a week, and only for the address it was sent to. Sending another withdraws the first.</Empty>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
