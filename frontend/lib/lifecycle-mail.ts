import "server-only";

import { createHash } from "node:crypto";
import { studioInbox } from "@/lib/email";
import { hydrateSettings } from "@/lib/settings/store";
import { SITE_URL } from "@/lib/site";
import {
  clientJoinedNoticeEmail, clientWelcomeEmail, deliverableApprovedNoticeEmail, entryAssignedEmail, meetingNoticeEmail,
  newDeviceEmail, passwordChangedEmail, revisionRequestedNoticeEmail, staffJoinedEmail, ticketReceivedEmail,
} from "@/lib/email-templates";
import { getClient, getProject, getSetting } from "@/lib/admin/store";
import { syncStore } from "@/lib/admin/persist";
import { queueLogged } from "@/lib/message-log";
import { notifyAllows, type Deliverable, type Message, type Project, type Ticket } from "@/lib/admin/types";
import { sendLogged } from "@/lib/outbox";
import { db } from "@/lib/db/pool";
import { deviceLabel, isNewDevice } from "@/lib/auth/device-label";
import type { MeetingNotice } from "@/lib/meetings/notice";

/**
 * THE LIFECYCLE MESSAGES: someone joined, approved, asked for changes, booked a
 * meeting, opened a question, signed in somewhere new, changed a password.
 *
 * Every one goes through the outbox (lib/outbox.ts), so its row is written
 * with a dedupe key before the mail server is called, and every one is called
 * from behind the response (`after()`), so no visitor waits on the slow mail
 * server. A failure is on the row; nothing here throws.
 *
 * WHO CAN SWITCH WHAT OFF.
 *  - Studio notices follow a switch under Settings, Notifications
 *    (notify.signups, notify.staff, notify.approvals, notify.meetings). Off
 *    means nothing is sent and nothing is written, as the existing notices do.
 *  - A notice to a client follows that client's own "project updates" switch.
 *    Off, the row says Skipped and why.
 *  - A client with no email on file gets a Skipped row saying so, never a
 *    silent return (`logNotSent`).
 *  - The two security notices are always sent.
 */

const abs = (path: string) => new URL(path, SITE_URL).toString();
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const short = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 10);
const versionOf = (d: Deliverable) => d.versions.at(-1)?.v ?? 1;

/** True when the studio has not switched this notice off. */
async function studioOn(key: string) {
  await hydrateSettings();
  return getSetting(key) !== "0";
}

/**
 * A message that was not sent, on the log with the reason, so the studio can
 * see why nothing went. The key carries a suffix so a LATER real send of the
 * same event (once an address is added) is not blocked as a duplicate.
 */
export async function logNotSent(input: {
  why: string; subject: string; dedupeKey: string; by: string; to?: string; clientId?: string; about?: Message["about"];
}) {
  try {
    await queueLogged({
      channel: "Email", to: input.to || "(no address on file)", subject: input.subject,
      summary: `Not sent: ${input.why}`, dedupeKey: `${input.dedupeKey}:skipped`, by: input.by,
      clientId: input.clientId, state: "Skipped", about: input.about,
    });
  } catch { /* A log that cannot be written must not fail the work it describes. */ }
}

/* ---------------------------------------------------------------- accounts */

/**
 * A client accepted their invitation. They get a welcome (what the portal is
 * for, and the link); the studio gets a notice. Both behind the response.
 */
export async function sendClientJoined(input: { userId: string; name: string; email: string; clientId: string | null }) {
  await syncStore();
  const client = input.clientId ? getClient(input.clientId) : null;
  const company = client?.company || client?.name || "";
  const about = client ? { kind: "client" as const, id: client.id, label: client.company } : undefined;
  const welcomeKey = `client-welcome:${input.userId}`;
  if (client && !notifyAllows(client.notify, "updates")) {
    await logNotSent({ why: `${company} has project updates switched off.`, subject: "Welcome to your client portal", dedupeKey: welcomeKey, by: "Portal", to: input.email, clientId: client.id, about });
  } else {
    try {
      await sendLogged(
        { to: input.email, ...clientWelcomeEmail({ name: input.name || client?.name || input.email, company: company || undefined, url: abs("/portal") }) },
        { summary: "Welcome, after accepting the invitation.", dedupeKey: welcomeKey, by: "Portal", clientId: client?.id, about },
      );
    } catch { /* The row records the failure. */ }
  }
  if (!(await studioOn("notify.signups"))) return;
  try {
    await sendLogged(
      { to: studioInbox(), ...clientJoinedNoticeEmail({ name: input.name || input.email, email: input.email, company: company || "A client", url: abs(client ? `/admin/clients/${client.id}` : "/admin/clients") }) },
      { summary: "A client accepted their invitation.", dedupeKey: `client-joined:${input.userId}`, by: "Portal", clientId: client?.id, about },
    );
  } catch { /* The row records the failure. */ }
}

