"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as db from "@/lib/admin/store";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/admin/types";
import { FAIL, OK, str, type ActionState } from "@/lib/admin/validate";
import { supportCookiePresent } from "@/lib/users/support";
import { SUPPORT_READ_ONLY } from "@/lib/users/support-policy";
import { getPortalRequest } from "./session";
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
async function requireClient() {
  try {
    if (await supportCookiePresent()) return null;
    const { session, client } = await getPortalRequest();
    const role = (session?.user as { role?: string } | undefined)?.role;
    return role === "client" ? client : null;
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
  const signedIn = await getPortalRequest().then((r) => Boolean(r.session?.user)).catch(() => false);
  return signedIn
    ? "Your account isn't linked to a client record yet. Email us and we'll connect it."
    : "You've been signed out. Sign in again in a new tab, then press this again. What you typed is still here.";
}

export async function approveDeliverable(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
  const id = str(fd, "id");
  const d = db.getDeliverable(id);
  const project = d ? db.getProject(d.projectId) : null;
  if (!d || !project || project.clientId !== client.id) return FAIL({}, "That deliverable is no longer there.");
  /* APPROVE WHAT WAS SEEN. A tab left open while the studio shared a newer
     version must not sign off on one the client has not looked at; and a
     second press on something approved is not a second sign-off email. */
  const latest = d.versions.at(-1)?.v ?? 0;
  const seen = Number(str(fd, "version") || latest);
  if (seen < latest) return FAIL({}, `A newer version (v${latest}) was shared since you opened this page. Reload and look at it first.`);
  if (d.approval === "Approved") return OK(`${d.name} is already approved.`);
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
  await syncStore();
  persistSoon();
  const client = await requireClient();
  if (!client) return FAIL({}, await whyNoClient());
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
  after(() => import("@/lib/support-mail").then((m) => m.sendSupportNotice({ ticket: t, body, opened: true, messageId: `${t.id}-open` })));
  revalidatePath("/admin/clients/support");
  revalidatePath("/portal/support");
  revalidatePath("/portal");
  return OK("Sent. We'll reply here, usually the same working day.");
}

export async function replyToTicket(_prev: ActionState, fd: FormData): Promise<ActionState> {
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
  if (m) after(() => import("@/lib/support-mail").then((x) => x.sendSupportNotice({ ticket: t, body, opened: false, messageId: m.id })));
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

/* Every other device signed in as this person is signed out; this one stays. */
export async function signOutOtherDevices(): Promise<ActionState> {
  const client = await requireClient();
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
