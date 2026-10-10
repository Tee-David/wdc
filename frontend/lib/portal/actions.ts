"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as db from "@/lib/admin/store";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/admin/types";
import { FAIL, OK, str, type ActionState } from "@/lib/admin/validate";
import { supportCookiePresent } from "@/lib/users/support";
import { SUPPORT_READ_ONLY } from "@/lib/users/support-policy";
import { getPortalRequest } from "./session";
import {decideLegacyDeliverable} from "@/lib/workspace/service-deliverable-decisions";
import {stageSupportNotice,stageSupportReceipt} from "@/lib/support-mail";
import {requireWorkspaceUser} from "@/lib/workspace/access";
import {dispatchWorkspaceEvents} from "@/lib/workspace/events";
import { persistSoon, syncStore } from "@/lib/admin/persist";

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
async function requireClient(primaryOnly = true) {
  try {
    if (await supportCookiePresent()) return null;
    const { session, client, isPrimaryContact } = await getPortalRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    return role === "client" && (!primaryOnly || isPrimaryContact) ? client : null;
  } catch {
    return null;
  }
}

/* SIGNED OUT IS NOT "NOT LINKED". A session that ended while a long note was
   being written used to be told the account was not linked, which is false
   and alarming; it is told the truth, and that what they typed is still on
   the page. */
async function whyNoClient() {
  if (await supportCookiePresent()) return SUPPORT_READ_ONLY;
  const request = await getPortalRequest().catch(() => null);
  if (request?.client && !request.isPrimaryContact) return "This action belongs to the primary company contact. Use your project conversation to contact the team.";
  const signedIn = Boolean(request?.session?.user);
  return signedIn
    ? "Your account isn't linked to a client record yet. Email us and we'll connect it."
    : "You've been signed out. Sign in again in a new tab, then press this again. What you typed is still here.";
}

export async function approveDeliverable(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const client = await requireClient(false);
  if (!client) return FAIL({}, await whyNoClient());
  const id=str(fd,"id"),d=db.getDeliverable(id),project=d?db.getProject(d.projectId):null;
  if(!d||!project||!(await getPortalRequest()).reviewProjectIds.includes(project.id))return FAIL({},"That deliverable is no longer there.");
  try {
    const result=await decideLegacyDeliverable(project.id,id,str(fd,"version"),"Approved");
    if(result.eventIds.length)after(()=>dispatchWorkspaceEvents({eventIds:result.eventIds}));
    revalidatePath(`/portal/projects/${project.id}`);revalidatePath(`/admin/projects/${project.id}`);revalidatePath("/portal");
    return OK(`${d.name} marked approved.`);
  }catch(error){return FAIL({},error instanceof Error?error.message:"Approval could not be recorded.");}
}

export async function requestRevision(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const client=await requireClient(false);
  if(!client)return FAIL({},await whyNoClient());
  const id=str(fd,"id"),note=str(fd,"note"),d=db.getDeliverable(id),project=d?db.getProject(d.projectId):null;
  if(!note)return FAIL({note:"Say what needs to change - it goes straight to the team working on it."});
  if(!d||!project||!(await getPortalRequest()).reviewProjectIds.includes(project.id))return FAIL({},"That deliverable is no longer there.");
  try {
    const result=await decideLegacyDeliverable(project.id,id,str(fd,"version"),"Revision requested",note);
    if(result.eventIds.length)after(()=>dispatchWorkspaceEvents({eventIds:result.eventIds}));
    revalidatePath(`/portal/projects/${project.id}`);revalidatePath(`/admin/projects/${project.id}`);revalidatePath("/portal");
    return OK("Revision request recorded.");
  }catch(error){return FAIL({},error instanceof Error?error.message:"Revision request could not be recorded.");}
}

export async function submitTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireWorkspaceUser(true);
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
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
  /* The studio hears about it by email, behind the response. */
  const notice=await stageSupportNotice({ticket:t,body,opened:true,messageId:`${t.id}-open`});
  if(typeof notice==='function')after(notice);
  /* And the client is told it arrived, and when to expect an answer. */
  const receipt=await stageSupportReceipt(t);
  if(typeof receipt==='function')after(receipt);
  revalidatePath("/admin/clients/support");
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Sent. We'll reply here, usually the same working day.");
}