/**
 * A staff member accepted their invitation. Told at acceptance, once. The
 * finished-welcome note (lib/staff-mail.ts) is sent only if they finish, so
 * the owner is never mailed twice for a person who skipped.
 */
export async function sendStaffJoined(input: { userId: string; name: string; email: string }) {
  if (!(await studioOn("notify.staff"))) return;
  try {
    await sendLogged(
      { to: studioInbox(), ...staffJoinedEmail({ name: input.name || input.email, email: input.email, url: abs("/admin/users") }) },
      { summary: "A new staff member accepted their invitation.", dedupeKey: `staff-joined:${input.userId}`, by: "Website" },
    );
  } catch { /* The row records the failure. */ }
}

/* --------------------------------------------------------------- approvals */

/** A client asked for changes to a deliverable. The studio gets their note. */
export async function sendRevisionRequested(input: { project: Project; deliverable: Deliverable; note: string; by: string }) {
  const { project, deliverable, note, by } = input;
  if (!(await studioOn("notify.approvals"))) return;
  const client = getClient(project.clientId);
  try {
    await sendLogged(
      { to: studioInbox(), ...revisionRequestedNoticeEmail({ company: client?.company || "A client", project: project.title, deliverable: `${deliverable.name} (v${versionOf(deliverable)})`, note, by, url: abs(`/admin/projects/${project.id}`) }) },
      { summary: `${by} asked for changes to ${deliverable.name} v${versionOf(deliverable)}.`, dedupeKey: `revision-notice:${deliverable.id}:v${versionOf(deliverable)}:${short(note)}`, by: "Portal", clientId: project.clientId, about: { kind: "project", id: project.id, label: project.title } },
    );
  } catch { /* The row records the failure. */ }
}

/** A client approved a deliverable. The studio is told (the client has their sign-off confirmation already). */
export async function sendDeliverableApproved(input: { project: Project; deliverable: Deliverable; signedBy: string }) {
  const { project, deliverable, signedBy } = input;
  if (!(await studioOn("notify.approvals"))) return;
  const client = getClient(project.clientId);
  try {
    await sendLogged(
      { to: studioInbox(), ...deliverableApprovedNoticeEmail({ company: client?.company || "A client", project: project.title, deliverable: `${deliverable.name} (v${versionOf(deliverable)})`, signedBy, url: abs(`/admin/projects/${project.id}`) }) },
      { summary: `${signedBy} approved ${deliverable.name} v${versionOf(deliverable)}.`, dedupeKey: `approved-notice:${deliverable.id}:v${versionOf(deliverable)}`, by: "Portal", clientId: project.clientId, about: { kind: "project", id: project.id, label: project.title } },
    );
  } catch { /* The row records the failure. */ }
}

/* ------------------------------------------------------- forms and meetings */

/** The owner ticked "Tell the client" when assigning a form entry. Off by default. */
export async function sendEntryAssigned(input: { clientId: string; projectId: string | null; formKey: string; formNoun: string; entryId: string; by: string }) {
  await syncStore();
  const client = getClient(input.clientId);
  if (!client) return;
  const project = input.projectId ? getProject(input.projectId) : null;
  const subject = `We have your ${input.formNoun}`;
  const dedupeKey = `entry-assigned:${input.formKey}:${input.entryId}:${client.id}`;
  const email = client.email?.trim();
  if (!email) return logNotSent({ why: `${client.company} has no email address on file.`, subject, dedupeKey, by: input.by, clientId: client.id });
  if (!notifyAllows(client.notify, "updates")) return logNotSent({ why: `${client.company} has project updates switched off.`, subject, dedupeKey, by: input.by, to: email, clientId: client.id });
  try {
    await sendLogged(
      { to: email, ...entryAssignedEmail({ clientName: client.name, form: input.formNoun, project: project?.title, url: abs(project ? `/portal/projects/${project.id}` : "/portal") }) },
      { summary: `Told ${client.company} their ${input.formNoun} was picked up.`, dedupeKey, by: input.by, clientId: client.id },
    );
  } catch { /* The row records the failure. */ }
}

