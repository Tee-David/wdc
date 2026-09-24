"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createInvitation, invitationsConfigured, normaliseEmail, revokeInvitation } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/invitation-mail";
import { getClient, audit } from "./store";
import { actorName, owner } from "./guard";
import { FAIL, OK, looksEmail, str, type ActionState } from "./validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_CONNECTED = "The account database is not connected, so an invitation has nowhere to be kept.";

/* The send happens after the response: the mail server takes about 23
   seconds to authenticate, and the invitation row is already written. */
function sendLater(...args: Parameters<typeof sendInvitationEmail>) {
  const job = sendInvitationEmail(...args).catch((e) => {
    console.error("[invite] email failed", e instanceof Error ? e.message : e);
  });
  try { after(job); } catch { /* No request scope; it is already running. */ }
}

/**
 * A client, to their portal. The address is the one on their record, not a
 * form field, so the portal -- which finds a client by the signed-in email --
 * is bound to this record by construction.
 */
export async function inviteClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  if (!invitationsConfigured()) return FAIL({}, NOT_CONNECTED);
  const client = getClient(str(fd, "clientId"));
  if (!client || client.archived) return FAIL({}, "That client could not be found, or is archived.");
  const email = normaliseEmail(client.email ?? "");
  if (!looksEmail(email)) return FAIL({}, "This client has no usable email address. Add one to their record first.");

  const by = await actorName();
  let made;
  try {
    made = await createInvitation({ email, name: client.name, role: "client", clientId: client.id, by });
  } catch {
    return FAIL({}, "The invitation could not be saved just now. Nothing was sent; try again.");
  }
  sendLater(made.invitation, made.token);
  audit({ actor: by, kind: "client", subjectId: client.id, subject: client.company || client.name, action: "invited to the portal", note: email });
  revalidatePath(`/admin/clients/${client.id}`);
  return OK(`Invitation sent to ${email}. It works once, for a week; sending another replaces it.`);
}

/** A member of staff, to the admin. Owner only, whatever else staff can do. */
export async function inviteStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  if (!invitationsConfigured()) return FAIL({}, NOT_CONNECTED);
  const email = normaliseEmail(str(fd, "email"));
  const name = str(fd, "name").slice(0, 120);
  const errors: Record<string, string> = {};
  if (!looksEmail(email)) errors.email = "Enter the address they will sign in with.";
  if (!name) errors.name = "Their name, as it should appear on what they change.";
  if (Object.keys(errors).length) return FAIL(errors);

  const by = await actorName();
  let made;
  try {
    made = await createInvitation({ email, name, role: "staff", by });
  } catch {
    return FAIL({}, "The invitation could not be saved just now. Nothing was sent; try again.");
  }
  sendLater(made.invitation, made.token);
  audit({ actor: by, kind: "setting", subjectId: made.invitation.id, subject: name, action: "invited to the studio admin", note: email });
  revalidatePath("/admin/settings/team");
  return OK(`Invitation sent to ${email}.`);
}

export async function revokeInvite(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner();
  if (refused) return refused;
  const id = str(fd, "id");
  if (!UUID.test(id)) return FAIL({}, "That invitation could not be found.");
  const by = await actorName();
  try {
    if (!(await revokeInvitation(id, by))) return OK("That invitation was already used or withdrawn.");
  } catch {
    return FAIL({}, "That could not be saved just now. Try again.");
  }
  audit({ actor: by, kind: "setting", subjectId: id, subject: "Invitation", action: "withdrew an invitation" });
  const back = str(fd, "back");
  if (back.startsWith("/admin/")) revalidatePath(back);
  return OK("Withdrawn. The link no longer works.");
}
