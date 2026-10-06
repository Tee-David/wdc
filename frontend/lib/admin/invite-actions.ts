"use server";

import { usersOwner } from "@/lib/users/authorize";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { ClientInvitationError, accountFor, createInvitation, invitationsConfigured, normaliseEmail, revokeInvitation } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/invitation-mail";
import { getClient, audit } from "./store";
import { actorName, owner, allow } from "./guard";
import { FAIL, OK, looksEmail, str, type ActionState } from "./validate";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "@/lib/email-domains";
import { getAdminRequest } from "./session";
import { db } from "@/lib/db/pool";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_CONNECTED = "The account database is not connected, so an invitation has nowhere to be kept.";

/* The send happens after the response: the mail server takes about 23
   seconds to authenticate, and the invitation row is already written. */
function sendLater(...args: Parameters<typeof sendInvitationEmail>) {
  try { after(async () => {
    try { await sendInvitationEmail(...args); }
    catch { console.error("[invite] deferred email failed; review its delivery state."); }
  }); } catch { /* The persisted queued intent remains visible for an explicit resend. */ }
}

/**
 * A client, to their portal. The address is the one on their record, not a
 * form field, so the portal -- which finds a client by the signed-in email --
 * is bound to this record by construction.
 */
export async function inviteClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await allow("clients");
  if (refused) return refused;
  if (!invitationsConfigured()) return FAIL({}, NOT_CONNECTED);
  const client = getClient(str(fd, "clientId"));
  if (!client || client.archived) return FAIL({}, "That client could not be found, or is archived.");
  const email = normaliseEmail(client.email ?? "");
  if (!looksEmail(email)) return FAIL({}, "This client has no usable email address. Add one to their record first.");
  if (refusedEmail(email)) return FAIL({}, `${email} is a temporary or anonymous inbox, which the portal does not accept. Add their work email to the record first.`);

  const by = await actorName();
  let made;
  try {
    made = await createInvitation({ email, name: client.name, role: "client", clientId: client.id, by, actorId: (await getAdminRequest()).session?.user.id ?? "" });
  } catch (error) {
    if (error instanceof ClientInvitationError) return FAIL({}, error.message);
    return FAIL({}, "The invitation could not be saved just now. Nothing was sent; try again.");
  }
  sendLater(made.invitation, made.token);
  audit({ actor: by, kind: "client", subjectId: client.id, subject: client.company || client.name, action: "invited to the portal", note: email });
  revalidatePath(`/admin/clients/${client.id}`);
  return OK(`Invitation queued for ${email}. It works once, for a week; sending another replaces it.`);
}

/**
 * Somebody to the admin, as staff or as an owner. Owner only, whatever else
 * staff can do. The role is read strictly: anything but "owner" is staff, so
 * a missing or tampered value can only ever give less.
 */
export async function inviteStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  if (!invitationsConfigured()) return FAIL({}, NOT_CONNECTED);
  const email = normaliseEmail(str(fd, "email"));
  const name = str(fd, "name").slice(0, 120);
  const role = str(fd, "role");
  if (role !== "owner" && role !== "staff") return FAIL({ role: "Choose Owner or Staff." });
  try { await usersOwner("invite", role === "owner"); } catch { return {...FAIL({}, "Sign in again, then retry this invitation."),signIn:true}; }
  const errors: Record<string, string> = {};
  if (!looksEmail(email)) errors.email = "Enter the address they will sign in with.";
  else if (refusedEmail(email)) errors.email = REFUSED_EMAIL_MESSAGE;
  if (!name) errors.name = "Their name, as it should appear on what they change.";
  if (Object.keys(errors).length) return FAIL(errors);

  /* AN ADDRESS THAT ALREADY HAS AN ACCOUNT cannot redeem an invitation (the
     invite page would tell them to log in, and logging in keeps the role they
     have), so it is refused here with the reason, not sent and left to fail. */
  let existing;
  try { existing = await accountFor(email); } catch { return FAIL({}, "The database could not check that account. Nothing was sent; retry."); }
  if (existing) {
    return FAIL({ email: existing.role === "client"
      ? `${email} already has a client account, and a client account cannot be made staff. Invite a different address for their studio work.`
      : `${email} already has an account here. Change what they can do in the list below instead.` });
  }

  const by = await actorName();
  let made;
  try {
    made = await createInvitation({ email, name, role, by, actorId: (await usersOwner("invite-create")).user.id });
  } catch (error) {
    /* Owner invitations need migration 0027; until it runs the database's
       own check refuses them, and saying so beats "try again". */
    if (role === "owner" && String((error as Error)?.message ?? "").includes("invitations_role_check")) {
      return FAIL({}, "Owner invitations need the latest database change. Apply it through Settings › System, then retry. Nothing was sent.");
    }
    return FAIL({}, "The invitation could not be saved just now. Nothing was sent; try again.");
  }
  sendLater(made.invitation, made.token);
  audit({ actor: by, kind: "setting", subjectId: made.invitation.id, subject: name, action: role === "owner" ? "invited to the studio admin as an owner" : "invited to the studio admin", note: email });
  revalidatePath("/admin/settings/team");
  revalidatePath("/admin/settings/users");
  return OK(`Invitation queued for ${email}, as ${role === "owner" ? "an owner" : "staff"}.`);
}

