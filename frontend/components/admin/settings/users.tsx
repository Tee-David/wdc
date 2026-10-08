"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Download, Pencil, LogOut, KeyRound, UserRound, Eye, Ban } from "lucide-react";
import { Pick } from "../pick";
import { BulkBar, PickAll, RowPick } from "../bulk";
import { Pager } from "../pager";
import { RowMenu, type RowMenuItem } from "../row-menu";
import { DialogButton } from "../dialog";
import { Actions, Fields, Field, Area, Form, Hidden, Submit } from "../form";
import { InviteStaffForm } from "./team-controls";
import { startClientSupport } from "@/lib/users/support-actions";
import { manageUser, recoverUser } from "@/lib/admin/user-actions";
import { revokeInvite, resendUserInvite } from "@/lib/admin/invite-actions";
import type { UserFilter, UserRow, InviteRow } from "@/lib/users/manage";
import "./users.css";

export function UserInviteButton() {
  return <DialogButton label="Invite user" title="Invite user" tone="primary" icon={UserPlus}>{() => <InviteStaffForm />}</DialogButton>;
}
function time(date: string | null) { return date ? new Date(date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "Not recorded"; }
function url(f: UserFilter, extra: Record<string, string>) {
  return `/admin/users?${new URLSearchParams({ tab: f.tab, q: f.search, role: f.role, status: f.status, size: String(f.size), page: String(f.page), ...extra })}`;
}
function accountItems(u: UserRow): RowMenuItem[] {
  const action = (change: string, label: string, explanation: string, danger = false): RowMenuItem => ({ kind: "dialog", label, title: `${label}: ${u.name}`, icon: danger ? Ban : LogOut, tone: danger ? "danger" : undefined, area: "team", render: close => <Form action={manageUser} onDone={close} confirm={explanation}><Hidden name="id" value={u.id} /><Hidden name="change" value={change} /><p>{explanation}</p><Actions><Submit>{label}</Submit></Actions></Form> });
  return [
    ...(u.role === "client" && u.active && u.clientId ? [{kind:"dialog" as const,label:"View as client",title:"Read-only client support",icon:Eye,render:() => <Form action={startClientSupport}><p>View this client&apos;s portal for up to 15 minutes. Changes, payments, security settings and downloads are disabled. Your owner session stays signed in.</p><p>Sign in again first if your session started more than 15 minutes ago.</p><Hidden name="targetId" value={u.id} /><Hidden name="clientId" value={u.clientId!} /><Area name="reason" label="Support reason" required hint="Keep it brief and avoid sensitive details." /><Actions><Submit>Start support view</Submit></Actions></Form>}] : []),
    { kind: "link", label: "Activity and sessions", href: `/admin/users/${encodeURIComponent(u.id)}`, icon: UserRound },
    { kind: "dialog", label: "Account details", title: u.name, icon: UserRound, render: () => <div className="ad__stack"><p>{u.email}</p><p><b>{u.role === "client" ? "Client" : u.role === "owner" ? "Owner" : "Staff"}</b> · {u.active ? "Active" : "Deactivated"}</p><p>Sign-in methods: {[u.password && "Password", u.google && "Google", "Email link"].filter(Boolean).join(", ")}</p><p>{u.sessions} active sessions. Last sign-in: {time(u.lastSignIn)}.</p><p>Email is verified identity. Email changes need verification and portal-link review. Contact the studio to correct an address.</p></div> },
    { kind: "dialog", label: "Edit name", title: `Edit ${u.name}`, icon: Pencil, render: close => <Form action={manageUser} onDone={close}><Hidden name="id" value={u.id} /><Hidden name="change" value="rename" /><Fields><Field name="name" label="Name" required defaultValue={u.name} /></Fields><Actions><Submit>Save name</Submit></Actions></Form> },
    ...(u.active ? [
      { kind: "dialog" as const, label: "Send password recovery", title: `Recover ${u.name}'s account`, icon: KeyRound, render: (close: () => void) => <Form action={recoverUser} onDone={close}><Hidden name="id" value={u.id} /><p>A secure reset link goes to {u.email}. You never see or choose their password.</p><Actions><Submit>Queue recovery</Submit></Actions></Form> },
      action("signout", "Sign out everywhere", "All active sessions end. They can sign back in."),
      ...(u.role !== "client" ? [action(u.role === "owner" ? "staff" : "owner", u.role === "owner" ? "Make staff" : "Make owner", "This changes their access and ends their sessions. Owner access includes finance, settings and users.")] : []),
      action("deactivate", "Deactivate", "Access ends now. Their historical work remains. Reactivate to restore sign-in.", true),
    ] : [action("reactivate", "Reactivate", "Restore this account's ability to sign in.")]),
  ];
}

export function UsersTable({ filter: f, users, invites, total, page, me }: { filter: UserFilter; users: UserRow[]; invites: InviteRow[]; total: number; page: number; me: string }) {
  const router = useRouter();
  const invitation = f.tab === "invitations";
  const current = { ...f, page };
  const target = `users-table-${f.tab}`;
  const exportUrl = (format: string, scope: string) => `/api/admin/users/export?${new URLSearchParams({ tab: f.tab, q: f.search, role: f.role, status: f.status, size: String(f.size), page: String(page), format, scope, ...(scope === "selected" ? { ids: [...(document.getElementById(target)?.querySelectorAll<HTMLInputElement>(".adRowPick:checked") ?? [])].map(input => input.value).join(",") } : {}) })}`;
  return <>
    <form method="get" className="adUsers__filters"><input type="hidden" name="tab" value={f.tab} />
      <label className="adUsers__search"><Search aria-hidden="true" /><span className="sr-only">Search users</span><input name="q" defaultValue={f.search} maxLength={120} placeholder="Search by name or email" /></label>
      <Pick name="role" label="Role" defaultValue={f.role} options={[{ value: "", label: "All roles" }, ...["owner", "staff", "client"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))]} />
      <Pick name="status" label="Status" defaultValue={f.status} options={[{ value: "", label: "All statuses" }, ...(invitation ? ["pending", "expired", "redeemed", "revoked"] : ["active", "deactivated"]).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))]} />
      <input type="hidden" name="size" value={f.size} /><button type="button" className="ad__btn" onClick={() => { const box = document.getElementById(target); box?.querySelectorAll<HTMLInputElement>(".adRowPick, .adRowPickAll").forEach(input => { input.checked = false; input.indeterminate = false; }); box?.dispatchEvent(new Event("change", { bubbles: true })); router.refresh(); }}>Refresh</button><button className="ad__btn" type="submit">Apply</button>
      <DialogButton label="Export" title="Export users" tone="plain" icon={Download}>{() => <><p>Export selected rows, this page or up to 1,000 filtered results. No passwords or session tokens are included.</p><div className="adUsers__export">{["csv", "json"].map(format => <div key={format}><b>{format.toUpperCase()}</b><Link className="ad__btn" href={exportUrl(format, "selected")}>Selected rows</Link><Link className="ad__btn" href={exportUrl(format, "page")}>This page</Link><Link className="ad__btn" href={exportUrl(format, "filtered")}>Filtered results</Link></div>)}</div></>}</DialogButton>
    </form>
    <BulkBar target={target} noun={invitation ? "invitations" : "accounts"} actions={invitation ? [{kind:"invitations:cancel",label:"Cancel",icon:"close",danger:true,confirm:"Cancel {n} invitations? Their links stop working."}] : [{kind:"users:signout",label:"Sign out",icon:"close",confirm:"End active sessions for {n} accounts? They can sign back in."}]} more={invitation ? [] : [{kind:"users:deactivate",label:"Deactivate",danger:true,confirm:"Deactivate {n} accounts? They cannot sign in until reactivated."},{kind:"users:reactivate",label:"Reactivate",confirm:"Restore access for {n} accounts?"}]} />
    <div id={target} className="ad__scroll adUsers__scroll" role="region" aria-label="Users table. Scroll sideways for more columns." tabIndex={0} data-lenis-prevent>
      <table className="ad__t adUsers__table"><thead><tr><th><label className="adUsers__check"><PickAll label="Select eligible rows on this page" />Person</label></th><th>Role</th><th>Status</th><th>{invitation ? "Expiry" : "Last sign-in"}</th>{invitation ? <th>Email</th> : null}<th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead><tbody>
        {invitation ? invites.map(i => <tr key={i.id}><td><label className="adUsers__person">{["pending","expired"].includes(i.status) ? <RowPick id={i.id} label={i.name} /> : null}<span><b>{i.name}</b><small>{i.email}</small></span></label></td><td>{i.role[0].toUpperCase() + i.role.slice(1)}</td><td><span className="ad__pill ad__pill--flat">{i.status === "revoked" ? "Cancelled" : i.status}</span></td><td>{time(i.expires)}</td><td>{i.delivery === "accepted" ? "Mail server accepted" : i.delivery === "unrecorded" ? "Not recorded" : i.delivery}</td><td className="ad__rmC">{i.status === "redeemed" ? <Link href={url(f,{tab:i.role === "client" ? "clients" : "team",q:i.email,page:"1",role:"",status:""})}>View account</Link> : i.status === "revoked" ? <small>No pending actions</small> : <RowMenu label={i.name} items={[
          { kind: "dialog", label: "Send again", title: `Resend to ${i.name}`, render: close => <Form action={resendUserInvite} onDone={close}><Hidden name="id" value={i.id} /><p>The old link stops working. A new invitation is queued.</p><Actions><Submit>Queue new invitation</Submit></Actions></Form> },
          { kind: "dialog", label: "Cancel invitation", title: `Cancel ${i.name}'s invitation`, tone: "danger", render: close => <Form action={revokeInvite} onDone={close} confirm="Cancel this invitation? Its link stops working."><Hidden name="id" value={i.id} /><Hidden name="back" value="/admin/users" /><Actions><Submit>Cancel invitation</Submit></Actions></Form> },
        ]} />}</td></tr>) : users.map(u => <tr key={u.id}><td><label className="adUsers__person">{u.id !== me ? <RowPick id={u.id} label={u.name} /> : null}<span className="adUsers__avatar" aria-hidden="true">{u.name.split(/\s+/).map(x => x[0]).slice(0, 2).join("")}</span><span><b>{u.name}</b><small>{u.email}</small></span></label></td><td>{u.role[0].toUpperCase() + u.role.slice(1)}</td><td><span className={`ad__pill ${u.active ? "ad__pill--good" : "ad__pill--flat"}`}>{u.active ? "Active" : "Deactivated"}</span></td><td>{time(u.lastSignIn)}</td><td className="ad__rmC">{u.id === me ? <Link href="/admin/settings/account">You</Link> : <RowMenu label={u.name} items={accountItems(u)} />}</td></tr>)}
        {!total ? <tr><td colSpan={invitation ? 6 : 5}><b>{f.search || f.role || f.status ? "No matching results" : "Nobody here yet"}</b><small>{f.search || f.role || f.status ? "Clear or change your filters." : "Invite a studio member, or connect a client through their client record."}</small></td></tr> : null}
      </tbody></table>
    </div>
    <Pager label="Users pages" total={total} page={page} per={f.size} noun={invitation ? "invitations" : "accounts"} perOptions={[10,25,50,100]} href={patch => url(current, { ...(patch.page ? {page:String(patch.page)}:{}), ...(patch.per ? {size:String(patch.per)}:{}) })} />
  </>;
}
