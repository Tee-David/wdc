"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/pool";
import { SITE_URL } from "@/lib/site";
import { UsersError } from "@/lib/users/errors";
import { sendSecurityNotice } from "@/lib/users/notices";
import { usersOwner } from "@/lib/users/authorize";
import { changeUser, type UserChange } from "@/lib/users/manage";
import { FAIL, OK, type ActionState } from "./validate";

const changes: UserChange[] = ["rename", "deactivate", "reactivate", "signout", "owner", "staff"];
function failure(e: unknown) {
  const message = e instanceof UsersError ? e.message : "The database did not answer. Refresh and retry; some bulk rows may already be updated.";
  return {...FAIL({},message),...(/sign in again/i.test(message) ? {signIn:true}:{})};
}
export async function manageUser(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const change = String(fd.get("change") ?? "") as UserChange;
  if (!changes.includes(change)) return FAIL({}, "Choose a supported account action.");
  const name = String(fd.get("name") ?? "").trim();
  if (change === "rename" && (!name || name.length > 120)) return FAIL({ name: "Enter a name up to 120 characters." });
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 120) return FAIL({}, "That account could not be found.");
  try {
    const actor = await usersOwner(change, ["owner", "staff", "deactivate"].includes(change));
    const noticeId = await changeUser(actor.user.id, id, change, name);
    if (noticeId) after(() => sendSecurityNotice(noticeId));
    revalidatePath("/admin/settings/users"); revalidatePath("/admin/settings/team");
    return OK("Updated.");
  } catch (e) { return failure(e); }
}

export async function bulkUsers(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const change = String(fd.get("change") ?? "") as UserChange;
  if (!["deactivate", "reactivate", "signout"].includes(change)) return FAIL({}, "Choose deactivate, reactivate or sign out.");
  const ids = [...new Set(fd.getAll("ids").map(String))];
  if (!ids.length || ids.length > 100 || ids.some(x => !x || x.length > 120)) return FAIL({}, "Select between 1 and 100 accounts on this page.");
  try {
    const actor = await usersOwner(`bulk-${change}`, change === "deactivate");
    const labels = await db.query<{id:string;name:string}>(`SELECT "id","name" FROM "user" WHERE "id"=ANY($1::TEXT[])`, [ids]);
    const names = new Map(labels.rows.map(row => [row.id,row.name]));
    const outcomes: NonNullable<ActionState["outcomes"]> = []; let successes = 0;
    for (const id of ids) {
      try { const noticeId = await changeUser(actor.user.id, id, change); if (noticeId) after(() => sendSecurityNotice(noticeId)); successes++; outcomes.push({id,label:names.get(id) ?? id,ok:true,message:"Updated."}); }
      catch (e) { outcomes.push({id,label:names.get(id) ?? id,ok:false,message:failure(e).message ?? "Retry this row."}); }
    }
    revalidatePath("/admin/settings/users");
    const message = `${successes} of ${ids.length} updated. Review the results for each person.`;
    return {...(successes === ids.length ? OK(message) : FAIL({}, message)),outcomes};
  } catch (e) { return failure(e); }
}

export async function recoverUser(_previous: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await usersOwner("recovery");
    const id = String(fd.get("id") ?? "");
    if (!id || id.length > 120) return FAIL({}, "That account could not be found.");
    const user = await db.query<{ email: string; active: boolean }>(`SELECT "email",("deactivatedAt" IS NULL) AS active FROM "user" WHERE "id"=$1`, [id]);
    if (!user.rows[0]?.active) return FAIL({}, "Reactivate this account before sending recovery.");
    await db.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'password-recovery-queued')`, [actor.user.id, id]);
    const h = await headers(); const email = user.rows[0].email;
    after(async () => {
      try { await auth.api.requestPasswordReset({ headers: h, body: { email, redirectTo: new URL("/reset-password", SITE_URL).toString() } }); }
      catch { await db.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'password-recovery-failed')`, [actor.user.id, id]); }
    });
    return OK("Recovery queued. Check Settings › Email for the mail server outcome; this does not confirm delivery.");
  } catch (e) { return failure(e); }
}

export async function retrySecurityNotice(_previous: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await usersOwner("retry-security-notice");
    const id = String(fd.get("noticeId") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return FAIL({}, "That email notice could not be found.");
    const queued = await db.query(`UPDATE user_security_notices SET state='queued',updated_at=now() WHERE id=$1 AND (state IN ('queued','failed') OR (state='sending' AND provider_started=false AND updated_at < now() - INTERVAL '10 minutes')) RETURNING id`, [id]);
    if (!queued.rowCount) return FAIL({}, "That email is accepted, sending or uncertain. Check Settings › Email before requesting another message.");
    after(() => sendSecurityNotice(id));
    revalidatePath("/admin/settings/users");
    return OK("Notice queued. The mail server outcome is shown separately.");
  } catch { return FAIL({}, "The notice could not be queued. Refresh and retry."); }
}