export async function replyToTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireWorkspaceUser(true);
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
  const ticketId = str(fd, "ticketId");
  const body = str(fd, "body");
  if (!body) return FAIL({ body: "Type a reply first." });
  const t = db.getTicket(ticketId);
  if (!t || t.clientId !== client.id) return FAIL({}, "That conversation is no longer there.");
  const m = db.addTicketMessage({ ticketId: t.id, from: "client", author: client.name, body });
  if(m){const run=await stageSupportNotice({ticket:t,body,opened:false,messageId:m.id});if(typeof run==='function')after(run);}
  revalidatePath("/admin/clients/support");
  revalidatePath(`/portal/support/${t.id}`);
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Sent.");
}

/* THE CLIENT CAN SETTLE THEIR OWN QUESTION. Closing is a status, not a
   deletion: the thread stays readable, and writing on it again reopens it
   (addTicketMessage does that), so a close pressed by mistake costs nothing. */
export async function closeMyTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
  const t = db.getTicket(str(fd, "ticketId"));
  if (!t || t.clientId !== client.id) return FAIL({}, "That conversation is no longer there.");
  if (t.status !== "Closed") db.setTicketStatus(t.id, "Closed");
  revalidatePath("/admin/clients/support");
  revalidatePath(`/portal/support/${t.id}`);
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Closed. Write here again any time and it reopens.");
}

/* THE CLIENT'S OWN NAME AND PHONE. The email is not here on purpose: it is
   what the portal matches the signed-in person to their client record by,
   so changing it from inside would lock them out. That goes through Support. */
export async function updateMyDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
  const name = str(fd, "name").replace(/\s+/g, " ").slice(0, 120);
  const phone = str(fd, "phone").slice(0, 40);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Your name, as we should address you.";
  if (phone && !/^\+?[0-9][0-9 ()-]{6,}$/.test(phone)) errors.phone = "A phone number, like +234 803 555 0142.";
  if (Object.keys(errors).length) return FAIL(errors);
  db.patchClient(client.id, { name, phone }, name);
  revalidatePath("/portal/settings");
  revalidatePath("/portal");
  return OK("Details saved.");
}

/* One other device, by its session id: only ever this person's own, never the one asking. */
export async function signOutDevice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const client = await requireClient(false);
  if (!client) return FAIL({}, await whyNoClient());
  const { headers } = await import("next/headers");
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const id = String(fd.get("session") ?? "");
  if (!session?.user || !id || id === session.session.id) return FAIL({}, "Use Sign out to leave this device.");
  try { await (await import("@/lib/db/pool")).db.query('DELETE FROM "session" WHERE "id" = $1 AND "userId" = $2', [id, session.user.id]); } catch {
    return FAIL({}, "That could not be done just now. Try again in a minute.");
  }
  revalidatePath("/portal/settings");
  return OK("That device is signed out.");
}

/* Every other device signed in as this person is signed out; this one stays. */
export async function signOutOtherDevices(): Promise<ActionState> {
  const client = await requireClient(false);
  if (!client) return FAIL({}, await whyNoClient());
  const { headers } = await import("next/headers");
  const h = await headers();
  const { auth } = await import("@/lib/auth");
  try { await auth.api.revokeOtherSessions({ headers: h }); } catch {
    return FAIL({}, "That could not be done just now. Try again in a minute.");
  }
  return OK("Every other device is signed out. This one stays.");
}

export async function updateNotifyPrefs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
  const notify = Object.fromEntries(
    NOTIFY_KINDS.map((k: NotifyKind) => [k, fd.get(k) === "on" || fd.get(k) === "1"]),
  ) as Record<NotifyKind, boolean>;
  db.patchClient(client.id, { notify }, client.name);
  revalidatePath("/portal/settings");
  return OK("Preferences saved.");
}
