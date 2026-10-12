import { KeyRound, MailPlus, ShieldCheck, Eye } from "lucide-react";
import { getClients } from "@/lib/admin/store";
import { db } from "@/lib/db/pool";
import { syncStore } from "@/lib/admin/persist";
import { adminRole } from "@/lib/admin/guard";
import { getAdminRequest } from "@/lib/admin/session";
import { AdminState } from "@/components/admin/admin-state";
import { RolesTable } from "@/components/admin/settings/roles-table";
import { UsersTable, UserInviteButton } from "@/components/admin/settings/users";
import { invitationsPage, userFilter, usersPage } from "@/lib/users/manage";
import { usersPulse } from "@/lib/users/pulse";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { ChoresMenu } from "@/components/admin/chores-menu";

export const metadata = { title: "Users" };

/**
 * USERS: accounts that need a person first (an invitation that expired unused, a client who never signed in), then
 * the studio team, client accounts and invitations as tabs with status chips, and the pulse of access in the rail.
 * Admin only. Every row action, the bulk bar and the export are the ones the page always had.
 */
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await adminRole() !== "owner") return <AdminState kind="forbidden" title="Users are managed by Admin" description="Ask Admin to invite people or change their access." back={{ href: "/admin/settings", label: "Back to settings" }} />;
  const f = userFilter(await searchParams);
  const { session } = await getAdminRequest();
  let accounts: Awaited<ReturnType<typeof usersPage>> | null = null;
  let invitations: Awaited<ReturnType<typeof invitationsPage>> | null = null;
  let pulse: Awaited<ReturnType<typeof usersPulse>>;
  try {
    await db.query(`SELECT 1 FROM user_security_notices LIMIT 0`);
    pulse = await usersPulse();
    if (f.tab === "invitations") invitations = await invitationsPage(f); else accounts = await usersPage(f);
  } catch { return <AdminState kind="error" title="Users could not be loaded" description="Check the database connection and apply migrations 0034 and 0036 in Settings › System, then reload." back={{ href: "/admin/settings/system", label: "Open system health" }} />; }
  if (accounts && f.tab === "clients") {
    await syncStore();
    const clients = getClients();
    accounts.rows = accounts.rows.map(user => ({ ...user, clientId: clients.find(client => !client.archived && !client.mergedInto && client.email?.trim().toLowerCase() === user.email.trim().toLowerCase())?.id }));
  }
  const result = accounts ?? invitations!;
  const now = nowMs();
  const href = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams();
    const base: Record<string, string> = { tab: f.tab === "team" ? "" : f.tab, q: f.search, role: f.role, status: f.status, size: f.size === 25 ? "" : String(f.size) };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) n.set(k, v);
    const s = n.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  /* THE DECK */
  const deck: DeckItem[] = [
    ...pulse.expired.map((i): DeckItem => ({
      id: `inv-${i.id}`, kind: "Invitation", urgency: `Expired ${dateWords(i.expires, now, false)}`, tone: "warn", label: "Invitations",
      title: `${i.name || i.email}'s invitation expired unused`,
      body: `It was sent on ${dateWords(i.sent, now, false)} for ${i.role === "owner" ? "an Admin" : `a ${i.role}`} role. The link no longer works.`,
      facts: [{ k: "Role", v: i.role === "owner" ? "Admin" : i.role[0].toUpperCase() + i.role.slice(1) }, { k: "Sent", v: dateWords(i.sent, now, false) }, { k: "Expired", v: dateWords(i.expires, now, false) }],
      why: "A new invitation replaces the old link.",
      primary: { label: "Send a new invitation", href: href({ tab: "invitations", status: "expired", q: i.email, page: undefined }) },
      open: href({ tab: "invitations", status: "expired", q: i.email }),
    })),
    ...pulse.never.map((c): DeckItem => ({
      id: `never-${c.id}`, kind: "Client account", urgency: `Created ${dateWords(c.created, now, false)}`, tone: "brand", label: "Clients",
      title: `${c.name || c.email} has never signed in`,
      body: "Their portal account exists, but they have not opened it. A password recovery email gives them a fresh way in.",
      facts: [{ k: "Email", v: c.email }, { k: "Created", v: dateWords(c.created, now, false) }],
      why: "Clients approve work and pay from the portal.",
      primary: { label: "Open their account", href: href({ tab: "clients", q: c.email, status: undefined, page: undefined }) },
      open: href({ tab: "clients", q: c.email }),
    })),
  ].slice(0, 8);

  const lede = <>{pulse.team.active} on the team, {pulse.clients.all} client {pulse.clients.all === 1 ? "account" : "accounts"}, {pulse.invites.pending + pulse.invites.expired} {pulse.invites.pending + pulse.invites.expired === 1 ? "invitation" : "invitations"}. <strong>Only Admin sees this page.</strong></>;

  const tabItems = [
    { key: "team", label: "Studio team", href: href({ tab: undefined, status: undefined, role: undefined, page: undefined, q: undefined }), count: pulse.team.all },
    { key: "clients", label: "Client accounts", href: href({ tab: "clients", status: undefined, role: undefined, page: undefined, q: undefined }), count: pulse.clients.all, tone: pulse.clients.never ? ("warn" as const) : undefined },
    { key: "invitations", label: "Invitations", href: href({ tab: "invitations", status: undefined, role: undefined, page: undefined, q: undefined }), count: pulse.invites.pending + pulse.invites.expired, tone: pulse.invites.expired ? ("warn" as const) : undefined },
  ];
  const c = f.tab === "team" ? pulse.team : f.tab === "clients" ? pulse.clients : null;
  const chipItems = c
    ? [{ key: "", label: "All", count: c.all }, { key: "active", label: "Active", count: c.active }, { key: "deactivated", label: "Deactivated", count: c.deactivated }]
    : [{ key: "", label: "All", count: pulse.invites.all }, { key: "pending", label: "Pending", count: pulse.invites.pending }, { key: "expired", label: "Expired", count: pulse.invites.expired }, { key: "redeemed", label: "Accepted", count: pulse.invites.redeemed }, { key: "revoked", label: "Cancelled", count: pulse.invites.revoked }];

  return (
    <>
      <PageHead title="Users" lede={lede} action={<UserInviteButton />}
        chores={<ChoresMenu label="users, more" items={[{ label: "Departments", href: "/admin/users/departments", icon: "layers" }, { label: "Settings", href: "/admin/settings", icon: "settings" }]} />} />
      <Workbench
        railLabel="Account pulse"
        rail={<>
          <RailHead title="Account pulse" />
          <StatTiles items={[
            { label: "On the team", value: String(pulse.team.active), note: pulse.team.deactivated ? `${pulse.team.deactivated} deactivated` : "Active", icon: ShieldCheck, tone: "good", href: href({ tab: undefined, status: "active", page: undefined, q: undefined }) },
            { label: "Client accounts", value: String(pulse.clients.all), note: pulse.clients.never ? `${pulse.clients.never} never signed in` : "All have signed in", noteTone: pulse.clients.never ? "accent" : undefined, icon: KeyRound, tone: "live", href: href({ tab: "clients", status: undefined, page: undefined, q: undefined }) },
            { label: "Invitations", value: String(pulse.invites.pending + pulse.invites.expired), note: pulse.invites.expired ? `${pulse.invites.expired} expired` : "None expired", noteTone: pulse.invites.expired ? "accent" : undefined, icon: MailPlus, tone: "warn", href: href({ tab: "invitations", status: undefined, page: undefined, q: undefined }) },
          ]} />
          <RailCard title="Support views" aside="Last 30 days">
            <p className="adRc__sub" style={{ whiteSpace: "normal" }}>Each one is read only and recorded with its reason.</p>
            <RailRows empty="Nobody has opened a support view in the last 30 days." rows={pulse.support.map((s, i) => ({ key: String(i), title: `${s.target}${s.role === "client" ? " as client" : s.role ? " as staff" : ""}`, sub: `${s.actor} · ${whenWords(s.at, now)}${s.reason ? ` · ${s.reason}` : ""}`, icon: Eye, tone: "neutral" as const }))} />
          </RailCard>
        </>}
      >
        <Deck id="users" title="Accounts this week" items={deck} emptyTitle="Every account is in order." emptyBody="No invitation has expired unused and every client has signed in at least once." emptyNext={{ label: "Invite someone", href: "/admin/users" }} />
        <section className="adList" aria-label="Accounts" data-tour="users-table">
          <div className="adList__hd">
            <h2>{f.tab === "team" ? "Studio team" : f.tab === "clients" ? "Client accounts" : "Invitations"}</h2><span className="adList__n">{result.total}</span><span className="adList__sp" />
            <UrlSearch label="Search users" placeholder="Name or email" />
          </div>
          <Tabs label="User groups" items={tabItems} current={f.tab} />
          <div className="adList__pad" style={{ paddingTop: ".75rem" }}><Chips label="Status" current={f.status} items={chipItems.map((x) => ({ key: x.key, label: x.label, count: x.count, href: href({ status: x.key || undefined, page: undefined }) }))} /></div>
          <UsersTable key={JSON.stringify(f)} filter={f} users={accounts?.rows ?? []} invites={invitations?.rows ?? []} total={result.total} page={result.page} me={session?.user.id ?? ""} />
        </section>
        <div className="adSetPad"><RolesTable /></div>
      </Workbench>
    </>
  );
}
