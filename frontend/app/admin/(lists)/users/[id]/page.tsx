import Link from "next/link";
import { notFound } from "next/navigation";
import { usersOwner } from "@/lib/users/authorize";
import { db } from "@/lib/db/pool";
import { Panel } from "@/components/admin/bits";
import { SecurityNoticeRetry } from "@/components/admin/settings/security-notice-retry";
import { AdminState } from "@/components/admin/admin-state";

export const metadata = { title: "User activity and sessions" };
const date = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
export default async function UserHistory({ params }: { params: Promise<{ id: string }> }) {
  try { await usersOwner("read"); } catch { return <AdminState kind="forbidden" title="Owner access required" description="Only an owner can inspect another account's sessions." />; }
  const { id } = await params;
  if (!id || id.length > 120) notFound();
  let account, sessions, activity;
  try {
    [account, sessions, activity] = await Promise.all([
      db.query<{ name: string; email: string }>(`SELECT "name","email" FROM "user" WHERE "id"=$1`, [id]),
      db.query<{ id: string; created: string; expires: string }>(`SELECT "id","createdAt" AS created,"expiresAt" AS expires FROM "session" WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "createdAt" DESC LIMIT 100`, [id]),
      db.query<{ event: string; created: string; actor: string; notice_id: string|null; delivery: string|null; retry_safe: boolean }>(`SELECT e.event,e.created_at AS created,coalesce(u."name",'Former account') AS actor,n.id AS notice_id,n.state AS delivery,(n.state='sending' AND n.provider_started=false AND n.updated_at < now() - INTERVAL '10 minutes') AS retry_safe FROM user_security_events e LEFT JOIN "user" u ON u."id"=e.actor_id LEFT JOIN user_security_notices n ON n.event_id=e.id WHERE e.target_id=$1 ORDER BY e.created_at DESC LIMIT 50`, [id]),
    ]);
  } catch { return <AdminState kind="error" title="Account activity could not be loaded" description="The database did not answer. Refresh in a moment." />; }
  if (!account.rows[0]) notFound();
  return <><div className="ad__head"><div><h1>{account.rows[0].name}</h1><p>{account.rows[0].email}</p></div><Link className="ad__btn" href="/admin/users">Back to users</Link></div>
    <div className="ad__stack"><Panel title="Active sessions"><p className="adSetPad">Only creation and expiry are shown. Device names and locations are not inferred. Up to 100 sessions; sign out everywhere from the Users row menu.</p><div className="ad__scroll"><table className="ad__t"><thead><tr><th>Created</th><th>Expires</th></tr></thead><tbody>{sessions.rows.map(s => <tr key={s.id}><td>{date(s.created)}</td><td>{date(s.expires)}</td></tr>)}{!sessions.rows.length ? <tr><td colSpan={2}>No active sessions.</td></tr> : null}</tbody></table></div></Panel>
    <Panel title="Account activity"><p className="adSetPad">The latest 50 recorded changes. Older changes remain in the audit log. A queued recovery is not proof of email delivery.</p><div className="ad__scroll"><table className="ad__t"><thead><tr><th>Change</th><th>Who</th><th>When</th><th>Email notice</th></tr></thead><tbody>{activity.rows.map((event, i) => <tr key={`${event.created}-${i}`}><td>{event.event.replaceAll("-", " ")}</td><td>{event.actor}</td><td>{date(event.created)}</td><td>{event.delivery === "accepted" ? "Mail server accepted" : event.delivery === "requested" ? "Recovery request accepted; email delivery separate" : event.retry_safe ? "Interrupted before sending" : event.delivery ?? "No notice"}{event.notice_id && (["queued","failed"].includes(event.delivery ?? "") || event.retry_safe) ? <SecurityNoticeRetry noticeId={event.notice_id} /> : null}{event.delivery === "uncertain" || (event.delivery === "sending" && !event.retry_safe) ? <small><Link href="/admin/settings/email">Inspect the email log before sending again</Link></small> : null}</td></tr>)}{!activity.rows.length ? <tr><td colSpan={4}>No recorded changes yet.</td></tr> : null}</tbody></table></div></Panel></div>
  </>;
}
