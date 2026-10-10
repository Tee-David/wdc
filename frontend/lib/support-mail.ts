import { designed } from "@/lib/email-designed";
import "server-only";

import { studioInbox } from "@/lib/email";
import { hydrateSettings } from "@/lib/settings/store";

import { SITE_URL } from "@/lib/site";
import { supportNoticeEmail, supportReplyEmail, ticketReceivedEmail } from "@/lib/email-templates";
import { getClient, getSetting } from "@/lib/admin/store";
import { queueLogged } from "@/lib/message-log";
import { notifyAllows, type Ticket } from "@/lib/admin/types";
import { sendQueuedLogged } from "@/lib/outbox";
import { logNotSent } from "@/lib/lifecycle-mail";
import {stageLegacySupportNotification} from "@/lib/workspace/legacy-notifications";

/**
 * SUPPORT MESSAGES: the studio hears about a question or a reply, and the
 * client hears the studio's answer.
 *
 * Through the outbox like every other message: the row is written before the
 * mail server is called and keyed to the message, so a retry sends once.
 * Called from behind the response. The client's copy is a "project update"
 * they can switch off; switched off, the row says Skipped and why.
 */
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

export async function stageSupportNotice(input: { ticket: Ticket; body: string; opened: boolean; messageId: string }) {
  const { ticket, body, opened, messageId } = input;
  /* Settings, Notifications: the studio can switch these off. */
  await hydrateSettings();
  await stageLegacySupportNotification({ticket,key:`support-notice:${messageId}`,title:ticket.subject,summary:opened?'A client opened a support question.':'A client replied to the support question.',by:'Portal',audience:'studio',existingAddress:studioInbox()});
  if (getSetting("notify.tickets") === "0") return;
  const client = getClient(ticket.clientId);
  const company = client?.company || client?.name || "A client";
  const to=studioInbox(),log={summary:opened?"A client opened a question.":"A client replied.",dedupeKey:`support-notice:${messageId}`,by:"Portal",clientId:ticket.clientId};
  const queued=await queueLogged({channel:'Email',to,subject:ticket.subject,...log},true);
  if(!queued.ok)return null;
  const mail={to,...supportNoticeEmail({company,subject:ticket.subject,body,opened,url:new URL(`/admin/clients/support/${ticket.id}`,SITE_URL).toString()})};
  return async()=>{try{await sendQueuedLogged(mail,log,queued.message.id);}catch{/* Persisted log records provider failure. */}};
}

export async function stageSupportReply(input: { ticket: Ticket; reply: string; author: string; messageId: string; by: string }) {
  const { ticket, reply, author, messageId, by } = input;
  const client = getClient(ticket.clientId);
  const email = client?.email?.trim();
  if (!client) return;
  await stageLegacySupportNotification({ticket,key:`support-reply:${messageId}`,title:`Re: ${ticket.subject}`,summary:'The studio replied to your support question.',by,audience:'client',existingAddress:email??''});
  const subject = `Re: ${ticket.subject}`;
  const dedupeKey = `support-reply:${messageId}`;
  if (!email) return logNotSent({ why: `${client.company} has no email address on file.`, subject, dedupeKey, by, clientId: client.id });
  if (!notifyAllows(client.notify, "updates")) {
    await queueLogged({
      channel: "Email", to: email, subject, summary: `Not sent: ${client.company} has project updates switched off.`,
      dedupeKey, by, clientId: client.id, state: "Skipped",
    },true);
    return;
  }
  const log={summary:"The studio replied to a support question.",dedupeKey,by,clientId:client.id};
  const queued=await queueLogged({channel:'Email',to:email,subject,...log},true);
  if(!queued.ok)return null;
  const mail={to:email,...(await designed("support-reply",{"client.first_name":first(client.name),"ticket.subject":ticket.subject,"reply.body":reply,"reply.author":author,"links.thread":new URL(`/portal/support/${ticket.id}`,SITE_URL).toString()},()=>supportReplyEmail({clientName:first(client.name),subject:ticket.subject,reply,author,url:new URL(`/portal/support/${ticket.id}`,SITE_URL).toString()})))};
  return async()=>{try{await sendQueuedLogged(mail,log,queued.message.id);}catch{/* Persisted log records provider failure. */}};
}
export async function sendSupportNotice(input:Parameters<typeof stageSupportNotice>[0]){const run=await stageSupportNotice(input);if(typeof run==='function')await run();}
export async function sendSupportReply(input:Parameters<typeof stageSupportReply>[0]){const run=await stageSupportReply(input);if(typeof run==='function')await run();}
export async function stageSupportReceipt(ticket:Ticket){
 const client=getClient(ticket.clientId);if(!client)return null;
 const to=client.email.trim(),subject=`We have your question: ${ticket.subject}`,dedupeKey=`ticket-received:${ticket.id}`;
 await stageLegacySupportNotification({ticket,key:dedupeKey,title:subject,summary:'Your support question was received. The team will reply in the thread.',by:'Portal',audience:'client',existingAddress:to});
 if(!to||!notifyAllows(client.notify,'updates')){await queueLogged({channel:'Email',to:to||'(no address on file)',subject,summary:'The acknowledgement was held back.',error:!to?'No client email address.':'Client updates are switched off.',dedupeKey,by:'Portal',clientId:client.id,state:'Skipped'},true);return null;}
 const log={summary:'Told the client their question arrived.',dedupeKey,by:'Portal',clientId:client.id};
 const queued=await queueLogged({channel:'Email',to,subject,...log},true);if(!queued.ok)return null;
 const mail={to,...ticketReceivedEmail({clientName:first(client.name),subject:ticket.subject,url:new URL(`/portal/support/${ticket.id}`,SITE_URL).toString()})};
 return async()=>{try{await sendQueuedLogged(mail,log,queued.message.id);}catch{/* Persisted log records provider failure. */}};
}
