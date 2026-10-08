"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { transaction } from "@/lib/db/transaction";

import { db } from "@/lib/db/pool";

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
    revalidatePath("/admin/users"); revalidatePath("/admin/settings/team");
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
    revalidatePath("/admin/users");
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
    const noticeId = await transaction(async tx => {
      const event = await tx.query<{id:string}>(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$2,'password-recovery-queued') RETURNING id`, [actor.user.id,id]);
      const notice = await tx.query<{id:string}>(`INSERT INTO user_security_notices(event_id,target_id,kind) VALUES($1,$2,'recovery') RETURNING id`, [event.rows[0].id,id]);
      return notice.rows[0].id;
    });
    after(() => sendSecurityNotice(noticeId));
    revalidatePath(`/admin/users/${encodeURIComponent(id)}`);
    return OK("Recovery request queued. Its state is in Activity and sessions; retry there if it has not started. Requested means the authentication service accepted it; Settings › Email shows any subsequent mail attempt.");
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
    revalidatePath("/admin/users");
    return OK("Notice queued. The mail server outcome is shown separately.");
  } catch { return FAIL({}, "The notice could not be queued. Refresh and retry."); }
}

/* ------------------------------------------------- delete an account for good */

type UserImpact = { blocked: string | null; goes: string[]; stays: string[]; email: string; name: string };

/** What deleting this account would take, and what refuses it. Re-run by the delete itself. */
async function impactOf(actorId: string, id: string): Promise<UserImpact | null> {
  const r = await db.query<{ name: string; email: string; role: string; off: Date | null }>(`SELECT "name","email","role","deactivatedAt" AS off FROM "user" WHERE "id"=$1`, [id]);
  const u = r.rows[0];
  if (!u) return null;
  const { syncStore } = await import("@/lib/admin/persist");
  const store = await import("@/lib/admin/store");
  await syncStore().catch(() => {});
  const name = u.name.trim().toLowerCase();
  const projects = store.getProjects(true).filter((p) => p.owner.split(",").some((n) => n.trim().toLowerCase() === name)).length;
  const tasks = store.getTasks().filter((t) => t.assignee.trim().toLowerCase() === name).length;
  const sessions = (await db.query<{ n: string }>(`SELECT count(*) AS n FROM "session" WHERE "userId"=$1`, [id])).rows[0]?.n ?? "0";
  const blocked =
    id === actorId ? "You cannot delete your own account."
    : u.role === "owner" ? "Owners cannot be deleted. Make them staff first, then deactivate, then delete."
    : !u.off ? "Deactivate the account first. Deleting is a second step, taken from a deactivated account."
    : projects || tasks ? `${projects ? `${projects} project${projects === 1 ? "" : "s"} name` : ""}${projects && tasks ? " and " : ""}${tasks ? `${tasks} task${tasks === 1 ? "" : "s"} assign` : ""} them. Reassign that work first, so nothing is left without an owner.`
    : null;
  return {
    blocked, name: u.name, email: u.email,
    goes: ["their sign-in, password and Google link", `${sessions} signed-in device${sessions === "1" ? "" : "s"}`, "their profile settings"],
    stays: ["the audit trail and the work they did, which keep their name as text", "security-log entries about them are removed with them"],
  };
}

export async function userDeletionImpact(id: string): Promise<UserImpact | null> {
  try { const actor = await usersOwner("read"); return await impactOf(actor.user.id, id); } catch { return null; }
}

export async function deleteUserPermanently(_previous: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  if (!id || id.length > 120) return FAIL({}, "That account could not be found.");
  try {
    const actor = await usersOwner("delete-account", true);
    const impact = await impactOf(actor.user.id, id);
    if (!impact) return FAIL({}, "That account is already gone.");
    if (impact.blocked) return FAIL({}, impact.blocked);
    if (String(fd.get("typed") ?? "").trim().toLowerCase() !== impact.email.toLowerCase()) return FAIL({ typed: `Type ${impact.email} exactly to confirm.` });
    try {
      await transaction(async (tx) => {
        await tx.query(`DELETE FROM user_security_notices WHERE target_id=$1`, [id]);
        await tx.query(`DELETE FROM user_security_events WHERE target_id=$1`, [id]);
        await tx.query(`DELETE FROM "user" WHERE "id"=$1 AND "deactivatedAt" IS NOT NULL AND "role"<>'owner'`, [id]);
      });
    } catch {
      return FAIL({}, "They appear in the security log as the person who made a change, so the account is kept. Leave it deactivated.");
    }
    const { audit } = await import("@/lib/admin/store");
    audit({ actor: actor.user.name ?? "Owner", kind: "client", subjectId: id, subject: impact.name, action: "account deleted permanently", note: impact.email });
    revalidatePath("/admin/users");
    return OK(`${impact.name}'s account is deleted.`);
  } catch (e) { return failure(e); }
}