/** A meeting was booked, cancelled or moved. Studio only: the booking service sends the client's own emails. */
export async function sendMeetingNotice(input: MeetingNotice & { digest: string }) {
  if (!(await studioOn("notify.meetings"))) return;
  try {
    await sendLogged(
      { to: studioInbox(), ...meetingNoticeEmail({ kind: input.kind, title: input.title, who: input.who, email: input.email, when: input.when, url: abs("/admin/meetings") }) },
      { summary: `A meeting was ${input.kind}.`, dedupeKey: `meeting:${input.kind}:${input.uid}:${input.digest.slice(0, 12)}`, by: "Meetings" },
    );
  } catch { /* The row records the failure. */ }
}

/* ----------------------------------------------------------------- support */

/** The client's question reached us: "we have it, and when to expect an answer". */
export async function sendTicketReceived(input: { ticket: Ticket }) {
  const { ticket } = input;
  await syncStore();
  const client = getClient(ticket.clientId);
  if (!client) return;
  const subject = `We have your question: ${ticket.subject}`;
  const dedupeKey = `ticket-received:${ticket.id}`;
  const email = client.email?.trim();
  if (!email) return logNotSent({ why: `${client.company} has no email address on file.`, subject, dedupeKey, by: "Portal", clientId: client.id });
  if (!notifyAllows(client.notify, "updates")) return logNotSent({ why: `${client.company} has project updates switched off.`, subject, dedupeKey, by: "Portal", to: email, clientId: client.id });
  try {
    await sendLogged(
      { to: email, ...ticketReceivedEmail({ clientName: first(client.name), subject: ticket.subject, url: abs(`/portal/support/${ticket.id}`) }) },
      { summary: "Told the client their question arrived.", dedupeKey, by: "Portal", clientId: client.id },
    );
  } catch { /* The row records the failure. */ }
}

/* ---------------------------------------------------------------- security */

const RESET_URL = () => abs("/forgot-password");

/**
 * A sign-in from a device the person has not used lately. ALWAYS SENT: it is a
 * security notice. Called from behind the response at the session seam in
 * lib/auth.ts, so a sign-in never waits on the mail server.
 */
export async function sendNewDeviceNotice(input: { userId: string; sessionId: string; userAgent: string | null }) {
  try {
    const others = await db.query<{ userAgent: string | null }>(
      'SELECT "userAgent" FROM "session" WHERE "userId" = $1 AND "id" <> $2 AND "expiresAt" > now()', [input.userId, input.sessionId]);
    if (!isNewDevice(input.userAgent, others.rows.map((r) => r.userAgent))) return;
    const who = (await db.query<{ email: string; name: string | null }>('SELECT "email","name" FROM "user" WHERE "id" = $1', [input.userId])).rows[0];
    if (!who?.email) return;
    await sendLogged(
      { to: who.email, ...newDeviceEmail({ name: who.name ?? undefined, device: deviceLabel(input.userAgent), when: new Date(), resetUrl: RESET_URL() }) },
      { summary: "A sign-in from a new device.", dedupeKey: `new-device:${input.sessionId}`, by: "Account security" },
    );
  } catch (e) { console.error("[lifecycle] new-device notice failed:", e instanceof Error ? e.message : e); }
}

/** A password was changed (in the account, or by a reset link). ALWAYS SENT. */
export async function sendPasswordChangedNotice(input: { email: string; name?: string | null; how: "changed" | "reset"; eventKey: string }) {
  try {
    await sendLogged(
      { to: input.email, ...passwordChangedEmail({ name: input.name ?? undefined, when: new Date(), how: input.how, resetUrl: RESET_URL() }) },
      { summary: input.how === "reset" ? "A password was reset with a link." : "A password was changed.", dedupeKey: `password-changed:${input.eventKey}`, by: "Account security" },
    );
  } catch (e) { console.error("[lifecycle] password notice failed:", e instanceof Error ? e.message : e); }
}
