"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/pool";
import * as store from "./store";
import { persistSoon, syncStore } from "./persist";
import { actorName, allow } from "./guard";
import { outOfScope } from "./staff-scope";
import { FAIL, OK, looksEmail, str, type ActionState } from "./validate";
import { getAdminRequest } from "./session";
import { refusedEmail, REFUSED_EMAIL_MESSAGE } from "@/lib/email-domains";
import { ClientInvitationError, createColleagueInvitation, normaliseEmail } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/invitation-mail";
import { liveProjectIds } from "@/lib/portal/people";
import type { Contact } from "./types";

/**
 * THE PEOPLE AT A CLIENT, from their page. The main contact is the record's own name, email and phone, and the
 * portal binds to that email; everyone else is a contact. Each change goes through patchClient, so the audit log
 * has one line per field that moved.
 */
async function guard(clientId: string) {
  await syncStore();
  persistSoon();
  const refused = await allow("clients"); if (refused) return { refused };
  const scoped = await outOfScope({ client: clientId }); if (scoped) return { refused: scoped };
  const client = store.getClient(clientId);
  if (!client || client.archived) return { refused: FAIL({}, "This client is archived or gone. Refresh the page.") };
  return { client };
}
const back = (id: string) => { revalidatePath(`/admin/clients/${id}`); revalidatePath("/admin/clients"); };

export async function addContact(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(str(fd, "clientId")); if ("refused" in g) return g.refused!;
  const c = g.client;
  const name = str(fd, "name").replace(/\s+/g, " ").slice(0, 80), role = str(fd, "role").slice(0, 60), email = normaliseEmail(str(fd, "email")), phone = str(fd, "phone").slice(0, 40);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Their name.";
  if (email && !looksEmail(email)) errors.email = "Check the email address.";
  else if (email && refusedEmail(email)) errors.email = REFUSED_EMAIL_MESSAGE;
  const known = [c.email, ...(c.contacts ?? []).map((x) => x.email ?? "")].map((e) => normaliseEmail(e));
  if (email && known.includes(email)) errors.email = "Someone at this client already has this address.";
  if ((c.contacts ?? []).length >= 10) errors.name = "Ten contacts is the most a client keeps. Remove one first.";
  if (Object.keys(errors).length) return FAIL(errors);
  const next: Contact = { name, ...(role ? { role } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
  store.patchClient(c.id, { contacts: [...(c.contacts ?? []), next] }, await actorName());
  back(c.id);
  return OK(`Saved. ${name} is on ${c.company}'s people.`);
}

export async function removeContact(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(str(fd, "clientId")); if ("refused" in g) return g.refused!;
  const c = g.client, at = Number(str(fd, "at")), who = (c.contacts ?? [])[at];
  if (!who || who.name !== str(fd, "name")) return FAIL({}, "The people list changed. Refresh the page.");
  store.patchClient(c.id, { contacts: (c.contacts ?? []).filter((_, i) => i !== at) }, await actorName());
  back(c.id);
  return OK(`Updated. ${who.name} is off the list. Any portal access they were given stays until it is withdrawn.`);
}

/**
 * MAKE SOMEONE THE MAIN CONTACT: they swap places with the current one. The portal follows the main contact's
 * email, so the old address's pending invitation is withdrawn, the same as editing the email by hand.
 */
export async function makeMainContact(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(str(fd, "clientId")); if ("refused" in g) return g.refused!;
  const c = g.client, at = Number(str(fd, "at")), who = (c.contacts ?? [])[at];
  if (!who || who.name !== str(fd, "name")) return FAIL({}, "The people list changed. Refresh the page.");
  if (!who.email || !looksEmail(who.email)) return FAIL({}, `Add an email for ${who.name} first. The main contact signs in with it.`);
  if (store.findDuplicateClient(who.email, who.phone ?? "", c.id)) return FAIL({}, "Another client already has this email or phone.");
  const old: Contact = { name: c.name, role: "Former main contact", ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phone: c.phone } : {}) };
  const contacts = (c.contacts ?? []).map((x, i) => (i === at ? old : x));
  store.patchClient(c.id, { name: who.name, email: who.email, phone: who.phone ?? "", contacts }, await actorName());
  try { const { revokeStaleInvitations } = await import("@/lib/invitations"); await revokeStaleInvitations(c.id, who.email, await actorName()); } catch { /* nothing pending to withdraw */ }
  back(c.id);
  return OK(`Updated. ${who.name} is the main contact. Invite them to the portal from Portal access if they have no account.`);
}

/**
 * GIVE A CONTACT PORTAL ACCESS: the same colleague access the main contact can grant from their portal, on every
 * live project. An existing client account is added at once; anyone else gets an invitation (sending again
 * replaces the last one, which is how a lost invitation is resent).
 */
export async function givePortalAccess(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard(str(fd, "clientId")); if ("refused" in g) return g.refused!;
  const c = g.client, name = str(fd, "name").slice(0, 120), email = normaliseEmail(str(fd, "email"));
  const gets = fd.getAll("gets").map(String), review = gets.includes("review"), billing = gets.includes("billing");
  if (!looksEmail(email)) return FAIL({}, `Add an email for ${name} first.`);
  if (refusedEmail(email)) return FAIL({}, REFUSED_EMAIL_MESSAGE);
  if (email === normaliseEmail(c.email)) return FAIL({}, "That is the main contact. Use Portal access beside the list.");
  const projects = liveProjectIds(c.id);
  if (!projects.length) return FAIL({}, "There is no live project to share yet. Access can be given once one starts.");
  const actorId = (await getAdminRequest()).session?.user.id ?? "", by = await actorName();
  try {
    const existing = await db.query<{ id: string; role: string; gone: boolean }>(`SELECT id, role, ("deactivatedAt" IS NOT NULL) AS gone FROM "user" WHERE lower(email)=$1`, [email]);
    const who = existing.rows[0];
    if (who) {
      if (who.role !== "client" || who.gone) return FAIL({}, "This address belongs to another kind of account. Use a different one.");
      for (const p of projects) await db.query(`INSERT INTO workspace_project_members(project_id,user_id,can_manage,can_review,can_billing,granted_by) VALUES($1,$2,false,$3,$4,$5) ON CONFLICT(project_id,user_id) DO UPDATE SET can_review=excluded.can_review,can_billing=excluded.can_billing,granted_by=excluded.granted_by,granted_at=now(),revoked_at=NULL`, [p, who.id, review, billing, actorId]);
    } else {
      const made = await createColleagueInvitation({ email, name, actorId, clientId: c.id, by, projects: projects.map((id) => ({ id, review, billing })) });
      after(async () => { try { await sendInvitationEmail(made.invitation, made.token); } catch { console.error("[people] deferred invitation email failed; review its delivery state."); } });
    }
    store.audit({ actor: by, kind: "client", subjectId: c.id, subject: c.company || c.name, action: who ? "gave a contact portal access" : "invited a contact to the portal", note: `${name} <${email}>` });
    back(c.id);
    return OK(who ? `Saved. ${name} can see ${c.company}'s projects now.` : `Saved. ${name} gets an invitation at ${email}. It works once, for a week.`);
  } catch (error) {
    if (error instanceof ClientInvitationError) return FAIL({}, error.message);
    return FAIL({}, "Access could not be given just now. Nothing was sent; try again.");
  }
}
