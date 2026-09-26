import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { invitationsConfigured, invitationsFor, inviteState } from "@/lib/invitations";
import { listTeam, type TeamMember } from "@/lib/team";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { InvitationRow, InviteStaffForm, MemberControls } from "@/components/admin/settings/team-controls";
import { RolesTable } from "@/components/admin/settings/roles-table";

export const metadata = { title: "Team and roles" };

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
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="The team is the owner's" description="Who can reach the admin, and what they can do." /></section>;
  }
  if (!invitationsConfigured()) {
    return <section className="ad__panel"><AdminState kind="error" title="The accounts database is not connected" description="COCKROACHDB_URL is not set, so there are no accounts to show." /></section>;
  }
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  const user = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;
  const me = user?.id ?? "";
  let team: TeamMember[] = [];
  let invites: Awaited<ReturnType<typeof invitationsFor>> = [];
  let failed = false;
  try {
    const [t, staff, owners] = await Promise.all([listTeam(), invitationsFor({ role: "staff", limit: 50 }), invitationsFor({ role: "owner", limit: 50 })]);
    team = t;
    invites = [...staff, ...owners].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch { failed = true; }
  const pending = invites.filter((i) => inviteState(i) === "pending");
  /* YOU, FIRST, ALWAYS. The page read "0 with access" to an owner who was
     plainly signed in, because an account made from the environment has no
     row of its own. The session is the truth about who is here, so it is
     listed from the session when the table does not have it. */
  const mine = team.find((t) => t.id === me);
  const rows: (TeamMember & { you?: boolean; fromSession?: boolean })[] = [
    ...(mine ? [{ ...mine, you: true }] : user?.email ? [{
      id: me, name: user.name || user.email, email: user.email, role: (user.role === "staff" ? "staff" : "owner") as TeamMember["role"],
      createdAt: "", lastSignIn: null, sessions: 1, deactivatedAt: null, deactivatedBy: null, you: true, fromSession: true,
    }] : []),
    ...team.filter((t) => t.id !== me),
  ];

  return (
    <>
      <div className="ad__head"><div><h1>Team and roles</h1><p>Who can open the admin.</p></div></div>
      {failed ? (
        <AdminState kind="error" title="The team could not be loaded" description="The database did not answer. Reload in a minute." />
      ) : (
        <div className="ad__stack">
          <Panel title="Invite someone">
            <div className="adSetPad">
              <InviteStaffForm />
              {/* The waiting list only takes space when someone is waiting. */}
              {!pending.length ? <p className="ad__dim adTeam__none">No invitations waiting.</p> : null}
              <RolesTable />
            </div>
          </Panel>

          <Panel title={`${rows.filter((t) => !t.deactivatedAt).length} with access`}>
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>Who</th><th>Role</th><th>Last signed in</th><th>Signed in now</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td><b>{m.name}</b><small>{m.email}</small></td>
                      <td>
                        <span className={`ad__pill ${m.role === "owner" ? "ad__pill--live" : "ad__pill--flat"}`}>{m.role === "owner" ? "Owner" : "Staff"}</span>
                        {m.deactivatedAt ? <small><span className="ad__pill ad__pill--bad">Deactivated</span> {when(m.deactivatedAt)}{m.deactivatedBy ? ` by ${m.deactivatedBy}` : ""}</small> : null}
                      </td>
                      <td>{m.fromSession ? "Signed in now" : time(m.lastSignIn)}</td>
                      <td className="num">{m.fromSession ? "This session" : m.sessions ? `${m.sessions} ${m.sessions === 1 ? "session" : "sessions"}` : "No"}</td>
                      <td>
                        {m.you
                          ? <span className="ad__pill ad__pill--brand">You</span>
                          : <MemberControls id={m.id} name={m.name} role={m.role} active={!m.deactivatedAt} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {pending.length ? (
            <Panel title={`Invitations waiting (${pending.length})`}>
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>Who</th><th>Role</th><th>Sent</th><th>Works until</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pending.map((i) => (
                      <tr key={i.id}>
                        <td><b>{i.name}</b><small>{i.email}</small></td>
                        <td><span className={`ad__pill ${i.role === "owner" ? "ad__pill--live" : "ad__pill--flat"}`}>{i.role === "owner" ? "Owner" : "Staff"}</span></td>
                        <td className="ad__nowrap">{when(i.createdAt)}<small>by {i.invitedBy}</small></td>
                        <td>{when(i.expiresAt)}</td>
                        <td><InvitationRow id={i.id} name={i.name} email={i.email} role={i.role === "owner" ? "owner" : "staff"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </>
  );
}
