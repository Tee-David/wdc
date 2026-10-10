import 'server-only';
import {createHash} from 'node:crypto';
import {getClient,getInvoice,getEstimate,getPayments} from '@/lib/admin/store';
import type {Message,Ticket} from '@/lib/admin/types';
import {projectRecipients,clientRecipients} from './access';
import {emitWorkspaceEvent} from './events';
const identity=(key:string)=>{const h=createHash('sha256').update('legacy:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
/** Existing primary emails keep their own durable path; scoped people receive one additional notice. */
export async function stageLegacyMoneyNotification(input:{key:string;clientId?:string;about?:Message['about'];title:string;summary:string;by:string;existingAddress:string}){
 const about=input.about;if(!about)return null;
 const invoice=about.kind==='invoice'?getInvoice(about.id):about.kind==='payment'?getInvoice(getPayments().find(p=>p.id===about.id)?.invoiceId??''):null;
 const estimate=about.kind==='estimate'?getEstimate(about.id):null;
 const projectId=invoice?.projectId??estimate?.projectId;
 const client=getClient(input.clientId??invoice?.clientId??estimate?.clientId??''),studioNotice=/^(paid-notice|estimate-notice):/.test(input.key);if(!client)return null;
 const scopeId=projectId??'client:'+client.id;
 const id=identity(input.key),recipients=(await (projectId?projectRecipients(projectId,studioNotice?'internal':'all','billing'):clientRecipients(client.id,studioNotice?'internal':'all'))).filter(person=>person.role==='owner'||(!studioNotice&&person.role==='client')).map(person=>({userId:person.userId,href:person.role==='client'?'/portal/billing':invoice?'/admin/money/'+invoice.id:'/admin/money',suppressEmailReason:[input.existingAddress,client?.email??''].some(email=>email.trim().toLowerCase()===person.email.trim().toLowerCase())?'The existing transactional email handles this recipient.':undefined}));
 await emitWorkspaceEvent({id,projectId:scopeId,clientId:client.id,kind:'billing.'+input.key.split(':')[0],category:input.key.startsWith('reminder:')?'reminders':'billing',recipientPurpose:'billing',actorId:'legacy-money',actorName:input.by,title:input.title,summary:input.summary,href:'/admin/money',visibility:studioNotice?'internal':'client',recipients});
 return id;
}
/** Support is company-private: secondary project contacts never acquire the support thread. */
export async function stageLegacySupportNotification(input:{ticket:Ticket;key:string;title:string;summary:string;by:string;audience:'studio'|'client';existingAddress:string}){
 const {ticket}=input;
 const client=getClient(ticket.clientId);if(!client)return null;
 const id=identity(input.key),people=await (ticket.projectId?projectRecipients(ticket.projectId,input.audience==='studio'?'internal':'client','updates'):clientRecipients(ticket.clientId,input.audience==='studio'?'internal':'client'));
 const recipients=people.filter(person=>input.audience==='studio'||person.email.trim().toLowerCase()===client.email.trim().toLowerCase()).map(person=>({userId:person.userId,href:input.audience==='studio'?'/admin/clients/support/'+ticket.id:'/portal/support/'+ticket.id,suppressEmailReason:person.email.trim().toLowerCase()===input.existingAddress.trim().toLowerCase()?'The existing support email handles this recipient.':undefined}));
 await emitWorkspaceEvent({id,projectId:ticket.projectId??'client:'+ticket.clientId,clientId:ticket.clientId,kind:'support.'+(input.audience==='studio'?'client_message':'studio_reply'),category:'support',actorId:'legacy-support',actorName:input.by,title:input.title,summary:input.summary,href:'/admin/clients/support/'+ticket.id,visibility:input.audience==='studio'?'internal':'client',recipients});
 return id;
}
