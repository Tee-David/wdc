"use server";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/pool";
import * as store from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { FAIL, OK, looksEmail, str, type ActionState } from "@/lib/admin/validate";
import { refusedEmail, REFUSED_EMAIL_MESSAGE } from "@/lib/email-domains";
import { rateLimit } from "@/lib/rate-limit";
import { supportCookiePresent } from "@/lib/users/support";
import { SUPPORT_READ_ONLY } from "@/lib/users/support-policy";
import { ClientInvitationError, createColleagueInvitation, normaliseEmail } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/invitation-mail";
import { emitWorkspaceEvent, dispatchWorkspaceEvents } from "@/lib/workspace/events";
import { projectRecipients } from "@/lib/workspace/access";
import { getPortalRequest } from "./session";
import { liveProjectIds } from "./people";

const NOT_READY = "Adding people needs a studio update that is not switched on yet. Ask Admin.";

/**
 * PEOPLE AT YOUR BUSINESS. Only the main contact (the account whose email is
 * the client record's) adds, changes or removes colleagues, and only on the
 * business's own projects. Every change is in the studio's audit log and the
 * project team is told.
 */
async function mainContact() {
  if (await supportCookiePresent()) return { refused: SUPPORT_READ_ONLY } as const;
  const r = await getPortalRequest().catch(() => null);
  const user = r?.session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!r?.client || !user?.id || user.role !== "client" || !r.isPrimaryContact) return { refused: "Only the main contact for your business can change who has access." } as const;
  return { client: r.client, userId: user.id, name: user.name || r.client.name } as const;
}

async function tellStudio(projectId: string, clientId: string, actorId: string, actorName: string, summary: string) {
  const id = randomUUID();
  try {
    await emitWorkspaceEvent({ id, projectId, clientId, kind: "project.access_changed", category: "actions", actorId, actorName, title: "Client changed who has access", summary, href: `/admin/clients/${clientId}`, visibility: "internal", recipients: await projectRecipients(projectId, "internal") });
    after(() => dispatchWorkspaceEvents({ eventIds: [id], limit: 1 }));
  } catch { /* the audit line still records it */ }
}

export async function addColleague(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const me = await mainContact();
  if ("refused" in me) return FAIL({}, me.refused);
  // Per-instance abuse control, not a quota.
  if (!rateLimit(`colleague:${me.userId}`, 10, 60 * 60_000).ok) return FAIL({}, "That is a lot of invitations in an hour. Try again later.");
  const name = str(fd, "name").replace(/\s+/g, " ").slice(0, 120);
  const email = normaliseEmail(str(fd, "email"));
  const gets = fd.getAll("gets").map(String), review = gets.includes("review"), billing = gets.includes("billing");
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Add their name.";
  if (!looksEmail(email)) errors.email = "Check the email address.";
  else if (refusedEmail(email)) errors.email = REFUSED_EMAIL_MESSAGE;
  else if (email === normaliseEmail(me.client.email)) errors.email = "That is your own address.";
  if (Object.keys(errors).length) return FAIL(errors);
  const projects = liveProjectIds(me.client.id);
  if (!projects.length) return FAIL({}, "You have no live project to share yet. People can be added once one starts.");

  const existing = await db.query<{ id: string; role: string; name: string; gone: boolean }>(`SELECT id, role, name, ("deactivatedAt" IS NOT NULL) AS gone FROM "user" WHERE lower(email)=$1`, [email]);
  const who = existing.rows[0];
  if (who) {
    if (who.role !== "client" || who.gone) return FAIL({ email: "This address cannot be added. Use a different one, or ask Admin." });
    try {
      for (const p of projects) {
        await db.query(`INSERT INTO workspace_project_members(project_id,user_id,can_manage,can_review,can_billing,granted_by) VALUES($1,$2,false,$3,$4,$5) ON CONFLICT(project_id,user_id) DO UPDATE SET can_review=excluded.can_review,can_billing=excluded.can_billing,granted_by=excluded.granted_by,granted_at=now(),revoked_at=NULL`, [p, who.id, review, billing, me.userId]);
      }
    } catch { return FAIL({}, NOT_READY); }
    const grantId = randomUUID();
    await emitWorkspaceEvent({ id: grantId, projectId: projects[0], clientId: me.client.id, kind: "project.access_granted", category: "progress", actorId: me.userId, actorName: me.name, title: `You have access to ${me.client.company || "their"} projects`, summary: `${me.name} added you. Open the portal to see the shared work.`, href: "/portal/projects", visibility: "client", recipients: [{ userId: who.id }] }).then(() => after(() => dispatchWorkspaceEvents({ eventIds: [grantId], limit: 1 }))).catch(() => {});
  } else {
    let made;
    try {
      made = await createColleagueInvitation({ email, name, actorId: me.userId, clientId: me.client.id, by: me.name, projects: projects.map((id) => ({ id, review, billing })) });
    } catch (error) {
      if (error instanceof ClientInvitationError) return FAIL({}, error.message);
      return FAIL({}, NOT_READY);
    }
    try { after(async () => { try { await sendInvitationEmail(made.invitation, made.token); } catch { console.error("[colleague] deferred invitation email failed; review its delivery state."); } }); } catch { /* the queued row stays for a resend */ }
  }
  const rights = [review && "approvals", billing && "invoices and receipts"].filter(Boolean).join(" and ") || "project updates only";
  store.audit({ actor: `${me.name} (client)`, kind: "client", subjectId: me.client.id, subject: me.client.company || me.client.name, action: who ? "gave a colleague access" : "invited a colleague", note: `${name} <${email}>: ${rights}` });
  await tellStudio(projects[0], me.client.id, me.userId, me.name, `${me.name} ${who ? "gave" : "invited"} ${name} (${email}) access to their projects: ${rights}.`);
  revalidatePath("/portal/settings");
  return OK(who ? `Saved. ${name.split(" ")[0]} can now see your projects.` : `Saved. ${name.split(" ")[0]} gets an invite at ${email}.`);
}

