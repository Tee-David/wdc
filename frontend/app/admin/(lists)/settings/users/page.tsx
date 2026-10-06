import Link from "next/link";
import { getClients } from "@/lib/admin/store";
import { db } from "@/lib/db/pool";
import { syncStore } from "@/lib/admin/persist";
import { adminRole } from "@/lib/admin/guard";
import { getAdminRequest } from "@/lib/admin/session";
import { Panel } from "@/components/admin/bits";
import { AdminState } from "@/components/admin/admin-state";
import { RolesTable } from "@/components/admin/settings/roles-table";
import { UsersTable, UserInviteButton } from "@/components/admin/settings/users";
import { invitationsPage, userFilter, usersPage } from "@/lib/users/manage";

export const metadata = { title: "Users" };
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await adminRole() !== "owner") return <AdminState kind="forbidden" title="Users are managed by the owner" description="Ask an owner to invite people or change their access." back={{ href: "/admin/settings", label: "Back to settings" }} />;
  const f = userFilter(await searchParams);
  const { session } = await getAdminRequest();
  let accounts: Awaited<ReturnType<typeof usersPage>> | null = null;
  let invitations: Awaited<ReturnType<typeof invitationsPage>> | null = null;
  try { await db.query(`SELECT 1 FROM user_security_notices LIMIT 0`); if (f.tab === "invitations") invitations = await invitationsPage(f); else accounts = await usersPage(f); }
  catch { return <AdminState kind="error" title="Users could not be loaded" description="Check the database connection and apply migrations 0034 and 0036 in Settings › System, then reload." back={{ href: "/admin/settings/system", label: "Open system health" }} />; }
  if (accounts && f.tab === "clients") {
    await syncStore();
    const clients = getClients();
    accounts.rows = accounts.rows.map(user => ({...user,clientId:clients.find(client => !client.archived && !client.mergedInto && client.email?.trim().toLowerCase() === user.email.trim().toLowerCase())?.id}));
  }
  const result = accounts ?? invitations!;
  return <><div className="ad__head"><div><h1>Users</h1><p>Invite people, manage access and help them sign in.</p></div><UserInviteButton /></div>
    <nav className="ad__tabsNav" aria-label="User groups">{(["team", "invitations", "clients"] as const).map(tab => <Link key={tab} aria-current={tab === f.tab ? "page" : undefined} href={`/admin/settings/users?tab=${tab}`}>{tab[0].toUpperCase() + tab.slice(1)}</Link>)}</nav>
    <Panel title={f.tab === "team" ? "Studio team" : f.tab === "clients" ? "Client accounts" : "Invitations"}><UsersTable key={JSON.stringify(f)} filter={f} users={accounts?.rows ?? []} invites={invitations?.rows ?? []} total={result.total} page={result.page} me={session?.user.id ?? ""} /></Panel>
    <div className="adSetPad"><RolesTable /></div>
  </>;
}
