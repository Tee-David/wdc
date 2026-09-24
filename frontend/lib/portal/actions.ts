"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as db from "@/lib/admin/store";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/admin/types";
import { FAIL, OK, str, type ActionState } from "@/lib/admin/validate";
import { getPortalRequest } from "./session";

/**
 * THE PORTAL'S OWN WRITE ENDPOINTS -- a separate module from
 * `lib/admin/actions.ts`, not a set of wrappers around it, because every
 * export here is reachable by a signed-in CLIENT, and `lib/admin/validate.ts`
 * says plainly what that means: "a server action is a public POST endpoint
 * whether or not a form points at it". The admin's own equivalents
 * (`moveApproval`, `patchClient`) trust the id in the FormData because
 * everything behind `/admin` is the studio's own data already. Nothing here
 * may make that assumption: every action re-derives the signed-in client from
 * the session and checks that the record being written -- a deliverable, a
 * ticket, the client's own settings -- actually belongs to them before
 * calling the store. An id that does not is answered exactly like one that
 * does not exist, not with a more specific error that would confirm to a
 * client which ids are real.
 */

/* A CLIENT, AND ONLY A CLIENT. The portal layout redirects other roles, but
   an action is reachable without the layout, and an owner whose address
   happens to match a client record must not be able to act as that client. */
async function requireClient() {
  try {
    const { session, client } = await getPortalRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    return role === "client" ? client : null;
  } catch {
    return null;
  }
}

export async function approveDeliverable(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient();
  if (!client) return FAIL({}, "Your account isn't linked to a client record.");
  const id = str(fd, "id");
  const d = db.getDeliverable(id);
  const project = d ? db.getProject(d.projectId) : null;
  if (!d || !project || project.clientId !== client.id) return FAIL({}, "That deliverable is no longer there.");
  db.setApproval(id, "Approved");
  /* A confirmation of what they agreed to, like a receipt, behind the
     response. The name is the signed-in person's, not a form field. */
  const { session } = await getPortalRequest();
  const signedBy = session?.user?.name?.trim() || client.name;
  after(async () => {
    const { sendSignOffConfirmation } = await import("@/lib/project-mail");
    await sendSignOffConfirmation({ project, deliverable: d, signedBy });
  });
  revalidatePath(`/portal/projects/${project.id}`);
  revalidatePath("/portal");
  return OK(`${d.name} marked approved.`);
}

export async function requestRevision(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient();
  if (!client) return FAIL({}, "Your account isn't linked to a client record.");
  const id = str(fd, "id");
  const note = str(fd, "note");
  if (!note) return FAIL({ note: "Say what needs to change -- it goes straight to the team working on it." });
  const d = db.getDeliverable(id);
  const project = d ? db.getProject(d.projectId) : null;
  if (!d || !project || project.clientId !== client.id) return FAIL({}, "That deliverable is no longer there.");
  db.setApproval(id, "Revision requested", note);
  revalidatePath(`/portal/projects/${project.id}`);
  revalidatePath("/portal");
  return OK("Revision request sent.");
}

export async function submitTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient();
  if (!client) return FAIL({}, "Your account isn't linked to a client record.");
  const subject = str(fd, "subject");
  const body = str(fd, "body");
  if (!subject) return FAIL({ subject: "Give it a short subject." });
  if (!body) return FAIL({ body: "Say what you need -- this is what the studio sees first." });
  const projectIdRaw = str(fd, "projectId");
  const project = projectIdRaw ? db.getProject(projectIdRaw) : null;
  /* A projectId that does not belong to this client is silently dropped
     rather than rejected: raising a general question is always allowed, and
     the worst outcome of a spoofed id should be that one detail is ignored,
     not a form the person has to retype. */
  const projectId = project && project.clientId === client.id ? project.id : null;
  const t = db.addTicket({ clientId: client.id, projectId, subject, body, author: client.name });
  if (!t) return FAIL({}, "Could not open that. Try again.");
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Sent. We'll reply here, usually the same working day.");
}

export async function replyToTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient();
  if (!client) return FAIL({}, "Your account isn't linked to a client record.");
  const ticketId = str(fd, "ticketId");
  const body = str(fd, "body");
  if (!body) return FAIL({ body: "Type a reply first." });
  const t = db.getTicket(ticketId);
  if (!t || t.clientId !== client.id) return FAIL({}, "That conversation is no longer there.");
  db.addTicketMessage({ ticketId: t.id, from: "client", author: client.name, body });
  revalidatePath(`/portal/support/${t.id}`);
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Sent.");
}

export async function updateNotifyPrefs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient();
  if (!client) return FAIL({}, "Your account isn't linked to a client record.");
  const notify = Object.fromEntries(
    NOTIFY_KINDS.map((k: NotifyKind) => [k, fd.get(k) === "on"]),
  ) as Record<NotifyKind, boolean>;
  db.patchClient(client.id, { notify }, client.name);
  revalidatePath("/portal/settings");
  return OK("Preferences saved.");
}