export async function changeColleague(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const me = await mainContact();
  if ("refused" in me) return FAIL({}, me.refused);
  const id = str(fd, "id"), kind = str(fd, "kind");
  const gets = fd.getAll("gets").map(String), review = gets.includes("review"), billing = gets.includes("billing");
  const ids = store.getProjects(true).filter((p) => p.clientId === me.client.id).map((p) => p.id);
  let n = 0;
  try {
    if (kind === "invite") n = (await db.query(`UPDATE invitation_project_grants SET can_review=$2, can_billing=$3 WHERE invitation_id=$1 AND project_id=ANY($4::STRING[]) AND EXISTS (SELECT 1 FROM invitations i WHERE i.id=$1 AND i.client_id=$5 AND i.redeemed_at IS NULL AND i.revoked_at IS NULL)`, [id, review, billing, ids, me.client.id])).rowCount ?? 0;
    else n = (await db.query(`UPDATE workspace_project_members SET can_review=$2, can_billing=$3 WHERE user_id=$1 AND project_id=ANY($4::STRING[]) AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM "user" u WHERE u.id=$1 AND u.role='client')`, [id, review, billing, ids])).rowCount ?? 0;
  } catch { return FAIL({}, NOT_READY); }
  if (!n) return FAIL({}, "That person no longer has access. Reload to see the list.");
  store.audit({ actor: `${me.name} (client)`, kind: "client", subjectId: me.client.id, subject: me.client.company || me.client.name, action: "changed a colleague's access", note: `Approvals: ${review ? "yes" : "no"}; invoices: ${billing ? "yes" : "no"}` });
  persistSoon();
  revalidatePath("/portal/settings");
  return OK("Updated. They receive only what you ticked.");
}

export async function removeColleague(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const me = await mainContact();
  if ("refused" in me) return FAIL({}, me.refused);
  const id = str(fd, "id"), kind = str(fd, "kind");
  const ids = store.getProjects(true).filter((p) => p.clientId === me.client.id).map((p) => p.id);
  let n = 0;
  try {
    if (kind === "invite") n = (await db.query(`UPDATE invitations SET revoked_at=now(), revoked_by=$3 WHERE id=$1 AND client_id=$2 AND redeemed_at IS NULL AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM invitation_project_grants g WHERE g.invitation_id=$1)`, [id, me.client.id, `${me.name} (client)`])).rowCount ?? 0;
    else n = (await db.query(`UPDATE workspace_project_members SET revoked_at=now() WHERE user_id=$1 AND project_id=ANY($2::STRING[]) AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM "user" u WHERE u.id=$1 AND u.role='client')`, [id, ids])).rowCount ?? 0;
  } catch { return FAIL({}, NOT_READY); }
  if (!n) return FAIL({}, "That person no longer has access.");
  store.audit({ actor: `${me.name} (client)`, kind: "client", subjectId: me.client.id, subject: me.client.company || me.client.name, action: kind === "invite" ? "cancelled a colleague's invitation" : "removed a colleague's access" });
  persistSoon();
  const first = liveProjectIds(me.client.id)[0];
  if (first) await tellStudio(first, me.client.id, me.userId, me.name, `${me.name} ${kind === "invite" ? "cancelled an invitation for a colleague" : "removed a colleague's access to their projects"}.`);
  revalidatePath("/portal/settings");
  return OK(kind === "invite" ? "Updated. The invitation no longer works." : "Updated. They can no longer see your projects.");
}
