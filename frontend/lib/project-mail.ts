import { designed } from "@/lib/email-designed";
import "server-only";

import { SITE_URL } from "@/lib/site";
import { deliverableReadyEmail, projectStageEmail, signOffEmail } from "@/lib/email-templates";
import { getClient } from "@/lib/admin/store";
import { queueLogged } from "@/lib/message-log";
import { notifyAllows, type Deliverable, type Project } from "@/lib/admin/types";
import { sendLogged } from "@/lib/outbox";

/**
 * The project messages: it moved, it needs you, you signed it off.
 *
 * All three go through the outbox, so each writes its row before the mail
 * server is called, and each is keyed to the EVENT so a retry or a double
 * press sends once. They are called from behind the response.
 *
 * WHO CAN SWITCH WHAT OFF. A stage change and an approval request are
 * "project updates", which the client controls; switched off, the row says
 * Skipped and why, instead of silently not sending. A sign-off confirmation is
 * a record of something they agreed to, like a receipt, and always goes.
 */

const portalUrl = (projectId: string) => new URL(`/portal/projects/${projectId}`, SITE_URL).toString();
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

async function skipped(project: Project, subject: string, dedupeKey: string, by: string) {
  const client = getClient(project.clientId);
  await queueLogged({
    channel: "Email", to: client?.email || "(no address on file)", subject,
    summary: `Not sent: ${client?.company ?? "the client"} has project updates switched off.`,
    dedupeKey, by, clientId: project.clientId, state: "Skipped",
    about: { kind: "project", id: project.id, label: project.title },
  });
}

export async function sendStageEmail(input: { project: Project; from: string; to: string; note?: string; by: string }) {
  const { project, from, to, note, by } = input;
  const client = getClient(project.clientId);
  const email = client?.email?.trim();
  const dedupeKey = `stage:${project.id}:${to}:${new Date().toISOString().slice(0, 10)}`;
  const subject = `${project.title}: now ${to}`;
  if (!client || !email) return;
  if (!notifyAllows(client.notify, "updates")) return skipped(project, subject, dedupeKey, by);
  try {
    await sendLogged(
      { to: email, ...(await designed("project-stage", {
        "client.first_name": first(client.name), "project.title": project.title, "project.from": from, "project.to": to, "project.note": note ?? "", "links.project": portalUrl(project.id),
      }, () => projectStageEmail({ clientName: first(client.name), projectTitle: project.title, fromStage: from, toStage: to, note, url: portalUrl(project.id) }))) },
      { summary: `Moved from ${from} to ${to}.`, dedupeKey, by, clientId: client.id, about: { kind: "project", id: project.id, label: project.title } },
    );
  } catch { /* The row records the failure. */ }
}

export async function sendApprovalRequest(input: { project: Project; deliverable: Deliverable; by: string }) {
  const { project, deliverable, by } = input;
  const client = getClient(project.clientId);
  const email = client?.email?.trim();
  const v = deliverable.versions.at(-1)?.v ?? 1;
  const dedupeKey = `approval-request:${deliverable.id}:v${v}`;
  const subject = `${deliverable.name} is ready for your review`;
  if (!client || !email) return;
  if (!notifyAllows(client.notify, "updates")) return skipped(project, subject, dedupeKey, by);
  /* A week, stated in the email so the schedule cannot slip silently. It is
     the studio's ask, and the client can say it does not work for them. */
  const respondBy = new Date(Date.now() + 7 * 86_400_000);
  try {
    await sendLogged(
      { to: email, ...(await designed("deliverable-ready", {
        "client.first_name": first(client.name), "project.title": project.title, "deliverable.name": `${deliverable.name} (v${v})`,
        "deliverable.respond_by": new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(respondBy), "links.review": portalUrl(project.id),
      }, () => deliverableReadyEmail({ clientName: first(client.name), projectTitle: project.title, deliverable: `${deliverable.name} (v${v})`, url: portalUrl(project.id), respondBy }))) },
      { summary: `${deliverable.name} v${v} sent for approval.`, dedupeKey, by, clientId: client.id, about: { kind: "project", id: project.id, label: project.title } },
    );
  } catch { /* The row records the failure. */ }
}

export async function sendSignOffConfirmation(input: { project: Project; deliverable: Deliverable; signedBy: string }) {
  const { project, deliverable, signedBy } = input;
  const client = getClient(project.clientId);
  const email = client?.email?.trim();
  if (!client || !email) return;
  const v = deliverable.versions.at(-1)?.v ?? 1;
  try {
    await sendLogged(
      { to: email, ...signOffEmail({ clientName: first(client.name), projectTitle: project.title, deliverable: `${deliverable.name} (v${v})`, signedBy, signedAt: new Date(), url: portalUrl(project.id) }) },
      { summary: `${signedBy} approved ${deliverable.name} v${v}.`, dedupeKey: `signoff:${deliverable.id}:v${v}`, by: signedBy, clientId: client.id, about: { kind: "project", id: project.id, label: project.title } },
    );
  } catch { /* The row records the failure. */ }
}