export async function revokeInvite(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const refused = await owner();
  if (refused) return refused;
  try { await usersOwner("cancel-invite"); } catch { return {...FAIL({}, "Sign in again, then retry cancellation."),signIn:true}; }
  const id = str(fd, "id");
  if (!UUID.test(id)) return FAIL({}, "That invitation could not be found.");
  const by = await actorName();
  try {
    if (!(await revokeInvitation(id, by, (await usersOwner("cancel-confirm")).user.id))) return OK("That invitation was already used or withdrawn.");
  } catch {
    return FAIL({}, "That could not be saved just now. Try again.");
  }
  audit({ actor: by, kind: "setting", subjectId: id, subject: "Invitation", action: "withdrew an invitation" });
  const back = str(fd, "back");
  if (back.startsWith("/admin/")) revalidatePath(back);
  revalidatePath("/admin/settings/users");
  return OK("Cancelled. The link no longer works.");
}

export async function resendUserInvite(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await usersOwner("resend-invite");
    const id = str(fd, "id");
    if (!UUID.test(id)) return FAIL({}, "That invitation could not be found.");
    const found = await db.query<{ email: string; name: string; role: "owner" | "staff" | "client"; client_id: string | null }>(`SELECT email,name,role,client_id FROM invitations WHERE id=$1 AND redeemed_at IS NULL AND revoked_at IS NULL`, [id]);
    const original = found.rows[0];
    if (!original) return FAIL({}, "That invitation was accepted or cancelled. Refresh the list.");
    if (original.role === "owner") await usersOwner("resend-owner", true);
    if (refusedEmail(original.email)) return FAIL({}, REFUSED_EMAIL_MESSAGE);
    const made = await createInvitation({ email: original.email, name: original.name, role: original.role, clientId: original.client_id, by: actor.user.name, actorId: actor.user.id, sourceId: id });
    sendLater(made.invitation, made.token);
    revalidatePath("/admin/settings/users");
    return OK("Invitation queued. The previous link no longer works; email acceptance is shown separately.");
  } catch (error) { return FAIL({}, error instanceof ClientInvitationError ? error.message : "The invitation could not be replaced. Refresh the list and retry."); }
}

export async function bulkCancelInvites(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await usersOwner("bulk-cancel-invites");
    const ids = [...new Set(fd.getAll("ids").map(String))];
    if (!ids.length || ids.length > 100 || ids.some(id => !UUID.test(id))) return FAIL({}, "Select between 1 and 100 invitations on this page.");
    const labels = await db.query<{id:string;name:string}>(`SELECT id,name FROM invitations WHERE id=ANY($1::UUID[])`,[ids]);
    const names = new Map(labels.rows.map(row=>[row.id,row.name]));
    const outcomes: NonNullable<ActionState["outcomes"]> = []; let cancelled = 0;
    for (const id of ids) {
      try { const changed = await revokeInvitation(id, actor.user.name, actor.user.id); if (changed) cancelled++; outcomes.push({id,label:names.get(id) ?? id,ok:changed,message:changed ? "Cancelled. The link no longer works." : "Already used or cancelled. Refresh the list."}); }
      catch { outcomes.push({id,label:names.get(id) ?? id,ok:false,message:"Database unavailable; retry this row."}); }
    }
    revalidatePath("/admin/settings/users");
    return {...(cancelled === ids.length ? OK(`${cancelled} cancelled.`) : FAIL({}, `${cancelled} of ${ids.length} cancelled. Review each result.`)),outcomes};
  } catch { return FAIL({}, "Owner access could not be verified. Sign in again and retry."); }
}
